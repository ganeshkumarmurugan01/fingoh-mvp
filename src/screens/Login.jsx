import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('email') // 'email' | 'otp'
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
    <div
      className="min-h-screen bg-[#0D1B3E] flex flex-col items-center justify-center px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Logo */}
      <div className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1E40AF] flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">F</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Fingoh</h1>
        <p className="text-[#94A3B8] text-sm mt-1">Booth Intelligence · Pharma Edition</p>
      </div>

      <div className="w-full max-w-sm">
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-[#94A3B8] text-xs font-medium uppercase tracking-wider mb-2 block">
                Work Email
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ fontSize: '16px' }}
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-2xl px-4 py-4 focus:outline-none focus:border-[#3B82F6] focus:bg-white/15 transition-all"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-semibold py-4 rounded-2xl text-base active:scale-95 transition-all disabled:opacity-40 mt-2"
            >
              {loading ? 'Sending code...' : 'Get Login Code'}
            </button>

            <p className="text-[#64748B] text-xs text-center pt-2">
              We'll send a 6-digit code to your email
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">📬</div>
              <p className="text-white font-semibold">Check your email</p>
              <p className="text-[#94A3B8] text-sm mt-1">
                Code sent to <span className="text-[#3B82F6]">{email}</span>
              </p>
            </div>

            <div>
              <label className="text-[#94A3B8] text-xs font-medium uppercase tracking-wider mb-2 block">
                6-Digit Code
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.slice(0, 6))}
                required
                autoFocus
                style={{ fontSize: '24px', letterSpacing: '0.3em', textAlign: 'center' }}
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/20 rounded-2xl px-4 py-4 focus:outline-none focus:border-[#3B82F6] focus:bg-white/15 transition-all"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-semibold py-4 rounded-2xl text-base active:scale-95 transition-all disabled:opacity-40"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              className="w-full text-[#64748B] text-sm py-2 active:text-white transition-colors"
            >
              ← Use different email
            </button>
          </form>
        )}
      </div>

      <p className="text-[#1E3A5F] text-xs mt-12">
        Powered by Fingoh · Akiraas Pte. Ltd.
      </p>
    </div>
  )
}
