import React, { useEffect, useMemo, useState } from 'react'
import { Button } from './UI'
import { Icon } from './Icons'
import { days, slots } from '../data/mockData'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

const initialForm = {
  course: '',
  code: '',
  section: '',
  staff: '',
  type: 'Lecture',
  day: 'Saturday',
  slot: 's1',
  room: '',
}

export default function AddAllocationModal({ open, onClose, onAdd }) {
  const { t } = useLanguage()
  const [form, setForm] = useState(initialForm)
  const [rooms, setRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selectedSlot = useMemo(() => slots.find(item => item.id === form.slot), [form.slot])

  useEffect(() => {
    if (!open) return
    setForm(initialForm)
    setError('')
    setLoadingRooms(true)
    tanseekApi.getRooms()
      .then(payload => {
        const list = Array.isArray(payload) ? payload : payload?.rooms || []
        setRooms(list)
        setForm(current => ({ ...current, room: list.find(item => item.status === 'available')?.name || list[0]?.name || '' }))
      })
      .catch(err => setError(err?.message || t('Could not load rooms and labs.')))
      .finally(() => setLoadingRooms(false))
  }, [open])

  if (!open) return null

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!form.course.trim() || !form.code.trim() || !form.section.trim() || !form.staff.trim() || !form.room || !form.day || !form.slot) {
      setError(t('Complete all required session fields.'))
      return
    }
    setSaving(true)
    try {
      await onAdd({ ...form })
      onClose()
    } catch (err) {
      setError(err?.message || t('Could not add this session.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-tanseek-navy/45 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="custom-scrollbar max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-brand border border-tanseek-line bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-tanseek-line p-5 md:p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-tanseek-muted">Fall 2026 · Draft v3</p>
            <h2 className="mt-1 text-xl font-bold text-tanseek-navy">{t('Add session to draft')}</h2>
            <p className="mt-1 text-xs leading-5 text-tanseek-muted">{t('Choose the actual day, time and room for this lecture or section. Hard overlaps are rejected in Mock API mode.')}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-brand-sm p-2 text-tanseek-muted hover:bg-tanseek-canvas hover:text-tanseek-navy"><Icon name="x" size={19}/></button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6">
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Course')} *</span><input autoFocus value={form.course} onChange={e=>update('course', e.target.value)} placeholder="Algorithms" className="h-10 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Course code')} *</span><input value={form.code} onChange={e=>update('code', e.target.value)} placeholder="CS210" className="h-10 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Section')} *</span><input value={form.section} onChange={e=>update('section', e.target.value)} placeholder="Year 2 · A" className="h-10 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Doctor / TA')} *</span><input value={form.staff} onChange={e=>update('staff', e.target.value)} placeholder="Dr. Ahmed Ali" className="h-10 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Session type')}</span><select value={form.type} onChange={e=>update('type', e.target.value)} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="Lecture">{t('Lecture')}</option><option value="Tutorial">{t('Tutorial')}</option><option value="Lab">{t('Lab')}</option></select></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Room / lab')} *</span><select disabled={loadingRooms} value={form.room} onChange={e=>update('room', e.target.value)} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm disabled:bg-tanseek-canvas"><option value="">{loadingRooms ? t('Loading rooms & labs…') : t('Select room / lab')}</option>{rooms.map(room=><option key={room.id} value={room.name} disabled={room.status !== 'available'}>{room.name} · {room.capacity} · {t(room.status === 'available' ? 'Available' : room.status === 'pending' ? 'Pending' : 'In conflict')}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Day')} *</span><select value={form.day} onChange={e=>update('day', e.target.value)} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">{days.map(day=><option key={day} value={day}>{t(day)}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Time slot')} *</span><select value={form.slot} onChange={e=>update('slot', e.target.value)} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">{slots.map(slot=><option key={slot.id} value={slot.id}>{slot.start}–{slot.end}</option>)}</select></label>

          <div className="md:col-span-2 rounded-brand-sm border border-tanseek-teal/20 bg-tanseek-tealSoft/50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-tanseek-muted">{t('Allocation preview')}</p>
            <p className="mt-2 text-sm font-bold text-tanseek-navy">{form.course || t('Course')} · {form.section || t('Section')}</p>
            <p className="mt-1 text-xs text-tanseek-muted">{t(form.day)} · {selectedSlot ? `${selectedSlot.start}–${selectedSlot.end}` : ''} · {form.room || t('Room / lab')}</p>
          </div>

          {error && <div className="md:col-span-2 rounded-brand-sm border border-tanseek-alert/25 bg-tanseek-alertSoft p-3 text-sm leading-5 text-tanseek-alert">{error}</div>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-tanseek-line bg-tanseek-canvas/60 p-4 sm:flex-row sm:justify-end md:px-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{t('Cancel')}</Button>
          <Button type="submit" icon="plus" disabled={saving || loadingRooms}>{saving ? t('Adding…') : t('Add to draft')}</Button>
        </div>
      </form>
    </div>
  )
}
