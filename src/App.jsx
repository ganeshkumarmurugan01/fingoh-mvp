import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

import Login from './screens/Login'
import ICPSetup from './screens/ICPSetup'
import Home from './screens/Home'
import Scanner from './screens/Scanner'
import Result from './screens/Result'
import MyScans from './screens/MyScans'

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem('sb-eayujebzswmseppyzqnl-auth-token')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (parsed?.expires_at && parsed.expires_at * 1000 > Date.now()) return parsed
    } catch {}
    return null
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/home" />} />
      <Route path="/setup" element={session ? <ICPSetup /> : <Navigate to="/login" />} />
      <Route path="/home" element={session ? <Home /> : <Navigate to="/login" />} />
      <Route path="/scan" element={session ? <Scanner /> : <Navigate to="/login" />} />
      <Route path="/result/:scanId" element={session ? <Result /> : <Navigate to="/login" />} />
      <Route path="/scans" element={session ? <MyScans /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to={session ? "/home" : "/login"} />} />
    </Routes>
  )
}
