import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card, StatusBadge } from './UI'
import { Icon } from './Icons'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

const emptyDepartment = { code: '', name: '', active: true }

export default function DepartmentManagement() {
  const { t } = useLanguage()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyDepartment)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const payload = await tanseekApi.getDepartments()
      setRows(Array.isArray(payload) ? payload : payload?.departments || [])
    } catch (err) {
      setError(err?.message || t('Could not load departments.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(row => [row.code, row.name].some(value => String(value || '').toLowerCase().includes(q)))
  }, [rows, query])

  function startNew() {
    setEditingId(null)
    setForm(emptyDepartment)
    setMessage('')
    setError('')
    setEditorOpen(true)
  }

  function edit(row) {
    setEditingId(row.id)
    setForm({ code: row.code || '', name: row.name || '', active: row.active !== false })
    setMessage('')
    setError('')
    setEditorOpen(true)
  }

  async function save(event) {
    event.preventDefault()
    if (!form.code.trim() || !form.name.trim()) {
      setError(t('Department code and name are required.'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { code: form.code.trim().toUpperCase(), name: form.name.trim(), active: Boolean(form.active) }
      if (editingId) await tanseekApi.updateDepartment(editingId, payload)
      else await tanseekApi.createDepartment(payload)
      setEditorOpen(false)
      setMessage(t(editingId ? 'Department updated.' : 'Department created.'))
      await load()
    } catch (err) {
      setError(err?.message || t('Could not save department.'))
    } finally {
      setSaving(false)
    }
  }

  async function remove(row) {
    if (!window.confirm(`${t('Delete department')} ${row.name}?`)) return
    setError('')
    setMessage('')
    try {
      await tanseekApi.deleteDepartment(row.id)
      setMessage(t('Department deleted.'))
      await load()
    } catch (err) {
      setError(err?.message || t('Could not delete department.'))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t('System setup')}
        title={t('Departments')}
        description={t('Create the university departments that scope coordinators, department admins, courses and sections.')}
        actions={<Button icon="plus" onClick={startNew}>{t('Add department')}</Button>}
      />

      {error && <div className="mb-5 rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft px-4 py-3 text-sm font-bold text-tanseek-alert">{error}</div>}
      {message && <div className="mb-5 rounded-brand border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{message}</div>}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-tanseek-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-tanseek-navy">{t('Department directory')}</h2>
            <p className="mt-1 text-xs text-tanseek-muted">{t('Departments are global setup data managed by the Super Admin.')}</p>
          </div>
          <label className="relative w-full sm:w-[320px]"><Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-tanseek-muted"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Search departments...')} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white pl-10 pr-3 text-sm"/></label>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-tanseek-muted">{t('Loading departments…')}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center"><Icon name="room" size={28} className="mx-auto text-tanseek-muted"/><h3 className="mt-3 font-bold text-tanseek-navy">{t('No departments found')}</h3><p className="mt-2 text-sm text-tanseek-muted">{t('Create the first department to begin academic setup.')}</p></div>
        ) : (
          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted"><tr><th className="px-5 py-3">{t('Code')}</th><th className="px-5 py-3">{t('Department')}</th><th className="px-5 py-3">{t('Status')}</th><th className="px-5 py-3"></th></tr></thead>
              <tbody className="divide-y divide-tanseek-line">{filtered.map(row => <tr key={row.id} className="bg-white hover:bg-tanseek-canvas/40"><td className="px-5 py-4 text-sm font-bold text-tanseek-navy">{row.code}</td><td className="px-5 py-4 text-sm text-tanseek-ink">{row.name}</td><td className="px-5 py-4"><StatusBadge status={row.active === false ? 'pending' : 'available'}>{row.active === false ? t('Inactive') : t('Active')}</StatusBadge></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={()=>edit(row)} className="rounded-brand-sm p-2 text-tanseek-muted hover:bg-tanseek-canvas hover:text-tanseek-navy"><Icon name="edit" size={17}/></button><button onClick={()=>remove(row)} className="rounded-brand-sm p-2 text-tanseek-muted hover:bg-tanseek-alertSoft hover:text-tanseek-alert"><Icon name="trash" size={17}/></button></div></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>

      {editorOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-tanseek-navy/45 p-4" onMouseDown={()=>!saving&&setEditorOpen(false)}>
          <form onSubmit={save} onMouseDown={e=>e.stopPropagation()} className="w-full max-w-lg rounded-brand border border-tanseek-line bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-tanseek-teal">{t('System setup')}</p><h2 className="mt-1 text-xl font-bold text-tanseek-navy">{t(editingId ? 'Edit department' : 'Add department')}</h2></div><button type="button" onClick={()=>setEditorOpen(false)} className="rounded p-2 text-tanseek-muted hover:bg-tanseek-canvas"><Icon name="x"/></button></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label><span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Department code')}</span><input autoFocus required value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="CS" className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"/></label>
              <label><span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Department name')}</span><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Computer Science" className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"/></label>
              <label className="sm:col-span-2 flex items-center gap-3 rounded-brand-sm border border-tanseek-line bg-tanseek-canvas p-3"><input type="checkbox" checked={form.active} onChange={e=>setForm(p=>({...p,active:e.target.checked}))} className="h-4 w-4 accent-tanseek-teal"/><span className="text-sm font-medium text-tanseek-ink">{t('Active department')}</span></label>
            </div>
            <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={()=>setEditorOpen(false)}>{t('Cancel')}</Button><Button type="submit" disabled={saving}>{saving ? t('Saving…') : t('Save department')}</Button></div>
          </form>
        </div>
      )}
    </>
  )
}
