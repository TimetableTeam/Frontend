import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card, StatusBadge } from './UI'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

const kinds = [
  { id: 'UNAVAILABLE', label: 'Unavailable' },
  { id: 'AVAILABLE', label: 'Available' },
  { id: 'PREFERRED', label: 'Preferred' },
]

export default function StaffAvailability() {
  const [catalog, setCatalog] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [slotMap, setSlotMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { t } = useLanguage()

  useEffect(() => {
    (async () => {
      try {
        const c = await tanseekApi.getPlanningCatalog()
        if (!c?.term) throw new Error('No active academic term is available.')

        // Keep the planning catalog even if the availability request fails.
        // Previously setCatalog() happened after getMyAvailability(), so any
        // availability/auth error left catalog as null and crashed the render.
        setCatalog(c)

        const s = await tanseekApi.getMyAvailability(c.term.id)
        setSubmission(s)
        const map = {}
        for (const entry of s?.slots || []) map[`${entry.day}:${entry.slot_id}`] = entry.kind
        setSlotMap(map)
      } catch (e) {
        setError(e?.message || 'Could not load teaching availability.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const stats = useMemo(() => {
    const values = Object.values(slotMap)
    return {
      preferred: values.filter(v => v === 'PREFERRED').length,
      available: values.filter(v => v === 'AVAILABLE').length,
      unavailable: (catalog?.days?.length || 0) * (catalog?.slots?.length || 0) - values.filter(v => v !== 'UNAVAILABLE').length,
    }
  }, [slotMap, catalog])

  function setKind(day, slotId, kind) {
    setSlotMap(prev => ({ ...prev, [`${day}:${slotId}`]: kind }))
    setMessage('')
  }

  function payload() {
    if (!catalog?.term || !Array.isArray(catalog?.days) || !Array.isArray(catalog?.slots)) {
      throw new Error('Academic term data is not available yet.')
    }
    const slots = []
    for (const day of catalog.days) for (const slot of catalog.slots) {
      const kind = slotMap[`${day}:${slot.id}`] || 'UNAVAILABLE'
      if (kind !== 'UNAVAILABLE') slots.push({ day, slot_id: slot.id, kind })
    }
    return { term_id: catalog.term.id, slots }
  }

  async function saveDraft() {
    setSaving(true); setError(''); setMessage('')
    try { const result = await tanseekApi.saveMyAvailability(payload()); setSubmission(result); setMessage(t('Availability draft saved.')) }
    catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function confirm() {
    setSaving(true); setError(''); setMessage('')
    try { const result = await tanseekApi.confirmMyAvailability(payload()); setSubmission(result); setMessage(t('Availability confirmed and ready for scheduling.')) }
    catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 text-sm text-tanseek-muted">{t('Loading availability…')}</div>

  if (!catalog?.term || !Array.isArray(catalog?.days) || !Array.isArray(catalog?.slots)) {
    return (
      <>
        <PageHeader eyebrow={t('Lecturer / TA')} title={t('Teaching availability')} description={t('Mark when you can teach this term. Preferred windows are soft preferences; unavailable slots are treated as scheduling constraints.')} />
        <Card className="p-6">
          <p className="text-sm font-bold text-tanseek-alert">{error || t('No active academic term is available.')}</p>
          <p className="mt-2 text-xs leading-5 text-tanseek-muted">{t('Ask the Super Admin to create and activate an Academic Term, then reload this page.')}</p>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader eyebrow={t('Lecturer / TA')} title={t('Teaching availability')} description={t('Mark when you can teach this term. Preferred windows are soft preferences; unavailable slots are treated as scheduling constraints.')} actions={<>{submission && <StatusBadge status={submission.state === 'CONFIRMED' ? 'confirmed' : 'draft'}>{submission.state === 'CONFIRMED' ? t('Confirmed') : t('Draft')}</StatusBadge>}</>} />
      {error && <div className="mb-5 rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft px-4 py-3 text-sm font-bold text-tanseek-alert">{error}</div>}
      {message && <div className="mb-5 rounded-brand border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{message}</div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3"><Card className="p-5"><p className="text-xs text-tanseek-muted">{t('Preferred slots')}</p><p className="mt-2 text-3xl font-bold text-tanseek-navy">{stats.preferred}</p></Card><Card className="p-5"><p className="text-xs text-tanseek-muted">{t('Available slots')}</p><p className="mt-2 text-3xl font-bold text-tanseek-navy">{stats.available}</p></Card><Card className="p-5"><p className="text-xs text-tanseek-muted">{t('Unavailable slots')}</p><p className="mt-2 text-3xl font-bold text-tanseek-navy">{stats.unavailable}</p></Card></div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-tanseek-line p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-bold text-tanseek-navy">{catalog.term.name}</h2><p className="mt-1 text-xs text-tanseek-muted">{submission?.instructor_name} · {submission?.role}</p></div><div className="flex flex-wrap gap-2"><span className="rounded-brand-sm bg-tanseek-canvas px-3 py-2 text-xs font-bold text-tanseek-muted">{t('Unavailable')}</span><span className="rounded-brand-sm bg-tanseek-tealSoft px-3 py-2 text-xs font-bold text-tanseek-navy">{t('Available')}</span><span className="rounded-brand-sm bg-tanseek-navy px-3 py-2 text-xs font-bold text-white">{t('Preferred')}</span></div></div>
        <div className="custom-scrollbar overflow-x-auto p-5">
          <table className="min-w-[920px] w-full border-separate border-spacing-2">
            <thead><tr><th className="w-40 px-2 py-2 text-left text-xs uppercase tracking-[.08em] text-tanseek-muted">{t('Day')}</th>{catalog.slots.map(slot => <th key={slot.id} className="px-2 py-2 text-left"><span className="block text-sm font-bold text-tanseek-navy">{slot.start}–{slot.end}</span><span className="text-[11px] font-normal text-tanseek-muted">{t('2-hour slot')}</span></th>)}</tr></thead>
            <tbody>{catalog.days.map(day => <tr key={day}><th className="px-2 py-2 text-left text-sm font-bold text-tanseek-navy">{t(day)}</th>{catalog.slots.map(slot => { const value = slotMap[`${day}:${slot.id}`] || 'UNAVAILABLE'; return <td key={slot.id} className="px-2 py-2"><select value={value} onChange={e => setKind(day, slot.id, e.target.value)} className={`h-12 w-full min-w-[160px] rounded-brand-sm border px-3 text-sm font-bold ${value === 'PREFERRED' ? 'border-tanseek-navy bg-tanseek-navy text-white' : value === 'AVAILABLE' ? 'border-tanseek-teal/40 bg-tanseek-tealSoft text-tanseek-navy' : 'border-tanseek-line bg-tanseek-canvas text-tanseek-muted'}`}>{kinds.map(k => <option key={k.id} value={k.id}>{t(k.label)}</option>)}</select></td>})}</tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-tanseek-line bg-tanseek-canvas p-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-tanseek-muted">{t('Confirm only when the availability is final. Saving again after confirmation returns the submission to Draft.')}</p><div className="flex gap-2"><Button variant="secondary" onClick={saveDraft} disabled={saving}>{t('Save draft')}</Button><Button onClick={confirm} disabled={saving}>{saving ? t('Saving…') : t('Confirm availability')}</Button></div></div>
      </Card>
    </>
  )
}
