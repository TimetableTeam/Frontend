import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card, StatusBadge } from './UI'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

export default function SectionAssignmentManagement({ currentUser }) {
  const { t } = useLanguage()
  const [students, setStudents] = useState([])
  const [catalog, setCatalog] = useState(null)
  const [activeTermId, setActiveTermId] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [registrations, setRegistrations] = useState([])
  const [assignments, setAssignments] = useState([])
  const [form, setForm] = useState({ course_code: '', component: 'LECTURE', section_code: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selectedStudent = useMemo(
    () => students.find(item => String(item.id) === String(selectedStudentId)) || null,
    [students, selectedStudentId]
  )

  const registeredCourseCodes = useMemo(() => registrations.map(item => item.course_code), [registrations])
  const registeredCourses = useMemo(() => {
    const courses = (catalog?.courses || []).filter(course => registeredCourseCodes.includes(course.code))
    if (!currentUser || currentUser.role === 'super_admin' || currentUser.department_id == null) return courses
    return courses.filter(course => Number(course.department_id) === Number(currentUser.department_id))
  }, [catalog, registeredCourseCodes, currentUser])

  const selectedCourse = useMemo(
    () => registeredCourses.find(course => course.code === form.course_code) || null,
    [registeredCourses, form.course_code]
  )


  const visibleAssignments = useMemo(() => {
    if (!currentUser || currentUser.role === 'super_admin' || currentUser.department_id == null) return assignments
    const allowedCourseCodes = new Set((catalog?.courses || [])
      .filter(course => Number(course.department_id) === Number(currentUser.department_id))
      .map(course => course.code))
    return assignments.filter(item => allowedCourseCodes.has(item.course_code))
  }, [assignments, catalog, currentUser])

  const sectionOptions = useMemo(() => {
    if (!selectedCourse) return []
    return (catalog?.sections || []).filter(section =>
      Number(section.course_id) === Number(selectedCourse.id) &&
      String(section.component || '').toUpperCase() === form.component
    )
  }, [catalog, selectedCourse, form.component])

  async function loadForStudent(studentId, termId = activeTermId) {
    if (!studentId) {
      setRegistrations([])
      setAssignments([])
      return
    }
    if (!termId) {
      setRegistrations([])
      setAssignments([])
      setError(t('No active academic term is available.'))
      return
    }
    setError('')
    try {
      const [registrationPayload, assignmentPayload] = await Promise.all([
        tanseekApi.getStudentCourseRegistrations(studentId, termId),
        tanseekApi.getStudentSectionEnrollments(studentId, termId),
      ])
      setRegistrations(registrationPayload?.registrations || [])
      setAssignments(assignmentPayload?.assignments || [])
    } catch (err) {
      setError(err?.message || 'Could not load student section assignments.')
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError('')
      try {
        const [studentsPayload, catalogPayload] = await Promise.all([
          tanseekApi.getStudents(),
          tanseekApi.getPlanningCatalog(),
        ])
        const list = studentsPayload?.students || []
        const termId = Number(catalogPayload?.termId || catalogPayload?.term?.id || 0) || null
        setStudents(list)
        setCatalog(catalogPayload)
        setActiveTermId(termId)
        const firstId = list[0]?.id || ''
        setSelectedStudentId(firstId)
        if (firstId) await loadForStudent(firstId, termId)
      } catch (err) {
        setError(err?.message || 'Could not load section assignment data.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!form.course_code && registeredCourses[0]?.code) {
      setForm(current => ({ ...current, course_code: registeredCourses[0].code, section_code: '' }))
    }
  }, [registeredCourses, form.course_code])

  useEffect(() => {
    setForm(current => ({ ...current, section_code: '' }))
  }, [form.course_code, form.component])

  async function assignSection(event) {
    event.preventDefault()
    if (!selectedStudentId || !activeTermId || !form.course_code || !form.section_code) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await tanseekApi.createSectionEnrollment({
        student_id: Number(selectedStudentId),
        term_id: activeTermId,
        course_code: form.course_code,
        component: form.component,
        section_code: form.section_code,
      })
      setMessage(t('Section assignment saved.'))
      await loadForStudent(selectedStudentId, activeTermId)
    } catch (err) {
      setError(err?.message || 'Could not assign this section.')
    } finally {
      setSaving(false)
    }
  }

  async function removeAssignment(id) {
    if (!window.confirm(t('Remove this section assignment?'))) return
    setError('')
    setMessage('')
    try {
      await tanseekApi.deleteSectionEnrollment(id)
      setMessage(t('Section assignment removed.'))
      await loadForStudent(selectedStudentId, activeTermId)
    } catch (err) {
      setError(err?.message || 'Could not remove this section assignment.')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t('Department Coordinator')}
        title={t('Student section assignments')}
        description={t('After course registration, assign each student to one Lecture section and one Practical section when the course has both components.')}
      />

      {!loading && !activeTermId && (
        <div className="mb-5 rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft px-4 py-3 text-sm font-bold text-tanseek-alert">
          {t('No active academic term is available. Activate a term before assigning students to sections.')}
        </div>
      )}

      {currentUser?.role === 'department_coordinator' && currentUser?.department_name && (
        <div className="mb-5 rounded-brand border border-tanseek-teal/20 bg-tanseek-tealSoft px-4 py-3 text-xs text-tanseek-ink">
          {t('Scope')}: <strong>{currentUser.department_name}</strong> · {t('Only registered courses owned by your department can be assigned here.')}
        </div>
      )}

      {error && <div className="mb-5 rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft px-4 py-3 text-sm font-bold text-tanseek-alert">{error}</div>}
      {message && <div className="mb-5 rounded-brand border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{message}</div>}

      {loading ? (
        <Card className="p-6 text-sm text-tanseek-muted">{t('Loading section assignments…')}</Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-tanseek-navy">{t('Student & registered course')}</h2>
            <p className="mt-1 text-xs text-tanseek-muted">{t('Only courses already registered by the Registration Officer are available here.')}</p>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Student')}</span>
              <select
                value={selectedStudentId}
                onChange={async event => {
                  const id = event.target.value
                  setSelectedStudentId(id)
                  setForm({ course_code: '', component: 'LECTURE', section_code: '' })
                  await loadForStudent(id, activeTermId)
                }}
                className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm"
              >
                {students.map(student => <option key={student.id} value={student.id}>{student.university_id} · {student.name}</option>)}
              </select>
            </label>

            {selectedStudent && (
              <div className="mt-4 rounded-brand-sm bg-tanseek-canvas p-4">
                <p className="text-sm font-bold text-tanseek-navy">{selectedStudent.name}</p>
                <p className="mt-1 text-xs text-tanseek-muted">{t('Level')} {selectedStudent.current_level} · {selectedStudent.department_name}</p>
              </div>
            )}

            <form onSubmit={assignSection} className="mt-5 space-y-4 border-t border-tanseek-line pt-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Registered course')}</span>
                <select value={form.course_code} onChange={event => setForm(prev => ({ ...prev, course_code: event.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">
                  <option value="">{t('Select registered course')}</option>
                  {registeredCourses.map(course => <option key={course.id} value={course.code}>{course.code} — {course.name}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Component')}</span>
                <select value={form.component} onChange={event => setForm(prev => ({ ...prev, component: event.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">
                  <option value="LECTURE">{t('Lecture')}</option>
                  <option value="PRACTICAL">{t('Practical')}</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Section')}</span>
                <select value={form.section_code} onChange={event => setForm(prev => ({ ...prev, section_code: event.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">
                  <option value="">{t('Select section')}</option>
                  {sectionOptions.map(section => <option key={section.id} value={section.code}>{section.code} — {section.name}</option>)}
                </select>
              </label>

              <Button type="submit" icon="check" disabled={saving || !form.course_code || !form.section_code} className="w-full">
                {saving ? t('Saving…') : t('Assign section')}
              </Button>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-tanseek-line p-5">
              <h2 className="text-lg font-bold text-tanseek-navy">{t('Final section enrollments')}</h2>
              <p className="mt-1 text-xs text-tanseek-muted">{t('These individual rows are the source of truth used to build the student personal timetable and detect student conflicts.')}</p>
            </div>

            {visibleAssignments.length === 0 ? (
              <div className="grid min-h-[300px] place-items-center p-8 text-center text-sm text-tanseek-muted">{t('No section assignments yet.')}</div>
            ) : (
              <div className="custom-scrollbar overflow-x-auto">
                <table className="w-full min-w-[680px] text-left">
                  <thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted">
                    <tr><th className="px-5 py-3">{t('Course')}</th><th className="px-4 py-3">{t('Component')}</th><th className="px-4 py-3">{t('Section')}</th><th className="px-4 py-3">{t('Status')}</th><th className="px-5 py-3"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-tanseek-line">
                    {visibleAssignments.map(item => (
                      <tr key={item.id}>
                        <td className="px-5 py-4 text-sm font-bold text-tanseek-navy">{item.course_code}</td>
                        <td className="px-4 py-4 text-xs font-bold text-tanseek-muted">{t(item.component === 'PRACTICAL' ? 'Practical' : 'Lecture')}</td>
                        <td className="px-4 py-4 text-sm text-tanseek-ink">{item.section_code}</td>
                        <td className="px-4 py-4"><StatusBadge status="active">{t('Active')}</StatusBadge></td>
                        <td className="px-5 py-4 text-right"><button onClick={() => removeAssignment(item.id)} className="text-tanseek-alert hover:underline">{t('Remove')}</button></td>
                      </tr>
                    ))}
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
