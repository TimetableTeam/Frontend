import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card, StatusBadge } from './UI'
import { Icon } from './Icons'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

const emptyForm = {
  course_id: '',
  section_id: '',
  student_group_ids: [],
  session_type: 'Lecture',
  duration_minutes: 120,
  weekly_count: 1,
  required_room_type: 'Classroom',
  required_equipment: [],
  preferred_windows: [],
  notes: '',
  coordinator_name: 'Mona Hassan',
}

function Field({ label, children, hint }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-tanseek-ink">{label}</span>{children}{hint && <span className="mt-1.5 block text-[11px] leading-4 text-tanseek-muted">{hint}</span>}</label>
}

export default function CoordinatorRequirements() {
  const [catalog, setCatalog] = useState(null)
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const formRef = useRef(null)
  const courseFieldRef = useRef(null)
  const { t } = useLanguage()

  async function load() {
    setLoading(true); setError('')
    try {
      const [catalogData, requirements] = await Promise.all([tanseekApi.getPlanningCatalog(), tanseekApi.getRequirements()])
      setCatalog(catalogData); setItems(requirements)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const selected = useMemo(() => items.find(r => Number(r.id) === Number(selectedId)), [items, selectedId])
  const visibleSections = useMemo(() => {
    if (!catalog) return []
    return form.course_id ? catalog.sections.filter(s => Number(s.course_id) === Number(form.course_id)) : catalog.sections
  }, [catalog, form.course_id])

  function scrollToEditor({ focusCourse = false } = {}) {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (focusCourse) window.setTimeout(() => courseFieldRef.current?.focus(), 450)
    })
  }

  function startNew() {
    setSelectedId(null)
    setForm({ ...emptyForm })
    setMessage(t('New requirement form is ready.'))
    setError('')
    scrollToEditor({ focusCourse: true })
  }

  function editRequirement(record) {
    setSelectedId(record.id)
    setForm({ ...emptyForm, ...record, student_group_ids: record.student_group_ids || [], required_equipment: record.required_equipment || [], preferred_windows: record.preferred_windows || [] })
    setMessage(''); setError('')
    scrollToEditor()
  }

  function toggleArray(field, value) {
    setForm(prev => ({ ...prev, [field]: prev[field].includes(value) ? prev[field].filter(v => v !== value) : [...prev[field], value] }))
  }

  function addPreferredWindow() {
    if (!catalog) return
    const next = catalog.days.flatMap(day => catalog.slots.map(slot => ({ day, slot_id: slot.id }))).find(candidate => !form.preferred_windows.some(w => w.day === candidate.day && w.slot_id === candidate.slot_id))
    if (next) setForm(prev => ({ ...prev, preferred_windows: [...prev.preferred_windows, next] }))
  }

  function updateWindow(index, patch) {
    setForm(prev => ({ ...prev, preferred_windows: prev.preferred_windows.map((w, i) => i === index ? { ...w, ...patch } : w) }))
  }

  async function save(e) {
    e.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      const payload = {
        ...form,
        course_id: Number(form.course_id),
        section_id: Number(form.section_id),
        student_group_ids: form.student_group_ids.map(Number),
        duration_minutes: Number(form.duration_minutes),
        weekly_count: Number(form.weekly_count),
      }
      const result = selectedId ? await tanseekApi.updateRequirement(selectedId, payload) : await tanseekApi.createRequirement(payload)
      setItems(prev => selectedId ? prev.map(r => Number(r.id) === Number(selectedId) ? result : r) : [result, ...prev])
      setSelectedId(result.id); setForm({ ...emptyForm, ...result })
      setMessage(result.state === 'READY' ? t('Requirement saved and ready for scheduling.') : t('Saved, but the requirement is still incomplete.'))
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const nameOfCourse = id => catalog?.courses.find(c => Number(c.id) === Number(id))
  const nameOfSection = id => catalog?.sections.find(s => Number(s.id) === Number(id))
  const equipmentLabel = id => catalog?.equipment.find(e => e.id === id)?.label || id

  return (
    <>
      <PageHeader eyebrow={t('Department coordinator')} title={t('Course & section requirements')} description={t('Define what each section needs before scheduling: session type, duration, student groups, room type, equipment and preferred teaching windows.')} actions={<Button icon="plus" onClick={startNew}>{t('New requirement')}</Button>} />

      {error && <div className="mb-5 rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft px-4 py-3 text-sm font-bold text-tanseek-alert">{error}</div>}
      {message && <div className="mb-5 rounded-brand border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{message}</div>}

      <div className="grid gap-6 2xl:grid-cols-[430px_1fr]">
        <Card className="self-start overflow-hidden">
          <div className="border-b border-tanseek-line p-5"><h2 className="text-lg font-bold text-tanseek-navy">{t('Submitted requirements')}</h2><p className="mt-1 text-xs text-tanseek-muted">{t('Coordinator-owned teaching demand')}</p></div>
          <div className="max-h-[720px] divide-y divide-tanseek-line overflow-y-auto custom-scrollbar">
            {loading && <div className="p-5 text-sm text-tanseek-muted">{t('Loading requirements…')}</div>}
            {!loading && items.map(item => {
              const course = nameOfCourse(item.course_id)
              const section = nameOfSection(item.section_id)
              return <button key={item.id} onClick={() => editRequirement(item)} className={`w-full p-5 text-left transition hover:bg-tanseek-canvas ${Number(selectedId) === Number(item.id) ? 'bg-tanseek-navySoft' : ''}`}>
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-tanseek-navy">{course?.code || t('Course')} · {t(item.session_type)}</p><p className="mt-1 text-xs text-tanseek-muted">{section?.name || `${t('Section')} ${item.section_id}`}</p></div><StatusBadge status={item.state === 'READY' ? 'ready' : 'pending'}>{item.state === 'READY' ? t('Ready') : t('Incomplete')}</StatusBadge></div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-tanseek-muted"><span>{item.duration_minutes} min</span><span>{item.weekly_count}× / week</span><span>{t(item.required_room_type || 'Any room')}</span><span>{(item.required_equipment || []).length} {t('equipment needs')}</span></div>
              </button>
            })}
          </div>
        </Card>

        <form ref={formRef} onSubmit={save} className="scroll-mt-6">
          <Card className="p-5 md:p-6">
            <div className="flex flex-col gap-3 border-b border-tanseek-line pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-tanseek-teal">{selected ? `${t('Requirement')} #${selected.id}` : t('New requirement')}</p><h2 className="mt-1 text-xl font-bold text-tanseek-navy">{t('Teaching requirement details')}</h2></div>{selected && <StatusBadge status={selected.state === 'READY' ? 'ready' : 'pending'}>{selected.state === 'READY' ? t('Ready for scheduling') : t('Incomplete')}</StatusBadge>}</div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label={t('Course')}><select ref={courseFieldRef} required value={form.course_id} onChange={e => setForm(p => ({ ...p, course_id: e.target.value, section_id: '' }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="">{t('Select course')}</option>{catalog?.courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></Field>
              <Field label={t('Section')}><select required value={form.section_id} onChange={e => setForm(p => ({ ...p, section_id: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="">{t('Select section')}</option>{visibleSections.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}</select></Field>
              <Field label={t('Session type')}><select value={form.session_type} onChange={e => setForm(p => ({ ...p, session_type: e.target.value, required_room_type: e.target.value === 'Lab' ? 'Computer Lab' : 'Classroom' }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">{catalog?.sessionTypes.map(v => <option key={v} value={v}>{t(v)}</option>)}</select></Field>
              <div className="grid grid-cols-2 gap-3"><Field label={t('Duration (min)')}><input type="number" min="30" step="30" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm" /></Field><Field label={t('Sessions / week')}><input type="number" min="1" max="6" value={form.weekly_count} onChange={e => setForm(p => ({ ...p, weekly_count: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm" /></Field></div>
            </div>

            <div className="mt-6 border-t border-tanseek-line pt-6"><h3 className="text-sm font-bold text-tanseek-navy">{t('Student groups')}</h3><p className="mt-1 text-xs text-tanseek-muted">{t('A section can include more than one student group.')}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{catalog?.studentGroups.map(group => <label key={group.id} className={`flex items-center justify-between rounded-brand-sm border px-3 py-3 text-sm ${form.student_group_ids.includes(group.id) ? 'border-tanseek-teal bg-tanseek-tealSoft' : 'border-tanseek-line bg-white'}`}><span><span className="font-bold text-tanseek-navy">{group.name}</span><span className="ml-2 text-xs text-tanseek-muted">{group.size} {t('students')}</span></span><input type="checkbox" checked={form.student_group_ids.includes(group.id)} onChange={() => toggleArray('student_group_ids', group.id)} /></label>)}</div></div>

            <div className="mt-6 grid gap-5 border-t border-tanseek-line pt-6 md:grid-cols-2"><Field label={t('Required room type')}><select value={form.required_room_type} onChange={e => setForm(p => ({ ...p, required_room_type: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="">{t('Any suitable space')}</option>{catalog?.roomTypes.map(v => <option key={v} value={v}>{t(v)}</option>)}</select></Field><Field label={t('Notes')}><input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm" placeholder={t('Special setup or constraint')} /></Field></div>

            <div className="mt-6"><h3 className="text-sm font-bold text-tanseek-navy">{t('Required equipment')}</h3><div className="mt-3 flex flex-wrap gap-2">{catalog?.equipment.map(eq => <button type="button" key={eq.id} onClick={() => toggleArray('required_equipment', eq.id)} className={`rounded-brand-sm border px-3 py-2 text-xs font-bold ${form.required_equipment.includes(eq.id) ? 'border-tanseek-teal bg-tanseek-tealSoft text-tanseek-navy' : 'border-tanseek-line bg-white text-tanseek-muted'}`}>{form.required_equipment.includes(eq.id) && <span className="mr-1">✓</span>}{eq.label}</button>)}</div></div>

            <div className="mt-6 border-t border-tanseek-line pt-6"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-tanseek-navy">{t('Preferred windows')}</h3><p className="mt-1 text-xs text-tanseek-muted">{t('Soft preferences only; the scheduler keeps final approval.')}</p></div><Button type="button" variant="secondary" icon="plus" onClick={addPreferredWindow}>{t('Add window')}</Button></div><div className="mt-3 space-y-2">{form.preferred_windows.length === 0 && <div className="rounded-brand-sm border border-dashed border-tanseek-line p-4 text-xs text-tanseek-muted">{t('No preferred windows yet.')}</div>}{form.preferred_windows.map((w, i) => <div key={`${w.day}-${w.slot_id}-${i}`} className="grid gap-2 rounded-brand-sm border border-tanseek-line bg-tanseek-canvas p-3 sm:grid-cols-[1fr_1fr_auto]"><select value={w.day} onChange={e => updateWindow(i, { day: e.target.value })} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">{catalog?.days.map(d => <option key={d} value={d}>{t(d)}</option>)}</select><select value={w.slot_id} onChange={e => updateWindow(i, { slot_id: e.target.value })} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">{catalog?.slots.map(s => <option key={s.id} value={s.id}>{s.start}–{s.end}</option>)}</select><button type="button" onClick={() => setForm(p => ({ ...p, preferred_windows: p.preferred_windows.filter((_, idx) => idx !== i) }))} className="grid h-10 w-10 place-items-center rounded-brand-sm border border-tanseek-line bg-white text-tanseek-muted hover:text-tanseek-alert"><Icon name="x" size={17}/></button></div>)}</div></div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-tanseek-line pt-5"><p className="text-xs text-tanseek-muted">{t('Equipment currently selected:')} {form.required_equipment.map(equipmentLabel).join(', ') || t('none')}</p><div className="flex gap-2"><Button type="button" variant="secondary" onClick={startNew}>{t('Reset')}</Button><Button type="submit" disabled={saving}>{saving ? t('Saving…') : selectedId ? t('Save changes') : t('Create requirement')}</Button></div></div>
          </Card>
        </form>
      </div>
    </>
  )
}
