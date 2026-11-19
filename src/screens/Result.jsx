import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const PHARMA_SCORER_URL = 'https://ganeshkumarmurugan01--fingoh-scorer-pharma-scorer-score.modal.run'
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const CUSTOMER_TYPES = ['API Supplier','Formulation','CDMO','Distributor','Innovator','Regulator','Investor','Competitor']

const MANUAL_TIERS = {
  1:{label:'Cold',     color:'#9E9E9E', bg:'#F5F5F5', desc:'No clear interest shown. Add to long-term nurture.'},
  2:{label:'Potential',color:'#9C27B0', bg:'#F3E5F5', desc:'Some curiosity but needs more engagement.'},
  3:{label:'Engaged',  color:'#FF9800', bg:'#FFF3E0', desc:'Showed genuine interest. Worth a follow-up.'},
  4:{label:'Strong',   color:'#2196F3', bg:'#E3F2FD', desc:'Strong signals. Prioritise for follow-up.'},
  5:{label:'Hot',      color:'#00C853', bg:'#E8F5E9', desc:'High-priority lead. Act immediately.'},
}

const PHARMA_TIER = {
  T1:{bg:'#00C853',label:'🔥 Hot',  text:'High-Priority — Act Now',  body:'Strong pharma fit & senior decision-maker. Prioritise for immediate meeting or proposal.'},
  T2:{bg:'#FF9800',label:'🌡 Warm', text:'Follow Up Within 24 hrs',   body:'Good potential. Send personalised follow-up with relevant pharma case studies.'},
  T3:{bg:'#2196F3',label:'❄️ Cool', text:'Nurture Required',          body:'Some interest but limited buying signals. Add to nurture sequence.'},
  T4:{bg:'#9E9E9E',label:'🧊 Cold', text:'Long-term Nurture',         body:'Low immediate potential. Keep in database for future campaigns.'},
}

export default function Result() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [scan, setScan]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [manualScore, setManual]  = useState(3)
  const [selTypes, setSelTypes]   = useState([])
  const [sigs, setSigs]           = useState({returnVisit:false,demoAttended:false,badgeScanned:false,meetingBooked:false})
  const [urgency, setUrgency]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saveOk, setSaveOk]       = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis]   = useState(null)
  const [aiError, setAiError]     = useState(null)
  const [briefing2, setBriefing2] = useState(false)
  const [briefing, setBriefing]   = useState(null)
  const [briefError, setBriefError] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('scans').select('*').eq('id', id).single()
      if (data) {
        setScan(data)
        if (data.iei_score >= 1 && data.iei_score <= 5) setManual(data.iei_score)
        if (Array.isArray(data.quality_types)) setSelTypes(data.quality_types)
        if (data.signals && typeof data.signals === 'object' && !Array.isArray(data.signals)) setSigs(s=>({...s,...data.signals}))
        if (data.urgency) setUrgency(data.urgency)
        if (data.ai_analysis?.ieiScore) setAnalysis(data.ai_analysis)
        if (data.ai_analysis?.synthesised_intent) setBriefing(data.ai_analysis)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const toggleType = t => setSelTypes(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t])
  const toggleSig  = k => setSigs(p => ({...p,[k]:!p[k]}))

  const handleSave = async () => {
    setSaving(true); setSaveOk(false)
    await supabase.from('scans').update({
      iei_score: manualScore,
      tier: manualScore >= 4 ? 'T1' : manualScore === 3 ? 'T2' : manualScore === 2 ? 'T3' : 'T4',
      quality_types: selTypes,
      signals: sigs,
      urgency,
    }).eq('id', id)
    setSaving(false); setSaveOk(true)
    setTimeout(() => setSaveOk(false), 2000)
  }

  const runAnalysis = async () => {
    setAnalyzing(true); setAiError(null)
    try {
      const visitor = {
        job_title: scan.contact_title||'',
        company: scan.contact_company||'',
        country: scan.contact_country||scan.contact_city||'',
        primary_reason: scan.notes||'',
        categories_interest: selTypes.join(', '),
        profile_completeness: [scan.contact_name,scan.contact_title,scan.contact_company,scan.contact_email,scan.contact_phone].filter(Boolean).length / 5,
        return_visit: sigs.returnVisit ? 1 : 0,
        demo_attended: sigs.demoAttended ? 1 : 0,
        badge_scanned: sigs.badgeScanned ? 1 : 0,
        meeting_booked: sigs.meetingBooked ? 1 : 0,
        urgency_score: urgency === 'immediate' ? 3 : urgency === 'this_quarter' ? 2 : urgency === 'next_year' ? 1 : 0,
      }
      const res = await fetch(PHARMA_SCORER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitors:[visitor]})})
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const result = json.scores?.[0]
      if (!result) throw new Error('Empty response')
      setAnalysis(result)
      const merged = {...(scan.ai_analysis||{}), ...result}
      await supabase.from('scans').update({iei_score: result.ieiScore, tier: result.ieiTier, ai_analysis: merged}).eq('id', id)
    } catch(err) { setAiError('Scorer failed: '+err.message) }
    setAnalyzing(false)
  }

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
- Categories of interest: ${selTypes.join(', ')||''}
- Conversation signals: ${Object.entries(sigs).filter(([,v])=>v).map(([k])=>k).join(', ')||'none'}

