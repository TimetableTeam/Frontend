import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card, StatusBadge } from './UI'
import { Icon } from './Icons'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

const emptyForm = {
  course_id: '',
  session_type: 'Lecture',
  duration_minutes: 120,
  weekly_count: 1,
  expected_students: 30,
  required_room_type: 'Classroom',
  required_equipment: [],
  preferred_windows: [],
  notes: '',
}

function Field({ label, children, hint }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-tanseek-ink">{label}</span>{children}{hint && <span className="mt-1.5 block text-[11px] leading-4 text-tanseek-muted">{hint}</span>}</label>
}

export default function CoordinatorRequirements({ currentUser }) {
  const [catalog, setCatalog] = useState(null)
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [newEquipmentName, setNewEquipmentName] = useState('')
  const [addingEquipment, setAddingEquipment] = useState(false)
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

  const isSuperAdmin = currentUser?.role === 'super_admin'
  const courseInScope = course => isSuperAdmin || (
    (currentUser?.department_id && Number(course?.department_id) === Number(currentUser.department_id)) ||
    (currentUser?.department_name && String(course?.department || '').toLowerCase() === String(currentUser.department_name).toLowerCase())
  )
  const visibleCourses = useMemo(() => (catalog?.courses || []).filter(courseInScope), [catalog, currentUser?.department_id, currentUser?.department_name, isSuperAdmin])
  const visibleItems = useMemo(() => items.filter(item => {
    const course = catalog?.courses?.find(c => Number(c.id) === Number(item.course_id))
    return course && courseInScope(course)
  }), [items, catalog, currentUser?.department_id, currentUser?.department_name, isSuperAdmin])
  const selected = useMemo(() => visibleItems.find(item => Number(item.id) === Number(selectedId)), [visibleItems, selectedId])
  const nameOfCourse = id => catalog?.courses.find(c => Number(c.id) === Number(id))
  const equipmentLabel = id => catalog?.equipment.find(e => Number(e.id) === Number(id))?.label || id

  function scrollToEditor() {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => courseFieldRef.current?.focus(), 350)
    })
  }

  function startNew() {
    setSelectedId(null); setForm({ ...emptyForm }); setMessage(t('Creating a new requirement.')); setError(''); scrollToEditor()
  }

  function editRequirement(item) {
    setSelectedId(item.id)
    setForm({
      course_id: item.course_id || '',
      session_type: item.session_type || 'Lecture',
      duration_minutes: item.duration_minutes || 120,
      weekly_count: item.weekly_count || 1,
      expected_students: item.expected_students || 30,
      required_room_type: item.required_room_type || (item.session_type === 'Practical' ? 'Computer Lab' : 'Classroom'),
      required_equipment: item.required_equipment || [],
      preferred_windows: item.preferred_windows || [],
      notes: item.notes || '',
    })
    setMessage(''); setError(''); scrollToEditor()
  }

  function toggleArray(key, value) {
    setForm(prev => ({ ...prev, [key]: prev[key].includes(value) ? prev[key].filter(item => item !== value) : [...prev[key], value] }))
  }

  async function addEquipment() {
    const name = newEquipmentName.trim()
    if (!name) return
    setAddingEquipment(true); setError(''); setMessage('')
    try {
      const item = await tanseekApi.createEquipment({ name })
      const equipmentId = Number(item.id)
      setCatalog(prev => ({
        ...prev,
        equipment: [...(prev?.equipment || []).filter(eq => Number(eq.id) !== equipmentId), { id: equipmentId, name: item.name, label: item.label || item.name }]
          .sort((a, b) => String(a.label).localeCompare(String(b.label)))
      }))
      setForm(prev => ({ ...prev, required_equipment: prev.required_equipment.includes(equipmentId) ? prev.required_equipment : [...prev.required_equipment, equipmentId] }))
      setNewEquipmentName('')
      setMessage(t(item.created === false ? 'Equipment already exists and was selected.' : 'Equipment added and selected.'))
    } catch (e) {
      setError(e.message || t('Could not add equipment.'))
    } finally {
      setAddingEquipment(false)
    }
  }

  function addPreferredWindow() {
    const firstDay = catalog?.days?.[0] || 'Saturday'
    const firstSlot = catalog?.slots?.[0]?.id || 's1'
    setForm(prev => ({ ...prev, preferred_windows: [...prev.preferred_windows, { day: firstDay, slot_id: firstSlot }] }))
  }

  function updateWindow(index, patch) {
    setForm(prev => ({ ...prev, preferred_windows: prev.preferred_windows.map((item, i) => i === index ? { ...item, ...patch } : item) }))
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true); setError(''); setMessage('')
    try {
      const payload = {
        ...form,
        course_id: Number(form.course_id),
        duration_minutes: Number(form.duration_minutes),
        weekly_count: Number(form.weekly_count),
        expected_students: Number(form.expected_students),
      }
      if (selectedId) await tanseekApi.updateRequirement(selectedId, payload)
      else await tanseekApi.createRequirement(payload)
      setMessage(t(selectedId ? 'Requirement updated.' : 'Requirement created.'))
      await load()
      if (!selectedId) setForm({ ...emptyForm })
    } catch (e) { setError(e.message || t('Could not save requirement.')) }
    finally { setSaving(false) }
  }

  return (
    <>
      <PageHeader
        eyebrow={t('Department Coordinator')}
        title={t('Course requirements')}
        description={t('Define one Lecture and/or Practical requirement for each course. Sections are created separately, then instructors and students are assigned before scheduling.')}
        actions={<Button icon="plus" onClick={startNew}>{t('New requirement')}</Button>}
      />

      {error && <div className="mb-5 rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft px-4 py-3 text-sm font-bold text-tanseek-alert">{error}</div>}
      {message && <div className="mb-5 rounded-brand border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{message}</div>}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="self-start overflow-hidden">
          <div className="border-b border-tanseek-line p-5"><h2 className="text-lg font-bold text-tanseek-navy">{t('Submitted requirements')}</h2><p className="mt-1 text-xs text-tanseek-muted">{t('Course-level Lecture / Practical demand')}</p></div>
          <div className="max-h-[720px] divide-y divide-tanseek-line overflow-y-auto custom-scrollbar">
            {loading && <div className="p-5 text-sm text-tanseek-muted">{t('Loading requirements…')}</div>}
            {!loading && visibleItems.map(item => {
              const course = nameOfCourse(item.course_id)
              return <button key={item.id} onClick={() => editRequirement(item)} className={`w-full p-5 text-left transition hover:bg-tanseek-canvas ${Number(selectedId) === Number(item.id) ? 'bg-tanseek-navySoft' : ''}`}>
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-tanseek-navy">{course?.code || t('Course')} · {t(item.session_type)}</p><p className="mt-1 text-xs text-tanseek-muted">{item.expected_students || 0} {t('students')} · {item.weekly_count}× / {t('week')}</p></div><StatusBadge status={item.state === 'READY' ? 'ready' : 'pending'}>{item.state === 'READY' ? t('Ready') : t('Incomplete')}</StatusBadge></div>
                <p className="mt-3 text-xs text-tanseek-muted">{item.duration_minutes} min · {t(item.required_room_type || 'Any room')} · {(item.required_equipment || []).length} {t('equipment needs')}</p>
              </button>
            })}
          </div>
        </Card>

        <form ref={formRef} onSubmit={save} className="min-w-0 scroll-mt-6">
          <Card className="p-5 md:p-6">
            <div className="flex flex-col gap-3 border-b border-tanseek-line pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-tanseek-teal">{selected ? `${t('Requirement')} #${selected.id}` : t('New requirement')}</p><h2 className="mt-1 text-xl font-bold text-tanseek-navy">{t('Teaching requirement details')}</h2></div>{selected && <StatusBadge status={selected.state === 'READY' ? 'ready' : 'pending'}>{selected.state === 'READY' ? t('Ready for scheduling') : t('Incomplete')}</StatusBadge>}</div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label={t('Course')}><select ref={courseFieldRef} required value={form.course_id} onChange={e => setForm(p => ({ ...p, course_id: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="">{t('Select course')}</option>{visibleCourses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></Field>
              <Field label={t('Component')}><select value={form.session_type} onChange={e => setForm(p => ({ ...p, session_type: e.target.value, required_room_type: e.target.value === 'Practical' ? 'Computer Lab' : 'Classroom' }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="Lecture">{t('Lecture')}</option><option value="Practical">{t('Practical')}</option></select></Field>
              <div className="grid grid-cols-2 gap-3"><Field label={t('Duration (min)')}><input type="number" min="30" step="30" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm" /></Field><Field label={t('Sessions / week')}><input type="number" min="1" max="6" value={form.weekly_count} onChange={e => setForm(p => ({ ...p, weekly_count: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm" /></Field></div>
              <Field label={t('Expected students')} hint={t('Used for room-capacity validation before final section distribution.')}><input type="number" min="1" value={form.expected_students} onChange={e => setForm(p => ({ ...p, expected_students: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm" /></Field>
            </div>

            <div className="mt-6 grid gap-5 border-t border-tanseek-line pt-6 md:grid-cols-2"><Field label={t('Required room type')}><select value={form.required_room_type} onChange={e => setForm(p => ({ ...p, required_room_type: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="">{t('Any suitable space')}</option>{catalog?.roomTypes.map(v => <option key={v} value={v}>{t(v)}</option>)}</select></Field><Field label={t('Notes')}><input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm" placeholder={t('Special setup or constraint')} /></Field></div>

            <div className="mt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-tanseek-navy">{t('Required equipment')}</h3>
                  <p className="mt-1 text-xs text-tanseek-muted">{t('Select existing equipment or add a new requirement item for your department.')}</p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <input
                    value={newEquipmentName}
                    onChange={e => setNewEquipmentName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEquipment() } }}
                    placeholder={t('e.g. Smart board')}
                    className="h-10 min-w-0 flex-1 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm sm:w-52"
                  />
                  <Button type="button" variant="secondary" icon="plus" onClick={addEquipment} disabled={addingEquipment || !newEquipmentName.trim()}>
                    {addingEquipment ? t('Adding…') : t('Add equipment')}
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(catalog?.equipment || []).map(eq => {
                  const id = Number(eq.id)
                  const selectedEquipment = form.required_equipment.map(Number).includes(id)
                  return <button type="button" key={eq.id} onClick={() => toggleArray('required_equipment', id)} className={`rounded-brand-sm border px-3 py-2 text-xs font-bold ${selectedEquipment ? 'border-tanseek-teal bg-tanseek-tealSoft text-tanseek-navy' : 'border-tanseek-line bg-white text-tanseek-muted'}`}>{selectedEquipment && <span className="mr-1">✓</span>}{eq.label}</button>
                })}
              </div>
            </div>

            <div className="mt-6 border-t border-tanseek-line pt-6"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-tanseek-navy">{t('Preferred windows')}</h3><p className="mt-1 text-xs text-tanseek-muted">{t('Soft preferences only; hard availability rules are provided by Lecturer / TA.')}</p></div><Button type="button" variant="secondary" icon="plus" onClick={addPreferredWindow}>{t('Add window')}</Button></div><div className="mt-3 space-y-2">{form.preferred_windows.length === 0 && <div className="rounded-brand-sm border border-dashed border-tanseek-line p-4 text-xs text-tanseek-muted">{t('No preferred windows yet.')}</div>}{form.preferred_windows.map((w, i) => <div key={`${w.day}-${w.slot_id}-${i}`} className="grid gap-2 rounded-brand-sm border border-tanseek-line bg-tanseek-canvas p-3 sm:grid-cols-[1fr_1fr_auto]"><select value={w.day} onChange={e => updateWindow(i, { day: e.target.value })} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">{catalog?.days.map(d => <option key={d} value={d}>{t(d)}</option>)}</select><select value={w.slot_id} onChange={e => updateWindow(i, { slot_id: e.target.value })} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">{catalog?.slots.map(s => <option key={s.id} value={s.id}>{s.start}–{s.end}</option>)}</select><button type="button" onClick={() => setForm(p => ({ ...p, preferred_windows: p.preferred_windows.filter((_, idx) => idx !== i) }))} className="grid h-10 w-10 place-items-center rounded-brand-sm border border-tanseek-line bg-white text-tanseek-muted hover:text-tanseek-alert"><Icon name="x" size={17}/></button></div>)}</div></div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-tanseek-line pt-5"><p className="text-xs text-tanseek-muted">{t('Equipment currently selected:')} {form.required_equipment.map(equipmentLabel).join(', ') || t('none')}</p><div className="flex gap-2"><Button type="button" variant="secondary" onClick={startNew}>{t('Reset')}</Button><Button type="submit" disabled={saving}>{saving ? t('Saving…') : selectedId ? t('Save changes') : t('Create requirement')}</Button></div></div>
          </Card>
        </form>
      </div>
    </>
  )
}
