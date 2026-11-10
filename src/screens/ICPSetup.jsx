import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from "../lib/supabase"
import fingohLogo from "../assets/fingoh-logo.png"

const TABS = [
  { id: 'event', label: '📅 Event', title: 'Event Details' },
  { id: 'icp', label: '🎯 ICP', title: 'Ideal Customer Profile' },
  { id: 'intent', label: '💡 Intent', title: 'Exhibitor Intent' },
  { id: 'products', label: '📦 Products', title: 'Products & Services' },
]

const ROLES = ['C-Suite / CEO / MD', 'VP / Director', 'Procurement Manager', 'Clinical / Technical Lead', 'IT Manager', 'Department Head', 'Business Owner', 'R&D Lead', 'Finance / Budget holder', 'Consultant / Advisor', 'Marketing Manager', 'Operations Manager']
const COMPANY_SIZES = ['1–50 employees', '51–200 employees', '201–500 employees', '501–1000 employees', '1000+ employees', 'Government / Public sector', 'Academic / Research']
const VISIT_REASONS = ['Active sourcing / procurement', 'Product evaluation', 'Comparing vendors', 'Technology scouting', 'Market research', 'Partnership / distribution', 'Academic / research', 'General interest', 'Budget approved — ready to buy', 'Replacing existing solution']

