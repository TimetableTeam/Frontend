import React, { useEffect, useMemo, useState } from 'react'
import { Button } from './UI'
import { Icon } from './Icons'
import { days } from '../data/mockData'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

export default function EditAllocationModal({ allocation, onClose, onSave }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({ day: 'Saturday', slot: 's1', room: '' })
  const [rooms, setRooms] = useState([])
  const [slotOptions, setSlotOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selectedSlot = useMemo(() => slotOptions.find(item => item.id === form.slot), [slotOptions, form.slot])

  useEffect(() => {
    if (!allocation) return
    setForm({ day: allocation.day, slot: allocation.slot || '', room: allocation.room })
    setError('')
    setLoading(true)
    Promise.all([tanseekApi.getRooms(), tanseekApi.getPlanningCatalog()])
      .then(([roomsPayload, catalogPayload]) => {
        setRooms(Array.isArray(roomsPayload) ? roomsPayload : roomsPayload?.rooms || [])
        const liveSlots = catalogPayload?.slots || []
        setSlotOptions(liveSlots)
        const matching = liveSlots.find(item => item.id === allocation.slot)
          || liveSlots.find(item => item.start === String(allocation.start || '').slice(0, 5))
        setForm({ day: allocation.day, slot: matching?.id || liveSlots[0]?.id || '', room: allocation.room })
      })
      .catch(err => setError(err?.message || t('Could not load rooms, labs and time slots.')))
      .finally(() => setLoading(false))
  }, [allocation?.id])

  if (!allocation) return null

  async function submit(event) {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      await onSave(allocation.id, { ...allocation, ...form, start: selectedSlot?.start || '', end: selectedSlot?.end || '' })
      onClose()
    } catch (err) {
      setError(err?.message || t('Could not update this session.'))
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-tanseek-navy/45 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-xl overflow-hidden rounded-brand border border-tanseek-line bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-tanseek-line p-5 md:p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.12em] text-tanseek-teal">{t('Manual adjustment')}</p>
            <h2 className="mt-1 text-xl font-bold text-tanseek-navy">{allocation.code} · {allocation.section}</h2>
            <p className="mt-1 text-xs text-tanseek-muted">{allocation.staff} · {t(allocation.type)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-brand-sm p-2 text-tanseek-muted hover:bg-tanseek-canvas"><Icon name="x" size={18}/></button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6">
          <label><span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Day')}</span><select value={form.day} onChange={e => setForm(prev => ({ ...prev, day: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">{days.map(day => <option key={day} value={day}>{t(day)}</option>)}</select></label>
          <label><span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Time slot')}</span><select disabled={loading || slotOptions.length === 0} value={form.slot} onChange={e => setForm(prev => ({ ...prev, slot: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm disabled:bg-tanseek-canvas"><option value="">{slotOptions.length === 0 ? t('No time slots configured') : t('Select time slot')}</option>{slotOptions.map(slot => <option key={slot.id} value={slot.id}>{slot.start}–{slot.end}</option>)}</select></label>
          <label className="md:col-span-2"><span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Room / lab')}</span><select disabled={loading} value={form.room} onChange={e => setForm(prev => ({ ...prev, room: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm disabled:bg-tanseek-canvas">{rooms.map(room => <option key={room.id} value={room.name}>{room.name} · {room.capacity} · {t(room.type)}</option>)}</select></label>

          <div className="md:col-span-2 rounded-brand-sm border border-tanseek-line bg-tanseek-canvas p-4 text-xs leading-5 text-tanseek-muted">
            <strong className="text-tanseek-navy">{t('Re-validation required:')} </strong>
            {t('Every manual adjustment is checked again against room, instructor, student, capacity, equipment, availability, holiday and closure constraints.')}
          </div>
          {error && <div className="md:col-span-2 rounded-brand-sm border border-tanseek-alert/25 bg-tanseek-alertSoft p-3 text-sm text-tanseek-alert">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-tanseek-line bg-tanseek-canvas/60 p-4 md:px-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{t('Cancel')}</Button>
          <Button type="submit" disabled={saving || loading}>{saving ? t('Saving…') : t('Save adjustment')}</Button>
        </div>
      </form>
    </div>
  )
}
