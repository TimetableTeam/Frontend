import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Card, StatusBadge, Button } from './UI'
import { Icon } from './Icons'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

const emptySpace = {
  name: '',
  building: '',
  type: 'Classroom',
  capacity: 30,
  equipment: [],
  accessibility: false,
  status: 'available',
  closure: '',
}

function SpaceModal({ open, room, onClose, onSaved, onDeleted }) {
  const { t } = useLanguage()
  const [form, setForm] = useState(emptySpace)
  const [equipmentText, setEquipmentText] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const next = room ? { ...emptySpace, ...room } : { ...emptySpace }
    setForm(next)
    setEquipmentText((next.equipment || []).join(', '))
    setError('')
  }, [open, room])

  if (!open) return null

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    if (!form.name.trim() || !form.building.trim() || !form.type || Number(form.capacity) < 1) {
      setError(t('Please complete the required room fields.'))
      return
    }

    const payload = {
      ...form,
      capacity: Number(form.capacity),
      equipment: equipmentText.split(',').map(item => item.trim()).filter(Boolean),
      closure: form.closure.trim(),
    }

    setSaving(true)
    try {
      const saved = room?.id
        ? await tanseekApi.updateRoom(room.id, payload)
        : await tanseekApi.createRoom(payload)
      onSaved(saved)
    } catch (err) {
      setError(err?.message || t('Could not save this space.'))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!room?.id) return
    setDeleting(true)
    setError('')
    try {
      await tanseekApi.deleteRoom(room.id)
      onDeleted(room.id)
    } catch (err) {
      setError(err?.message || t('Could not delete this space.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-tanseek-navy/45 p-4" role="dialog" aria-modal="true">
      <form onSubmit={save} className="custom-scrollbar max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-brand border border-tanseek-line bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-tanseek-line p-5 md:p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-tanseek-muted">{t('Facilities inventory')}</p>
            <h2 className="mt-1 text-xl font-bold text-tanseek-navy">{room ? t('Edit room / lab') : t('Add room / lab')}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-brand-sm p-2 text-tanseek-muted hover:bg-tanseek-canvas hover:text-tanseek-navy"><Icon name="x" size={19}/></button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6">
          <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Space name')} *</span><input autoFocus value={form.name} onChange={e=>update('name', e.target.value)} placeholder="Room 204 / Lab E" className="h-10 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Building')} *</span><input value={form.building} onChange={e=>update('building', e.target.value)} placeholder="A" className="h-10 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Type')} *</span><select value={form.type} onChange={e=>update('type', e.target.value)} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="Classroom">{t('Classroom')}</option><option value="Computer Lab">{t('Computer Lab')}</option><option value="Graphics Lab">{t('Graphics Lab')}</option></select></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Capacity')} *</span><input type="number" min="1" value={form.capacity} onChange={e=>update('capacity', e.target.value)} className="h-10 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm"/></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Status')}</span><select value={form.status} onChange={e=>update('status', e.target.value)} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"><option value="available">{t('Available')}</option><option value="pending">{t('Pending')}</option><option value="conflict">{t('In conflict')}</option></select></label>
          <label className="md:col-span-2"><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Equipment')}</span><input value={equipmentText} onChange={e=>setEquipmentText(e.target.value)} placeholder={t('Separate equipment with commas')} className="h-10 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm"/><span className="mt-1 block text-[11px] text-tanseek-muted">{t('Example: Projector, 30 PCs, Whiteboard')}</span></label>
          <label className="flex items-center gap-3 rounded-brand-sm border border-tanseek-line bg-tanseek-canvas px-3 py-3"><input type="checkbox" checked={form.accessibility} onChange={e=>update('accessibility', e.target.checked)} className="h-4 w-4 accent-tanseek-teal"/><span className="text-sm font-medium text-tanseek-ink">{t('Accessible')}</span></label>
          <label><span className="mb-1.5 block text-xs font-bold text-tanseek-navy">{t('Closure / maintenance')}</span><input value={form.closure} onChange={e=>update('closure', e.target.value)} placeholder={t('Optional closure note')} className="h-10 w-full rounded-brand-sm border border-tanseek-line px-3 text-sm"/></label>
          {error && <div className="md:col-span-2 rounded-brand-sm border border-tanseek-alert/25 bg-tanseek-alertSoft p-3 text-sm text-tanseek-alert">{error}</div>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-tanseek-line bg-tanseek-canvas/60 p-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div>{room && <Button type="button" variant="danger" onClick={remove} disabled={deleting || saving}>{deleting ? t('Deleting…') : t('Delete space')}</Button>}</div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row"><Button type="button" variant="secondary" onClick={onClose} disabled={saving || deleting}>{t('Cancel')}</Button><Button type="submit" icon="check" disabled={saving || deleting}>{saving ? t('Saving…') : room ? t('Save changes') : t('Add space')}</Button></div>
        </div>
      </form>
    </div>
  )
}

