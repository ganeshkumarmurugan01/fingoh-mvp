import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_URL || 'https://api.fingoh.ai'

function compressImage(file, maxPx = 900, quality = 0.65) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = url
  })
}

export default function Scanner() {
  const navigate = useNavigate()
  const cameraRef = useRef(null)
  const uploadRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState(null)
  const [form, setForm] = useState({
    name: '', company: '', designation: '',
    email: '', phone: '', city: '', country: '', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const statusStyle = {
    scanning: { background: '#EFF6FF', color: '#1E40AF' },
    ok:       { background: '#F0FDF4', color: '#166534' },
    warn:     { background: '#FFFBEB', color: '#92400E' },
  }

  async function onPhoto(file) {
    if (!file) return
    setForm({ name: '', company: '', designation: '', email: '', phone: '', city: '', country: '', notes: '' })
    setError('')
    setPreview(URL.createObjectURL(file))
    setStatus({ text: '🔍 Scanning card…', type: 'scanning' })
    try {
      const b64 = await compressImage(file)
      const res = await fetch(`${API}/mvp/extract-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: b64 })
      })
      const data = await res.json()
      if (res.ok && data.contact) {
        const c = data.contact
        setForm(f => ({
          ...f,
          name: c.name || '', company: c.company || '',
          designation: c.designation || '', email: c.email || '',
          phone: c.phone || '', city: c.city || '', country: c.country || '',
        }))
        setStatus({ text: '✓ Card scanned — review and save', type: 'ok' })
      } else {
        setStatus({ text: '⚠ Could not read card — fill manually', type: 'warn' })
      }
    } catch (e) {
      setStatus({ text: '⚠ Scan failed — fill manually', type: 'warn' })
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('user_profiles').select('icp_config').eq('user_id', user.id).single()
      const res = await fetch(`${API}/mvp/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: form, icp: profile?.icp_config || {} })
      })
      const scored = await res.json()
      const { data: scan, error: dbErr } = await supabase
        .from('scans')
        .insert({
          user_id: user.id,
          contact_name: form.name, contact_company: form.company,
          contact_title: form.designation, contact_email: form.email,
          contact_phone: form.phone, iei_score: scored.iei_score,
          tier: scored.tier, signals: scored.signals || [],
          raw_contact: form,
        })
        .select().single()
      if (dbErr) throw dbErr
      navigate(`/result/${scan.id}`)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#F8FAFC',
      paddingTop: 'calc(env(safe-area-inset-top) + 56px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
    }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        paddingTop: 'env(safe-area-inset-top)',
        background: '#fff', borderBottom: '1px solid #E5E7EB',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#0D1B3E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 16,
          }}>F</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1B3E' }}>Scan Business Card</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Fingoh · Booth Intelligence</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{
          background: '#fff', border: '1px solid #E5E7EB',
          borderRadius: 16, padding: 16, marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 12 }}>
            CAPTURE BUSINESS CARD
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 6, padding: '14px 10px', background: '#0D1B3E', color: '#fff',
              borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              <span style={{ fontSize: 24 }}>📷</span>
              <span>Camera</span>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                style={{ display: 'none' }} onChange={e => onPhoto(e.target.files[0])} />
            </label>
            <label style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 6, padding: '14px 10px', background: '#F1F5F9', color: '#0D1B3E',
              border: '1px solid #E5E7EB', borderRadius: 12, cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}>
              <span style={{ fontSize: 24 }}>🖼</span>
              <span>Upload</span>
              <input ref={uploadRef} type="file" accept="image/*"
                style={{ display: 'none' }} onChange={e => onPhoto(e.target.files[0])} />
            </label>
          </div>
          {preview && (
            <img src={preview} alt="Card preview" style={{
              width: '100%', marginTop: 12, borderRadius: 10,
              border: '1px solid #E5E7EB', objectFit: 'contain', maxHeight: 180,
            }} />
          )}
          {status && (
            <div style={{
              marginTop: 10, padding: '8px 12px', borderRadius: 8,
              fontSize: 13, fontWeight: 500, ...statusStyle[status.type],
            }}>
              {status.text}
            </div>
          )}
        </div>

        <form onSubmit={handleSave}>
          <div style={{
            background: '#fff', border: '1px solid #E5E7EB',
            borderRadius: 16, padding: 16, marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 12 }}>
              CONTACT DETAILS
            </div>
            {[
              { key: 'name',        label: 'Name *',    placeholder: 'Full name' },
              { key: 'company',     label: 'Company',   placeholder: 'Company name' },
              { key: 'designation', label: 'Job Title', placeholder: 'Director, Manager…' },
              { key: 'email',       label: 'Email',     placeholder: 'email@company.com', type: 'email' },
              { key: 'phone',       label: 'Phone',     placeholder: '+91 98765 43210',   type: 'tel' },
              { key: 'city',        label: 'City',      placeholder: 'Mumbai, Milan…' },
              { key: 'country',     label: 'Country',   placeholder: 'India, UK…' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>
                  {f.label}
                </label>
                <input
                  type={f.type || 'text'}
                  value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{
                    width: '100%', fontSize: 16, padding: '10px 12px',
                    border: '1px solid #E5E7EB', borderRadius: 8,
                    background: '#F8FAFC', color: '#0D1B3E',
                    boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Quick note about this lead…"
                rows={2}
                style={{
                  width: '100%', fontSize: 16, padding: '10px 12px',
                  border: '1px solid #E5E7EB', borderRadius: 8,
                  background: '#F8FAFC', color: '#0D1B3E',
                  boxSizing: 'border-box', resize: 'none', outline: 'none',
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 12px', marginBottom: 12,
              background: '#FEF2F2', color: '#DC2626',
              borderRadius: 8, fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%', padding: '15px',
              background: saving ? '#94A3B8' : '#0D1B3E',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Scoring…' : 'Score & Save Lead →'}
          </button>
        </form>
      </div>
    </div>
  )
}
