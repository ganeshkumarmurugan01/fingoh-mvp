import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import fingohLogo from '../assets/fingoh-logo.png'

export default function Home() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [eventName, setEventName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name = user.email.split('@')[0]
        setUserName(name.charAt(0).toUpperCase() + name.slice(1))
      }
    })
    supabase.auth.getUser().then(({ data: { user } }) => { supabase.from('user_profiles').select('event_name').eq('id', user.id).single().then(({ data }) => {
      if (data?.event_name) setEventName(data.event_name)}) }
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <>
      <style>{`
        :root {
          --navy:#0D1B3E; --blue:#2563EB;
          --border:#E5E7EB; --surface:#FFFFFF; --bg:#F8FAFC; --text:#111827;
          --radius:12px; --radius-lg:16px; --shadow-sm:0 1px 3px rgba(0,0,0,.06);
          --shadow:0 4px 12px rgba(0,0,0,.08);
        }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:var(--bg); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
        #home-shell { max-width:480px; margin:0 auto; min-height:100dvh; display:flex; flex-direction:column; background:var(--bg); }
        .home-header { background:var(--navy); padding:20px 20px 28px; }
        .home-logo { margin-bottom:16px; }
        .home-logo img { height:28px; width:auto; filter:brightness(0) invert(1); }
        .home-greeting { color:rgba(255,255,255,0.6); font-size:13px; margin-bottom:2px; }
        .home-title { color:white; font-size:22px; font-weight:700; }
        .event-badge { background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15); border-radius:20px; padding:6px 14px; display:inline-flex; align-items:center; gap:6px; margin-top:12px; }
        .event-dot { width:6px; height:6px; background:#60A5FA; border-radius:50%; animation:pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .event-name { color:rgba(255,255,255,0.85); font-size:12px; font-weight:600; }
        .home-body { flex:1; padding:24px 20px; display:flex; flex-direction:column; gap:12px; }
        .section-label { font-size:11px; font-weight:700; color:#9CA3AF; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:4px; margin-top:4px; }
        .action-card { background:var(--surface); border-radius:var(--radius-lg); border:1.5px solid var(--border); padding:18px 16px; display:flex; align-items:center; gap:14px; cursor:pointer; transition:all 0.15s; box-shadow:var(--shadow-sm); }
        .action-card:active { transform:scale(0.98); box-shadow:var(--shadow); }
        .action-icon { width:48px; height:48px; border-radius:13px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
        .action-text { flex:1; }
        .action-title { color:var(--text); font-size:15px; font-weight:700; margin-bottom:2px; }
        .action-desc { color:#6B7280; font-size:12px; line-height:1.4; }
        .action-arrow { color:#D1D5DB; font-size:20px; }
        .action-card.settings { border-style:dashed; }
        .home-footer { padding:16px 20px 32px; }
        .signout-btn { width:100%; background:none; border:1.5px solid var(--border); color:#9CA3AF; padding:12px; border-radius:var(--radius); font-size:14px; font-weight:500; cursor:pointer; transition:all 0.15s; }
        .signout-btn:active { background:#F3F4F6; }
      `}</style>
      <div id="home-shell">
        <div className="home-header">
          <div className="home-logo">
            <img src={fingohLogo} alt="Fingoh" />
          </div>
          <div className="home-greeting">Welcome back, {userName}</div>
          <div className="home-title">Intent Intelligence</div>
          {eventName && <div className="event-badge">
            <div className="event-dot" />
            <div className="event-name">{eventName}</div></div>}
          </div>
        </div>

        <div className="home-body">
          <div className="section-label">Capture</div>

          <div className="action-card" onClick={() => navigate('/scan')}>
            <div className="action-icon" style={{ background:'#EFF6FF' }}>📷</div>
            <div className="action-text">
              <div className="action-title">Scan a Card</div>
              <div className="action-desc">Capture a business card and get instant IEI score + buying signals</div>
            </div>
            <div className="action-arrow">›</div>
          </div>

          <div className="action-card" onClick={() => navigate('/scans')}>
            <div className="action-icon" style={{ background:'#F0FDF4' }}>📋</div>
            <div className="action-text">
              <div className="action-title">My Leads</div>
              <div className="action-desc">Review all scanned contacts, scores, and conversation insights</div>
            </div>
            <div className="action-arrow">›</div>
          </div>

          <div className="section-label" style={{ marginTop:'8px' }}>Configuration</div>

          <div className="action-card settings" onClick={() => navigate('/setup')}>
            <div className="action-icon" style={{ background:'#F5F3FF' }}>⚙️</div>
            <div className="action-text">
              <div className="action-title">Event & ICP Setup</div>
              <div className="action-desc">Configure event, ICP profile, exhibitor intent and product brochures</div>
            </div>
            <div className="action-arrow">›</div>
          </div>
        </div>

        <div className="home-footer">
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>
    </>
  )
}
