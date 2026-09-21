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
  terms: { name: '', start: '', end: '', status: 'Draft' },
  courses: { code: '', name: '', department: '', contact_hours: 3 },
  sections: { code: '', course_id: '', student_group_id: '', size: 0 },
}

function Field({ label, children, hint, className = '' }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-xs font-bold text-tanseek-ink">{label}</span>{children}{hint && <span className="mt-1.5 block text-[11px] leading-4 text-tanseek-muted">{hint}</span>}</label>
}

export default function MasterData() {
  const [tab, setTab] = useState('terms')
  const [rows, setRows] = useState([])
  const [catalog, setCatalog] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyByTab.terms)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const { t } = useLanguage()

  async function load() {
    setLoading(true); setError('')
    try {
      const [data, planning] = await Promise.all([
        tanseekApi.getMasterData(tab),
        tanseekApi.getPlanningCatalog(),
      ])
      setRows(data.records || [])
      setCatalog(planning)
    } catch (e) { setError(e.message || t('Could not load master data.')) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    setFilterQuery('')
    setFilterOpen(false)
    load()
  }, [tab])

  const title = tabs.find(x => x[0] === tab)?.[1]
  const canAdd = tab !== 'slots'

  function openNew() {
    if (!canAdd) return
    setEditingId(null)
    setForm({ ...emptyByTab[tab] })
    setMessage(''); setError('')
    setEditorOpen(true)
  }

  function openEdit(row) {
    if (tab === 'slots') return
    setEditingId(row.id)
    if (tab === 'terms') setForm({ name: row.name || '', start: row.start || '', end: row.end || '', status: row.status || 'Draft' })
    if (tab === 'courses') setForm({ code: row.code || '', name: row.name || '', department: row.department || '', contact_hours: row.contact_hours ?? row.hours ?? 3 })
    if (tab === 'sections') setForm({ code: row.code || '', course_id: row.course_id || '', student_group_id: row.student_group_id || '', size: row.size || 0 })
    setMessage(''); setError('')
    setEditorOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true); setError(''); setMessage('')
    try {
      const payload = tab === 'sections'
        ? { ...form, course_id: Number(form.course_id), student_group_id: Number(form.student_group_id), size: Number(form.size) }
        : tab === 'courses'
          ? { ...form, contact_hours: Number(form.contact_hours) }
          : form
      if (editingId) await tanseekApi.updateMasterData(tab, editingId, payload)
      else await tanseekApi.createMasterData(tab, payload)
      setEditorOpen(false)
      setMessage(t(editingId ? 'Record updated.' : 'Record created.'))
      await load()
    } catch (e2) { setError(e2.message || t('Could not save this record.')) }
    finally { setSaving(false) }
  }

  const courseName = id => catalog?.courses.find(c => Number(c.id) === Number(id))
  const groupName = id => catalog?.studentGroups.find(g => Number(g.id) === Number(id))
  const filteredRows = useMemo(() => {
  const q = filterQuery.trim().toLowerCase()

  if (!q) return rows

  return rows.filter(row => {
    if (tab === 'terms') {
      return [
        row.name,
        row.start,
        row.end,
        row.status,
      ]
        .filter(Boolean)
        .some(value =>
          String(value).toLowerCase().includes(q)
        )
    }

    if (tab === 'courses') {
      return [
        row.code,
        row.name,
        row.department,
        row.contact_hours,
      ]
        .filter(Boolean)
        .some(value =>
          String(value).toLowerCase().includes(q)
        )
    }

    if (tab === 'sections') {
      const course = courseName(row.course_id)
      const group = groupName(row.student_group_id)

      return [
        row.code,
        course?.code,
        course?.name,
        group?.name,
        row.size,
      ]
        .filter(Boolean)
        .some(value =>
          String(value).toLowerCase().includes(q)
        )
    }

    if (tab === 'slots') {
      return [
        row.start,
        row.end,
      ]
        .filter(Boolean)
        .some(value =>
          String(value).toLowerCase().includes(q)
        )
    }

    return true
  })
}, [rows, filterQuery, tab, catalog])

  return (
    <>
      <PageHeader
        eyebrow={t('Scheduler administration')}
        title={t('Master data')}
        description={t('Maintain core academic records. Course and section identity live here; scheduling needs such as duration, room type, equipment and preferred windows are defined separately in Requirements.')}
        actions={canAdd ? <Button icon="plus" onClick={openNew}>{t('Add record')}</Button> : null}
      />

      {error && <div className="mb-5 rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft px-4 py-3 text-sm font-bold text-tanseek-alert">{error}</div>}
      {message && <div className="mb-5 rounded-brand border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{message}</div>}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="self-start p-2">
          {tabs.map(([id,label]) => <button key={id} onClick={()=>setTab(id)} className={`flex w-full items-center justify-between rounded-brand-sm px-3 py-3 text-left text-sm font-bold ${tab===id?'bg-tanseek-navy text-white':'text-tanseek-muted hover:bg-tanseek-canvas hover:text-tanseek-navy'}`}>{t(label)}<Icon name="chevron" size={16}/></button>)}
          <div className="mt-2 border-t border-tanseek-line px-3 py-4 text-xs leading-5 text-tanseek-muted">{t('Working days')}: {t('Saturday')}–{t('Wednesday')}<br/>{t('Teaching hours')}: 09:00–17:00<br/>{t('Slot length')}: {t('2 hours')}<br/>{t('Breaks')}: {t('none')}</div>
        </Card>

        <div className="min-w-0 space-y-4">
          {(tab === 'courses' || tab === 'sections') && <div className="rounded-brand border border-tanseek-teal/20 bg-tanseek-tealSoft px-4 py-3 text-xs leading-5 text-tanseek-ink"><strong>{t('Master data vs requirements:')}</strong> {tab === 'courses' ? t('A course record only defines the course itself. Session duration, room/lab needs, equipment and preferred windows belong to the Coordinator Requirements screen.') : t('A section record defines the student cohort and size. Duration, session type, room/lab needs and equipment belong to the Coordinator Requirements screen.')}</div>}
          {tab === 'slots' && <div className="rounded-brand border border-tanseek-line bg-tanseek-canvas px-4 py-3 text-xs leading-5 text-tanseek-muted"><strong className="text-tanseek-navy">{t('Fixed scheduling policy')}</strong> — {t('The MVP uses four fixed two-hour slots from 09:00 to 17:00, Saturday through Wednesday, with no breaks. These slots are read-only in the frontend.')}</div>}

          <Card className="min-w-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-tanseek-line p-5"><div><h2 className="text-lg font-bold text-tanseek-navy">{t(title)}</h2><p className="mt-1 text-xs text-tanseek-muted">{t('Mock data connected to the same planning catalog used by Requirements.')}</p></div><Button variant="secondary" icon="filter" onClick={() => setFilterOpen(prev => !prev)}>{t('Filter')}</Button></div>
            {filterOpen && (
  <div className="border-b border-tanseek-line bg-tanseek-canvas/50 p-4">
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-tanseek-muted">
          <Icon name="search" size={17} />
        </div>

        <input
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)}
          placeholder={t('Search records...')}
          className="
            h-10
            w-full
            rounded-brand-sm
            border border-tanseek-line
            bg-white
            pl-10 pr-3
            text-sm
            text-tanseek-ink
            outline-none
            focus:border-tanseek-teal
          "
        />
      </div>

      {filterQuery && (
        <button
          type="button"
          onClick={() => setFilterQuery('')}
          className="
            rounded-brand-sm
            border border-tanseek-line
            bg-white
            px-3 py-2
            text-xs font-bold
            text-tanseek-muted
            hover:text-tanseek-navy
          "
        >
          {t('Clear')}
        </button>
      )}
    </div>
  </div>
)}
            <div className="custom-scrollbar w-full min-w-0 overflow-x-auto">
              {loading && <div className="p-6 text-sm text-tanseek-muted">{t('Loading master data…')}</div>}
              {!loading && tab === 'terms' && <table className="min-w-[720px] w-full text-left"><thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted"><tr><th className="px-5 py-3">{t('Term')}</th><th className="px-5 py-3">{t('Start')}</th><th className="px-5 py-3">{t('End')}</th><th className="px-5 py-3">{t('Status')}</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-tanseek-line">{filteredRows.map(r=><tr key={r.id}><td className="px-5 py-4 text-sm font-bold text-tanseek-navy">{r.name}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.start}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.end}</td><td className="px-5 py-4"><StatusBadge status={String(r.status).toLowerCase()}>{t(r.status)}</StatusBadge></td><td className="px-5 py-4"><button onClick={()=>openEdit(r)} className="text-tanseek-muted hover:text-tanseek-navy"><Icon name="edit" size={17}/></button></td></tr>)}</tbody></table>}
              {!loading && tab === 'slots' && <table className="min-w-[600px] w-full text-left"><thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted"><tr><th className="px-5 py-3">{t('Slot')}</th><th className="px-5 py-3">{t('Start')}</th><th className="px-5 py-3">{t('End')}</th><th className="px-5 py-3">{t('Duration')}</th></tr></thead><tbody className="divide-y divide-tanseek-line">{filteredRows.map((r,i)=><tr key={r.id}><td className="px-5 py-4 text-sm font-bold text-tanseek-navy">{t('Slot')} {i+1}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.start}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.end}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{t('2 hours')}</td></tr>)}</tbody></table>}
              {!loading && tab === 'courses' && <table className="min-w-[760px] w-full text-left"><thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted"><tr><th className="px-5 py-3">{t('Code')}</th><th className="px-5 py-3">{t('Course')}</th><th className="px-5 py-3">{t('Department')}</th><th className="px-5 py-3">{t('Contact hours')}</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-tanseek-line">{filteredRows.map(r=><tr key={r.id}><td className="px-5 py-4 text-sm font-bold text-tanseek-navy">{r.code}</td><td className="px-5 py-4 text-sm text-tanseek-ink">{r.name}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.department}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.contact_hours}</td><td className="px-5 py-4"><button onClick={()=>openEdit(r)} className="text-tanseek-muted hover:text-tanseek-navy"><Icon name="edit" size={17}/></button></td></tr>)}</tbody></table>}
              {!loading && tab === 'sections' && <table className="min-w-[820px] w-full text-left"><thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted"><tr><th className="px-5 py-3">{t('Section')}</th><th className="px-5 py-3">{t('Course')}</th><th className="px-5 py-3">{t('Student group')}</th><th className="px-5 py-3">{t('Size')}</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-tanseek-line">{filteredRows.map(r=>{ const course=courseName(r.course_id); const group=groupName(r.student_group_id); return <tr key={r.id}><td className="px-5 py-4 text-sm font-bold text-tanseek-navy">{r.code}</td><td className="px-5 py-4 text-sm text-tanseek-ink">{course ? `${course.code} — ${course.name}` : r.course_id}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{group?.name || '—'}</td><td className="px-5 py-4 text-sm text-tanseek-muted">{r.size}</td><td className="px-5 py-4"><button onClick={()=>openEdit(r)} className="text-tanseek-muted hover:text-tanseek-navy"><Icon name="edit" size={17}/></button></td></tr>})}</tbody></table>}
              {!loading && filteredRows.length === 0 && <div className="p-8 text-center text-sm text-tanseek-muted">{filterQuery ? t('No matching records.') : t('No records yet.')}</div>}
            </div>
          </Card>
        </div>
      </div>

      {editorOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-tanseek-navy/45 p-4" onMouseDown={()=>!saving&&setEditorOpen(false)}><form onSubmit={save} className="w-full max-w-xl rounded-brand border border-tanseek-line bg-white p-6 shadow-soft" onMouseDown={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-tanseek-teal">{t(editingId ? 'Edit master record' : 'New master record')}</p><h2 className="mt-1 text-xl font-bold text-tanseek-navy">{t(editingId ? 'Edit' : 'Add')} {t(title)}</h2></div><button type="button" onClick={()=>setEditorOpen(false)} className="rounded p-2 text-tanseek-muted hover:bg-tanseek-canvas"><Icon name="x"/></button></div>

        {tab === 'terms' && <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label={t('Term name')} className="sm:col-span-2"><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm" placeholder="Fall 2027"/></Field><Field label={t('Start date')}><input required type="date" value={form.start} onChange={e=>setForm(p=>({...p,start:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"/></Field><Field label={t('End date')}><input required type="date" value={form.end} onChange={e=>setForm(p=>({...p,end:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"/></Field><Field label={t('Status')}><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="Draft">{t('Draft')}</option><option value="Active">{t('Active')}</option></select></Field></div>}

        {tab === 'courses' && <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label={t('Course code')}><input required value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm" placeholder="CS220"/></Field><Field label={t('Course name')}><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm" placeholder="Database Systems"/></Field><Field label={t('Department')}><input required value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm" placeholder="Computer Science"/></Field><Field label={t('Contact hours')} hint={t('This describes the course catalog only. Scheduling duration is defined per requirement.')}><input required type="number" min="1" max="8" value={form.contact_hours} onChange={e=>setForm(p=>({...p,contact_hours:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"/></Field></div>}

        {tab === 'sections' && <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label={t('Section code')}><input required value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm" placeholder="SEC-201"/></Field><Field label={t('Course')}><select required value={form.course_id} onChange={e=>setForm(p=>({...p,course_id:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="">{t('Select course')}</option>{catalog?.courses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></Field><Field label={t('Student group')}><select required value={form.student_group_id} onChange={e=>{const id=e.target.value; const g=catalog?.studentGroups.find(x=>Number(x.id)===Number(id)); setForm(p=>({...p,student_group_id:id,size:g?.size||p.size}))}} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="">{t('Select student group')}</option>{catalog?.studentGroups.map(g=><option key={g.id} value={g.id}>{g.name} · {g.size} {t('students')}</option>)}</select></Field><Field label={t('Section size')} hint={t('This is the enrolled group size used for capacity validation.')}><input required type="number" min="1" value={form.size} onChange={e=>setForm(p=>({...p,size:e.target.value}))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"/></Field><div className="sm:col-span-2 rounded-brand-sm border border-tanseek-teal/20 bg-tanseek-tealSoft p-3 text-xs leading-5 text-tanseek-ink"><strong>{t('Not part of the section record:')}</strong> {t('Session type, duration, weekly count, room type, equipment and preferred windows are added later from Requirements.')}</div></div>}

        <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={()=>setEditorOpen(false)}>{t('Cancel')}</Button><Button type="submit" disabled={saving}>{saving ? t('Saving…') : t('Save record')}</Button></div>
      </form></div>}
    </>
  )
}