export default function RoomsLabs() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All')
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const [advanced, setAdvanced] = useState({
    minCapacity: '',
    status: 'All',
    accessibility: 'All',
    equipment: '',
  })
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const { t } = useLanguage()

  useEffect(() => { loadSpaces() }, [])

  async function loadSpaces() {
    setLoading(true)
    setError('')
    try {
      const payload = await tanseekApi.getRooms()
      setSpaces(Array.isArray(payload) ? payload : payload?.rooms || [])
    } catch (err) {
      setError(err?.message || t('Could not load rooms and labs.'))
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setSelected(null)
    setModalOpen(true)
  }

  function openEdit(room) {
    setSelected(room)
    setModalOpen(true)
  }

  function handleSaved(saved) {
    setSpaces(current => {
      const exists = current.some(item => String(item.id) === String(saved.id))
      return exists ? current.map(item => String(item.id) === String(saved.id) ? saved : item) : [saved, ...current]
    })
    setModalOpen(false)
    setSelected(null)
  }

  function handleDeleted(id) {
    setSpaces(current => current.filter(item => String(item.id) !== String(id)))
    setModalOpen(false)
    setSelected(null)
  }

  const filtered = useMemo(() => spaces.filter(r => {
    const equipment = Array.isArray(r.equipment) ? r.equipment : []
    const matchQ = !query || [r.name, r.building, r.type, ...equipment].join(' ').toLowerCase().includes(query.toLowerCase())
    const matchT = type === 'All' || r.type === type
    const matchCapacity = !advanced.minCapacity || Number(r.capacity) >= Number(advanced.minCapacity)
    const matchStatus = advanced.status === 'All' || r.status === advanced.status
    const matchAccessibility = advanced.accessibility === 'All' || (advanced.accessibility === 'Accessible' ? Boolean(r.accessibility) : !r.accessibility)
    const equipmentQuery = advanced.equipment.trim().toLowerCase()
    const matchEquipment = !equipmentQuery || equipment.some(item => String(item).toLowerCase().includes(equipmentQuery))
    return matchQ && matchT && matchCapacity && matchStatus && matchAccessibility && matchEquipment
  }), [spaces, query, type, advanced])

  const activeAdvancedCount = useMemo(() => {
    return [
      advanced.minCapacity ? 1 : 0,
      advanced.status !== 'All' ? 1 : 0,
      advanced.accessibility !== 'All' ? 1 : 0,
      advanced.equipment.trim() ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0)
  }, [advanced])

  function clearAdvancedFilters() {
    setAdvanced({ minCapacity: '', status: 'All', accessibility: 'All', equipment: '' })
  }

  return (
    <>
      <PageHeader eyebrow={t('Facilities inventory')} title={t('Rooms & labs')} description={t('Search spaces by capacity, type, equipment and current availability. Closure and maintenance states remain visible in scheduling decisions.')} actions={<Button variant="secondary" icon="plus" onClick={openNew}>{t('Add space')}</Button>} />

      {loading ? (
        <Card className="grid min-h-[300px] place-items-center p-8 text-center"><div><div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-tanseek-line border-t-tanseek-teal"/><p className="mt-4 text-sm text-tanseek-muted">{t('Loading rooms & labs…')}</p></div></Card>
      ) : error ? (
        <Card className="grid min-h-[300px] place-items-center border-tanseek-alert/30 bg-tanseek-alertSoft/30 p-8 text-center"><div className="max-w-md"><Icon name="alert" size={28} className="mx-auto text-tanseek-alert"/><p className="mt-4 text-sm text-tanseek-alert">{error}</p><Button className="mt-5" variant="secondary" onClick={loadSpaces}>{t('Try again')}</Button></div></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid gap-3 border-b border-tanseek-line p-4 md:grid-cols-[1fr_220px_auto] md:p-5">
            <label className="relative"><Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-tanseek-muted"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Search room, building or equipment')} className="h-10 w-full rounded-brand-sm border border-tanseek-line pl-10 pr-3 text-sm"/></label>
            <select value={type} onChange={e=>setType(e.target.value)} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink"><option value="All">{t('All')}</option><option value="Computer Lab">{t('Computer Lab')}</option><option value="Classroom">{t('Classroom')}</option><option value="Graphics Lab">{t('Graphics Lab')}</option></select>
            <Button variant="secondary" icon="filter" onClick={() => setMoreFiltersOpen(prev => !prev)}>
              {t('More filters')}{activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : ''}
            </Button>
          </div>

          {moreFiltersOpen && (
            <div className="border-b border-tanseek-line bg-tanseek-canvas/50 p-4 md:p-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-tanseek-navy">{t('Advanced room filters')}</p>
                  <p className="mt-1 text-xs text-tanseek-muted">{t('Filter spaces by capacity, status, accessibility and equipment.')}</p>
                </div>
                {activeAdvancedCount > 0 && <Button variant="secondary" onClick={clearAdvancedFilters}>{t('Clear filters')}</Button>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <input type="number" min="1" value={advanced.minCapacity} onChange={e => setAdvanced(prev => ({ ...prev, minCapacity: e.target.value }))} placeholder={t('Minimum capacity')} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink" />

                <select value={advanced.status} onChange={e => setAdvanced(prev => ({ ...prev, status: e.target.value }))} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink">
                  <option value="All">{t('All statuses')}</option>
                  <option value="available">{t('Available')}</option>
                  <option value="pending">{t('Pending')}</option>
                  <option value="conflict">{t('In conflict')}</option>
                </select>

                <select value={advanced.accessibility} onChange={e => setAdvanced(prev => ({ ...prev, accessibility: e.target.value }))} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink">
                  <option value="All">{t('Any accessibility')}</option>
                  <option value="Accessible">{t('Accessible')}</option>
                  <option value="Standard">{t('Standard')}</option>
                </select>

                <input value={advanced.equipment} onChange={e => setAdvanced(prev => ({ ...prev, equipment: e.target.value }))} placeholder={t('Equipment contains…')} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink" />
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center p-8 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-tanseek-navySoft text-tanseek-navy"><Icon name="room" size={23}/></div><h3 className="mt-4 text-base font-bold text-tanseek-navy">{t('No spaces found')}</h3><p className="mt-2 text-sm text-tanseek-muted">{t('Add a room or lab, or change the current filters.')}</p><Button className="mt-5" icon="plus" onClick={openNew}>{t('Add space')}</Button></div></div>
          ) : (
            <div className="custom-scrollbar overflow-x-auto">
              <table className="min-w-[940px] w-full text-left">
                <thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[0.08em] text-tanseek-muted"><tr><th className="px-5 py-3">{t('Space')}</th><th className="px-5 py-3">{t('Type')}</th><th className="px-5 py-3">{t('Capacity')}</th><th className="px-5 py-3">{t('Equipment')}</th><th className="px-5 py-3">{t('Access')}</th><th className="px-5 py-3">{t('Status')}</th><th className="px-5 py-3"></th></tr></thead>
                <tbody className="divide-y divide-tanseek-line">
                  {filtered.map(room => <tr key={room.id} className="bg-white hover:bg-tanseek-canvas/45"><td className="px-5 py-4"><p className="text-sm font-bold text-tanseek-navy">{room.name}</p><p className="mt-1 text-xs text-tanseek-muted">{t('Building')} {room.building}{room.closure ? ` · ${room.closure}` : ''}</p></td><td className="px-5 py-4 text-sm text-tanseek-ink">{t(room.type)}</td><td className="px-5 py-4 text-sm font-bold text-tanseek-navy">{room.capacity}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">{(room.equipment || []).length ? room.equipment.map(x=><span key={x} className="rounded bg-tanseek-navySoft px-2 py-1 text-[11px] text-tanseek-muted">{x}</span>) : <span className="text-xs text-tanseek-muted">{t('None')}</span>}</div></td><td className="px-5 py-4 text-sm text-tanseek-muted">{room.accessibility ? t('Accessible') : t('Standard')}</td><td className="px-5 py-4"><StatusBadge status={room.status}>{room.status === 'available' ? t('Available') : room.status === 'conflict' ? t('In conflict') : t('Pending')}</StatusBadge></td><td className="px-5 py-4"><button onClick={()=>openEdit(room)} className="rounded-brand-sm p-2 text-tanseek-muted hover:bg-tanseek-canvas hover:text-tanseek-navy" aria-label={t('Edit room / lab')}><Icon name="edit" size={18}/></button></td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <SpaceModal open={modalOpen} room={selected} onClose={()=>{setModalOpen(false);setSelected(null)}} onSaved={handleSaved} onDeleted={handleDeleted}/>
    </>
  )
}
