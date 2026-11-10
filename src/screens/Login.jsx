import { useState } from 'react'
import fingohLogo from '../assets/fingoh-logo.png'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    })
    if (error) {
      setError(error.message)
    } else {
      setStep('otp')
    }
    setLoading(false)
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    })
    if (error) {
      setError('Invalid code. Please try again.')
    } else {
      navigate('/setup')
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8FAFC; }
        #login-shell {
          max-width: 480px; margin: 0 auto; min-height: 100dvh;
          background: #F8FAFC; display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 32px 24px;
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }
        .login-card {
          width: 100%; background: white; border-radius: 20px;
          border: 1.5px solid #E5E7EB; padding: 36px 24px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }
        .logo-block { text-align: center; margin-bottom: 28px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .logo-sub { color: #9CA3AF; font-size: 13px; }
        .field-label { display: block; font-size: 11px; font-weight: 700; color: #9CA3AF; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
        .field-input {
          width: 100%; border: 1.5px solid #E5E7EB; border-radius: 12px;
          padding: 14px 16px; font-size: 16px; color: #111827; background: #F9FAFB;
          outline: none; transition: all 0.15s; font-family: inherit;
        }
        .field-input:focus { border-color: #2563EB; background: white; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        .field-input-otp {
          width: 100%; border: 1.5px solid #E5E7EB; border-radius: 12px;
          padding: 16px; font-size: 28px; color: #0D1B3E; background: #F9FAFB;
          outline: none; transition: all 0.15s; font-family: 'SF Mono', monospace;
          letter-spacing: 0.25em; text-align: center;
        }
        .field-input-otp:focus { border-color: #2563EB; background: white; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        .btn-primary {
          width: 100%; background: #1E40AF; color: white; border: none;
          padding: 15px; border-radius: 12px; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: all 0.15s; margin-top: 16px; font-family: inherit;
        }
        .btn-primary:active { transform: scale(0.98); background: #1D4ED8; }
        .btn-primary:disabled { opacity: 0.4; }
        .btn-ghost { width: 100%; background: none; border: none; color: #9CA3AF; font-size: 14px; padding: 12px; cursor: pointer; margin-top: 4px; font-family: inherit; }
        .hint-text { color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 12px; }
        .error-text { color: #DC2626; font-size: 13px; text-align: center; margin-top: 8px; }
        .otp-header { text-align: center; margin-bottom: 20px; }
        .otp-emoji { font-size: 36px; margin-bottom: 8px; }
        .otp-title { color: #111827; font-size: 17px; font-weight: 700; }
        .otp-sub { color: #6B7280; font-size: 13px; margin-top: 4px; }
        .otp-email { color: #2563EB; font-weight: 600; }
        .footer-text { color: #D1D5DB; font-size: 11px; margin-top: 24px; text-align: center; }
      `}</style>
      <div id="login-shell">
        <div className="login-card">
          <div className="logo-block">
            <img src={fingohLogo} alt="Fingoh" style={{ height: '48px', width: 'auto' }} />
            <div className="logo-sub">Intent Intelligence · Pharma Edition</div>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleSendOtp}>
              <label className="field-label">Work Email</label>
              <input
                className="field-input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {error && <p className="error-text">{error}</p>}
              <button className="btn-primary" type="submit" disabled={loading || !email}>
                {loading ? 'Sending code...' : 'Get Login Code'}
              </button>
              <p className="hint-text">We'll send an 8-digit code to your email</p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="otp-header">
                <div className="otp-emoji">📬</div>
                <div className="otp-title">Check your email</div>
                <div className="otp-sub">Code sent to <span className="otp-email">{email}</span></div>
              </div>
              <label className="field-label">8-Digit Code</label>
              <input
                className="field-input-otp"
                type="text"
                inputMode="numeric"
                placeholder="00000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                required
                autoFocus
              />
              {error && <p className="error-text">{error}</p>}
              <button className="btn-primary" type="submit" disabled={loading || otp.length < 8}>
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <button className="btn-ghost" type="button" onClick={() => { setStep('email'); setOtp(''); setError('') }}>
                ← Use different email
              </button>
            </form>
          )}
        </div>
        <p className="footer-text">Powered by Fingoh · Akiraas Pte. Ltd.</p>
      </div>
    </>
  )
}
