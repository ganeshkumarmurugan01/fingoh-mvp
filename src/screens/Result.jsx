import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import fingohLogo from '../assets/fingoh-logo.png'

const PHARMA_SCORER_URL =
  'https://ganeshkumarmurugan01--fingoh-scorer-pharma-scorer-score.modal.run'
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const TIER = {
  T1: { bg:'#00C853', label:'🔥 Hot',  text:'High-Priority — Act Now',  body:'Strong pharma fit & senior decision-maker. Prioritise for immediate meeting or proposal.' },
  T2: { bg:'#FF9800', label:'🌡 Warm', text:'Follow Up Within 24 hrs',   body:'Good potential. Send personalised follow-up with relevant pharma case studies.' },
  T3: { bg:'#2196F3', label:'❄️ Cool', text:'Nurture Required',          body:'Some interest but limited buying signals. Add to nurture sequence with educational content.' },
  T4: { bg:'#9E9E9E', label:'🧊 Cold', text:'Long-term Nurture',         body:'Low immediate potential. Keep in database for future campaigns.' },
}

export default function Result() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [scan, setScan]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [analyzing, setAnalyzing]   = useState(false)
  const [analysis, setAnalysis]     = useState(null)
  const [aiError, setAiError]       = useState(null)
  const [briefing, setBriefing]     = useState(null)
  const [briefing2, setBriefing2]   = useState(false)
  const [briefError, setBriefError] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('scans').select('*').eq('id', id).single()
      if (!error) {
        setScan(data)
        if (data?.ai_analysis?.ieiScore)      setAnalysis(data.ai_analysis)
        if (data?.ai_analysis?.synthesised_intent) setBriefing(data.ai_analysis)
      }
      setLoading(false)
    }
    load()
  }, [id])

  /* ── Pharma IEI scorer ─────────────────────────────────────────── */
  const runAnalysis = async () => {
    setAnalyzing(true); setAiError(null)
    try {
      const catStr = Array.isArray(scan.quality_types)
        ? scan.quality_types.join(', ') : (scan.quality_types || '')
      const filled = [scan.contact_name,scan.contact_title,scan.contact_company,scan.contact_email,scan.contact_phone].filter(Boolean).length
      const visitor = {
        job_title: scan.contact_title||'', company: scan.contact_company||'',
        country: scan.contact_country||'', primary_reason: scan.notes||'',
        categories_interest: catStr, profile_completeness: filled/5,
        ...(scan.signals||{}),
      }
      const res = await fetch(PHARMA_SCORER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitors:[visitor]})})
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const result = json.scores?.[0]
      if (!result) throw new Error('Empty response')
      setAnalysis(result)
      await supabase.from('scans').update({iei_score:result.ieiScore,tier:result.ieiTier}).eq('id',scan.id)
    } catch(err) { setAiError('Scorer failed — '+err.message) }
    setAnalyzing(false)
  }

  /* ── Intelligence Brief (Claude + web_search) ──────────────────── */
  const runBriefing = async () => {
    setBriefing2(true); setBriefError(null)
    try {
      const prompt = `You are Fingoh.ai — a B2B pharma trade fair intelligence system.

VISITOR:
- Name: ${scan.contact_name||'Unknown'}
- Title: ${scan.contact_title||''}
- Company: ${scan.contact_company||''}
- Country: ${scan.contact_country||''}
- Visit reason: ${scan.notes||''}
- Categories of interest: ${Array.isArray(scan.quality_types)?scan.quality_types.join(', '):(scan.quality_types||'')}

Use web search to briefly research this person and their company. Then respond ONLY with valid JSON (no markdown, no explanation):
{
  "synthesised_intent": "2-3 sentences on what this person is likely attending a pharma trade fair for and what they want",
  "professional_profile": ["signal 1 about role/seniority", "signal 2 about company", "signal 3 about background", "signal 4 about buying authority"],
  "exhibitor_brief": {
    "context": "1 sentence on their company context",
    "what_they_want": "1 sentence on their likely sourcing/procurement need",
    "opening_line": "A strong opening line for your booth team to use when greeting this person"
  }
}`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Extract text from content blocks (may include tool_use blocks)
      let text = ''
      for (const block of data.content || []) {
        if (block.type === 'text') { text = block.text; break }
      }
      text = text.trim().replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim()
      const result = JSON.parse(text)
      setBriefing(result)

      // Merge into ai_analysis
      const merged = { ...(analysis||{}), ...result }
      await supabase.from('scans').update({ ai_analysis: merged }).eq('id', scan.id)

    } catch(err) { setBriefError('Intelligence brief failed — '+err.message) }
    setBriefing2(false)
  }

  if (loading) return (
    <div style={{background:'#0D1B3E',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'white',fontSize:16}}>Loading…</div>
    </div>
  )
  if (!scan) return (
    <div style={{background:'#0D1B3E',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'white'}}>Lead not found</div>
    </div>
  )

  const tierKey  = analysis?.ieiTier || scan.tier || 'T4'
  const tierInfo = TIER[tierKey] || TIER.T4
  const score    = analysis?.ieiScore ?? scan.iei_score

  return (
    <div style={{background:'#F4F5F7',minHeight:'100vh',fontFamily:'system-ui,sans-serif',paddingBottom:40}}>

      {/* ── Navy header ── */}
      <div style={{background:'#0D1B3E'}}>
        <div style={{display:'flex',alignItems:'center',padding:'12px 16px',position:'relative'}}>
          <button onClick={()=>navigate('/scans')} style={{background:'none',border:'none',color:'white',fontSize:28,cursor:'pointer',padding:0,lineHeight:1,width:36}}>‹</button>
          <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)'}}>
            <img src={fingohLogo} alt="Fingoh" style={{height:26,objectFit:'contain',filter:'brightness(0) invert(1)'}} />
          </div>
          <div style={{width:36,marginLeft:'auto'}} />
        </div>
        <div style={{padding:'0 20px 16px'}}>
          <div style={{background:'rgba(255,255,255,0.08)',borderRadius:14,padding:'14px 16px'}}>
            <div style={{color:'white',fontSize:17,fontWeight:800}}>{scan.contact_name||'Unknown Contact'}</div>
            <div style={{color:'rgba(255,255,255,0.65)',fontSize:13,marginTop:2}}>
              {[scan.contact_title,scan.contact_company].filter(Boolean).join(' · ')}
            </div>
            {scan.contact_email && <div style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginTop:4}}>✉ {scan.contact_email}</div>}
            {scan.contact_phone && <div style={{color:'rgba(255,255,255,0.5)',fontSize:12}}>📞 {scan.contact_phone}</div>}
          </div>
        </div>
      </div>

      <div style={{padding:16}}>

        {/* ── Existing score (before analysis) ── */}
        {score && !analysis && (
          <div style={{background:'white',borderRadius:14,padding:'14px 16px',marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',display:'flex',alignItems:'center',gap:12}}>
            <div>
              <div style={{fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:'0.5px'}}>IEI Score</div>
              <div style={{fontSize:38,fontWeight:900,color:'#0D1B3E',lineHeight:1}}>{score}</div>
            </div>
            <div style={{background:tierInfo.bg,color:'white',borderRadius:20,padding:'5px 14px',fontSize:13,fontWeight:700}}>{tierInfo.label}</div>
          </div>
        )}

        {/* ── Deep IEI Analysis button ── */}
        {!analysis && (
          <button onClick={runAnalysis} disabled={analyzing} style={{width:'100%',padding:'16px 20px',background:analyzing?'#8899AA':'#0D1B3E',color:'white',border:'none',borderRadius:14,fontSize:16,fontWeight:700,cursor:analyzing?'default':'pointer',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {analyzing?<><span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>⏳</span> Running Pharma IEI Analysis…</>:<>🧬 Deep IEI Analysis</>}
          </button>
        )}
        {aiError && <div style={{background:'#fff0f0',border:'1px solid #ffcccc',borderRadius:10,padding:'12px 14px',color:'#c00',marginBottom:12,fontSize:13}}>{aiError}</div>}

        {/* ── IEI Analysis result card ── */}
        {analysis && (
          <div style={{background:'white',borderRadius:14,padding:'18px 16px',marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:'#0D1B3E',textTransform:'uppercase',letterSpacing:'0.6px'}}>🧬 Pharma IEI Analysis</div>
              <button onClick={runAnalysis} disabled={analyzing} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:13,fontWeight:600}}>{analyzing?'⏳':'↺ Re-run'}</button>
            </div>
            <div style={{display:'flex',alignItems:'flex-end',gap:14,marginBottom:14}}>
              <div>
                <div style={{fontSize:11,color:'#888'}}>IEI Score</div>
                <div style={{fontSize:52,fontWeight:900,color:'#0D1B3E',lineHeight:1}}>{analysis.ieiScore}</div>
                <div style={{fontSize:11,color:'#aaa'}}>out of 100</div>
              </div>
              <div style={{paddingBottom:6}}>
                <div style={{background:TIER[analysis.ieiTier]?.bg||'#888',color:'white',borderRadius:20,padding:'6px 16px',fontSize:15,fontWeight:700,marginBottom:4}}>{TIER[analysis.ieiTier]?.label||analysis.ieiTierLabel}</div>
                <div style={{fontSize:11,color:'#aaa',textAlign:'center'}}>Tier {analysis.ieiTier}</div>
              </div>
            </div>
            <div style={{background:'#EEF0F3',borderRadius:8,height:10,marginBottom:14,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:8,width:`${analysis.ieiScore}%`,background:`linear-gradient(90deg,#0D1B3E,${TIER[analysis.ieiTier]?.bg||'#888'})`}} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
              <div style={{background:'#F4F5F7',borderRadius:10,padding:'10px 12px'}}>
                <div style={{fontSize:11,color:'#888'}}>Conversion Prob.</div>
                <div style={{fontSize:22,fontWeight:800,color:'#0D1B3E'}}>{Math.round((analysis.regProb||0)*100)}%</div>
              </div>
              <div style={{background:'#F4F5F7',borderRadius:10,padding:'10px 12px'}}>
                <div style={{fontSize:11,color:'#888'}}>Framework</div>
                <div style={{fontSize:13,fontWeight:700,color:'#0D1B3E'}}>47-Signal Pharma</div>
              </div>
            </div>
            <div style={{background:analysis.ieiTier==='T1'?'#E8F5E9':analysis.ieiTier==='T2'?'#FFF3E0':analysis.ieiTier==='T3'?'#E3F2FD':'#F5F5F5',borderRadius:10,padding:'12px 14px'}}>
              <div style={{fontSize:13,fontWeight:700,color:'#333',marginBottom:4}}>{TIER[analysis.ieiTier]?.text}</div>
              <div style={{fontSize:12,color:'#555',lineHeight:1.55}}>{TIER[analysis.ieiTier]?.body}</div>
            </div>
          </div>
        )}

        {/* ── Intelligence Brief button ── */}
        {analysis && !briefing?.synthesised_intent && (
          <button onClick={runBriefing} disabled={briefing2} style={{width:'100%',padding:'16px 20px',background:briefing2?'#8899AA':'#1A3A6B',color:'white',border:'none',borderRadius:14,fontSize:16,fontWeight:700,cursor:briefing2?'default':'pointer',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {briefing2?<><span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>⏳</span> Generating Intelligence Brief…</>:<>🔍 Intelligence Brief</>}
          </button>
        )}
        {briefError && <div style={{background:'#fff0f0',border:'1px solid #ffcccc',borderRadius:10,padding:'12px 14px',color:'#c00',marginBottom:12,fontSize:13}}>{briefError}</div>}

        {/* ── Intelligence Brief result ── */}
        {briefing?.synthesised_intent && (
          <>
            {/* Synthesised Intent */}
            <div style={{background:'#0D1B3E',borderRadius:14,padding:'16px',marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:8}}>Synthesised Intent</div>
              <div style={{fontSize:14,color:'white',lineHeight:1.65}}>{briefing.synthesised_intent}</div>
            </div>

            {/* Professional Profile */}
            {briefing.professional_profile?.length > 0 && (
              <div style={{background:'white',borderRadius:14,padding:'16px',marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#6B4FBB',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:10}}>Professional Profile</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {briefing.professional_profile.map((sig,i)=>(
                    <div key={i} style={{background:'#F3F0FB',borderRadius:8,padding:'8px 12px',fontSize:13,color:'#3D2A6E'}}>{sig}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Exhibitor Brief */}
            {briefing.exhibitor_brief && (
              <div style={{background:'white',borderRadius:14,padding:'16px',marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#1A6B4B',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:10}}>Exhibitor Brief</div>
                {briefing.exhibitor_brief.context && (
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:'#888',marginBottom:3}}>Context</div>
                    <div style={{fontSize:13,color:'#333',lineHeight:1.5}}>{briefing.exhibitor_brief.context}</div>
                  </div>
                )}
                {briefing.exhibitor_brief.what_they_want && (
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:'#888',marginBottom:3}}>What They Want</div>
                    <div style={{fontSize:13,color:'#333',lineHeight:1.5}}>{briefing.exhibitor_brief.what_they_want}</div>
                  </div>
                )}
                {briefing.exhibitor_brief.opening_line && (
                  <div style={{background:'#E8F5EE',borderRadius:10,padding:'10px 12px'}}>
                    <div style={{fontSize:11,color:'#1A6B4B',fontWeight:700,marginBottom:3}}>💬 Opening Line</div>
                    <div style={{fontSize:13,color:'#1A3A2A',lineHeight:1.5,fontStyle:'italic'}}>"{briefing.exhibitor_brief.opening_line}"</div>
                  </div>
                )}
              </div>
            )}

            <button onClick={()=>{setBriefing(null);runBriefing()}} style={{width:'100%',padding:'11px',background:'none',border:'1.5px solid #1A3A6B',color:'#1A3A6B',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer',marginBottom:12}}>
              🔍 Re-run Intelligence Brief
            </button>
          </>
        )}

        {/* Notes */}
        {scan.notes && (
          <div style={{background:'white',borderRadius:14,padding:'14px 16px',marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
            <div style={{fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Notes</div>
            <div style={{fontSize:14,color:'#333',lineHeight:1.55}}>{scan.notes}</div>
          </div>
        )}

        {scan.raw_contact && (
          <div style={{background:'white',borderRadius:14,padding:'14px 16px',marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
            <div style={{fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Scanned Text</div>
            <div style={{fontSize:12,color:'#666',lineHeight:1.6,fontFamily:'monospace',whiteSpace:'pre-wrap'}}>{typeof scan.raw_contact === "string" ? scan.raw_contact : JSON.stringify(scan.raw_contact, null, 2)}</div>
          </div>
        )}

      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
