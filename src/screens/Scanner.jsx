import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL

export default function Scanner() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [phase, setPhase] = useState('camera') // 'camera' | 'processing' | 'error'
  const [processingStep, setProcessingStep] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [flashActive, setFlashActive] = useState(false)
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    startCamera()
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      stopCamera()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permission and reload.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
  }

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return

    // Flash effect
    setFlashActive(true)
    setTimeout(() => setFlashActive(false), 150)

    // Capture frame
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1]

    stopCamera()
    setPhase('processing')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Step 1: Extract card text
      setProcessingStep('Reading business card...')
      const extractRes = await fetch(`${API_BASE}/mvp/extract-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageBase64 })
      })
      if (!extractRes.ok) throw new Error('Failed to extract card')
      const { extracted_data, raw_text } = await extractRes.json()

      // Step 2: Score with IEI
      setProcessingStep('Calculating IEI score...')
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('icp_roles, icp_company_types, icp_intent')
        .eq('id', user.id)
        .single()

      const scoreRes = await fetch(`${API_BASE}/mvp/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extracted_data,
          icp: profile || {}
        })
      })
      if (!scoreRes.ok) throw new Error('Failed to score')
      const scoreData = await scoreRes.json()

      // Step 3: Save to Supabase
      setProcessingStep('Saving scan...')
      const { data: scan, error: saveError } = await supabase
        .from('scans')
        .insert({
          user_id: user.id,
          raw_card_text: raw_text,
          extracted_data,
          iei_score: scoreData.iei_score,
          iei_tier: scoreData.iei_tier,
          signals: scoreData.signals,
          intelligence_layers: scoreData.intelligence_layers,
          is_offline: false
        })
        .select()
        .single()

      if (saveError) throw saveError

      navigate(`/result/${scan.id}`)

    } catch (err) {
      console.error(err)
      setPhase('error')
      setProcessingStep(err.message || 'Something went wrong')
    }
  }

  const retry = () => {
    setPhase('camera')
    setProcessingStep('')
    setCameraError('')
    startCamera()
  }

  return (
    <div className="min-h-screen bg-black flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Flash overlay */}
      {flashActive && <div className="fixed inset-0 bg-white z-50 pointer-events-none" />}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {phase === 'camera' && (
        <>
          {/* Camera feed */}
          <div className="relative flex-1">
            {cameraError ? (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <div>
                  <div className="text-4xl mb-4">📷</div>
                  <p className="text-white text-sm">{cameraError}</p>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ minHeight: '60vh' }}
              />
            )}

            {/* Viewfinder overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-72 h-44">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                {/* Scan line */}
                <div className="absolute inset-x-0 top-1/2 h-px bg-[#3B82F6]/60" />
              </div>
            </div>

            {/* Top bar */}
            <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4">
              <button onClick={() => navigate('/scans')} className="text-white bg-black/40 rounded-full px-3 py-1 text-sm">
                ← My Scans
              </button>
              <span className={`text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-500/80 text-white' : 'bg-yellow-500/80 text-black'}`}>
                {isOnline ? '● Online' : '○ Offline'}
              </span>
            </div>
          </div>

          {/* Bottom panel */}
          <div className="bg-[#0D1B3E] px-6 py-6 flex flex-col items-center gap-4">
            <p className="text-[#94A3B8] text-sm text-center">
              Point camera at a business card
            </p>
            <button
              onClick={captureAndProcess}
              disabled={!!cameraError}
              className="w-20 h-20 rounded-full bg-white border-4 border-[#3B82F6] flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40 shadow-lg"
            >
              <div className="w-14 h-14 rounded-full bg-[#1E40AF]" />
            </button>
            <p className="text-[#475569] text-xs">Tap to scan</p>
          </div>
        </>
      )}

      {phase === 'processing' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 bg-[#0D1B3E]">
          <div className="w-16 h-16 rounded-full border-4 border-[#1E40AF] border-t-[#3B82F6] animate-spin mb-6" />
          <p className="text-white font-semibold text-lg mb-2">Analysing...</p>
          <p className="text-[#94A3B8] text-sm text-center">{processingStep}</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 bg-[#0D1B3E]">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-white font-semibold mb-2">Something went wrong</p>
          <p className="text-[#94A3B8] text-sm text-center mb-6">{processingStep}</p>
          <button onClick={retry} className="bg-[#1E40AF] text-white px-6 py-3 rounded-xl font-semibold">
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