export default function ICPSetup() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('event')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef()

  // Event
  const [eventName, setEventName] = useState('')
  const [eventDates, setEventDates] = useState('')
  const [boothNumber, setBoothNumber] = useState('')

  // ICP
  const [selectedRoles, setSelectedRoles] = useState([])
  const [selectedSizes, setSelectedSizes] = useState([])
  const [selectedReasons, setSelectedReasons] = useState([])

  // Intent
  const [whyAttending, setWhyAttending] = useState('')
  const [whoToMeet, setWhoToMeet] = useState('')

  // Products
  const [brochures, setBrochures] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
    if (data) {
      setEventName(data.event_name || '')
      setEventDates(data.event_dates || '')
      setBoothNumber(data.booth_number || '')
      setSelectedRoles(data.icp_roles || [])
      setSelectedSizes(data.icp_company_sizes || [])
      setSelectedReasons(data.icp_visit_reasons || [])
      setWhyAttending(data.intent_why_attending || '')
      setWhoToMeet(data.intent_who_to_meet || '')
      setBrochures(data.brochures || [])
    }
  }

  const toggle = (list, setList, item) =>
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('user_profiles').upsert({
      id: user.id,
      email: user.email,
      event_name: eventName,
      event_dates: eventDates,
      booth_number: boothNumber,
      icp_roles: selectedRoles,
      icp_company_sizes: selectedSizes,
      icp_visit_reasons: selectedReasons,
      intent_why_attending: whyAttending,
      intent_who_to_meet: whoToMeet,
      brochures,
      updated_at: new Date().toISOString()
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleBrochureUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const path = `${user.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('brochures').upload(path, file)
    if (error) { console.error("Upload error:", error); alert("Upload failed: " + error.message); } else {
      const { data: { publicUrl } } = supabase.storage.from('brochures').getPublicUrl(path)
      const updated = [...brochures, { name: file.name, url: publicUrl, path }]
      setBrochures(updated)
      await supabase.from("user_profiles").upsert({ id: user.id, brochures: updated, updated_at: new Date().toISOString() })
    }
    setUploading(false)
  }

  const removeBrochure = async (idx) => {
    const b = brochures[idx]
    await supabase.storage.from('brochures').remove([b.path])
    const updated = brochures.filter((_, i) => i !== idx)
    setBrochures(updated)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("user_profiles").upsert({ id: user.id, brochures: updated, updated_at: new Date().toISOString() })
  }

  return (
    <>
      <style>{`
        :root {
          --navy:#0D1B3E; --blue:#2563EB; --green:#16A34A;
          --border:#E5E7EB; --surface:#FFFFFF; --bg:#F8FAFC; --text:#111827;
          --radius:12px; --radius-lg:16px; --shadow-sm:0 1px 3px rgba(0,0,0,.06);
        }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:var(--bg); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
        #setup-shell { max-width:480px; margin:0 auto; min-height:100dvh; display:flex; flex-direction:column; background:var(--bg); }
        .setup-header { background:var(--navy); padding:16px 20px 0; }
        .setup-header-top { display:flex; align-items:center; gap:12px; padding-bottom:16px; }
        .back-btn { background:rgba(255,255,255,0.1); border:none; color:white; width:36px; height:36px; border-radius:10px; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .header-title { color:white; font-size:17px; font-weight:700; }
        .header-sub { color:rgba(255,255,255,0.5); font-size:12px; margin-top:2px; }
        .tab-row { display:flex; gap:0; border-bottom:2px solid rgba(255,255,255,0.1); }
        .tab-btn { flex:1; background:none; border:none; color:rgba(255,255,255,0.5); font-size:11px; font-weight:600; padding:10px 4px; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all 0.15s; white-space:nowrap; }
        .tab-btn.active { color:white; border-bottom-color:#60A5FA; }
        .setup-body { flex:1; padding:20px; display:flex; flex-direction:column; gap:16px; padding-bottom:100px; overflow-y:auto; }
        .section-card { background:var(--surface); border-radius:var(--radius-lg); border:1.5px solid var(--border); padding:16px; box-shadow:var(--shadow-sm); }
        .section-title { font-size:13px; font-weight:700; color:var(--text); margin-bottom:4px; }
        .section-desc { font-size:12px; color:#6B7280; margin-bottom:14px; line-height:1.4; }
        .field-label { font-size:11px; font-weight:700; color:#9CA3AF; letter-spacing:0.07em; text-transform:uppercase; margin-bottom:6px; display:block; }
        .field-input { width:100%; border:1.5px solid var(--border); border-radius:10px; padding:12px 14px; font-size:15px; color:var(--text); background:var(--bg); outline:none; transition:all 0.15s; font-family:inherit; }
        .field-input:focus { border-color:var(--blue); background:white; }
        .field-textarea { width:100%; border:1.5px solid var(--border); border-radius:10px; padding:12px 14px; font-size:14px; color:var(--text); background:var(--bg); outline:none; transition:all 0.15s; font-family:inherit; resize:none; line-height:1.5; min-height:100px; }
        .field-textarea:focus { border-color:var(--blue); background:white; }
        .chip-wrap { display:flex; flex-wrap:wrap; gap:8px; }
        .chip { padding:7px 13px; border-radius:20px; border:1.5px solid var(--border); font-size:12px; font-weight:600; color:#6B7280; cursor:pointer; transition:all 0.15s; background:var(--bg); }
        .chip.active { background:#EFF6FF; border-color:#93C5FD; color:#1D4ED8; }
        .brochure-upload { border:2px dashed var(--border); border-radius:var(--radius); padding:24px; text-align:center; cursor:pointer; transition:all 0.15s; }
        .brochure-upload:hover { border-color:var(--blue); background:#EFF6FF; }
        .brochure-upload-icon { font-size:28px; margin-bottom:8px; }
        .brochure-upload-text { color:#6B7280; font-size:13px; font-weight:500; }
        .brochure-upload-sub { color:#9CA3AF; font-size:11px; margin-top:4px; }
        .brochure-list { display:flex; flex-direction:column; gap:8px; margin-top:12px; }
        .brochure-item { background:var(--bg); border:1.5px solid var(--border); border-radius:10px; padding:10px 14px; display:flex; align-items:center; gap:10px; }
        .brochure-icon { font-size:20px; }
        .brochure-name { flex:1; font-size:13px; color:var(--text); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .brochure-remove { background:none; border:none; color:#DC2626; font-size:18px; cursor:pointer; padding:0 4px; }
        .intent-hint { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:10px 14px; font-size:12px; color:#15803D; display:flex; gap:8px; align-items:flex-start; }
        .save-bar { position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; padding:12px 20px 28px; background:white; border-top:1px solid var(--border); }
        .save-btn { width:100%; background:var(--navy); color:white; border:none; padding:14px; border-radius:var(--radius); font-size:15px; font-weight:700; cursor:pointer; transition:all 0.15s; }
        .save-btn.saved { background:#16A34A; }
        .save-btn:disabled { opacity:0.5; }
        .field-row { display:flex; gap:10px; }
        .field-row > div { flex:1; }
      `}</style>
      <div id="setup-shell">
        <div className="setup-header">
          <div style={{padding:"12px 0 8px"}}><img src={fingohLogo} alt="Fingoh" style={{height:"24px",width:"auto",filter:"brightness(0) invert(1)"}} /></div>
          <div className="setup-header-top">
            <button className="back-btn" onClick={() => navigate('/home')}>‹</button>
            <div>
              <div className="header-title">Event & ICP Setup</div>
              <div className="header-sub">Configure your scoring profile</div>
            </div>
          </div>
          <div className="tab-row">
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-body">

          {/* EVENT TAB */}
          {activeTab === 'event' && (
            <div className="section-card">
              <div className="section-title">Event Details</div>
              <div className="section-desc">Set the event context. This anchors your IEI scoring to the right exhibition.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div>
                  <label className="field-label">Event Name</label>
                  <input className="field-input" placeholder="e.g. CPhI Milan 2024" value={eventName} onChange={e => setEventName(e.target.value)} />
                </div>
                <div className="field-row">
                  <div>
                    <label className="field-label">Dates</label>
                    <input className="field-input" placeholder="e.g. Nov 19–21, 2024" value={eventDates} onChange={e => setEventDates(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Booth / Hall</label>
                    <input className="field-input" placeholder="e.g. Hall 5, C42" value={boothNumber} onChange={e => setBoothNumber(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ICP TAB */}
          {activeTab === 'icp' && (
            <>
              <div className="section-card">
                <div className="section-title">Target visitor roles</div>
                <div className="section-desc">Select all that apply — these drive ICP tier scoring.</div>
                <div className="chip-wrap">
                  {ROLES.map(r => (
                    <button key={r} className={`chip ${selectedRoles.includes(r) ? 'active' : ''}`} onClick={() => toggle(selectedRoles, setSelectedRoles, r)}>{r}</button>
                  ))}
                </div>
              </div>
              <div className="section-card">
                <div className="section-title">Target company sizes</div>
                <div className="section-desc">Which organisation sizes fit your ideal buyer?</div>
                <div className="chip-wrap">
                  {COMPANY_SIZES.map(s => (
                    <button key={s} className={`chip ${selectedSizes.includes(s) ? 'active' : ''}`} onClick={() => toggle(selectedSizes, setSelectedSizes, s)}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="section-card">
                <div className="section-title">Primary visit reasons you want to attract</div>
                <div className="section-desc">Score higher when visitors show these intent signals.</div>
                <div className="chip-wrap">
                  {VISIT_REASONS.map(r => (
                    <button key={r} className={`chip ${selectedReasons.includes(r) ? 'active' : ''}`} onClick={() => toggle(selectedReasons, setSelectedReasons, r)}>{r}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* INTENT TAB */}
          {activeTab === 'intent' && (
            <>
              <div className="intent-hint">
                <span>✦</span>
                <span>Write naturally — Fingoh extracts intent signals and uses them to tune IEI scores, agent prompts, and live visitor alerts specifically for your goals.</span>
              </div>
              <div className="section-card">
                <div className="section-title">Why are you attending this exhibition?</div>
                <div className="section-desc">Describe your goals — products launching, deals to close, markets to enter.</div>
                <textarea className="field-textarea" rows={5}
                  placeholder="e.g. We are launching our new sterile fill-finish line and want to generate qualified leads from pharma companies expanding their injectable pipeline. We're also looking to appoint regional distributors in Southeast Asia..."
                  value={whyAttending} onChange={e => setWhyAttending(e.target.value)} />
              </div>
              <div className="section-card">
                <div className="section-title">What visitors or buyers do you want to meet?</div>
                <div className="section-desc">Describe roles, organisations, or profiles you most want to connect with.</div>
                <textarea className="field-textarea" rows={5}
                  placeholder="e.g. Heads of procurement and VP-level decision-makers at generic pharma companies with 200+ employees, particularly those expanding to regulated markets (US, EU, Japan)..."
                  value={whoToMeet} onChange={e => setWhoToMeet(e.target.value)} />
              </div>
              <div className="section-card" style={{ background:'#EFF6FF', borderColor:'#BFDBFE' }}>
                <div style={{ fontSize:'12px', color:'#1D4ED8', lineHeight:'1.5' }}>
                  ✦ Fingoh uses this intent to tune IEI scores, personalise agent outreach, and prioritise live visitor alerts.
                </div>
              </div>
            </>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="section-card">
              <div className="section-title">Products & Services</div>
              <div className="section-desc">Upload product brochures. Fingoh extracts your catalog and uses it to match visitors to your offerings during scoring.</div>

              <div className="brochure-upload" onClick={() => fileRef.current.click()}>
                <div className="brochure-upload-icon">{uploading ? '⏳' : '📄'}</div>
                <div className="brochure-upload-text">{uploading ? 'Uploading...' : 'Upload a product brochure'}</div>
                <div className="brochure-upload-sub">PDF, PNG or JPG · Max 10MB</div>
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display:'none' }} onChange={handleBrochureUpload} />
              </div>

              {brochures.length > 0 && (
                <div className="brochure-list">
                  {brochures.map((b, i) => (
                    <div key={i} className="brochure-item">
                      <span className="brochure-icon">📄</span>
                      <span className="brochure-name">{b.name}</span>
                      <button className="brochure-remove" onClick={() => removeBrochure(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {brochures.length === 0 && (
                <div style={{ textAlign:'center', color:'#9CA3AF', fontSize:'12px', marginTop:'12px' }}>
                  No brochures uploaded yet. Fingoh will score all visitors equally until a brochure is added.
                </div>
              )}
            </div>
          )}

        </div>

        <div className="save-bar">
          <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Setup'}
          </button>
        </div>
      </div>
    </>
  )
}
