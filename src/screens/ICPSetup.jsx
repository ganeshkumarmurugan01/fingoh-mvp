import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ROLES = ['C-Suite / VP', 'Director / Head', 'Manager / Lead', 'Scientist / Analyst', 'Procurement', 'Regulatory Affairs', 'Other']
const COMPANY_TYPES = ['Generic Pharma', 'Innovator / Branded', 'CDMO / CMO', 'API Manufacturer', 'Distributor / Trader', 'Biotech', 'Other']

export default function ICPSetup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [selectedRoles, setSelectedRoles] = useState([])
  const [selectedTypes, setSelectedTypes] = useState([])
  const [intent, setIntent] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleItem = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('user_profiles').upsert({
      id: user.id,
      email: user.email,
      icp_roles: selectedRoles,
      icp_company_types: selectedTypes,
      icp_intent: intent,
      updated_at: new Date().toISOString()
    })
    setSaving(false)
    navigate('/scan')
  }

  return (
    <div className="min-h-screen bg-[#0D1B3E] flex flex-col px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[#94A3B8] text-xs uppercase tracking-widest mb-1">Step {step} of 3</p>
        <div className="flex gap-1 mb-4">
          {[1,2,3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-[#3B82F6]' : 'bg-white/10'}`} />
          ))}
        </div>
        <h2 className="text-white text-xl font-bold">
          {step === 1 && 'Who do you want to meet?'}
          {step === 2 && 'What type of companies?'}
          {step === 3 && 'What are you offering?'}
        </h2>
        <p className="text-[#94A3B8] text-sm mt-1">
          {step === 1 && 'Select all roles that fit your ideal buyer'}
          {step === 2 && 'Select the company types you target'}
          {step === 3 && 'Describe what you want to offer or achieve'}
        </p>
      </div>

      {/* Step 1 — Roles */}
      {step === 1 && (
        <div className="flex flex-col gap-3 flex-1">
          {ROLES.map(r => (
            <button key={r} onClick={() => toggleItem(selectedRoles, setSelectedRoles, r)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                selectedRoles.includes(r)
                  ? 'bg-[#1E40AF] border-[#3B82F6] text-white'
                  : 'bg-white/5 border-white/10 text-[#CBD5E1]'
              }`}>
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — Company Types */}
      {step === 2 && (
        <div className="flex flex-col gap-3 flex-1">
          {COMPANY_TYPES.map(t => (
            <button key={t} onClick={() => toggleItem(selectedTypes, setSelectedTypes, t)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                selectedTypes.includes(t)
                  ? 'bg-[#1E40AF] border-[#3B82F6] text-white'
                  : 'bg-white/5 border-white/10 text-[#CBD5E1]'
              }`}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Step 3 — Intent */}
      {step === 3 && (
        <div className="flex-1">
          <textarea
            value={intent}
            onChange={e => setIntent(e.target.value)}
            placeholder="e.g. We offer sterile fill-finish manufacturing and are looking for pharma companies expanding their injectable pipeline..."
            rows={6}
            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3B82F6] resize-none"
          />
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button onClick={() => setStep(s => s-1)}
            className="flex-1 border border-white/20 text-white py-3 rounded-xl text-sm font-semibold">
            Back
          </button>
        )}
        {step < 3 ? (
          <button onClick={() => setStep(s => s+1)}
            className="flex-1 bg-[#1E40AF] text-white py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform">
            Next
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#1E40AF] text-white py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50">
            {saving ? 'Saving...' : 'Start Scanning →'}
          </button>
        )}
      </div>
    </div>
  )
}