Use web search to briefly research this person and their company. Respond ONLY with valid JSON (no markdown):
{
  "synthesised_intent": "2-3 sentences on what this person is likely attending for",
  "professional_profile": ["signal 1","signal 2","signal 3","signal 4"],
  "exhibitor_brief": {
    "context": "1 sentence on company context",
    "what_they_want": "1 sentence on their sourcing need",
    "opening_line": "A strong opening line for your booth team"
  }
}`
      const res = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','content-type':'application/json','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,tools:[{type:'web_search_20250305',name:'web_search'}],messages:[{role:'user',content:prompt}]}),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      let text = ''
      for (const block of data.content||[]) { if (block.type==='text'){text=block.text;break} }
      text = text.trim().replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim()
      const result = JSON.parse(text)
      setBriefing(result)
      const merged = {...(analysis||{}), ...result}
      await supabase.from('scans').update({ai_analysis:merged}).eq('id',id)
    } catch(err) { setBriefError('Intelligence brief failed: '+err.message) }
    setBriefing2(false)
  }

  if (loading) return <div style={{background:'#0D1B3E',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>Loading…</div>
  if (!scan)   return <div style={{background:'#0D1B3E',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>Lead not found</div>

  const tier = MANUAL_TIERS[manualScore] || MANUAL_TIERS[3]
  const pt   = analysis ? (PHARMA_TIER[analysis.ieiTier]||PHARMA_TIER.T4) : null

  return (
    <div style={{background:'#E8EAF0',minHeight:'100vh',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif',display:'flex',flexDirection:'column',alignItems:'center'}}>
      <div style={{width:'100%',maxWidth:430,background:'#F4F5F7',minHeight:'100vh',paddingBottom:40,position:'relative'}}>

      {/* Header */}
      <div style={{background:'#0D1B3E',padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>navigate('/scans')} style={{background:'rgba(255,255,255,0.12)',border:'none',color:'white',width:34,height:34,borderRadius:8,fontSize:18,cursor:'pointer',flexShrink:0}}>‹</button>
        <div style={{color:'white',fontWeight:800,fontSize:17}}>{scan.contact_name||'Unknown'}</div>
      </div>

      <div style={{padding:12,display:'flex',flexDirection:'column',gap:10}}>

        {/* IEI Score card */}
        <div style={{background:'white',borderRadius:14,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
          <div style={{fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:12}}>IEI Score</div>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
            <div style={{width:60,height:60,borderRadius:'50%',background:tier.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{fontSize:26,fontWeight:900,color:tier.color}}>{manualScore}</span>
            </div>
            <div>
              <div style={{fontSize:18,fontWeight:800,color:tier.color}}>{tier.label}</div>
              <div style={{fontSize:13,color:'#666',lineHeight:1.4,marginTop:2}}>{tier.desc}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            {[1,2,3,4,5].map(n=>(
              <button key={n} onClick={()=>setManual(n)} style={{flex:1,padding:'10px 0',borderRadius:10,border:`2px solid ${manualScore===n?MANUAL_TIERS[n].color:'#E5E7EB'}`,background:manualScore===n?MANUAL_TIERS[n].bg:'white',color:manualScore===n?MANUAL_TIERS[n].color:'#999',fontWeight:700,fontSize:15,cursor:'pointer'}}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div style={{background:'white',borderRadius:14,padding:'14px 16px',boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
          <div style={{fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:8}}>Contact</div>
          {(scan.contact_email||scan.contact_phone||scan.contact_company) ? (
            <>
              {scan.contact_title && <div style={{fontSize:13,color:'#555',marginBottom:2}}>{scan.contact_title}</div>}
              {scan.contact_company && <div style={{fontSize:13,fontWeight:600,color:'#333',marginBottom:4}}>{scan.contact_company}</div>}
              {scan.contact_email && <div style={{fontSize:13,color:'#555'}}>✉ {scan.contact_email}</div>}
              {scan.contact_phone && <div style={{fontSize:13,color:'#555'}}>📞 {scan.contact_phone}</div>}
              {(scan.contact_city||scan.contact_country) && <div style={{fontSize:13,color:'#555'}}>📍 {[scan.contact_city,scan.contact_country].filter(Boolean).join(', ')}</div>}
            </>
          ) : (
            <div style={{fontSize:13,color:'#aaa'}}>No contact info captured</div>
          )}
        </div>

        {/* Customer Type */}
        <div style={{background:'white',borderRadius:14,padding:'14px 16px',boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
          <div style={{fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:10}}>Customer Type</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {CUSTOMER_TYPES.map(t=>(
              <button key={t} onClick={()=>toggleType(t)} style={{padding:'7px 14px',borderRadius:20,border:`1.5px solid ${selTypes.includes(t)?'#0D1B3E':'#E0E0E0'}`,background:selTypes.includes(t)?'#0D1B3E':'white',color:selTypes.includes(t)?'white':'#555',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Signals */}
        <div style={{background:'white',borderRadius:14,padding:'14px 16px',boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
          <div style={{fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:10}}>Conversation Signals</div>
          {[
            {key:'returnVisit',  icon:'🔄', label:'Return visit'},
            {key:'demoAttended', icon:'🖥', label:'Demo attended'},
            {key:'badgeScanned', icon:'🏷', label:'Badge scanned'},
            {key:'meetingBooked',icon:'📅', label:'Meeting booked'},
          ].map(({key,icon,label})=>(
            <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid #F3F4F6'}}>
              <span style={{fontSize:14,color:'#333'}}>{icon} {label}</span>
              <div onClick={()=>toggleSig(key)} style={{width:46,height:26,borderRadius:13,background:sigs[key]?'#0D1B3E':'#D1D5DB',cursor:'pointer',position:'relative',transition:'background .2s'}}>
                <div style={{position:'absolute',top:3,left:sigs[key]?22:3,width:20,height:20,borderRadius:'50%',background:'white',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}} />
              </div>
            </div>
          ))}
        </div>

        {/* Purchase Urgency */}
        <div style={{background:'white',borderRadius:14,padding:'14px 16px',boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
          <div style={{fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:10}}>Purchase Urgency</div>
          <div style={{display:'flex',gap:8}}>
            {[
              {val:'immediate',   label:'Immediate'},
              {val:'this_quarter',label:'This Quarter'},
              {val:'next_year',   label:'Next Year'},
            ].map(({val,label})=>(
              <button key={val} onClick={()=>setUrgency(urgency===val?null:val)} style={{flex:1,padding:'10px 4px',borderRadius:10,border:`1.5px solid ${urgency===val?'#0D1B3E':'#E0E0E0'}`,background:urgency===val?'#0D1B3E':'white',color:urgency===val?'white':'#555',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        {scan.notes && (
          <div style={{background:'white',borderRadius:14,padding:'14px 16px',boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
            <div style={{fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:6}}>Notes</div>
            <div style={{fontSize:14,color:'#333',lineHeight:1.55}}>{scan.notes}</div>
          </div>
        )}

        {/* Save button */}
        <button onClick={handleSave} disabled={saving} style={{width:'100%',padding:'15px',background:saveOk?'#16A34A':'#16A34A',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:700,cursor:'pointer',opacity:saving?0.6:1}}>
          {saving?'Saving…':saveOk?'✓ Saved!':'Save Lead Insights'}
        </button>

        {/* Deep IEI Analysis button */}
        {!analysis && (
          <button onClick={runAnalysis} disabled={analyzing} style={{width:'100%',padding:'15px',background:analyzing?'#8899AA':'#0D1B3E',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:700,cursor:analyzing?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {analyzing?<><span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>⏳</span> Running Pharma IEI Analysis…</>:<>🧬 Deep IEI Analysis</>}
          </button>
        )}
        {aiError && <div style={{background:'#fff0f0',border:'1px solid #ffcccc',borderRadius:10,padding:'12px 14px',color:'#c00',fontSize:13}}>{aiError}</div>}

        {/* Pharma IEI result */}
        {analysis && (
          <div style={{background:'white',borderRadius:14,padding:'18px 16px',boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:'#0D1B3E',textTransform:'uppercase',letterSpacing:'0.6px'}}>🧬 Pharma IEI Score</div>
              <button onClick={runAnalysis} disabled={analyzing} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:13,fontWeight:600}}>{analyzing?'⏳':'↺ Re-run'}</button>
            </div>
            <div style={{display:'flex',alignItems:'flex-end',gap:14,marginBottom:12}}>
              <div>
                <div style={{fontSize:11,color:'#888'}}>Score</div>
                <div style={{fontSize:52,fontWeight:900,color:'#0D1B3E',lineHeight:1}}>{analysis.ieiScore}</div>
                <div style={{fontSize:11,color:'#aaa'}}>out of 100</div>
              </div>
              <div style={{paddingBottom:6}}>
                <div style={{background:pt?.bg,color:'white',borderRadius:20,padding:'6px 16px',fontSize:14,fontWeight:700}}>{pt?.label}</div>
                <div style={{fontSize:11,color:'#aaa',textAlign:'center',marginTop:2}}>Tier {analysis.ieiTier}</div>
              </div>
            </div>
            <div style={{background:'#EEF0F3',borderRadius:8,height:9,marginBottom:12,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:8,width:`${analysis.ieiScore}%`,background:`linear-gradient(90deg,#0D1B3E,${pt?.bg})`}} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              <div style={{background:'#F4F5F7',borderRadius:10,padding:'10px 12px'}}>
                <div style={{fontSize:11,color:'#888'}}>Conversion Prob.</div>
                <div style={{fontSize:22,fontWeight:800,color:'#0D1B3E'}}>{Math.round((analysis.regProb||0)*100)}%</div>
              </div>
              <div style={{background:'#F4F5F7',borderRadius:10,padding:'10px 12px'}}>
                <div style={{fontSize:11,color:'#888'}}>Framework</div>
                <div style={{fontSize:12,fontWeight:700,color:'#0D1B3E'}}>47-Signal Pharma</div>
              </div>
            </div>
            <div style={{background:analysis.ieiTier==='T1'?'#E8F5E9':analysis.ieiTier==='T2'?'#FFF3E0':analysis.ieiTier==='T3'?'#E3F2FD':'#F5F5F5',borderRadius:10,padding:'12px 14px'}}>
              <div style={{fontSize:13,fontWeight:700,color:'#333',marginBottom:3}}>{pt?.text}</div>
              <div style={{fontSize:12,color:'#555',lineHeight:1.5}}>{pt?.body}</div>
            </div>
          </div>
        )}

        {/* Intelligence Brief button */}
        {analysis && !briefing?.synthesised_intent && (
          <button onClick={runBriefing} disabled={briefing2} style={{width:'100%',padding:'15px',background:briefing2?'#8899AA':'#1A3A6B',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:700,cursor:briefing2?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {briefing2?<><span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>⏳</span> Generating Intelligence Brief…</>:<>🔍 Intelligence Brief</>}
          </button>
        )}
        {briefError && <div style={{background:'#fff0f0',border:'1px solid #ffcccc',borderRadius:10,padding:'12px 14px',color:'#c00',fontSize:13}}>{briefError}</div>}

        {/* Intelligence Brief results */}
        {briefing?.synthesised_intent && (
          <>
            <div style={{background:'#0D1B3E',borderRadius:14,padding:'16px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:8}}>Synthesised Intent</div>
              <div style={{fontSize:14,color:'white',lineHeight:1.65}}>{briefing.synthesised_intent}</div>
            </div>
            {briefing.professional_profile?.length > 0 && (
              <div style={{background:'white',borderRadius:14,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#6B4FBB',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:10}}>Professional Profile</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {briefing.professional_profile.map((sig,i)=>(
                    <div key={i} style={{background:'#F3F0FB',borderRadius:8,padding:'8px 12px',fontSize:13,color:'#3D2A6E'}}>{sig}</div>
                  ))}
                </div>
              </div>
            )}
            {briefing.exhibitor_brief && (
              <div style={{background:'white',borderRadius:14,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#1A6B4B',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:10}}>Exhibitor Brief</div>
                {briefing.exhibitor_brief.context && <div style={{marginBottom:10}}><div style={{fontSize:11,color:'#888',marginBottom:3}}>Context</div><div style={{fontSize:13,color:'#333',lineHeight:1.5}}>{briefing.exhibitor_brief.context}</div></div>}
                {briefing.exhibitor_brief.what_they_want && <div style={{marginBottom:10}}><div style={{fontSize:11,color:'#888',marginBottom:3}}>What They Want</div><div style={{fontSize:13,color:'#333',lineHeight:1.5}}>{briefing.exhibitor_brief.what_they_want}</div></div>}
                {briefing.exhibitor_brief.opening_line && (
                  <div style={{background:'#E8F5EE',borderRadius:10,padding:'10px 12px'}}>
                    <div style={{fontSize:11,color:'#1A6B4B',fontWeight:700,marginBottom:3}}>💬 Opening Line</div>
                    <div style={{fontSize:13,color:'#1A3A2A',lineHeight:1.5,fontStyle:'italic'}}>"{briefing.exhibitor_brief.opening_line}"</div>
                  </div>
                )}
              </div>
            )}
            <button onClick={()=>{setBriefing(null);runBriefing()}} style={{width:'100%',padding:'11px',background:'none',border:'1.5px solid #1A3A6B',color:'#1A3A6B',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer'}}>
              🔍 Re-run Intelligence Brief
            </button>
          </>
        )}

      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}
