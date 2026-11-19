import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import fingohLogo from '../assets/fingoh-logo.png'

const PHARMA_SCORER_URL =
  'https://ganeshkumarmurugan01--fingoh-scorer-pharma-scorer-score.modal.run'

const TIER = {
  T1: { bg: '#00C853', label: '🔥 Hot',  text: 'High-Priority — Act Now',    body: 'Strong pharma fit & senior decision-maker. Prioritise for immediate meeting or proposal.' },
  T2: { bg: '#FF9800', label: '🌡 Warm', text: 'Follow Up Within 24 hrs',     body: 'Good potential. Send personalised follow-up with relevant pharma case studies.' },
  T3: { bg: '#2196F3', label: '❄️ Cool', text: 'Nurture Required',            body: 'Some interest but limited buying signals. Add to nurture sequence with educational content.' },
  T4: { bg: '#9E9E9E', label: '🧊 Cold', text: 'Long-term Nurture',           body: 'Low immediate potential. Keep in database for future campaigns.' },
}

export default function Result() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [scan, setScan]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis]   = useState(null)
  const [aiError, setAiError]     = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('scans').select('*').eq('id', id).single()
      if (!error) {
        setScan(data)
        if (data?.ai_analysis?.ieiScore) setAnalysis(data.ai_analysis)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const runAnalysis = async () => {
    setAnalyzing(true)
    setAiError(null)
    try {
      const catStr = Array.isArray(scan.quality_types)
        ? scan.quality_types.join(', ')
        : (scan.quality_types || '')

      const filled = [
        scan.contact_name, scan.contact_title,
        scan.contact_company, scan.contact_email, scan.contact_phone,
      ].filter(Boolean).length

      const visitor = {
        job_title:            scan.contact_title   || '',
        company:              scan.contact_company || '',
        country:              scan.contact_country || '',
        primary_reason:       scan.notes           || '',
        categories_interest:  catStr,
        profile_completeness: filled / 5,
        ...(scan.signals || {}),
      }

      const res = await fetch(PHARMA_SCORER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitors: [visitor] }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const result = json.scores?.[0]
      if (!result) throw new Error('Empty response')
      setAnalysis(result)

      await supabase.from('scans').update({
        ai_analysis: result,
        iei_score:   result.ieiScore,
        tier:        result.ieiTier,
      }).eq('id', scan.id)

    } catch (err) {
      setAiError('Analysis failed — ' + err.message)
    }
    setAnalyzing(false)
  }

  if (loading) return (
    <div style={{ background:'#0D1B3E', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'white', fontSize:16 }}>Loading…</div>
    </div>
  )
  if (!scan) return (
    <div style={{ background:'#0D1B3E', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'white' }}>Lead not found</div>
    </div>
  )

  const tierKey  = analysis?.ieiTier || scan.tier || 'T4'
  const tierInfo = TIER[tierKey] || TIER.T4
  const score    = analysis?.ieiScore ?? scan.iei_score

  return (
    <div style={{ background:'#F4F5F7', minHeight:'100vh', fontFamily:'system-ui,sans-serif', paddingBottom:40 }}>

      <div style={{ background:'#0D1B3E' }}>
        <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', position:'relative' }}>
          <button
            onClick={() => navigate('/scans')}
            style={{ background:'none', border:'none', color:'white', fontSize:28, cursor:'pointer', padding:0, lineHeight:1, width:36 }}
          >‹</button>
          <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)' }}>
            <img src={fingohLogo} alt="Fingoh" style={{ height:26, objectFit:'contain', filter:'brightness(0) invert(1)' }} />
          </div>
          <div style={{ width:36, marginLeft:'auto' }} />
        </div>

        <div style={{ padding:'0 20px 16px' }}>
          <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 16px' }}>
            <div style={{ color:'white', fontSize:17, fontWeight:800 }}>
              {scan.contact_name || 'Unknown Contact'}
            </div>
            <div style={{ color:'rgba(255,255,255,0.65)', fontSize:13, marginTop:2 }}>
              {[scan.contact_title, scan.contact_company].filter(Boolean).join(' · ')}
            </div>
            {scan.contact_email && (
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginTop:4 }}>✉ {scan.contact_email}</div>
            )}
            {scan.contact_phone && (
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12 }}>📞 {scan.contact_phone}</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding:16 }}>

        {score && !analysis && (
          <div style={{ background:'white', borderRadius:14, padding:'14px 16px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)', display:'flex', alignItems:'center', gap:12 }}>
            <div>
              <div style={{ fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'0.5px' }}>IEI Score</div>
              <div style={{ fontSize:38, fontWeight:900, color:'#0D1B3E', lineHeight:1 }}>{score}</div>
            </div>
            <div style={{ background:tierInfo.bg, color:'white', borderRadius:20, padding:'5px 14px', fontSize:13, fontWeight:700 }}>
              {tierInfo.label}
            </div>
          </div>
        )}

        {!analysis && (
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            style={{
              width:'100%', padding:'16px 20px',
              background: analyzing ? '#8899AA' : '#0D1B3E',
              color:'white', border:'none', borderRadius:14,
              fontSize:16, fontWeight:700,
              cursor: analyzing ? 'default' : 'pointer',
              marginBottom:12,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}
          >
            {analyzing
              ? <><span style={{ display:'inline-block', animation:'spin 1s linear infinite' }}>⏳</span> Running Pharma IEI Analysis…</>
              : <>🧬 Deep IEI Analysis</>
            }
          </button>
        )}

        {aiError && (
          <div style={{ background:'#fff0f0', border:'1px solid #ffcccc', borderRadius:10, padding:'12px 14px', color:'#c00', marginBottom:12, fontSize:13 }}>
            {aiError}
          </div>
        )}

        {analysis && (
          <div style={{ background:'white', borderRadius:14, padding:'18px 16px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#0D1B3E', textTransform:'uppercase', letterSpacing:'0.6px' }}>
                🧬 Pharma IEI Analysis
              </div>
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:13, fontWeight:600 }}
              >
                {analyzing ? '⏳' : '↺ Re-run'}
              </button>
            </div>

            <div style={{ display:'flex', alignItems:'flex-end', gap:14, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, color:'#888' }}>IEI Score</div>
                <div style={{ fontSize:52, fontWeight:900, color:'#0D1B3E', lineHeight:1 }}>{analysis.ieiScore}</div>
                <div style={{ fontSize:11, color:'#aaa' }}>out of 100</div>
              </div>
              <div style={{ paddingBottom:6 }}>
                <div style={{ background:TIER[analysis.ieiTier]?.bg||'#888', color:'white', borderRadius:20, padding:'6px 16px', fontSize:15, fontWeight:700, marginBottom:4 }}>
                  {TIER[analysis.ieiTier]?.label || analysis.ieiTierLabel}
                </div>
                <div style={{ fontSize:11, color:'#aaa', textAlign:'center' }}>Tier {analysis.ieiTier}</div>
              </div>
            </div>

            <div style={{ background:'#EEF0F3', borderRadius:8, height:10, marginBottom:14, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:8,
                width:`${analysis.ieiScore}%`,
                background:`linear-gradient(90deg,#0D1B3E,${TIER[analysis.ieiTier]?.bg||'#888'})`,
              }} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              <div style={{ background:'#F4F5F7', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:11, color:'#888' }}>Conversion Prob.</div>
                <div style={{ fontSize:22, fontWeight:800, color:'#0D1B3E' }}>
                  {Math.round((analysis.regProb||0)*100)}%
                </div>
              </div>
              <div style={{ background:'#F4F5F7', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:11, color:'#888' }}>Framework</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#0D1B3E' }}>47-Signal Pharma</div>
              </div>
            </div>

            <div style={{
              background: analysis.ieiTier==='T1'?'#E8F5E9': analysis.ieiTier==='T2'?'#FFF3E0': analysis.ieiTier==='T3'?'#E3F2FD':'#F5F5F5',
              borderRadius:10, padding:'12px 14px',
            }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#333', marginBottom:4 }}>
                {TIER[analysis.ieiTier]?.text}
              </div>
              <div style={{ fontSize:12, color:'#555', lineHeight:1.55 }}>
                {TIER[analysis.ieiTier]?.body}
              </div>
            </div>
          </div>
        )}

        {analysis && (
          <button
            onClick={() => { setAnalysis(null); setAiError(null) }}
            style={{ width:'100%', padding:'12px', background:'none', border:'1.5px solid #0D1B3E', color:'#0D1B3E', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer', marginBottom:12 }}
          >
            🧬 Re-run Deep IEI Analysis
          </button>
        )}

        {scan.notes && (
          <div style={{ background:'white', borderRadius:14, padding:'14px 16px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Notes</div>
            <div style={{ fontSize:14, color:'#333', lineHeight:1.55 }}>{scan.notes}</div>
          </div>
        )}

        {scan.raw_contact && (
          <div style={{ background:'white', borderRadius:14, padding:'14px 16px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Scanned Text</div>
            <div style={{ fontSize:12, color:'#666', lineHeight:1.6, fontFamily:'monospace', whiteSpace:'pre-wrap' }}>{scan.raw_contact}</div>
          </div>
        )}

      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
