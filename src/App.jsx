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
    <div style={{ minHeight:'100dvh', background:'#0D1B3E', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'white', fontSize:'18px', fontWeight:700, letterSpacing:'0.05em' }}>Fingoh</div>
    </div>
  )

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
