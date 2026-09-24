import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card, StatusBadge } from './UI'
import { Icon } from './Icons'
import { useLanguage } from '../i18n/LanguageContext'

export default function ConflictResolution({ conflicts, resolvedIds, onResolve, readOnly = false }) {
  const unresolved = useMemo(() => conflicts.filter(c => !resolvedIds.includes(c.id)), [conflicts, resolvedIds])
  const [selectedId, setSelectedId] = useState(unresolved[0]?.id || conflicts[0]?.id)
  const [selectedAlternative, setSelectedAlternative] = useState(null)
  const [applying, setApplying] = useState(false)
  const [actionError, setActionError] = useState('')
  const conflict = unresolved.find(c => c.id === selectedId) || unresolved[0]
  const alternatives = Array.isArray(conflict?.alternatives) ? conflict.alternatives : []
  const { t } = useLanguage()

  useEffect(() => {
    if (!unresolved.length) {
      setSelectedId(null)
      setSelectedAlternative(null)
      setActionError('')
      return
    }
    if (!unresolved.some(item => item.id === selectedId)) {
      setSelectedId(unresolved[0].id)
      setSelectedAlternative(null)
      setActionError('')
    }
  }, [unresolved, selectedId])

  async function applySelected() {
    if (!selectedAlternative || applying || !conflict) return
    setApplying(true)
    setActionError('')
    try {
      await onResolve(conflict.id, selectedAlternative)
      setSelectedAlternative(null)
    } catch (error) {
      setActionError(error?.message || t('Could not apply this alternative.'))
    } finally {
      setApplying(false)
    }
  }

  if (!conflict) {
    return <><PageHeader eyebrow={t('Validation engine')} title={t('Conflict resolution')} description={t('Hard conflicts are checked before publication.')}/><Card className="grid min-h-[360px] place-items-center p-10 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tanseek-tealSoft text-tanseek-teal"><Icon name="check" size={28}/></div><h2 className="mt-5 text-xl font-bold text-tanseek-navy">{t('No hard conflicts remain')}</h2><p className="mt-2 max-w-md text-sm leading-6 text-tanseek-muted">{t(readOnly ? 'The current draft has no blocking conflicts in your review view.' : 'The current draft is clear of blocking conflicts and can be submitted for Admin review.')}</p></div></Card></>
  }

  return (
    <>
      <PageHeader eyebrow={t('Validation engine')} title={t('Conflict resolution')} description={t('Every hard conflict is explicit, blocks publication and includes ranked feasible alternatives with clear trade-offs.')} />
      <div className="grid gap-6 xl:grid-cols-[330px_1fr]">
        <Card className="overflow-hidden self-start">
          <div className="border-b border-tanseek-line p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-tanseek-navy">{t('Open conflicts')}</h2><StatusBadge status="conflict">{unresolved.length} {t('blocking')}</StatusBadge></div></div>
          <div className="divide-y divide-tanseek-line">
            {unresolved.map(c => <button key={c.id} onClick={()=>{setSelectedId(c.id);setSelectedAlternative(null);setActionError('')}} className={`w-full p-4 text-left transition ${conflict.id===c.id ? 'bg-tanseek-alertSoft' : 'bg-white hover:bg-tanseek-canvas'}`}><div className="flex items-start gap-3"><span className="mt-0.5 text-tanseek-alert"><Icon name="alert" size={18}/></span><span className="min-w-0"><span className="block text-sm font-bold text-tanseek-ink">{t(c.title)}</span><span className="mt-1 block text-xs leading-5 text-tanseek-muted">{t(c.scope)}</span></span></div></button>)}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-tanseek-alert/35 bg-tanseek-alertSoft/60 p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-brand-sm bg-tanseek-alert text-white"><Icon name="alert" size={22}/></div><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-tanseek-alert">{t('Hard conflict')}</p><h2 className="mt-1 text-xl font-bold text-tanseek-navy">{t(conflict.title)}</h2><p className="mt-2 text-sm leading-6 text-tanseek-ink">{t(conflict.reason)}</p></div></div>
              <StatusBadge status="conflict">{t('Blocks publish')}</StatusBadge>
            </div>
            <div className="mt-5 grid gap-3 rounded-brand-sm border border-tanseek-alert/20 bg-white/80 p-4 sm:grid-cols-2"><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tanseek-muted">{t('Affected session')}</p><p className="mt-1 text-sm font-bold text-tanseek-navy">{t(conflict.allocation)}</p></div><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tanseek-muted">{t('Collision')}</p><p className="mt-1 text-sm font-bold text-tanseek-navy">{t(conflict.scope)}</p></div></div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-tanseek-line p-5 md:px-6"><h2 className="text-lg font-bold text-tanseek-navy">{t('Suggested spaces & slots')}</h2><p className="mt-1 text-sm text-tanseek-muted">{t('Feasible alternatives ranked by room suitability, equipment, availability and scheduling preferences.')}</p></div>
            <div className="divide-y divide-tanseek-line">
              {alternatives.length === 0 ? (
                <div className="p-5 md:p-6">
                  <div className="rounded-brand-sm border border-tanseek-line bg-tanseek-canvas/60 p-4">
                    <p className="text-sm font-bold text-tanseek-navy">{t('No automatic alternative is available for this live conflict.')}</p>
                    <p className="mt-1 text-xs leading-5 text-tanseek-muted">{conflict.recommendationError || t('No feasible room/time combination was found under the current capacity, equipment, availability and conflict rules. You can edit the allocation manually and validation will run again.')}</p>
                  </div>
                </div>
              ) : alternatives.map((a, index) => {
                const selected = selectedAlternative === a.id
                return <button key={a.id} onClick={()=>setSelectedAlternative(a.id)} className={`flex w-full flex-col gap-4 p-5 text-left transition md:flex-row md:items-center ${selected ? 'bg-tanseek-tealSoft/70' : 'hover:bg-tanseek-canvas/80'}`}>
                  <div className="flex flex-1 items-start gap-4"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-brand-sm text-sm font-bold ${index===0?'bg-tanseek-teal text-tanseek-navy':'bg-tanseek-navySoft text-tanseek-navy'}`}>{index+1}</div><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold text-tanseek-navy">{a.room}</h3>{index===0 && <StatusBadge status="available">{t('Recommended')}</StatusBadge>}</div><p className="mt-1 text-sm text-tanseek-muted">{t(a.day)} · {a.time}{a.capacity ? ` · ${a.capacity} ${t('seats')}` : ''}{a.score != null ? ` · ${a.score}%` : ''}</p><p className="mt-2 text-xs leading-5 text-tanseek-muted">{[a.equipment, a.tradeoff].filter(Boolean).map(value => t(value)).join(' · ')}</p></div></div>
                  <div className="flex items-center gap-4 md:justify-end"><div className={`grid h-9 w-9 place-items-center rounded-full border ${selected?'border-tanseek-teal bg-tanseek-teal text-tanseek-navy':'border-tanseek-line bg-white text-transparent'}`}><Icon name="check" size={17}/></div></div>
                </button>
              })}
            </div>
            <div className="border-t border-tanseek-line bg-tanseek-canvas/60 p-5 md:px-6">
              {actionError && <div className="mb-3 rounded-brand-sm border border-tanseek-alert/25 bg-tanseek-alertSoft px-3 py-2 text-xs font-bold text-tanseek-alert">{actionError}</div>}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-tanseek-muted">{t(readOnly ? 'Admin can review conflict details here; conflict alternatives are applied by the Scheduler.' : 'Scheduler confirmation is required; recommendations never auto-publish.')}</p>
                {!readOnly && (
                  <Button disabled={!selectedAlternative || applying} onClick={applySelected} className={!selectedAlternative || applying ? 'cursor-not-allowed opacity-45' : ''} icon="check">
                    {t(applying ? 'Applying…' : 'Apply selected alternative')}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
