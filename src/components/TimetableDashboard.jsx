import React, { useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card, StatusBadge } from './UI'
import { Icon } from './Icons'
import { days, slots } from '../data/mockData'
import { useLanguage } from '../i18n/LanguageContext'
import { hasPermission } from '../auth/permissions'
import AddAllocationModal from './AddAllocationModal'
import EditAllocationModal from './EditAllocationModal'

function formatPublishedAt(value, language = 'en') {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function allocationLevel(item) {
  const direct = item?.level ?? item?.academic_level ?? item?.academicLevel ?? item?.student_group?.level ?? item?.studentGroup?.level
  if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
    const match = String(direct).match(/\d+/)
    return match ? String(Number(match[0])) : String(direct)
  }

  const text = [item?.section, item?.student_group_name, item?.studentGroupName, item?.group]
    .filter(Boolean)
    .join(' ')
  const match = text.match(/(?:year|level)\s*(\d+)/i)
  return match ? String(Number(match[1])) : ''
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean).map(value => String(value)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

function PublishedState({ type, message, onRetry }) {
  const { t } = useLanguage()

  if (type === 'loading') {
    return (
      <Card className="grid min-h-[360px] place-items-center p-10 text-center">
        <div>
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-tanseek-line border-t-tanseek-teal" />
          <h2 className="mt-5 text-lg font-bold text-tanseek-navy">{t('Loading published timetable')}</h2>
          <p className="mt-2 text-sm text-tanseek-muted">{t('Checking the latest official version.')}</p>
        </div>
      </Card>
    )
  }

  if (type === 'error') {
    return (
      <Card className="grid min-h-[360px] place-items-center border-tanseek-alert/30 bg-tanseek-alertSoft/35 p-10 text-center">
        <div className="max-w-md">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tanseek-alertSoft text-tanseek-alert"><Icon name="alert" size={27} /></div>
          <h2 className="mt-5 text-lg font-bold text-tanseek-navy">{t('Could not load the timetable')}</h2>
          <p className="mt-2 text-sm leading-6 text-tanseek-muted">{message}</p>
          {onRetry && <Button className="mt-5" variant="secondary" onClick={onRetry}>{t('Try again')}</Button>}
        </div>
      </Card>
    )
  }

  return (
    <Card className="grid min-h-[360px] place-items-center p-10 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tanseek-navySoft text-tanseek-navy"><Icon name="calendar" size={27} /></div>
        <h2 className="mt-5 text-lg font-bold text-tanseek-navy">{t('No published timetable yet')}</h2>
        <p className="mt-2 text-sm leading-6 text-tanseek-muted">{t('The Admin has not published an official timetable for this term yet. Draft allocations are not visible here.')}</p>
      </div>
    </Card>
  )
}

function PublishModal({ mode, conflictCount, allocationCount, publishedVersion, publishing, error, workflowStatus, onClose, onReviewConflicts, onConfirm }) {
  const { language, t } = useLanguage()
  if (!mode) return null

  const success = mode === 'success'
  const blocked = mode === 'blocked'
  const workflowBlocked = mode === 'workflow-blocked'

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-tanseek-navy/45 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-[540px] overflow-hidden rounded-brand border border-tanseek-line bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-tanseek-line p-5 md:p-6">
          <div className="flex gap-3">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-brand-sm ${blocked || workflowBlocked ? 'bg-tanseek-alertSoft text-tanseek-alert' : success ? 'bg-tanseek-tealSoft text-tanseek-teal' : 'bg-tanseek-navySoft text-tanseek-navy'}`}>
              <Icon name={blocked || workflowBlocked ? 'alert' : success ? 'check' : 'calendar'} size={22} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-tanseek-muted">Fall 2026</p>
              <h2 className="mt-1 text-xl font-bold text-tanseek-navy">{blocked ? t('Cannot publish this version') : workflowBlocked ? t('Schedule is not ready to publish') : success ? t('Timetable published') : t('Publish timetable?')}</h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-brand-sm p-2 text-tanseek-muted hover:bg-tanseek-canvas hover:text-tanseek-navy" aria-label="Close"><Icon name="x" size={19} /></button>
        </div>

        <div className="p-5 md:p-6">
          {workflowBlocked ? (
            <>
              <p className="text-sm leading-6 text-tanseek-ink">{t('The Scheduler must submit the draft for Admin review before it can be published.')}</p>
              <div className="mt-5 rounded-brand-sm border border-tanseek-alert/25 bg-tanseek-alertSoft p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-tanseek-alert"><Icon name="alert" size={17} />{t('Current workflow status')}: {t(workflowStatus || 'DRAFT')}</div>
                <p className="mt-2 text-xs leading-5 text-tanseek-muted">{t('Sign in as Scheduler, resolve hard conflicts, then use Submit for Admin review. After that, Admin can publish.')}</p>
              </div>
            </>
          ) : blocked ? (
            <>
              <p className="text-sm leading-6 text-tanseek-ink">{conflictCount} {t('hard conflicts')} {language === 'ar' ? 'يجب حلها قبل أن تصبح هذه المسودة الجدول الرسمي.' : `must be resolved before this draft can become the official timetable.`}</p>
              <div className="mt-5 rounded-brand-sm border border-tanseek-alert/25 bg-tanseek-alertSoft p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-tanseek-alert"><Icon name="alert" size={17} />{t('Publication blocked')}</div>
                <p className="mt-2 text-xs leading-5 text-tanseek-muted">{t('Open Conflict Resolution, apply feasible alternatives, then return here and publish again.')}</p>
              </div>
            </>
          ) : success ? (
            <>
              <p className="text-sm leading-6 text-tanseek-ink">{language === 'ar' ? `تم نشر النسخة ${publishedVersion?.version_number} وأصبحت أحدث جدول رسمي في الوضع التجريبي.` : `Published Version ${publishedVersion?.version_number} is now the latest official timetable in Mock API mode.`}</p>
              <div className="mt-5 grid gap-3 rounded-brand-sm border border-tanseek-teal/20 bg-tanseek-tealSoft/55 p-4 sm:grid-cols-2">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tanseek-muted">{t('Status')}</p><p className="mt-1 text-sm font-bold text-tanseek-navy">{t('PUBLISHED')}</p></div>
                <div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tanseek-muted">{t('Published')}</p><p className="mt-1 text-sm font-bold text-tanseek-navy">{formatPublishedAt(publishedVersion?.published_at, language)}</p></div>
              </div>
              <p className="mt-4 text-xs leading-5 text-tanseek-muted">{language === 'ar' ? 'سجّل الدخول بحساب دكتور/معيد للتأكد من ظهور النسخة المنشورة فقط. ويمكن للطلاب رؤيتها من الصفحة الرئيسية بدون تسجيل دخول.' : 'Sign in with the Doctor/TA or Student demo account to verify the published personalized views.'}</p>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-tanseek-ink">{language === 'ar' ? 'سيتم إنشاء نسخة رسمية منشورة جديدة من المسودة الحالية. سيعرض الدكتور/المعيد هذه النسخة داخل حسابه، وسيعرضها الطلاب من الصفحة الرئيسية.' : `This creates a new official published version from the current draft. Doctor/TA and Student accounts will read this snapshot instead of draft data.`}</p>
              <div className="mt-5 grid gap-3 rounded-brand-sm border border-tanseek-line bg-tanseek-canvas p-4 sm:grid-cols-2">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tanseek-muted">{t('Allocations')}</p><p className="mt-1 text-lg font-bold text-tanseek-navy">{allocationCount}</p></div>
                <div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tanseek-muted">{t('Hard conflicts')}</p><p className="mt-1 text-lg font-bold text-tanseek-teal">0</p></div>
              </div>
              {error && <div className="mt-4 rounded-brand-sm border border-tanseek-alert/25 bg-tanseek-alertSoft p-3 text-sm text-tanseek-alert">{error}</div>}
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-tanseek-line bg-tanseek-canvas/60 p-4 sm:flex-row sm:justify-end md:px-6">
          {workflowBlocked ? (
            <Button onClick={onClose}>{t('Done')}</Button>
          ) : blocked ? (
            <>
              <Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button>
              <Button variant="danger" icon="alert" onClick={onReviewConflicts}>{t('Review conflicts')}</Button>
            </>
          ) : success ? (
            <Button onClick={onClose}>{t('Done')}</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose} disabled={publishing}>{t('Cancel')}</Button>
              <Button icon="check" onClick={onConfirm} disabled={publishing} className={publishing ? 'cursor-wait opacity-70' : ''}>{publishing ? t('Publishing…') : t('Publish version')}</Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TimetableDashboard({
  role,
  user,
  conflictCount,
  onGoConflicts,
  allocations = [],
  publishedVersion,
  publishedDetails = null,
  publishedLoading = false,
  publishedError = '',
  onReloadPublished,
  onPublish,
  onAddAllocation,
  onUpdateAllocation,
  draftLoading = false,
  draftError = '',
  onReloadDraft,
  workflow = null,
  onGenerate,
  onSubmitReview,
}) {
  const [view, setView] = useState('level')
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    level: 'All',
    section: 'All',
    lecturer: 'All',
    room: 'All',
    day: 'All',
  })
  const [publishMode, setPublishMode] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [justPublished, setJustPublished] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editingAllocation, setEditingAllocation] = useState(null)
  const [workflowBusy, setWorkflowBusy] = useState(false)
  const [workflowError, setWorkflowError] = useState('')
  const [workflowMessage, setWorkflowMessage] = useState('')
  const { language, t } = useLanguage()

  const publishedOnly = ['lecturer', 'ta', 'student'].includes(role)
  const canManageDraft = hasPermission(user, 'schedule.manage')
  const canGenerate = hasPermission(user, 'schedule.generate')
  const canSubmitReview = hasPermission(user, 'schedule.submit_review')
  const canReview = hasPermission(user, 'schedule.review')
  const canPublish = hasPermission(user, 'publish.manage')
  const canResolveConflicts = hasPermission(user, 'conflicts.manage')

  const baseAllocations = useMemo(() => {
    if (!publishedOnly) return allocations
    const published = publishedVersion?.allocations || []
    if (role === 'lecturer' || role === 'ta') return published.filter(item => item.staff === user?.name)
    return published
  }, [allocations, publishedOnly, publishedVersion, role, user?.name])

  const filterOptions = useMemo(() => ({
    levels: uniqueValues(baseAllocations.map(allocationLevel)),
    sections: uniqueValues(baseAllocations.map(item => item.section)),
    lecturers: uniqueValues(baseAllocations.map(item => item.staff)),
    rooms: uniqueValues(baseAllocations.map(item => item.room)),
  }), [baseAllocations])

  const activeFilterCount = useMemo(() =>
    Object.values(filters).filter(value => value !== 'All').length,
  [filters])

  const visible = useMemo(() => baseAllocations.filter(a => {
    const level = allocationLevel(a)

    if (filters.level !== 'All' && level !== String(filters.level)) return false
    if (filters.section !== 'All' && a.section !== filters.section) return false
    if (filters.lecturer !== 'All' && a.staff !== filters.lecturer) return false
    if (filters.room !== 'All' && a.room !== filters.room) return false
    if (filters.day !== 'All' && a.day !== filters.day) return false

    const q = query.trim().toLowerCase()
    if (!q) return true

    if (view === 'level') {
      return [level, `level ${level}`, `year ${level}`].some(value => String(value || '').toLowerCase().includes(q))
    }
    if (view === 'section') return String(a.section || '').toLowerCase().includes(q)
    if (view === 'lecturer') return String(a.staff || '').toLowerCase().includes(q)
    if (view === 'room') return String(a.room || '').toLowerCase().includes(q)
    return true
  }), [baseAllocations, query, view, filters])

  function clearFilters() {
    setFilters({ level: 'All', section: 'All', lecturer: 'All', room: 'All', day: 'All' })
  }

  const headerEyebrow = publishedOnly
    ? publishedVersion ? `${publishedVersion.term_name || 'Fall 2026'} · ${t('Published')} v${publishedVersion.version_number}` : `Fall 2026 · ${t('Published timetable')}`
    : 'Fall 2026 · Draft v3'

  const title = publishedOnly ? t('My timetable') : t('Weekly timetable')
  const description = publishedOnly
    ? t('Latest official published schedule. Draft changes remain hidden until an Admin publishes the reviewed version.')
    : t('Saturday–Wednesday · 09:00–17:00 · 2-hour slots · no breaks. Times shown in campus local time.')

  function openPublish() {
    setPublishError('')
    const publishableStatuses = ['READY_FOR_REVIEW', 'UNDER_REVIEW', 'APPROVED']
    if (!publishableStatuses.includes(workflow?.status)) {
      setPublishMode('workflow-blocked')
      return
    }
    setPublishMode(conflictCount > 0 ? 'blocked' : 'confirm')
  }

  async function confirmPublish() {
    if (!onPublish) return
    setPublishing(true)
    setPublishError('')
    try {
      const version = await onPublish()
      setJustPublished(version)
      setPublishMode('success')
    } catch (error) {
      setPublishError(error?.message || 'Could not publish this version.')
    } finally {
      setPublishing(false)
    }
  }


  async function runGenerate() {
    if (!onGenerate) return
    setWorkflowBusy(true); setWorkflowError(''); setWorkflowMessage('')
    try {
      await onGenerate()
      setWorkflowMessage(t('Draft schedule generated. Resolve any conflicts, then submit it for Admin review.'))
    } catch (error) {
      setWorkflowError(error?.message || t('Could not generate the draft schedule.'))
    } finally { setWorkflowBusy(false) }
  }

  async function submitReview() {
    if (!onSubmitReview) {
      setWorkflowError(t('Submit action is not connected.'))
      return
    }
    setWorkflowBusy(true); setWorkflowError(''); setWorkflowMessage('')
    try {
      await onSubmitReview()
      setWorkflowMessage(t('Draft submitted to Admin for review.'))
    } catch (error) {
      setWorkflowError(error?.message || t('Could not submit the draft for review.'))
    } finally { setWorkflowBusy(false) }
  }

  return (
    <>
      <PageHeader
        eyebrow={headerEyebrow}
        title={title}
        description={description}
        actions={!publishedOnly && <>
          {canGenerate && <Button variant="secondary" icon="calendar" onClick={runGenerate} disabled={workflowBusy}>{t('Generate draft')}</Button>}
          {canManageDraft && <Button variant="secondary" icon="plus" onClick={() => setAddOpen(true)}>{t('Add session')}</Button>}
          <Button variant="secondary" icon="filter" onClick={() => setFiltersOpen(prev => !prev)}>{t('Filters')}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</Button>
          {canSubmitReview && workflow?.status !== 'READY_FOR_REVIEW' && workflow?.status !== 'PUBLISHED' && <Button onClick={submitReview} disabled={workflowBusy} title={conflictCount > 0 ? t('Click to see why review submission is blocked.') : undefined}>{t('Submit for Admin review')}</Button>}
          {canPublish && <Button onClick={openPublish} title={!['READY_FOR_REVIEW','UNDER_REVIEW','APPROVED'].includes(workflow?.status) ? t('Click to see what is required before publishing.') : undefined}>{t('Publish version')}</Button>}
        </>}
      />

      {!publishedOnly && workflow && (
        <Card className="mb-5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.1em] text-tanseek-muted">{t('Schedule workflow')}</p>
              <p className="mt-1 text-sm font-bold text-tanseek-navy">{t(workflow.status || 'DRAFT')}</p>
              <p className="mt-1 text-xs text-tanseek-muted">{role === 'scheduler' ? t('Scheduler prepares the draft and submits it. Admin owns final review and Publish.') : role === 'admin' ? t('Review and adjust only the authorized department scope, then Publish when validation passes.') : t('Full workflow visibility.')}</p>
            </div>
            {canReview && workflow.status === 'READY_FOR_REVIEW' && <StatusBadge status="pending">{t('Ready for Admin review')}</StatusBadge>}
            {workflow.status === 'PUBLISHED' && <StatusBadge status="available">{t('Published')}</StatusBadge>}
          </div>
        </Card>
      )}
      {workflowError && <div className="mb-5 rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft px-4 py-3 text-sm font-bold text-tanseek-alert">{workflowError}</div>}
      {workflowMessage && <div className="mb-5 rounded-brand border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{workflowMessage}</div>}

      {!publishedOnly && draftLoading && (
        <Card className="mb-5 flex items-center gap-3 p-4 text-sm text-tanseek-muted"><div className="h-5 w-5 animate-spin rounded-full border-2 border-tanseek-line border-t-tanseek-teal" />{t('Loading draft timetable…')}</Card>
      )}
      {!publishedOnly && !draftLoading && draftError && (
        <div className="mb-5 flex flex-col gap-3 rounded-brand border border-tanseek-alert/30 bg-tanseek-alertSoft/40 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2 text-sm text-tanseek-alert"><Icon name="alert" size={18}/><span>{draftError}</span></div>{onReloadDraft && <Button variant="secondary" onClick={onReloadDraft}>{t('Try again')}</Button>}</div>
      )}

      {publishedOnly && !publishedLoading && !publishedError && publishedVersion && role === 'student' && (
        <div className="mb-5 grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[.1em] text-tanseek-muted">{t('Registered courses')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(publishedDetails?.course_registrations || []).map(item => <span key={item.id} className="rounded-brand-sm bg-tanseek-navySoft px-3 py-2 text-xs font-bold text-tanseek-navy">{item.course_code} · {item.course_name}{item.registration_type === 'CARRIED' ? ` · ${t('Carried course')}` : ''}</span>)}
              {(publishedDetails?.course_registrations || []).length === 0 && <span className="text-sm text-tanseek-muted">{t('No course registrations yet.')}</span>}
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[.1em] text-tanseek-muted">{t('My Lecture / Practical sections')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(publishedDetails?.section_enrollments || []).map(item => <span key={item.id} className="rounded-brand-sm border border-tanseek-line bg-white px-3 py-2 text-xs font-bold text-tanseek-navy">{item.section_code} · {t(item.component === 'PRACTICAL' ? 'Practical' : 'Lecture')}</span>)}
              {(publishedDetails?.section_enrollments || []).length === 0 && <span className="text-sm text-tanseek-muted">{t('No section assignments yet.')}</span>}
            </div>
          </Card>
        </div>
      )}

      {publishedOnly && !publishedLoading && !publishedError && publishedVersion && role === 'ta' && (
        <Card className="mb-5 p-5">
          <p className="text-xs font-bold uppercase tracking-[.1em] text-tanseek-muted">{t('My Practical sections')}</p>
          <div className="mt-3 flex flex-wrap gap-2">{uniqueValues(baseAllocations.filter(item => String(item.type).toLowerCase() === 'practical').map(item => item.section)).map(section => <span key={section} className="rounded-brand-sm bg-tanseek-navySoft px-3 py-2 text-xs font-bold text-tanseek-navy">{section}</span>)}</div>
        </Card>
      )}

      {publishedOnly && publishedLoading && <PublishedState type="loading" />}
      {publishedOnly && !publishedLoading && publishedError && <PublishedState type="error" message={publishedError} onRetry={onReloadPublished} />}
      {publishedOnly && !publishedLoading && !publishedError && !publishedVersion && <PublishedState type="empty" />}

      {!publishedOnly && publishedVersion && (
        <div className="mb-5 flex flex-col gap-2 rounded-brand border border-tanseek-teal/20 bg-tanseek-tealSoft/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><span className="mt-0.5 text-tanseek-teal"><Icon name="check" size={19} /></span><div><p className="text-sm font-bold text-tanseek-navy">{t('Latest official version:')} {t('Published')} v{publishedVersion.version_number}</p><p className="mt-0.5 text-xs text-tanseek-muted">{t('Published')} {formatPublishedAt(publishedVersion.published_at, language)} by {publishedVersion.published_by}.</p></div></div>
          <StatusBadge status="available">{t('Published')}</StatusBadge>
        </div>
      )}

      {conflictCount > 0 && canResolveConflicts && (
        <button onClick={onGoConflicts} className="mb-5 flex w-full items-center justify-between gap-4 rounded-brand border border-tanseek-alert/30 bg-tanseek-alertSoft px-4 py-3 text-left">
          <span className="flex items-start gap-3"><span className="mt-0.5 text-tanseek-alert"><Icon name="alert" size={20}/></span><span><strong className="block text-sm text-tanseek-alert">{t('Publication blocked by')} {conflictCount} {t('hard conflicts')}</strong><span className="mt-0.5 block text-xs text-tanseek-muted">{t('Open conflict resolution to review the collision and choose a feasible alternative.')}</span></span></span>
          <Icon name="chevron" size={18} className="shrink-0 text-tanseek-alert" />
        </button>
      )}

      {!publishedOnly && filtersOpen && (
        <Card className="mb-5 p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-tanseek-navy">{t('Timetable filters')}</p>
              <p className="mt-1 text-xs text-tanseek-muted">{t('The scheduler keeps one term draft; filters show the same draft by level, section, lecturer, room or day.')}</p>
            </div>
            {activeFilterCount > 0 && <Button variant="secondary" onClick={clearFilters}>{t('Clear filters')}</Button>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <select value={filters.level} onChange={e => setFilters(prev => ({ ...prev, level: e.target.value }))} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink">
              <option value="All">{t('All levels')}</option>
              {filterOptions.levels.map(level => <option key={level} value={level}>{t('Level')} {level}</option>)}
            </select>

            <select value={filters.section} onChange={e => setFilters(prev => ({ ...prev, section: e.target.value }))} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink">
              <option value="All">{t('All sections')}</option>
              {filterOptions.sections.map(section => <option key={section} value={section}>{section}</option>)}
            </select>

            <select value={filters.lecturer} onChange={e => setFilters(prev => ({ ...prev, lecturer: e.target.value }))} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink">
              <option value="All">{t('All lecturers')}</option>
              {filterOptions.lecturers.map(lecturer => <option key={lecturer} value={lecturer}>{lecturer}</option>)}
            </select>

            <select value={filters.room} onChange={e => setFilters(prev => ({ ...prev, room: e.target.value }))} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink">
              <option value="All">{t('All rooms')}</option>
              {filterOptions.rooms.map(room => <option key={room} value={room}>{room}</option>)}
            </select>

            <select value={filters.day} onChange={e => setFilters(prev => ({ ...prev, day: e.target.value }))} className="h-10 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink">
              <option value="All">{t('All days')}</option>
              {days.map(day => <option key={day} value={day}>{t(day)}</option>)}
            </select>
          </div>
        </Card>
      )}

      {(!publishedOnly || (!publishedLoading && !publishedError && publishedVersion)) && (
        <>
          {publishedOnly && publishedVersion && baseAllocations.length === 0 ? (
            <Card className="grid min-h-[360px] place-items-center p-10 text-center">
              <div className="max-w-md"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tanseek-navySoft text-tanseek-navy"><Icon name="calendar" size={27} /></div><h2 className="mt-5 text-lg font-bold text-tanseek-navy">{t('No sessions assigned')}</h2><p className="mt-2 text-sm leading-6 text-tanseek-muted">{t('The latest published version does not contain any sessions assigned to this account.')}</p></div>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-tanseek-line p-4 md:flex-row md:items-center md:justify-between md:px-5">
                <div className="flex gap-1 rounded-brand-sm bg-tanseek-canvas p-1">
                  {['level', 'section', 'lecturer', 'room'].map(v => <button key={v} onClick={() => { setView(v); setQuery('') }} className={`rounded-brand-sm px-3 py-2 text-xs font-bold capitalize ${view === v ? 'bg-white text-tanseek-navy shadow-sm' : 'text-tanseek-muted'}`}>{t(v)}</button>)}
                </div>
                <label className="relative block w-full md:w-80"><Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-tanseek-muted"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={`${t('Search by')} ${t(view)}`} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white pl-10 pr-3 text-sm" /></label>
              </div>

              <div className="custom-scrollbar overflow-x-auto">
                <div className="min-w-[980px] p-4 md:p-5">
                  <div className="grid grid-cols-[112px_repeat(5,minmax(160px,1fr))] gap-2">
                    <div />
                    {days.map(day => <div key={day} className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.08em] text-tanseek-muted">{t(day)}</div>)}
                    {slots.flatMap(slot => [
                      <div key={`time-${slot.id}`} className="flex min-h-[112px] flex-col justify-start rounded-brand-sm bg-tanseek-canvas px-3 py-3 text-xs"><span className="font-bold text-tanseek-navy">{slot.start}</span><span className="mt-1 text-tanseek-muted">{slot.end}</span></div>,
                      ...days.map(day => {
                        const cellEvents = visible.filter(a => a.day === day && a.slot === slot.id)
                        return <div key={`${day}-${slot.id}`} className={`min-h-[112px] rounded-brand-sm border p-2 ${cellEvents.length ? 'border-tanseek-line bg-tanseek-canvas/35' : 'border-tanseek-line bg-white'}`}>
                          <div className="space-y-2">
                            {cellEvents.map(event => <div key={event.id} className={`rounded-brand-sm border p-3 ${event.status === 'conflict' ? 'border-tanseek-alert/35 bg-tanseek-alertSoft' : 'border-tanseek-teal/20 bg-tanseek-tealSoft/75'}`}>
                              <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold leading-5 text-tanseek-navy">{event.course}</p>{event.status === 'conflict' && <span className="text-tanseek-alert"><Icon name="alert" size={16}/></span>}</div>
                              <p className="mt-1 text-[11px] font-bold text-tanseek-muted">{event.code} · {event.section}</p>
                              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-tanseek-muted"><Icon name="room" size={13}/>{event.room}</div>
                              <p className="mt-1 truncate text-[11px] text-tanseek-muted">{event.staff}</p>
                              {canManageDraft && (role !== 'admin' || !user?.department_id || Number(event.department_id) === Number(user.department_id)) && (
                                <button type="button" onClick={() => setEditingAllocation(event)} className="mt-2 text-[11px] font-bold text-tanseek-teal hover:underline">{t('Edit allocation')}</button>
                              )}
                            </div>)}
                          </div>
                        </div>
                      })
                    ])}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-tanseek-line bg-tanseek-canvas/60 px-5 py-3 text-xs text-tanseek-muted"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-tanseek-tealSoft ring-1 ring-tanseek-teal/30"/>{t('Scheduled')}</span>{!publishedOnly && <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-tanseek-alertSoft ring-1 ring-tanseek-alert/30"/>{t('Conflict')}</span>}<span className="ml-auto">{visible.length} {t(visible.length === 1 ? 'visible allocation' : 'visible allocations')}</span></div>
            </Card>
          )}
        </>
      )}

      <AddAllocationModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={onAddAllocation}
        user={user}
      />

      <EditAllocationModal allocation={editingAllocation} onClose={() => setEditingAllocation(null)} onSave={onUpdateAllocation} />

      <PublishModal
        mode={publishMode}
        conflictCount={conflictCount}
        allocationCount={allocations.length}
        publishedVersion={justPublished || publishedVersion}
        publishing={publishing}
        error={publishError}
        workflowStatus={workflow?.status}
        onClose={() => { setPublishMode(null); setPublishError('') }}
        onReviewConflicts={() => { setPublishMode(null); onGoConflicts?.() }}
        onConfirm={confirmPublish}
      />
    </>
  )
}
