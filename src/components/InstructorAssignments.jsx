import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card, StatusBadge } from './UI'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

export default function InstructorAssignments({ currentUser }) {
  const { t } = useLanguage()
  const [catalog, setCatalog] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [staff, setStaff] = useState([])
  const [sectionId, setSectionId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [catalogPayload, assignmentPayload] = await Promise.all([
        tanseekApi.getPlanningCatalog(),
        tanseekApi.getInstructorAssignments(),
      ])
      setCatalog(catalogPayload)
      setAssignments(assignmentPayload?.assignments || [])
      setStaff(assignmentPayload?.staff || [])
    } catch (err) {
      setError(err?.message || t('Could not load instructor assignments.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const sectionOptions = useMemo(() => {
    const sections = catalog?.sections || []
    if (!currentUser || currentUser.role === 'super_admin' || currentUser.department_id == null) return sections
    return sections.filter(section => {
      const course = catalog?.courses?.find(item => Number(item.id) === Number(section.course_id))
      return Number(course?.department_id) === Number(currentUser.department_id)
    })
  }, [catalog, currentUser])
  const selectedSection = useMemo(() => sectionOptions.find(item => String(item.id) === String(sectionId)) || null, [sectionOptions, sectionId])
  const selectedRequirementId = selectedSection?.requirement_id ?? selectedSection?.requirementId ?? null
  const eligibleStaff = useMemo(() => {
    const scopedStaff = (!currentUser || currentUser.role === 'super_admin' || currentUser.department_id == null)
      ? staff
      : staff.filter(item => Number(item.department_id) === Number(currentUser.department_id))
    if (!selectedSection) return scopedStaff
    if (selectedSection.component === 'PRACTICAL') return scopedStaff.filter(item => ['lecturer', 'ta'].includes(item.role))
    return scopedStaff.filter(item => item.role === 'lecturer')
  }, [staff, selectedSection, currentUser])

  async function assign(event) {
    event.preventDefault()
    if (!sectionId || !staffId || !selectedRequirementId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await tanseekApi.assignInstructor(sectionId, { staff_id: Number(staffId), requirement_id: Number(selectedRequirementId) })
      setMessage(t('Instructor assignment saved.'))
      setStaffId('')
      await load()
    } catch (err) {
      setError(err?.message || t('Could not save instructor assignment.'))
    } finally {
      setSaving(false)
    }
  }

  async function remove(item) {
    if (!window.confirm(t('Remove this instructor assignment?'))) return
    setError('')
    setMessage('')
    try {
      await tanseekApi.removeInstructor(item.section_id, item.staff_id)
      setMessage(t('Instructor assignment removed.'))
      await load()
    } catch (err) {
      setError(err?.message || t('Could not remove instructor assignment.'))
    }
  }


  const visibleAssignments = useMemo(() => {
    const allowedSectionIds = new Set(sectionOptions.map(section => Number(section.id)))
    return assignments.filter(item => allowedSectionIds.has(Number(item.section_id)))
  }, [assignments, sectionOptions])

  const courseFor = section => catalog?.courses?.find(course => Number(course.id) === Number(section?.course_id))
  const sectionFor = id => catalog?.sections?.find(section => Number(section.id) === Number(id))

  return (
    <>
      <PageHeader
        eyebrow={t('Department Coordinator')}
        title={t('Instructor assignments')}
        description={t('Assign the responsible Lecturer or TA to each Lecture or Practical section before scheduling. The Scheduler chooses time and room, not the instructor.')}
      />

      {error && <div className="mb-5 rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft px-4 py-3 text-sm font-bold text-tanseek-alert">{error}</div>}
      {message && <div className="mb-5 rounded-brand border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{message}</div>}

      {loading ? (
        <Card className="p-6 text-sm text-tanseek-muted">{t('Loading instructor assignments…')}</Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-tanseek-navy">{t('Assign instructor')}</h2>
            <p className="mt-1 text-xs leading-5 text-tanseek-muted">{t('Lecture sections require a Lecturer. Practical sections may be assigned to a Lecturer or TA.')}</p>

            <form onSubmit={assign} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Section')}</span>
                <select value={sectionId} onChange={event => { setSectionId(event.target.value); setStaffId('') }} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">
                  <option value="">{t('Select section')}</option>
                  {sectionOptions.map(section => {
                    const course = courseFor(section)
                    return <option key={section.id} value={section.id}>{section.code} · {course?.name || ''} · {t(section.component === 'PRACTICAL' ? 'Practical' : 'Lecture')}</option>
                  })}
                </select>
              </label>

              {selectedSection && !selectedRequirementId && (
                <div className="rounded-brand-sm border border-tanseek-alert/25 bg-tanseek-alertSoft px-3 py-2 text-xs font-bold leading-5 text-tanseek-alert">
                  {t('This section is not linked to a Lecture/Practical requirement. Create the course requirement first, then edit this section and choose its component.')}
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Instructor')}</span>
                <select disabled={!sectionId || !selectedRequirementId} value={staffId} onChange={event => setStaffId(event.target.value)} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm disabled:bg-tanseek-canvas">
                  <option value="">{t('Select instructor')}</option>
                  {eligibleStaff.map(person => <option key={person.id} value={person.id}>{person.name} · {t(person.role === 'ta' ? 'TA' : 'Lecturer')}</option>)}
                </select>
              </label>

              <Button type="submit" className="w-full" disabled={saving || !sectionId || !staffId || !selectedRequirementId}>{saving ? t('Saving…') : t('Save assignment')}</Button>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-tanseek-line p-5">
              <h2 className="text-lg font-bold text-tanseek-navy">{t('Assigned sections')}</h2>
              <p className="mt-1 text-xs text-tanseek-muted">{t('These assignments are consumed by the scheduling engine.')}</p>
            </div>
            {visibleAssignments.length === 0 ? (
              <div className="grid min-h-[280px] place-items-center p-8 text-center text-sm text-tanseek-muted">{t('No instructor assignments yet.')}</div>
            ) : (
              <div className="custom-scrollbar overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted"><tr><th className="px-5 py-3">{t('Section')}</th><th className="px-4 py-3">{t('Component')}</th><th className="px-4 py-3">{t('Instructor')}</th><th className="px-4 py-3">{t('Role')}</th><th className="px-5 py-3"></th></tr></thead>
                  <tbody className="divide-y divide-tanseek-line">
                    {visibleAssignments.map(item => {
                      const section = sectionFor(item.section_id)
                      return (
                        <tr key={item.id}>
                          <td className="px-5 py-4"><p className="text-sm font-bold text-tanseek-navy">{section?.code || item.section_id}</p><p className="mt-1 text-xs text-tanseek-muted">{courseFor(section)?.name || ''}</p></td>
                          <td className="px-4 py-4"><StatusBadge status={section?.component === 'PRACTICAL' ? 'pending' : 'active'}>{t(section?.component === 'PRACTICAL' ? 'Practical' : 'Lecture')}</StatusBadge></td>
                          <td className="px-4 py-4 text-sm font-bold text-tanseek-navy">{item.staff_name}</td>
                          <td className="px-4 py-4 text-xs text-tanseek-muted">{t(item.staff_role === 'TA' ? 'TA' : 'Lecturer')}</td>
                          <td className="px-5 py-4 text-right"><button onClick={() => remove(item)} className="text-tanseek-alert hover:underline">{t('Remove')}</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
