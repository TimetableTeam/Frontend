import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card, StatusBadge } from './UI'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

export default function EnrollmentManagement() {
  const { t } = useLanguage()
  const [students, setStudents] = useState([])
  const [catalog, setCatalog] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ course_code: '', registration_type: 'NORMAL' })

  const selectedStudent = useMemo(
    () => students.find(item => String(item.id) === String(selectedStudentId)) || null,
    [students, selectedStudentId]
  )

  const courseOptions = useMemo(() => catalog?.courses || [], [catalog])

  async function loadBase() {
    setLoading(true)
    setError('')
    try {
      const [studentsPayload, catalogPayload] = await Promise.all([
        tanseekApi.getStudents(),
        tanseekApi.getPlanningCatalog(),
      ])
      const list = studentsPayload?.students || []
      setStudents(list)
      setCatalog(catalogPayload)
      const firstId = selectedStudentId || list[0]?.id || ''
      setSelectedStudentId(firstId)
      if (firstId) await loadRegistrations(firstId)
    } catch (err) {
      setError(err?.message || 'Could not load students and registrations.')
    } finally {
      setLoading(false)
    }
  }

  async function loadRegistrations(studentId) {
    if (!studentId) {
      setRegistrations([])
      return
    }
    setError('')
    try {
      const payload = await tanseekApi.getStudentCourseRegistrations(studentId, 1)
      setRegistrations(payload?.registrations || [])
    } catch (err) {
      setError(err?.message || 'Could not load course registrations.')
    }
  }

  useEffect(() => { loadBase() }, [])

  async function addRegistration(event) {
    event.preventDefault()
    if (!selectedStudentId || !form.course_code) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await tanseekApi.createCourseRegistration({
        student_id: Number(selectedStudentId),
        term_id: 1,
        course_code: form.course_code,
        registration_type: form.registration_type,
      })
      setForm({ course_code: '', registration_type: 'NORMAL' })
      setMessage(t('Course registration added.'))
      await loadRegistrations(selectedStudentId)
    } catch (err) {
      setError(err?.message || 'Could not add course registration.')
    } finally {
      setSaving(false)
    }
  }

  async function removeRegistration(id) {
    if (!window.confirm(t('Remove this course registration?'))) return
    setError('')
    setMessage('')
    try {
      await tanseekApi.deleteCourseRegistration(id)
      setMessage(t('Course registration removed.'))
      await loadRegistrations(selectedStudentId)
    } catch (err) {
      setError(err?.message || 'Could not remove course registration.')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t('Registration Officer')}
        title={t('Course registrations')}
        description={t('Register the courses each student is taking in the active term. Section assignment happens later by the Department Coordinator.')}
      />

      {error && <div className="mb-5 rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft px-4 py-3 text-sm font-bold text-tanseek-alert">{error}</div>}
      {message && <div className="mb-5 rounded-brand border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{message}</div>}

      {loading ? (
        <Card className="p-6 text-sm text-tanseek-muted">{t('Loading course registrations…')}</Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-tanseek-navy">{t('Student')}</h2>
            <p className="mt-1 text-xs text-tanseek-muted">{t('Choose a student, then register only the courses they are taking this term.')}</p>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Student account')}</span>
              <select
                value={selectedStudentId}
                onChange={async event => {
                  const id = event.target.value
                  setSelectedStudentId(id)
                  await loadRegistrations(id)
                }}
                className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink"
              >
                {students.map(student => <option key={student.id} value={student.id}>{student.university_id} · {student.name}</option>)}
              </select>
            </label>

            {selectedStudent && (
              <div className="mt-4 rounded-brand-sm bg-tanseek-canvas p-4 text-sm">
                <p className="font-bold text-tanseek-navy">{selectedStudent.name}</p>
                <p className="mt-1 text-xs text-tanseek-muted">{selectedStudent.email}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-tanseek-muted">
                  <span>{t('Level')} {selectedStudent.current_level}</span><span>·</span><span>{selectedStudent.department_name}</span>
                </div>
              </div>
            )}

            <form onSubmit={addRegistration} className="mt-5 space-y-4 border-t border-tanseek-line pt-5">
              <h3 className="font-bold text-tanseek-navy">{t('Register course')}</h3>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Course')}</span>
                <select value={form.course_code} onChange={event => setForm(prev => ({ ...prev, course_code: event.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">
                  <option value="">{t('Select course')}</option>
                  {courseOptions.map(course => <option key={course.id} value={course.code}>{course.code} — {course.name}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-tanseek-ink">{t('Registration type')}</span>
                <select value={form.registration_type} onChange={event => setForm(prev => ({ ...prev, registration_type: event.target.value }))} className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm">
                  <option value="NORMAL">{t('Current term')}</option>
                  <option value="CARRIED">{t('Carried course')}</option>
                  <option value="REPEATED">{t('Repeated course')}</option>
                </select>
              </label>

              <Button type="submit" icon="plus" disabled={saving || !selectedStudentId || !form.course_code} className="w-full">
                {saving ? t('Saving…') : t('Register course')}
              </Button>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-tanseek-line p-5">
              <h2 className="text-lg font-bold text-tanseek-navy">{t('Registered courses')}</h2>
              <p className="mt-1 text-xs text-tanseek-muted">{t('The Department Coordinator will assign Lecture and Practical sections after course registration.')}</p>
            </div>

            {registrations.length === 0 ? (
              <div className="grid min-h-[280px] place-items-center p-8 text-center text-sm text-tanseek-muted">{t('No course registrations yet.')}</div>
            ) : (
              <div className="custom-scrollbar overflow-x-auto">
                <table className="w-full min-w-[620px] text-left">
                  <thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted">
                    <tr><th className="px-5 py-3">{t('Course')}</th><th className="px-4 py-3">{t('Registration type')}</th><th className="px-4 py-3">{t('Status')}</th><th className="px-5 py-3"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-tanseek-line">
                    {registrations.map(item => (
                      <tr key={item.id}>
                        <td className="px-5 py-4"><p className="text-sm font-bold text-tanseek-navy">{item.course_code}</p><p className="mt-1 text-xs text-tanseek-muted">{item.course_name}</p></td>
                        <td className="px-4 py-4 text-xs text-tanseek-muted">{t(item.registration_type === 'CARRIED' ? 'Carried course' : item.registration_type === 'REPEATED' ? 'Repeated course' : 'Current term')}</td>
                        <td className="px-4 py-4"><StatusBadge status="active">{t('Active')}</StatusBadge></td>
                        <td className="px-5 py-4 text-right"><button onClick={() => removeRegistration(item.id)} className="text-tanseek-alert hover:underline">{t('Remove')}</button></td>
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
