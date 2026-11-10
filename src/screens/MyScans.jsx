import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SCORE_COLOR = { 1:'#94A3B8', 2:'#64748B', 3:'#EAB308', 4:'#3B82F6', 5:'#16A34A' }
const SCORE_LABEL = { 1:'Pass-through', 2:'Polite interest', 3:'Engaged', 4:'Strong evaluator', 5:'Active buyer' }
const SCORE_BG    = { 1:'#F1F5F9', 2:'#F1F5F9', 3:'#FEF9C3', 4:'#EFF6FF', 5:'#F0FDF4' }

export default function MyScans() {
  const navigate = useNavigate()
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchScans()
  }, [])

  const fetchScans = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setScans(data || [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? scans : scans.filter(s => s.iei_score >= parseInt(filter))
  const sorted = [...filtered].sort((a, b) => (b.iei_score || 0) - (a.iei_score || 0))

  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <>
      <style>{`
        :root {
          --navy:#0D1B3E; --blue:#2563EB; --green:#16A34A;
          --border:#E5E7EB; --surface:#FFFFFF; --bg:#F8FAFC; --text:#111827;
          --radius:12px; --radius-lg:16px;
          --shadow-sm:0 1px 3px rgba(0,0,0,.06);
        }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:var(--bg); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
        #scans-shell { max-width:480px; margin:0 auto; min-height:100dvh; display:flex; flex-direction:column; background:var(--bg); }
        .scans-header { background:var(--navy); padding:16px 20px 20px; display:flex; align-items:center; gap:12px; }
        .back-btn { background:rgba(255,255,255,0.1); border:none; color:white; width:36px; height:36px; border-radius:10px; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .header-info { flex:1; }
        .header-title { color:white; font-size:17px; font-weight:700; }
        .header-sub { color:rgba(255,255,255,0.5); font-size:12px; margin-top:2px; }
        .filter-row { background:var(--navy); padding:0 20px 16px; display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; }
        .filter-row::-webkit-scrollbar { display:none; }
        .filter-chip { border:1.5px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.7); padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; transition:all 0.15s; }
        .filter-chip.active { background:white; color:var(--navy); border-color:white; }
        .scans-body { flex:1; padding:16px 20px; display:flex; flex-direction:column; gap:12px; }
        .lead-card { background:var(--surface); border-radius:var(--radius-lg); border:1.5px solid var(--border); padding:16px; display:flex; align-items:center; gap:14px; cursor:pointer; transition:all 0.15s; box-shadow:var(--shadow-sm); }
        .lead-card:active { transform:scale(0.98); }
        .score-badge { width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; flex-shrink:0; }
        .lead-info { flex:1; min-width:0; }
        .lead-name { color:var(--text); font-size:15px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .lead-company { color:#6B7280; font-size:12px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .lead-meta { display:flex; align-items:center; gap:6px; margin-top:6px; }
        .tier-chip { font-size:11px; font-weight:600; padding:2px 8px; border-radius:10px; }
        .lead-time { color:#9CA3AF; font-size:11px; }
        .lead-arrow { color:#D1D5DB; font-size:18px; }
        .empty-state { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:40px 20px; }
        .empty-icon { font-size:48px; opacity:0.4; }
        .empty-title { color:#6B7280; font-size:16px; font-weight:600; }
        .empty-desc { color:#9CA3AF; font-size:13px; text-align:center; line-height:1.5; }
        .scan-now-btn { background:var(--blue); color:white; border:none; padding:12px 24px; border-radius:var(--radius); font-size:14px; font-weight:600; cursor:pointer; margin-top:8px; }
        .loading-state { flex:1; display:flex; align-items:center; justify-content:center; color:#9CA3AF; font-size:14px; }
        .stats-row { display:flex; gap:8px; margin-bottom:4px; }
        .stat-pill { flex:1; background:var(--surface); border:1.5px solid var(--border); border-radius:10px; padding:10px 12px; text-align:center; }
        .stat-num { font-size:20px; font-weight:800; color:var(--text); }
        .stat-lbl { font-size:11px; color:#9CA3AF; margin-top:2px; }
      `}</style>
      <div id="scans-shell">
        <div className="scans-header">
          <button className="back-btn" onClick={() => navigate('/home')}>‹</button>
          <div className="header-info">
            <div className="header-title">My Leads</div>
            <div className="header-sub">{scans.length} contact{scans.length !== 1 ? 's' : ''} scanned</div>
          </div>
        </div>

        <div className="filter-row">
          {['all','3','4','5'].map(f => (
            <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === '3' ? '⭐ Engaged+' : f === '4' ? '🔵 Strong+' : '🟢 Active buyers'}
            </button>
          ))}
        </div>

        <div className="scans-body">
          {loading ? (
            <div className="loading-state">Loading leads...</div>
          ) : scans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No leads yet</div>
              <div className="empty-desc">Scan a business card to capture your first lead and get an IEI score.</div>
              <button className="scan-now-btn" onClick={() => navigate('/scan')}>Scan a Card</button>
            </div>
          ) : (
            <>
              <div className="stats-row">
                <div className="stat-pill">
                  <div className="stat-num">{scans.filter(s => s.iei_score >= 4).length}</div>
                  <div className="stat-lbl">Hot leads</div>
                </div>
                <div className="stat-pill">
                  <div className="stat-num">{scans.filter(s => s.iei_score >= 3).length}</div>
                  <div className="stat-lbl">Engaged</div>
                </div>
                <div className="stat-pill">
                  <div className="stat-num" style={{ color:'#EAB308' }}>
                    {scans.length > 0 ? (scans.reduce((a,s) => a + (s.iei_score||0), 0) / scans.length).toFixed(1) : '—'}
                  </div>
                  <div className="stat-lbl">Avg score</div>
                </div>
              </div>

              {sorted.map(scan => {
                const score = scan.iei_score || 0
                const color = SCORE_COLOR[score] || '#94A3B8'
                const bg = SCORE_BG[score] || '#F1F5F9'
                const label = SCORE_LABEL[score] || 'Unscored'
                return (
                  <div key={scan.id} className="lead-card" onClick={() => navigate(`/result/${scan.id}`)}>
                    <div className="score-badge" style={{ background: bg, color }}>
                      {score || '?'}
                    </div>
                    <div className="lead-info">
                      <div className="lead-name">{scan.name || 'Unknown'}</div>
                      <div className="lead-company">{[scan.designation, scan.company].filter(Boolean).join(' · ')}</div>
                      <div className="lead-meta">
                        <span className="tier-chip" style={{ background: bg, color }}>{label}</span>
                        <span className="lead-time">{timeAgo(scan.created_at)}</span>
                      </div>
                    </div>
                    <div className="lead-arrow">›</div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </>
  )
}
