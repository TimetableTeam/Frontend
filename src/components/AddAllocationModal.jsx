import React, { useEffect, useMemo, useState } from 'react'
import { Button } from './UI'
import { Icon } from './Icons'
import { days, slots } from '../data/mockData'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

const initialForm = {
  section_id: '',
  day: 'Saturday',
  slot: 's1',
  room: '',
}

export default function AddAllocationModal({ open, onClose, onAdd, user }) {
  const { t } = useLanguage()
  const [form, setForm] = useState(initialForm)
  const [rooms, setRooms] = useState([])
  const [catalog, setCatalog] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(initialForm)
    setError('')
    setLoading(true)
    Promise.all([
      tanseekApi.getRooms(),
      tanseekApi.getPlanningCatalog(),
      tanseekApi.getInstructorAssignments(),
    ])
      .then(([roomsPayload, catalogPayload, assignmentPayload]) => {
        const roomList = Array.isArray(roomsPayload) ? roomsPayload : roomsPayload?.rooms || []
        setRooms(roomList)
        setCatalog(catalogPayload)
        setAssignments(assignmentPayload?.assignments || [])
        setForm(current => ({ ...current, room: roomList.find(item => item.status === 'available')?.name || roomList[0]?.name || '' }))
      })
      .catch(err => setError(err?.message || t('Could not load scheduling data.')))
      .finally(() => setLoading(false))
  }, [open])

  const visibleSections = useMemo(() => {
    const all = catalog?.sections || []
    if (user?.role !== 'admin' || !user?.department_id) return all
    return all.filter(section => {
      const course = catalog?.courses?.find(item => Number(item.id) === Number(section.course_id))
      return Number(course?.department_id) === Number(user.department_id)
    })
  }, [catalog, user?.role, user?.department_id])
  const selectedSection = useMemo(() => visibleSections.find(item => String(item.id) === String(form.section_id)) || null, [visibleSections, form.section_id])
  const selectedCourse = useMemo(() => catalog?.courses?.find(item => Number(item.id) === Number(selectedSection?.course_id)) || null, [catalog, selectedSection])
  const assignment = useMemo(() => assignments.find(item => Number(item.section_id) === Number(selectedSection?.id)) || null, [assignments, selectedSection])
  const selectedSlot = useMemo(() => slots.find(item => item.id === form.slot), [form.slot])

  if (!open) return null

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!selectedSection || !selectedCourse || !form.room || !form.day || !form.slot) {
      setError(t('Complete all required session fields.'))
      return
    }
    if (!assignment) {
      setError(t('This section has no instructor assignment. Ask the Department Coordinator to assign a Lecturer or TA first.'))
      return
    }

    setSaving(true)
    try {
      await onAdd({
        section_id: selectedSection.id,
        course_id: selectedCourse.id,
        instructor_id: assignment.staff_id,
        course: selectedCourse.name,
        code: selectedCourse.code,
        section: selectedSection.code,
        staff: assignment.staff_name,
        type: selectedSection.component === 'PRACTICAL' ? 'Practical' : 'Lecture',
        department_id: selectedCourse.department_id || null,
        day: form.day,
        slot: form.slot,
        room: form.room,
      })
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
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-tanseek-muted">Fall 2026 · Draft</p>
            <h2 className="mt-1 text-xl font-bold text-tanseek-navy">{t('Add session to draft')}</h2>
            <p className="mt-1 text-xs leading-5 text-tanseek-muted">{t('The Department Coordinator already owns section and instructor assignment. The Scheduler only chooses the time and room.')}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-brand-sm p-2 text-tanseek-muted hover:bg-tanseek-canvas hover:text-tanseek-navy"><Icon name="x" size={19}/></button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6">
          <label className="md:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Section')} *</span>
            <select autoFocus disabled={loading} value={form.section_id} onChange={e => update('section_id', e.target.value)} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm disabled:bg-tanseek-canvas">
              <option value="">{loading ? t('Loading…') : t('Select section')}</option>
              {visibleSections.map(section => {
                const course = catalog?.courses?.find(item => Number(item.id) === Number(section.course_id))
                return <option key={section.id} value={section.id}>{section.code} · {course?.name || ''} · {t(section.component === 'PRACTICAL' ? 'Practical' : 'Lecture')}</option>
              })}
            </select>
          </label>

          <div className="rounded-brand-sm border border-tanseek-line bg-tanseek-canvas p-3">
            <p className="text-[11px] font-bold uppercase tracking-[.08em] text-tanseek-muted">{t('Course')}</p>
            <p className="mt-1 text-sm font-bold text-tanseek-navy">{selectedCourse ? `${selectedCourse.code} — ${selectedCourse.name}` : '—'}</p>
          </div>
          <div className="rounded-brand-sm border border-tanseek-line bg-tanseek-canvas p-3">
            <p className="text-[11px] font-bold uppercase tracking-[.08em] text-tanseek-muted">{t('Assigned instructor')}</p>
            <p className="mt-1 text-sm font-bold text-tanseek-navy">{assignment?.staff_name || t('Not assigned yet')}</p>
            {selectedSection && !assignment && <p className="mt-1 text-[11px] text-tanseek-alert">{t('Coordinator action required before scheduling.')}</p>}
          </div>

          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Room / lab')} *</span><select disabled={loading} value={form.room} onChange={e=>update('room', e.target.value)} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm disabled:bg-tanseek-canvas"><option value="">{loading ? t('Loading rooms & labs…') : t('Select room / lab')}</option>{rooms.map(room=><option key={room.id} value={room.name} disabled={room.status !== 'available'}>{room.name} · {room.capacity} · {t(room.status === 'available' ? 'Available' : room.status === 'pending' ? 'Pending' : 'In conflict')}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Day')} *</span><select value={form.day} onChange={e=>update('day', e.target.value)} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">{days.map(day=><option key={day} value={day}>{t(day)}</option>)}</select></label>
          <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Time slot')} *</span><select value={form.slot} onChange={e=>update('slot', e.target.value)} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">{slots.map(slot=><option key={slot.id} value={slot.id}>{slot.start}–{slot.end}</option>)}</select></label>

          <div className="md:col-span-2 rounded-brand-sm border border-tanseek-teal/20 bg-tanseek-tealSoft/50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-tanseek-muted">{t('Allocation preview')}</p>
            <p className="mt-2 text-sm font-bold text-tanseek-navy">{selectedCourse?.name || t('Course')} · {selectedSection?.code || t('Section')}</p>
            <p className="mt-1 text-xs text-tanseek-muted">{assignment?.staff_name || t('Instructor not assigned')} · {t(form.day)} · {selectedSlot ? `${selectedSlot.start}–${selectedSlot.end}` : ''} · {form.room || t('Room / lab')}</p>
          </div>

          {error && <div className="md:col-span-2 rounded-brand-sm border border-tanseek-alert/25 bg-tanseek-alertSoft p-3 text-sm leading-5 text-tanseek-alert">{error}</div>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-tanseek-line bg-tanseek-canvas/60 p-4 sm:flex-row sm:justify-end md:px-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{t('Cancel')}</Button>
          <Button type="submit" icon="plus" disabled={saving || loading || !assignment}>{saving ? t('Adding…') : t('Add to draft')}</Button>
        </div>
      </form>
    </div>
  )
}
