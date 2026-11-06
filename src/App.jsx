import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

import Login from './screens/Login'
import ICPSetup from './screens/ICPSetup'
import Scanner from './screens/Scanner'
import Result from './screens/Result'
import MyScans from './screens/MyScans'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-[#0D1B3E] flex items-center justify-center">
      <div className="text-white text-lg font-semibold tracking-wide animate-pulse">Fingoh</div>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/scan" />} />
      <Route path="/setup" element={session ? <ICPSetup /> : <Navigate to="/login" />} />
      <Route path="/scan" element={session ? <Scanner /> : <Navigate to="/login" />} />
      <Route path="/result/:scanId" element={session ? <Result /> : <Navigate to="/login" />} />
      <Route path="/scans" element={session ? <MyScans /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to={session ? "/scan" : "/login"} />} />
    </Routes>
  )
}
