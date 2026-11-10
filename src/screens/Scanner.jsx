import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import fingohLogo from '../assets/fingoh-logo.png'

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

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy: #0D1B3E;
    --blue: #2563EB;
    --blue-light: #EFF6FF;
    --green: #16A34A;
    --green-light: #F0FDF4;
    --red: #DC2626;
    --red-light: #FEF2F2;
    --amber-light: #FFFBEB;
    --muted: #6B7280;
    --muted-light: #9CA3AF;
    --border: #E5E7EB;
    --border-light: #F3F4F6;
    --surface: #FFFFFF;
    --bg: #F8FAFC;
    --text: #111827;
    --radius-sm: 8px;
    --radius: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-top: env(safe-area-inset-top, 0px);
  }
  html, body {
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
  }
  #scanner-shell {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    max-width: 480px;
    margin: 0 auto;
    background: var(--bg);
    position: relative;
  }
  .walkin-header {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px;
    padding-top: calc(14px + var(--safe-top));
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 90;
  }
  .back-btn {
    width: 34px; height: 34px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; cursor: pointer; color: var(--navy);
    flex-shrink: 0;
  }
  .walkin-title { font-size: 15px; font-weight: 700; color: var(--navy); }
  .walkin-sub { font-size: 11px; color: var(--muted); }
  .screen-content {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: calc(80px + var(--safe-bottom));
  }
  .form-wrap {
    padding: 16px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .section-card {
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }
  .section-head {
    padding: 14px 16px 10px;
    border-bottom: 1px solid var(--border-light);
  }
  .section-title {
    font-size: 13px; font-weight: 700;
    color: var(--navy);
    text-transform: uppercase;
    letter-spacing: .05em;
  }
  .section-body { padding: 14px 16px; }
  .scan-area {
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .scan-btns { display: flex; }
  .scan-btn {
    flex: 1; padding: 14px 10px;
    background: var(--border-light);
    border: none; cursor: pointer;
    font-size: 12px; font-weight: 600;
    color: var(--navy); font-family: inherit;
    display: flex; flex-direction: column;
    align-items: center; gap: 5px;
    transition: background .12s;
    -webkit-tap-highlight-color: transparent;
  }
  .scan-btn:first-child { border-right: 1px solid var(--border); }
  .scan-btn:active { background: var(--border); }
  .scan-btn-icon { font-size: 22px; }
  .scan-preview {
    width: 100%; display: block;
    max-height: 180px; object-fit: cover;
    border-top: 1px solid var(--border-light);
  }
  .scan-status {
    padding: 8px 14px;
    font-size: 12px; font-weight: 600;
    text-align: center;
    border-top: 1px solid var(--border-light);
  }
  .field-label {
    display: block;
    font-size: 11px; font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 6px;
  }
  .field-input {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    font-size: 16px;
    font-family: inherit;
    color: var(--text);
    background: var(--surface);
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    -webkit-appearance: none;
  }
  .field-input:focus {
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgba(37,99,235,.1);
  }
  .field-textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    font-size: 16px;
    font-family: inherit;
    color: var(--text);
    background: var(--surface);
    outline: none;
    resize: none;
    line-height: 1.5;
    transition: border-color .15s, box-shadow .15s;
    -webkit-appearance: none;
  }
  .field-textarea:focus {
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgba(37,99,235,.1);
  }
  .field-row { margin-bottom: 14px; }
  .field-row:last-child { margin-bottom: 0; }
  .msg-err {
    background: var(--red-light);
    color: #991B1B;
    border: 1px solid #FECACA;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    font-size: 13px;
  }
  .btn-save {
    width: 100%; padding: 15px;
    background: var(--green);
    color: white; border: none;
    border-radius: var(--radius);
    font-size: 15px; font-weight: 700;
    cursor: pointer; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    transition: opacity .12s, transform .08s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-save:active { transform: scale(.98); opacity: .92; }
  .btn-save:disabled { opacity: .5; cursor: not-allowed; transform: none; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner {
    display: inline-block; width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: white; border-radius: 50%;
    animation: spin .8s linear infinite;
  }
`

export default function Scanner() {
  const navigate = useNavigate()
  const cameraRef = useRef(null)
  const uploadRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [scanStatus, setScanStatus] = useState(null)
  const [form, setForm] = useState({
    name: '', company: '', designation: '',
    email: '', phone: '', city: '', country: '', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const statusColors = {
    scanning: { background: '#EFF6FF', color: '#1E40AF' },
    ok:       { background: '#F0FDF4', color: '#166534' },
    warn:     { background: '#FFFBEB', color: '#92400E' },
  }

  async function onPhoto(file) {
    if (!file) return
    setForm({ name: '', company: '', designation: '', email: '', phone: '', city: '', country: '', notes: '' })
    setError('')
    setPreview(URL.createObjectURL(file))
    setScanStatus({ text: '🔍 Scanning card…', type: 'scanning' })
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
        setScanStatus({ text: '✓ Card scanned — review and save', type: 'ok' })
      } else {
        setScanStatus({ text: '⚠ Could not read card — fill manually', type: 'warn' })
      }
    } catch {
      setScanStatus({ text: '⚠ Scan failed — fill manually', type: 'warn' })
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
          contact_name: form.name,
          contact_company: form.company,
          contact_title: form.designation,
          contact_email: form.email,
          contact_phone: form.phone,
          iei_score: scored.iei_score,
          tier: scored.tier,
          signals: scored.signals || [],
          raw_contact: form,
        })
        .select().single()
      if (dbErr) throw dbErr
      navigate(`/result/${scan.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { key: 'name',        label: 'Name *',    placeholder: 'Full name' },
    { key: 'company',     label: 'Company',   placeholder: 'Company name' },
    { key: 'designation', label: 'Job Title', placeholder: 'Director, Manager…' },
    { key: 'email',       label: 'Email',     placeholder: 'email@company.com', type: 'email' },
    { key: 'phone',       label: 'Phone',     placeholder: '+91 98765 43210',   type: 'tel' },
    { key: 'city',        label: 'City',      placeholder: 'Mumbai, Milan…' },
    { key: 'country',     label: 'Country',   placeholder: 'India, UK…' },
  ]

  return (
    <>
      <style>{css}</style>
      <div id="scanner-shell">

        {/* Sticky header */}
        <div className="walkin-header" style={{background:"#0D1B3E",borderBottom:"none",paddingBottom:"10px"}}>
          <button className="back-btn" style={{background:"rgba(255,255,255,0.1)",border:"none",color:"white"}} onClick={() => navigate("/home")}>←</button>
          <div>
            <img src={fingohLogo} alt="Fingoh" style={{height:"22px",filter:"brightness(0) invert(1)",marginBottom:"4px"}} /><div className="walkin-title" style={{color:"white"}}>Walk-in Visitor</div>
            <div className="walkin-sub">Scan card or enter details</div>
          </div>
        </div>

        <div className="screen-content">
          <form className="form-wrap" onSubmit={handleSave}>

            {/* Scan section */}
            <div className="section-card">
              <div className="section-head">
                <div className="section-title">Scan Business Card</div>
              </div>
              <div className="section-body">
                <div className="scan-area">
                  <div className="scan-btns">
                    <label className="scan-btn">
                      <span className="scan-btn-icon">📷</span>
                      <span>Camera</span>
                      <input
                        ref={cameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={e => onPhoto(e.target.files[0])}
                      />
                    </label>
                    <label className="scan-btn">
                      <span className="scan-btn-icon">🖼</span>
                      <span>Upload</span>
                      <input
                        ref={uploadRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => onPhoto(e.target.files[0])}
                      />
                    </label>
                  </div>
                  {preview && (
                    <img src={preview} alt="Card preview" className="scan-preview" />
                  )}
                  {scanStatus && (
                    <div className="scan-status" style={statusColors[scanStatus.type]}>
                      {scanStatus.text}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div className="section-card">
              <div className="section-head">
                <div className="section-title">Confirm Details</div>
              </div>
              <div className="section-body">
                {fields.map(f => (
                  <div key={f.key} className="field-row">
                    <label className="field-label">{f.label}</label>
                    <input
                      className="field-input"
                      type={f.type || 'text'}
                      value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
                <div className="field-row">
                  <label className="field-label">Notes</label>
                  <textarea
                    className="field-textarea"
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Quick note about this lead…"
                  />
                </div>
              </div>
            </div>

            {error && <div className="msg-err">{error}</div>}

            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? <><span className="spinner" /> Scoring…</> : 'Save Walk-in Visitor →'}
            </button>

          </form>
        </div>
      </div>
    </>
  )
}
