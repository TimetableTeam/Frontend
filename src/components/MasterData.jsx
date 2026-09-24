import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card, StatusBadge } from './UI'
import { Icon } from './Icons'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

const tabs = [
  ['terms', 'Academic terms'],
  ['courses', 'Courses'],
  ['sections', 'Sections'],
  ['slots', 'Time slots'],
]

const emptyByTab = {
  terms: {
    name: '',
    start: '',
    availability_deadline: '',
    holidays_text: '',
    status: 'Draft',
  },
  courses: { code: '', name: '', department: '', contact_hours: 3 },
  sections: { code: '', course_id: '', component: 'LECTURE', size: 0 },
  slots: { start: '', end: '' },
}

function Field({ label, children, hint, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-bold text-tanseek-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] leading-4 text-tanseek-muted">{hint}</span>}
    </label>
  )
}

export default function MasterData({
  allowedTabs = ['terms', 'courses', 'sections', 'slots'],
  initialTab,
  currentUser,
  eyebrow,
  pageTitle,
  description,
}) {
  const { t } = useLanguage()
  const visibleTabs = useMemo(() => tabs.filter(([id]) => allowedTabs.includes(id)), [allowedTabs])
  const firstTab = initialTab && allowedTabs.includes(initialTab) ? initialTab : (visibleTabs[0]?.[0] || 'terms')
  const [tab, setTab] = useState(firstTab)
  const [rows, setRows] = useState([])
  const [catalog, setCatalog] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...emptyByTab[firstTab] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [endingTermId, setEndingTermId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')

  useEffect(() => {
    if (!allowedTabs.includes(tab)) setTab(firstTab)
  }, [allowedTabs, firstTab, tab])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [data, planning] = await Promise.all([
        tanseekApi.getMasterData(tab),
        tanseekApi.getPlanningCatalog(),
      ])
      setRows(data.records || [])
      setCatalog(planning)
    } catch (e) {
      setError(e.message || t('Could not load master data.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setFilterQuery('')
    setFilterOpen(false)
    setEditorOpen(false)
    load()
  }, [tab])

  const title = tabs.find(x => x[0] === tab)?.[1]
  const canAdd = tab !== 'slots'
  const departmentScope = currentUser?.department_name && currentUser.department_name !== 'University-wide access'
    ? currentUser.department_name
    : ''

  const visibleCourses = useMemo(() => {
    const courses = catalog?.courses || []
    if (!departmentScope) return courses
    return courses.filter(course => String(course.department || '') === String(departmentScope))
  }, [catalog, departmentScope])

  function openNew() {
    if (!emptyByTab[tab]) return
    setEditingId(null)
    const next = { ...emptyByTab[tab] }
    if (tab === 'courses' && departmentScope) next.department = departmentScope
    setForm(next)
    setMessage('')
    setError('')
    setEditorOpen(true)
  }

  function openEdit(row) {
    if (tab === 'slots') return
    setEditingId(row.id)
    if (tab === 'terms') {
      setForm({
        name: row.name || '',
        start: row.start || '',
        availability_deadline: row.availability_deadline || row.availabilityDeadline || '',
        holidays_text: Array.isArray(row.holidays) ? row.holidays.join('\n') : '',
        status: String(row.status || '').toLowerCase() === 'active' ? 'Active' : 'Draft',
      })
    }
    if (tab === 'courses') setForm({ code: row.code || '', name: row.name || '', department: row.department || departmentScope || '', contact_hours: row.contact_hours ?? row.hours ?? 3 })
    if (tab === 'sections') setForm({ code: row.code || '', course_id: row.course_id || '', component: String(row.component || 'LECTURE').toUpperCase(), size: row.size || 0 })
    setMessage('')
    setError('')
    setEditorOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      let payload
      if (tab === 'sections') {
        payload = { ...form, course_id: Number(form.course_id), component: String(form.component || 'LECTURE').toUpperCase(), size: Number(form.size) }
      } else if (tab === 'courses') {
        payload = { ...form, department: departmentScope || form.department, contact_hours: Number(form.contact_hours) }
      } else if (tab === 'terms') {
        payload = {
          ...form,
          holidays: String(form.holidays_text || '').split(/\n|,/).map(item => item.trim()).filter(Boolean),
        }
        delete payload.holidays_text
      } else {
        payload = form
      }

      if (editingId) await tanseekApi.updateMasterData(tab, editingId, payload)
      else await tanseekApi.createMasterData(tab, payload)
      setEditorOpen(false)
      setMessage(t(tab === 'slots' ? 'Time slot added.' : (editingId ? 'Record updated.' : 'Record created.')))
      await load()
    } catch (e2) {
      setError(e2.message || t('Could not save this record.'))
    } finally {
      setSaving(false)
    }
  }

  async function endTerm(row) {
    const confirmed = window.confirm(t('End this term today? The end date will be set automatically and the term will be archived.'))
    if (!confirmed) return
    setEndingTermId(row.id)
    setError('')
    setMessage('')
    try {
      await tanseekApi.endAcademicTerm(row.id)
      setMessage(t('Term ended successfully.'))
      await load()
    } catch (e) {
      setError(e.message || t('Could not end this term.'))
    } finally {
      setEndingTermId(null)
    }
  }

  const courseName = id => catalog?.courses.find(c => Number(c.id) === Number(id))

  const filteredRows = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    const departmentRows = (tab === 'courses' && departmentScope)
      ? rows.filter(row => String(row.department || '') === String(departmentScope))
      : (tab === 'sections' && departmentScope)
        ? rows.filter(row => {
            const course = courseName(row.course_id)
            return String(course?.department || '') === String(departmentScope)
          })
        : rows

    if (!q) return departmentRows

    return departmentRows.filter(row => {
      if (tab === 'terms') return [row.name, row.start, row.end, row.availability_deadline, row.status].filter(Boolean).some(value => String(value).toLowerCase().includes(q))
      if (tab === 'courses') return [row.code, row.name, row.department, row.contact_hours].filter(Boolean).some(value => String(value).toLowerCase().includes(q))
      if (tab === 'sections') {
        const course = courseName(row.course_id)
        return [row.code, course?.code, course?.name, row.component, row.size].filter(Boolean).some(value => String(value).toLowerCase().includes(q))
      }
      if (tab === 'slots') return [row.start, row.end].filter(Boolean).some(value => String(value).toLowerCase().includes(q))
      return true
    })
  }, [rows, filterQuery, tab, catalog, departmentScope])

  const defaultEyebrow = allowedTabs.includes('terms') ? 'System setup' : 'Department coordination'
  const defaultTitle = visibleTabs.length === 1 ? visibleTabs[0][1] : (allowedTabs.includes('terms') ? 'Academic term setup' : 'Academic catalog')
  const defaultDescription = allowedTabs.includes('terms')
    ? 'Configure the academic term and review the fixed time-slot policy before departments begin planning.'
    : 'Maintain the courses and sections owned by your department. Scheduling requirements are defined separately.'
  const showTabRail = visibleTabs.length > 1

  return (
    <>
      <PageHeader
        eyebrow={t(eyebrow || defaultEyebrow)}
        title={t(pageTitle || defaultTitle)}
        description={t(description || defaultDescription)}
        actions={canAdd ? <Button icon="plus" onClick={openNew}>{t('Add record')}</Button> : null}
      />

      {error && <div className="mb-5 rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft px-4 py-3 text-sm font-bold text-tanseek-alert">{error}</div>}
      {message && <div className="mb-5 rounded-brand border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{message}</div>}

      <div className={showTabRail ? 'grid min-w-0 gap-6 xl:grid-cols-[240px_minmax(0,1fr)]' : 'min-w-0'}>
        {showTabRail && (
          <Card className="self-start p-2">
            {visibleTabs.map(([id, label]) => (
              <button key={id} onClick={()=>setTab(id)} className={`flex w-full items-center justify-between rounded-brand-sm px-3 py-3 text-left text-sm font-bold ${tab===id?'bg-tanseek-navy text-white':'text-tanseek-muted hover:bg-tanseek-canvas hover:text-tanseek-navy'}`}>
                {t(label)}<Icon name="chevron" size={16}/>
              </button>
            ))}
            {allowedTabs.includes('terms') && (
              <div className="mt-2 border-t border-tanseek-line px-3 py-4 text-xs leading-5 text-tanseek-muted">
                {t('Working days')}: {t('Saturday')}–{t('Wednesday')}<br/>
                {t('Teaching hours')}: 09:00–17:00<br/>
                {t('Slot length')}: {t('2 hours')}<br/>
                {t('Breaks')}: {t('none')}
              </div>
            )}
          </Card>
        )}

        <div className="min-w-0 space-y-4">
          {(tab === 'courses' || tab === 'sections') && (
            <div className="rounded-brand border border-tanseek-teal/20 bg-tanseek-tealSoft px-4 py-3 text-xs leading-5 text-tanseek-ink">
              <strong>{t('Master data vs requirements:')}</strong>{' '}
              {tab === 'courses'
                ? t('A course record only defines the course itself. Session duration, room/lab needs, equipment and preferred windows belong to the Coordinator Requirements screen.')
                : t('A section belongs to one course component (Lecture or Practical). Students are assigned to sections later from Section Assignments; duration, room/lab needs and equipment belong to Requirements.')}
            </div>
          )}

          {tab === 'terms' && (
            <div className="rounded-brand border border-tanseek-teal/20 bg-tanseek-tealSoft px-4 py-3 text-xs leading-5 text-tanseek-ink">
              <strong>{t('Scheduling policy:')}</strong> {t('Saturday through Wednesday, 09:00–17:00, four two-hour slots and no breaks. Time slots are generated from this policy; they are not edited by the Scheduler.')}
            </div>
          )}

          {tab === 'slots' && (
            <div className="rounded-brand border border-tanseek-line bg-tanseek-canvas px-4 py-3 text-xs leading-5 text-tanseek-muted">
              <strong className="text-tanseek-navy">{t('Time-slot policy')}</strong> — {t('Time slots belong to the active term and apply across Saturday through Wednesday. The Super Admin can add missing two-hour slots here.')}
            </div>
          )}

          <Card className="min-w-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-tanseek-line p-5">
              <div><h2 className="text-lg font-bold text-tanseek-navy">{t(title)}</h2><p className="mt-1 text-xs text-tanseek-muted">{tab === 'terms' ? t('Global academic setup managed by the Super Admin.') : t('Department-scoped academic records used by Requirements and scheduling.')}</p></div>
              <div className="flex items-center gap-2">
                {tab === 'slots' && <Button icon="plus" onClick={openNew}>{t('Add time slot')}</Button>}
                <Button variant="secondary" icon="filter" onClick={() => setFilterOpen(prev => !prev)}>{t('Filter')}</Button>
              </div>
            </div>

            {filterOpen && (
              <div className="border-b border-tanseek-line bg-tanseek-canvas/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1"><div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-tanseek-muted"><Icon name="search" size={17}/></div><input value={filterQuery} onChange={e=>setFilterQuery(e.target.value)} placeholder={t('Search records...')} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white pl-10 pr-3 text-sm text-tanseek-ink outline-none focus:border-tanseek-teal"/></div>
                  {filterQuery && <button type="button" onClick={()=>setFilterQuery('')} className="rounded-brand-sm border border-tanseek-line bg-white px-3 py-2 text-xs font-bold text-tanseek-muted hover:text-tanseek-navy">{t('Clear')}</button>}
                </div>
              </div>
            )}

            <div className="custom-scrollbar w-full min-w-0 overflow-x-auto">
              {loading && <div className="p-6 text-sm text-tanseek-muted">{t('Loading master data…')}</div>}

              {!loading && tab === 'terms' && (
                <table className="min-w-[980px] w-full text-left"><thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted"><tr><th className="px-5 py-3">{t('Term')}</th><th className="px-5 py-3">{t('Start')}</th><th className="px-5 py-3">{t('End')}</th><th className="px-5 py-3">{t('Availability deadline')}</th><th className="px-5 py-3">{t('Status')}</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-tanseek-line">{filteredRows.map(r=>{ const active=String(r.status||'').toLowerCase()==='active'; const ended=String(r.status||'').toLowerCase()==='ended'; return <tr key={r.id}><td className="px-5 py-4 text-sm font-bold text-tanseek-navy">{r.name}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.start}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.end || (active ? t('Not ended yet') : '—')}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.availability_deadline || r.availabilityDeadline || '—'}</td><td className="px-5 py-4"><StatusBadge status={String(r.status).toLowerCase()}>{t(r.status)}</StatusBadge></td><td className="px-5 py-4"><div className="flex items-center justify-end gap-3">{active && <button type="button" disabled={endingTermId===r.id} onClick={()=>endTerm(r)} className="rounded-brand-sm border border-tanseek-alert/25 bg-tanseek-alertSoft px-3 py-2 text-xs font-bold text-tanseek-alert hover:opacity-80 disabled:cursor-wait disabled:opacity-60">{endingTermId===r.id ? t('Ending…') : t('End term')}</button>}{!ended && <button type="button" onClick={()=>openEdit(r)} className="text-tanseek-muted hover:text-tanseek-navy"><Icon name="edit" size={17}/></button>}</div></td></tr>})}</tbody></table>
              )}

              {!loading && tab === 'slots' && (
                <table className="min-w-[600px] w-full text-left"><thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted"><tr><th className="px-5 py-3">{t('Slot')}</th><th className="px-5 py-3">{t('Start')}</th><th className="px-5 py-3">{t('End')}</th><th className="px-5 py-3">{t('Duration')}</th></tr></thead><tbody className="divide-y divide-tanseek-line">{filteredRows.map((r,i)=><tr key={r.id}><td className="px-5 py-4 text-sm font-bold text-tanseek-navy">{t('Slot')} {i+1}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.start}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.end}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{t('2 hours')}</td></tr>)}</tbody></table>
              )}

              {!loading && tab === 'courses' && (
                <table className="min-w-[760px] w-full text-left"><thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted"><tr><th className="px-5 py-3">{t('Code')}</th><th className="px-5 py-3">{t('Course')}</th><th className="px-5 py-3">{t('Department')}</th><th className="px-5 py-3">{t('Contact hours')}</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-tanseek-line">{filteredRows.map(r=><tr key={r.id}><td className="px-5 py-4 text-sm font-bold text-tanseek-navy">{r.code}</td><td className="px-5 py-4 text-sm text-tanseek-ink">{r.name}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.department}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.contact_hours}</td><td className="px-5 py-4"><button onClick={()=>openEdit(r)} className="text-tanseek-muted hover:text-tanseek-navy"><Icon name="edit" size={17}/></button></td></tr>)}</tbody></table>
              )}

              {!loading && tab === 'sections' && (
                <table className="min-w-[760px] w-full text-left"><thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted"><tr><th className="px-5 py-3">{t('Section')}</th><th className="px-5 py-3">{t('Course')}</th><th className="px-5 py-3">{t('Component')}</th><th className="px-5 py-3">{t('Section size')}</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-tanseek-line">{filteredRows.map(r=>{ const course=courseName(r.course_id); return <tr key={r.id}><td className="px-5 py-4 text-sm font-bold text-tanseek-navy">{r.code}</td><td className="px-5 py-4 text-sm text-tanseek-ink">{course ? `${course.code} — ${course.name}` : r.course_id}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{t(String(r.component || 'LECTURE').toUpperCase() === 'PRACTICAL' ? 'Practical' : 'Lecture')}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.size}</td><td className="px-5 py-4"><button onClick={()=>openEdit(r)} className="text-tanseek-muted hover:text-tanseek-navy"><Icon name="edit" size={17}/></button></td></tr>})}</tbody></table>
              )}

              {!loading && filteredRows.length === 0 && <div className="p-8 text-center text-sm text-tanseek-muted">{filterQuery ? t('No matching records.') : t('No records yet.')}</div>}
            </div>
          </Card>
        </div>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tanseek-navy/45 p-4" onMouseDown={()=>!saving&&setEditorOpen(false)}>
          <form onSubmit={save} className="custom-scrollbar max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-brand border border-tanseek-line bg-white p-6 shadow-soft" onMouseDown={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-tanseek-teal">{t(editingId ? 'Edit master record' : 'New master record')}</p><h2 className="mt-1 text-xl font-bold text-tanseek-navy">{t(editingId ? 'Edit' : 'Add')} {t(tab === 'slots' ? 'time slot' : title)}</h2></div><button type="button" onClick={()=>setEditorOpen(false)} className="rounded p-2 text-tanseek-muted hover:bg-tanseek-canvas"><Icon name="x"/></button></div>

            {tab === 'terms' && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label={t('Term name')} className="sm:col-span-2"><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm" placeholder="Fall 2027"/></Field>
                <Field label={t('Start date')}><input required type="date" value={form.start} onChange={e=>setForm(p=>({...p,start:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"/></Field>
                <Field label={t('Availability deadline')} hint={t('Doctors and TAs should confirm availability before this date.')}><input type="date" value={form.availability_deadline} onChange={e=>setForm(p=>({...p,availability_deadline:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"/></Field>
                <Field label={t('Status')}><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="Draft">{t('Draft')}</option><option value="Active">{t('Active')}</option></select></Field>
                <Field className="sm:col-span-2" label={t('Holidays')} hint={t('Enter one holiday date per line or separate dates with commas.')}><textarea rows="4" value={form.holidays_text} onChange={e=>setForm(p=>({...p,holidays_text:e.target.value}))} placeholder={'2027-10-06\n2027-12-25'} className="w-full rounded-brand-sm border border-tanseek-line bg-white px-3 py-2 text-sm"/></Field>
                <div className="sm:col-span-2 rounded-brand-sm border border-tanseek-line bg-tanseek-canvas p-3 text-xs leading-5 text-tanseek-muted"><strong className="text-tanseek-navy">{t('Fixed policy')}</strong><br/>{t('Saturday')}–{t('Wednesday')} · 09:00–17:00 · 4 × {t('2 hours')} · {t('Breaks')}: {t('none')}</div>
              </div>
            )}


            {tab === 'slots' && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label={t('Start time')} hint={t('The current scheduling policy uses two-hour slots.')}>
                  <input required type="time" step="60" value={form.start || ''} onChange={e=>setForm(p=>({...p,start:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"/>
                </Field>
                <Field label={t('End time')}>
                  <input required type="time" step="60" value={form.end || ''} onChange={e=>setForm(p=>({...p,end:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"/>
                </Field>
                <div className="sm:col-span-2 rounded-brand-sm border border-tanseek-teal/20 bg-tanseek-tealSoft p-3 text-xs leading-5 text-tanseek-ink">
                  <strong>{t('Applies to the active term:')}</strong> {t('The slot is created for Saturday, Sunday, Monday, Tuesday and Wednesday so scheduling, availability and validation all use the same real database slot.')}
                </div>
              </div>
            )}

            {tab === 'courses' && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label={t('Course code')}><input required value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm" placeholder="CS220"/></Field>
                <Field label={t('Course name')}><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm" placeholder="Database Systems"/></Field>
                <Field label={t('Department')}><input required readOnly={Boolean(departmentScope)} value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))} className={`h-11 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm ${departmentScope ? 'bg-tanseek-canvas text-tanseek-muted' : 'bg-white'}`} placeholder="Computer Science"/></Field>
                <Field label={t('Contact hours')} hint={t('This describes the course catalog only. Scheduling duration is defined per requirement.')}><input required type="number" min="1" max="8" value={form.contact_hours} onChange={e=>setForm(p=>({...p,contact_hours:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"/></Field>
              </div>
            )}

            {tab === 'sections' && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label={t('Section code')}><input required value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm" placeholder="SEC-201"/></Field>
                <Field label={t('Course')}><select required value={form.course_id} onChange={e=>setForm(p=>({...p,course_id:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="">{t('Select course')}</option>{visibleCourses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></Field>
                <Field label={t('Component')}><select required value={form.component} onChange={e=>setForm(p=>({...p,component:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="LECTURE">{t('Lecture')}</option><option value="PRACTICAL">{t('Practical')}</option></select></Field>
                <Field label={t('Section size')} hint={t('Expected section capacity. Students are assigned later from Section Assignments.')}><input required type="number" min="1" value={form.size} onChange={e=>setForm(p=>({...p,size:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"/></Field>
                <div className="sm:col-span-2 rounded-brand-sm border border-tanseek-teal/20 bg-tanseek-tealSoft p-3 text-xs leading-5 text-tanseek-ink"><strong>{t('Section flow:')}</strong> {t('Create Lecture/Practical sections here, then assign students to them from Section Assignments after course registration.')}</div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={()=>setEditorOpen(false)}>{t('Cancel')}</Button><Button type="submit" disabled={saving}>{saving ? t('Saving…') : t(tab === 'slots' ? 'Add time slot' : 'Save record')}</Button></div>
          </form>
        </div>
      )}
    </>
  )
}
