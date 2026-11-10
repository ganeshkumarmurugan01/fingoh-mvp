import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const API = 'https://api.fingoh.ai'

const SCORE_COLOR = { 1:'#94A3B8', 2:'#64748B', 3:'#EAB308', 4:'#3B82F6', 5:'#16A34A' }
const SCORE_LABEL = { 1:'Pass-through', 2:'Polite interest', 3:'Engaged', 4:'Strong evaluator', 5:'Active buyer' }
const SCORE_BG    = { 1:'#F1F5F9', 2:'#F1F5F9', 3:'#FEF9C3', 4:'#EFF6FF', 5:'#F0FDF4' }
const SCORE_DESC  = {
  1: 'Just browsing. Low purchase intent, unlikely to convert.',
  2: 'Acknowledged your booth but showed no strong buying signals.',
  3: 'Showed genuine interest. Worth a follow-up.',
  4: 'Actively evaluating. High conversion potential.',
  5: 'Ready to buy or already in process. Prioritise immediately.'
}

const QUALITY_TYPES = ['API Supplier', 'Formulation', 'CDMO', 'Distributor', 'Innovator', 'Regulator', 'Investor', 'Competitor']

export default function Result() {
  const { scanId } = useParams()
  const navigate = useNavigate()
  const [scan, setScan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Signal logging state
  const [manualScore, setManualScore] = useState(null)
  const [qualityTypes, setQualityTypes] = useState([])
  const [toggles, setToggles] = useState({ return_visit: false, demo_attended: false, badge_scanned: false, meeting_booked: false })
  const [notes, setNotes] = useState('')
  const [urgency, setUrgency] = useState('')

  useEffect(() => {
    fetchScan()
  }, [scanId])

  const fetchScan = async () => {
    const { data, error } = await supabase.from('scans').select('*').eq('id', scanId).single()
    if (!error && data) {
      setScan(data)
      setManualScore(data.manual_score || data.iei_score || null)
      setQualityTypes(data.quality_types || [])
      setToggles(data.toggles || { return_visit: false, demo_attended: false, badge_scanned: false, meeting_booked: false })
      setNotes(data.notes || '')
      setUrgency(data.urgency || '')
    }
    setLoading(false)
  }

  const toggleQuality = (t) => setQualityTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  const toggleSignal = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('scans').update({
      manual_score: manualScore,
      quality_types: qualityTypes,
      toggles,
      notes,
      urgency,
      updated_at: new Date().toISOString()
    }).eq('id', scanId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return (
    <div style={{ minHeight:'100dvh', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', color:'#9CA3AF', fontFamily:'system-ui' }}>
      Loading...
    </div>
  )

  if (!scan) return (
    <div style={{ minHeight:'100dvh', background:'#F8FAFC', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px', fontFamily:'system-ui' }}>
      <div style={{ fontSize:'40px' }}>🔍</div>
      <div style={{ color:'#6B7280', fontSize:'15px' }}>Lead not found</div>
      <button onClick={() => navigate('/scans')} style={{ background:'#2563EB', color:'white', border:'none', padding:'10px 20px', borderRadius:'10px', fontSize:'14px', cursor:'pointer' }}>Back to Leads</button>
    </div>
  )

  const score = manualScore || scan.iei_score || 0
  const color = SCORE_COLOR[score] || '#94A3B8'
  const bg = SCORE_BG[score] || '#F1F5F9'
  const aiAnalysis = scan.ai_analysis || {}

  return (
    <>
      <style>{`
        :root {
          --navy:#0D1B3E; --blue:#2563EB; --green:#16A34A;
          --border:#E5E7EB; --surface:#FFFFFF; --bg:#F8FAFC; --text:#111827;
          --radius:12px; --radius-lg:16px; --shadow-sm:0 1px 3px rgba(0,0,0,.06);
        }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:var(--bg); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
        #result-shell { max-width:480px; margin:0 auto; min-height:100dvh; display:flex; flex-direction:column; background:var(--bg); }
        .result-header { background:var(--navy); padding:16px 20px; display:flex; align-items:center; gap:12px; }
        .back-btn { background:rgba(255,255,255,0.1); border:none; color:white; width:36px; height:36px; border-radius:10px; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .header-name { color:white; font-size:16px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .header-company { color:rgba(255,255,255,0.5); font-size:12px; margin-top:2px; }
        .result-body { flex:1; padding:16px 20px; display:flex; flex-direction:column; gap:14px; padding-bottom:100px; }
        .section-card { background:var(--surface); border-radius:var(--radius-lg); border:1.5px solid var(--border); padding:16px; box-shadow:var(--shadow-sm); }
        .section-title { font-size:11px; font-weight:700; color:#9CA3AF; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:12px; }
        .score-hero { display:flex; align-items:center; gap:16px; }
        .score-circle { width:72px; height:72px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:30px; font-weight:900; flex-shrink:0; }
        .score-info { flex:1; }
        .score-tier { font-size:18px; font-weight:800; color:var(--text); }
        .score-desc { font-size:12px; color:#6B7280; margin-top:4px; line-height:1.4; }
        .score-grid { display:flex; gap:6px; margin-top:14px; }
        .score-btn { flex:1; height:40px; border-radius:10px; border:2px solid transparent; font-size:16px; font-weight:800; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; justify-content:center; }
        .contact-row { display:flex; flex-direction:column; gap:8px; }
        .contact-field { display:flex; gap:10px; align-items:flex-start; }
        .contact-icon { width:20px; color:#9CA3AF; font-size:14px; flex-shrink:0; margin-top:1px; }
        .contact-val { color:var(--text); font-size:13px; line-height:1.4; }
        .contact-val.muted { color:#9CA3AF; }
        .chip-row { display:flex; flex-wrap:wrap; gap:6px; }
        .quality-chip { padding:6px 12px; border-radius:20px; border:1.5px solid var(--border); font-size:12px; font-weight:600; color:#6B7280; cursor:pointer; transition:all 0.15s; background:var(--bg); }
        .quality-chip.active { background:#EFF6FF; border-color:#93C5FD; color:#1D4ED8; }
        .toggle-list { display:flex; flex-direction:column; gap:10px; }
        .toggle-row { display:flex; align-items:center; justify-content:space-between; }
        .toggle-label { font-size:14px; color:var(--text); font-weight:500; }
        .toggle-switch { position:relative; width:44px; height:24px; }
        .toggle-switch input { opacity:0; width:0; height:0; }
        .toggle-track { position:absolute; cursor:pointer; inset:0; border-radius:12px; transition:0.2s; }
        .toggle-track::before { content:''; position:absolute; width:18px; height:18px; left:3px; bottom:3px; border-radius:50%; background:white; transition:0.2s; }
        input:checked + .toggle-track::before { transform:translateX(20px); }
        .urgency-row { display:flex; gap:6px; }
        .urgency-btn { flex:1; padding:8px 4px; border-radius:10px; border:1.5px solid var(--border); font-size:11px; font-weight:600; color:#6B7280; cursor:pointer; text-align:center; transition:all 0.15s; background:var(--bg); }
        .urgency-btn.active { background:#FEF9C3; border-color:#FDE047; color:#854D0E; }
        .notes-input { width:100%; border:1.5px solid var(--border); border-radius:10px; padding:10px 12px; font-size:13px; color:var(--text); resize:none; outline:none; font-family:inherit; background:var(--bg); line-height:1.5; }
        .notes-input:focus { border-color:#93C5FD; background:white; }
        .ai-section { display:flex; flex-direction:column; gap:10px; }
        .ai-block { border-radius:10px; padding:12px; }
        .ai-block-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px; }
        .ai-items { display:flex; flex-direction:column; gap:4px; }
        .ai-item { font-size:13px; line-height:1.4; padding-left:14px; position:relative; }
        .ai-item::before { content:'•'; position:absolute; left:0; }
        .save-bar { position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; padding:12px 20px; background:white; border-top:1px solid var(--border); }
        .save-btn { width:100%; background:var(--green); color:white; border:none; padding:14px; border-radius:var(--radius); font-size:15px; font-weight:700; cursor:pointer; transition:all 0.15s; }
        .save-btn:disabled { opacity:0.6; }
        .save-btn.saved { background:#059669; }
      `}</style>

      <div id="result-shell">
        <div className="result-header">
          <button className="back-btn" onClick={() => navigate('/scans')}>‹</button>
          <div>
            <div className="header-name">{scan.name || 'Unknown Contact'}</div>
            <div className="header-company">{[scan.designation, scan.company].filter(Boolean).join(' · ')}</div>
          </div>
        </div>

        <div className="result-body">

          {/* IEI Score */}
          <div className="section-card">
            <div className="section-title">IEI Score</div>
            <div className="score-hero">
              <div className="score-circle" style={{ background: bg, color }}>
                {score || '?'}
              </div>
              <div className="score-info">
                <div className="score-tier" style={{ color }}>{SCORE_LABEL[score] || 'Unscored'}</div>
                <div className="score-desc">{SCORE_DESC[score] || 'Score this lead using the grid below.'}</div>
              </div>
            </div>
            <div className="score-grid">
              {[1,2,3,4,5].map(s => (
                <button key={s} className="score-btn"
                  onClick={() => setManualScore(s)}
                  style={{
                    background: manualScore === s ? SCORE_BG[s] : '#F8FAFC',
                    borderColor: manualScore === s ? SCORE_COLOR[s] : '#E5E7EB',
                    color: SCORE_COLOR[s]
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="section-card">
            <div className="section-title">Contact</div>
            <div className="contact-row">
              {scan.email && <div className="contact-field"><span className="contact-icon">✉</span><span className="contact-val">{scan.email}</span></div>}
              {scan.phone && <div className="contact-field"><span className="contact-icon">📞</span><span className="contact-val">{scan.phone}</span></div>}
              {scan.city && <div className="contact-field"><span className="contact-icon">📍</span><span className="contact-val">{[scan.city, scan.country].filter(Boolean).join(', ')}</span></div>}
              {!scan.email && !scan.phone && <div className="contact-field"><span className="contact-val muted">No contact info captured</span></div>}
            </div>
          </div>

          {/* Quality Type */}
          <div className="section-card">
            <div className="section-title">Customer Type</div>
            <div className="chip-row">
              {QUALITY_TYPES.map(t => (
                <button key={t} className={`quality-chip ${qualityTypes.includes(t) ? 'active' : ''}`} onClick={() => toggleQuality(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Signals / Toggles */}
          <div className="section-card">
            <div className="section-title">Conversation Signals</div>
            <div className="toggle-list">
              {[
                { key:'return_visit', label:'🔄 Return visit' },
                { key:'demo_attended', label:'🖥 Demo attended' },
                { key:'badge_scanned', label:'🏷 Badge scanned' },
                { key:'meeting_booked', label:'📅 Meeting booked' }
              ].map(({ key, label }) => (
                <div key={key} className="toggle-row">
                  <span className="toggle-label">{label}</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={toggles[key] || false} onChange={() => toggleSignal(key)} />
                    <span className="toggle-track" style={{ background: toggles[key] ? '#16A34A' : '#D1D5DB' }} />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div className="section-card">
            <div className="section-title">Purchase Urgency</div>
            <div className="urgency-row">
              {['Immediate', 'Q1–Q2', 'H2 2025', 'No timeline'].map(u => (
                <button key={u} className={`urgency-btn ${urgency === u ? 'active' : ''}`} onClick={() => setUrgency(urgency === u ? '' : u)}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="section-card">
            <div className="section-title">Notes</div>
            <textarea
              className="notes-input"
              rows={4}
              placeholder="Key takeaways from the conversation, specific products discussed, follow-up actions..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* AI Analysis */}
          {(aiAnalysis.buying_signals?.length > 0 || aiAnalysis.red_flags?.length > 0 || aiAnalysis.follow_up_hook) && (
            <div className="section-card">
              <div className="section-title">AI Analysis</div>
              <div className="ai-section">
                {aiAnalysis.buying_signals?.length > 0 && (
                  <div className="ai-block" style={{ background:'#F0FDF4' }}>
                    <div className="ai-block-title" style={{ color:'#15803D' }}>✅ Buying Signals</div>
                    <div className="ai-items">
                      {aiAnalysis.buying_signals.map((s, i) => <div key={i} className="ai-item" style={{ color:'#166534' }}>{s}</div>)}
                    </div>
                  </div>
                )}
                {aiAnalysis.red_flags?.length > 0 && (
                  <div className="ai-block" style={{ background:'#FFF1F2' }}>
                    <div className="ai-block-title" style={{ color:'#B91C1C' }}>⚠️ Red Flags</div>
                    <div className="ai-items">
                      {aiAnalysis.red_flags.map((f, i) => <div key={i} className="ai-item" style={{ color:'#991B1B' }}>{f}</div>)}
                    </div>
                  </div>
                )}
                {aiAnalysis.follow_up_hook && (
                  <div className="ai-block" style={{ background:'#EFF6FF' }}>
                    <div className="ai-block-title" style={{ color:'#1D4ED8' }}>💡 Follow-up Hook</div>
                    <div style={{ color:'#1E40AF', fontSize:'13px', lineHeight:'1.5' }}>{aiAnalysis.follow_up_hook}</div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        <div className="save-bar">
          <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Lead Insights'}
          </button>
        </div>
      </div>
    </>
  )
}
