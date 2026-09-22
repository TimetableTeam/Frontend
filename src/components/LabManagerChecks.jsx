import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card, StatusBadge } from './UI'
import { Icon } from './Icons'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

export default function LabManagerChecks() {
  const [catalog, setCatalog] = useState(null)
  const [data, setData] = useState({ requirements: [], rooms: [] })
  const [selectedId, setSelectedId] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingRoom, setSavingRoom] = useState(null)
  const [issueCandidate, setIssueCandidate] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { t } = useLanguage()

  async function load(preserveSelection = true) {
    setLoading(true); setError('')
    try {
      const [c, checks] = await Promise.all([tanseekApi.getPlanningCatalog(), tanseekApi.getLabChecks()])
      setCatalog(c); setData(checks)
      const next = preserveSelection && selectedId ? selectedId : checks.requirements[0]?.id
      setSelectedId(next || null)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load(false) }, [])

  const selected = useMemo(() => data.requirements.find(r => Number(r.id) === Number(selectedId)), [data, selectedId])
  const course = selected && catalog?.courses.find(c => Number(c.id) === Number(selected.course_id))
  const equipmentLabel = id => catalog?.equipment.find(e => e.id === id)?.label || id

  async function confirm(roomId) {
    if (!selected) return
    setSavingRoom(roomId); setError(''); setMessage('')
    try {
      const decision = await tanseekApi.saveLabCheck(selected.id, { room_id: roomId, status: 'CONFIRMED', notes })
      setData(prev => ({
        ...prev,
        requirements: prev.requirements.map(req => Number(req.id) === Number(selected.id) ? { ...req, decision } : req),
      }))
      setMessage(t('Lab check saved. The scheduler can now use the confirmed space as a feasible option.'))
    } catch (e) { setError(e.message) }
    finally { setSavingRoom(null) }
  }

  return (
    <>
      <PageHeader eyebrow={t('Lab manager')} title={t('Lab requirement checks')} description={t('Review practical-session requirements and verify that candidate labs satisfy capacity, room type, equipment, availability and closure constraints.')} />
      {error && <div className="mb-5 rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft px-4 py-3 text-sm font-bold text-tanseek-alert">{error}</div>}
      {message && <div className="mb-5 rounded-brand border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{message}</div>}

      <div className="grid gap-6 2xl:grid-cols-[390px_1fr]">
        <Card className="self-start overflow-hidden"><div className="border-b border-tanseek-line p-5"><h2 className="text-lg font-bold text-tanseek-navy">{t('Lab sessions')}</h2><p className="mt-1 text-xs text-tanseek-muted">{t('Requirements needing facilities review')}</p></div><div className="divide-y divide-tanseek-line">{loading && <div className="p-5 text-sm text-tanseek-muted">{t('Loading lab checks…')}</div>}{!loading && data.requirements.map(req => { const c = catalog?.courses.find(x => Number(x.id) === Number(req.course_id)); return <button key={req.id} onClick={() => { setSelectedId(req.id); setMessage(''); setNotes(req.decision?.notes || '') }} className={`w-full p-5 text-left ${Number(selectedId)===Number(req.id)?'bg-tanseek-navySoft':'hover:bg-tanseek-canvas'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-tanseek-navy">{c?.code} · {t(req.session_type)}</p><p className="mt-1 text-xs text-tanseek-muted">{req.expected_students || 0} {t('students')} · {req.duration_minutes} min</p></div><StatusBadge status={req.decision ? 'confirmed' : req.state === 'READY' ? 'ready' : 'pending'}>{req.decision ? t('Checked') : req.state === 'READY' ? t('Ready') : t('Incomplete')}</StatusBadge></div><p className="mt-3 text-xs text-tanseek-muted">{t(req.required_room_type)} · {(req.required_equipment || []).length} {t('equipment needs')}</p></button>})}</div></Card>

        {selected ? <div className="space-y-6">
          <Card className="p-5 md:p-6"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-tanseek-teal">{t('Requirement')} #{selected.id}</p><h2 className="mt-1 text-xl font-bold text-tanseek-navy">{course?.code} — {course?.name}</h2><p className="mt-1 text-sm text-tanseek-muted">{t(selected.session_type)} · {selected.expected_students || 0} {t('students')}</p></div>{selected.decision && <StatusBadge status="confirmed">{t('Confirmed')}: {data.rooms.find(r=>r.id===selected.decision.room_id)?.name || selected.decision.room_id}</StatusBadge>}</div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-brand-sm bg-tanseek-canvas p-3"><p className="text-[11px] text-tanseek-muted">{t('Duration')}</p><p className="mt-1 text-sm font-bold text-tanseek-navy">{selected.duration_minutes} min</p></div><div className="rounded-brand-sm bg-tanseek-canvas p-3"><p className="text-[11px] text-tanseek-muted">{t('Room type')}</p><p className="mt-1 text-sm font-bold text-tanseek-navy">{t(selected.required_room_type)}</p></div><div className="rounded-brand-sm bg-tanseek-canvas p-3 sm:col-span-2"><p className="text-[11px] text-tanseek-muted">{t('Equipment')}</p><p className="mt-1 text-sm font-bold text-tanseek-navy">{(selected.required_equipment || []).map(equipmentLabel).join(' · ') || t('None')}</p></div></div>{selected.decision && <div className="mt-4 flex items-start gap-3 rounded-brand-sm border border-tanseek-teal/25 bg-tanseek-tealSoft p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tanseek-teal text-white"><Icon name="check" size={16}/></span><div><p className="text-sm font-bold text-tanseek-navy">{t('Lab confirmation saved')}</p><p className="mt-1 text-xs leading-5 text-tanseek-muted">{t('Confirmed lab:')} {data.rooms.find(r=>r.id===selected.decision.room_id)?.name || selected.decision.room_id}{selected.decision.notes ? ` · ${selected.decision.notes}` : ''}</p></div></div>}{selected.notes && <div className="mt-4 rounded-brand-sm border border-tanseek-line p-4 text-xs leading-5 text-tanseek-muted"><span className="font-bold text-tanseek-ink">{t('Coordinator note:')} </span>{selected.notes}</div>}</Card>

          <Card className="overflow-hidden"><div className="border-b border-tanseek-line p-5"><h3 className="text-lg font-bold text-tanseek-navy">{t('Candidate labs')}</h3><p className="mt-1 text-xs text-tanseek-muted">{t('Every check is explicit; color is never the only signal.')}</p></div><div className="custom-scrollbar overflow-x-auto"><table className="min-w-[920px] w-full text-left"><thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted"><tr><th className="px-5 py-3">{t('Lab')}</th><th className="px-5 py-3">{t('Capacity')}</th><th className="px-5 py-3">{t('Type')}</th><th className="px-5 py-3">{t('Equipment')}</th><th className="px-5 py-3">{t('Availability')}</th><th className="px-5 py-3">{t('Result')}</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-tanseek-line">{selected.candidates.map(candidate => <tr key={candidate.room_id}><td className="px-5 py-4"><p className="text-sm font-bold text-tanseek-navy">{candidate.room_name}</p><p className="mt-1 text-xs text-tanseek-muted">{t('Building')} {candidate.building}</p></td><td className="px-5 py-4 text-sm"><Check ok={candidate.capacity_ok} text={`${candidate.capacity} / ${t('need')} ${candidate.group_size}`} /></td><td className="px-5 py-4 text-sm"><Check ok={candidate.type_ok} text={t(candidate.room_type)} /></td><td className="px-5 py-4 text-sm"><Check ok={candidate.equipment_ok} text={candidate.equipment_ok ? t('All required equipment') : `${t('Missing:')} ${candidate.missing_equipment.map(equipmentLabel).join(', ')}`} /></td><td className="px-5 py-4 text-sm"><Check ok={candidate.availability_ok && candidate.closure_ok} text={candidate.closure ? candidate.closure : candidate.availability_ok ? t('Available') : t('Current conflict')} /></td><td className="px-5 py-4"><StatusBadge status={candidate.suitable ? 'available' : 'conflict'}>{candidate.suitable ? t('Suitable') : t('Not suitable')}</StatusBadge></td><td className="px-5 py-4">{selected.decision?.room_id === candidate.room_id ? <Button variant="primary" disabled icon="check">{t('Confirmed lab')}</Button> : candidate.suitable ? <Button variant="primary" disabled={savingRoom === candidate.room_id} onClick={() => confirm(candidate.room_id)}>{savingRoom === candidate.room_id ? t('Saving…') : t('Confirm lab')}</Button> : <Button variant="secondary" onClick={() => setIssueCandidate(candidate)}>{t('View issues')}</Button>}</td></tr>)}</tbody></table></div><div className="border-t border-tanseek-line bg-tanseek-canvas p-5"><label><span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Lab manager notes')}</span><textarea value={notes} onChange={e => setNotes(e.target.value)} rows="3" className="w-full rounded-brand-sm border border-tanseek-line bg-white p-3 text-sm" placeholder={t('Physical check, closure note, equipment condition…')} /></label></div></Card>
        </div> : !loading && <Card className="grid min-h-[300px] place-items-center p-8 text-center text-sm text-tanseek-muted">{t('No lab requirement selected.')}</Card>}
      </div>

      {issueCandidate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-tanseek-navy/45 p-4" onMouseDown={()=>setIssueCandidate(null)}><div className="w-full max-w-md rounded-brand border border-tanseek-line bg-white p-6 shadow-soft" onMouseDown={e=>e.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-tanseek-alert">{t('Cannot confirm this lab')}</p><h3 className="mt-1 text-xl font-bold text-tanseek-navy">{issueCandidate.room_name}</h3></div><button onClick={()=>setIssueCandidate(null)} className="rounded p-2 text-tanseek-muted hover:bg-tanseek-canvas"><Icon name="x"/></button></div><p className="mt-3 text-sm leading-6 text-tanseek-muted">{t('This lab fails one or more hard requirements. Resolve the issues below before it can be confirmed.')}</p><div className="mt-5 space-y-2 text-sm">{!issueCandidate.capacity_ok && <Issue text={`${t('Capacity')}: ${issueCandidate.capacity} / ${t('need')} ${issueCandidate.group_size}`} />}{!issueCandidate.type_ok && <Issue text={`${t('Type')}: ${t(issueCandidate.room_type)}`} />}{!issueCandidate.equipment_ok && <Issue text={`${t('Missing:')} ${issueCandidate.missing_equipment.map(equipmentLabel).join(', ')}`} />}{!issueCandidate.availability_ok && <Issue text={t('The lab is not currently available.')} />}{!issueCandidate.closure_ok && <Issue text={issueCandidate.closure || t('The lab has an active closure.')} />}</div><div className="mt-6 flex justify-end"><Button onClick={()=>setIssueCandidate(null)}>{t('Got it')}</Button></div></div></div>}
    </>
  )
}

function Issue({ text }) {
  return <div className="flex items-start gap-2 rounded-brand-sm bg-tanseek-alertSoft px-3 py-2 text-tanseek-alert"><Icon name="alert" size={16}/><span>{text}</span></div>
}

function Check({ ok, text }) {
  return <span className={`inline-flex items-center gap-2 ${ok ? 'text-tanseek-navy' : 'text-tanseek-alert'}`}><span className={`grid h-5 w-5 place-items-center rounded-full ${ok ? 'bg-tanseek-tealSoft' : 'bg-tanseek-alertSoft'}`}><Icon name={ok ? 'check' : 'x'} size={12}/></span><span>{text}</span></span>
}
