import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Home() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserName(user.email.split('@')[0])
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
          --navy: #0D1B3E; --blue: #2563EB; --blue-light: #EFF6FF;
          --green: #16A34A; --green-light: #F0FDF4;
          --border: #E5E7EB; --surface: #FFFFFF; --bg: #F8FAFC;
          --text: #111827; --radius: 12px; --radius-lg: 16px;
          --shadow-sm: 0 1px 3px rgba(0,0,0,.06);
          --shadow: 0 4px 12px rgba(0,0,0,.08);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        #home-shell { max-width: 480px; margin: 0 auto; min-height: 100dvh; display: flex; flex-direction: column; background: var(--bg); }
        .home-header { background: var(--navy); padding: 20px 20px 28px; }
        .home-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .home-logo-mark { width: 32px; height: 32px; background: #1E40AF; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 16px; }
        .home-logo-text { color: white; font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
        .home-logo-text span { color: #60A5FA; }
        .home-greeting { color: rgba(255,255,255,0.6); font-size: 13px; margin-bottom: 2px; }
        .home-title { color: white; font-size: 22px; font-weight: 700; }
        .home-body { flex: 1; padding: 24px 20px; display: flex; flex-direction: column; gap: 16px; }
        .action-card { background: var(--surface); border-radius: var(--radius-lg); border: 1.5px solid var(--border); padding: 24px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.15s; box-shadow: var(--shadow-sm); text-decoration: none; }
        .action-card:active { transform: scale(0.98); box-shadow: var(--shadow); }
        .action-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
        .action-icon.scan { background: #EFF6FF; }
        .action-icon.leads { background: #F0FDF4; }
        .action-text { flex: 1; }
        .action-title { color: var(--text); font-size: 16px; font-weight: 700; margin-bottom: 3px; }
        .action-desc { color: #6B7280; font-size: 13px; line-height: 1.4; }
        .action-arrow { color: #9CA3AF; font-size: 20px; }
        .home-footer { padding: 20px; border-top: 1px solid var(--border); }
        .signout-btn { width: 100%; background: none; border: 1.5px solid var(--border); color: #6B7280; padding: 12px; border-radius: var(--radius); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .signout-btn:active { background: #F3F4F6; }
        .event-badge { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 20px; padding: 6px 14px; display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; }
        .event-dot { width: 6px; height: 6px; background: #2563EB; border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .event-name { color: #1D4ED8; font-size: 12px; font-weight: 600; }
      `}</style>
      <div id="home-shell">
        <div className="home-header">
          <div className="home-logo">
            <div className="home-logo-mark">F</div>
            <div className="home-logo-text">Fingoh<span>.ai</span></div>
          </div>
          <div className="home-greeting">Welcome back, {userName}</div>
          <div className="home-title">Booth Intelligence</div>
          <div className="event-badge">
            <div className="event-dot" />
            <div className="event-name">CPhI Milan 2024</div>
          </div>
        </div>

        <div className="home-body">
          <div className="action-card" onClick={() => navigate('/scan')}>
            <div className="action-icon scan">📷</div>
            <div className="action-text">
              <div className="action-title">Scan a Card</div>
              <div className="action-desc">Capture a business card and get instant IEI score + buying signals</div>
            </div>
            <div className="action-arrow">›</div>
          </div>

          <div className="action-card" onClick={() => navigate('/scans')}>
            <div className="action-icon leads">📋</div>
            <div className="action-text">
              <div className="action-title">My Leads</div>
              <div className="action-desc">Review all scanned contacts, scores, and conversation insights</div>
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
