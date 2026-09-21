import React, { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icons'
import { Card } from './UI'
import { days, slots } from '../data/mockData'
import { tanseekApi } from '../api/tanseekApi'
import { USE_MOCK_API } from '../api/client'
import { useLanguage } from '../i18n/LanguageContext'
import ThemeToggle from './ThemeToggle'
import { useTheme } from '../theme/ThemeContext'

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

function sectionLevel(section) {
  const direct = section?.level ?? section?.academic_level ?? section?.academicLevel
  if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
    const match = String(direct).match(/\d+/)
    return match ? String(Number(match[0])) : String(direct)
  }
  const match = String(section?.name || '').match(/(?:year|level)\s*(\d+)/i)
  return match ? String(Number(match[1])) : ''
}

function StateCard({ type, message, onRetry }) {
  const { t } = useLanguage()

  if (type === 'loading') {
    return (
      <Card className="grid min-h-[300px] place-items-center p-8 text-center">
        <div>
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-tanseek-line border-t-tanseek-teal" />
          <h2 className="mt-5 text-lg font-bold text-tanseek-navy">{t('Loading timetable')}</h2>
          <p className="mt-2 text-sm text-tanseek-muted">{t('Checking the latest published schedule.')}</p>
        </div>
      </Card>
    )
  }

  if (type === 'error') {
    return (
      <Card className="grid min-h-[300px] place-items-center border-tanseek-alert/30 bg-tanseek-alertSoft/30 p-8 text-center">
        <div className="max-w-md">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tanseek-alertSoft text-tanseek-alert"><Icon name="alert" size={27} /></div>
          <h2 className="mt-5 text-lg font-bold text-tanseek-navy">{t('Could not load the timetable')}</h2>
          <p className="mt-2 text-sm leading-6 text-tanseek-muted">{message}</p>
          {onRetry && <button onClick={onRetry} className="mt-5 rounded-brand-sm bg-tanseek-navy px-4 py-2.5 text-sm font-bold text-white">{t('Try again')}</button>}
        </div>
      </Card>
    )
  }

  if (type === 'select') {
    return (
      <Card className="grid min-h-[300px] place-items-center p-8 text-center">
        <div className="max-w-md">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tanseek-navySoft text-tanseek-navy"><Icon name="calendar" size={27} /></div>
          <h2 className="mt-5 text-lg font-bold text-tanseek-navy">{t('Choose your level and section')}</h2>
          <p className="mt-2 text-sm leading-6 text-tanseek-muted">{t('Select your academic level first, then choose your section to view the latest official timetable.')}</p>
        </div>
      </Card>
    )
  }

  if (type === 'unpublished') {
    return (
      <Card className="grid min-h-[300px] place-items-center p-8 text-center">
        <div className="max-w-md">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tanseek-navySoft text-tanseek-navy"><Icon name="calendar" size={27} /></div>
          <h2 className="mt-5 text-lg font-bold text-tanseek-navy">{t('No published timetable yet')}</h2>
          <p className="mt-2 text-sm leading-6 text-tanseek-muted">{t('The scheduling office has not published an official timetable for this term yet.')}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="grid min-h-[300px] place-items-center p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tanseek-tealSoft text-tanseek-teal"><Icon name="check" size={27} /></div>
        <h2 className="mt-5 text-lg font-bold text-tanseek-navy">{t('No sessions assigned')}</h2>
        <p className="mt-2 text-sm leading-6 text-tanseek-muted">{t('There are no sessions for this section in the latest published timetable.')}</p>
      </div>
    </Card>
  )
}

export default function PublicStudentHome({ onLogin }) {
  const { language, isRTL, toggleLanguage, t } = useLanguage()
  const { isDark } = useTheme()
  const [sections, setSections] = useState([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sectionsError, setSectionsError] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [timetable, setTimetable] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const levels = useMemo(() => {
    return [...new Set(sections.map(sectionLevel).filter(Boolean))].sort((a, b) => Number(a) - Number(b))
  }, [sections])

  const levelSections = useMemo(() => {
    if (!selectedLevel) return []
    return sections.filter(section => sectionLevel(section) === String(selectedLevel))
  }, [sections, selectedLevel])

  const selectedSection = useMemo(
    () => sections.find(item => String(item.id) === String(selectedSectionId)) || null,
    [sections, selectedSectionId]
  )

  async function loadSections() {
    setSectionsLoading(true)
    setSectionsError('')
    try {
      const payload = await tanseekApi.getPublicSections()
      setSections(Array.isArray(payload?.sections) ? payload.sections : [])
    } catch (err) {
      setSectionsError(err?.message || 'Could not load sections.')
    } finally {
      setSectionsLoading(false)
    }
  }

  async function loadTimetable(sectionId) {
    if (!sectionId) {
      setTimetable(null)
      setError('')
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = await tanseekApi.getPublicTimetable(sectionId)
      setTimetable(payload || null)
    } catch (err) {
      setError(err?.message || 'Could not load the timetable.')
      setTimetable(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSections()
  }, [])

  useEffect(() => {
    loadTimetable(selectedSectionId)
  }, [selectedSectionId])

  const version = timetable?.version || null
  const allocations = Array.isArray(timetable?.allocations) ? timetable.allocations : []

  return (
    <div className="min-h-screen bg-tanseek-canvas text-tanseek-ink" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-30 border-b border-tanseek-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-3 px-4 md:px-8">
          <img src={isDark ? "/assets/05-reversed.png" : "/assets/01-horizontal.png"} alt="Tanseek" className="w-[155px] sm:w-[175px]" />

          <div className={`${isRTL ? 'mr-auto' : 'ml-auto'} flex items-center gap-2`} dir="ltr">
            <ThemeToggle compact />
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex h-10 items-center gap-2 rounded-brand-sm border border-tanseek-line bg-white px-3 text-xs font-bold text-tanseek-navy transition hover:bg-tanseek-canvas"
              aria-label={t('Language')}
            >
              <span className="text-tanseek-teal">{language === 'en' ? 'ع' : 'EN'}</span>
              <span className="hidden sm:inline">{language === 'en' ? 'العربية' : 'English'}</span>
            </button>

            <button
              type="button"
              onClick={onLogin}
              className="inline-flex h-10 w-10 items-center justify-center rounded-brand-sm bg-tanseek-navy text-white transition hover:bg-tanseek-ink"
              aria-label={t('Staff login')}
              title={t('Staff login')}
            >
              <Icon name="login" size={19} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-8 md:px-8 md:py-12">
        <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tanseek-teal">{t('STUDENT TIMETABLE')}</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-tanseek-navy md:text-4xl">{t('Find your timetable')}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-tanseek-muted md:text-base">{t('Choose your level and section to view the latest official timetable published by the scheduling office. No student login is required.')}</p>
          </div>

          <div className="rounded-brand border border-tanseek-line bg-white p-4 shadow-soft md:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-tanseek-muted">{t('Academic level')}</span>
                <div className="relative">
                  <select
                    value={selectedLevel}
                    onChange={(event) => {
                      setSelectedLevel(event.target.value)
                      setSelectedSectionId('')
                      setTimetable(null)
                      setError('')
                    }}
                    disabled={sectionsLoading || Boolean(sectionsError)}
                    className={`h-12 w-full appearance-none rounded-brand-sm border border-tanseek-line bg-white px-4 text-sm font-bold text-tanseek-navy outline-none transition focus:border-tanseek-teal focus:ring-2 focus:ring-tanseek-teal/10 disabled:cursor-not-allowed disabled:bg-tanseek-canvas ${isRTL ? 'pl-11' : 'pr-11'}`}
                  >
                    <option value="">{sectionsLoading ? t('Loading levels…') : t('Select level')}</option>
                    {levels.map(level => <option key={level} value={level}>{t('Level')} {level}</option>)}
                  </select>
                  <Icon name="chevronDown" size={17} className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-tanseek-muted ${isRTL ? 'left-4' : 'right-4'}`} />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-tanseek-muted">{t('Your section')}</span>
                <div className="relative">
                  <select
                    value={selectedSectionId}
                    onChange={(event) => setSelectedSectionId(event.target.value)}
                    disabled={!selectedLevel || sectionsLoading || Boolean(sectionsError)}
                    className={`h-12 w-full appearance-none rounded-brand-sm border border-tanseek-line bg-white px-4 text-sm font-bold text-tanseek-navy outline-none transition focus:border-tanseek-teal focus:ring-2 focus:ring-tanseek-teal/10 disabled:cursor-not-allowed disabled:bg-tanseek-canvas ${isRTL ? 'pl-11' : 'pr-11'}`}
                  >
                    <option value="">{!selectedLevel ? t('Select level first') : t('Select your section')}</option>
                    {levelSections.map(section => (
                      <option key={section.id} value={section.id}>{section.name}</option>
                    ))}
                  </select>
                  <Icon name="chevronDown" size={17} className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-tanseek-muted ${isRTL ? 'left-4' : 'right-4'}`} />
                </div>
              </label>
            </div>
            {selectedLevel && !sectionsLoading && !sectionsError && levelSections.length === 0 && (
              <p className="mt-3 text-xs text-tanseek-muted">{t('No sections are configured for this level yet.')}</p>
            )}
            {sectionsError && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-brand-sm border border-tanseek-alert/25 bg-tanseek-alertSoft p-3 text-xs text-tanseek-alert">
                <span>{sectionsError}</span>
                <button onClick={loadSections} className="shrink-0 font-bold underline">{t('Try again')}</button>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          {!selectedSectionId && <StateCard type="select" />}
          {selectedSectionId && loading && <StateCard type="loading" />}
          {selectedSectionId && !loading && error && <StateCard type="error" message={error} onRetry={() => loadTimetable(selectedSectionId)} />}
          {selectedSectionId && !loading && !error && !version && <StateCard type="unpublished" />}
          {selectedSectionId && !loading && !error && version && allocations.length === 0 && <StateCard type="empty" />}

          {selectedSectionId && !loading && !error && version && allocations.length > 0 && (
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-tanseek-line p-4 md:flex-row md:items-center md:justify-between md:px-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-tanseek-navy">{selectedSection?.name || t('Timetable')}</h2>
                    <span className="rounded-full bg-tanseek-tealSoft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-tanseek-teal">{t('Published')} v{version.version_number}</span>
                  </div>
                  <p className="mt-1 text-xs text-tanseek-muted">{version.term_name || 'Fall 2026'} · {t('Published')} {formatPublishedAt(version.published_at, language)}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-tanseek-muted"><Icon name="clock" size={16} />{t('Campus local time')}</div>
              </div>

              <div className="custom-scrollbar overflow-x-auto">
                <div className="min-w-[980px] p-4 md:p-5">
                  <div className="grid grid-cols-[112px_repeat(5,minmax(160px,1fr))] gap-2">
                    <div />
                    {days.map(day => <div key={day} className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.08em] text-tanseek-muted">{t(day)}</div>)}
                    {slots.flatMap(slot => [
                      <div key={`time-${slot.id}`} className="flex min-h-[112px] flex-col justify-start rounded-brand-sm bg-tanseek-canvas px-3 py-3 text-xs">
                        <span className="font-bold text-tanseek-navy">{slot.start}</span>
                        <span className="mt-1 text-tanseek-muted">{slot.end}</span>
                      </div>,
                      ...days.map(day => {
                        const event = allocations.find(item => item.day === day && item.slot === slot.id)
                        return (
                          <div key={`${day}-${slot.id}`} className={`min-h-[112px] rounded-brand-sm border p-3 ${event ? 'border-tanseek-teal/20 bg-tanseek-tealSoft/75' : 'border-tanseek-line bg-white'}`}>
                            {event && (
                              <>
                                <p className="text-sm font-bold leading-5 text-tanseek-navy">{event.course}</p>
                                <p className="mt-1 text-[11px] font-bold text-tanseek-muted">{event.code}</p>
                                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-tanseek-muted"><Icon name="room" size={13} />{event.room}</div>
                                <p className="mt-1 truncate text-[11px] text-tanseek-muted">{event.staff}</p>
                              </>
                            )}
                          </div>
                        )
                      }),
                    ])}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-tanseek-line bg-tanseek-canvas/60 px-5 py-3 text-xs text-tanseek-muted">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-tanseek-tealSoft ring-1 ring-tanseek-teal/30" />{t('Scheduled')}</span>
                <span className={`${isRTL ? 'mr-auto' : 'ml-auto'}`}>{allocations.length} {t(allocations.length === 1 ? 'session' : 'sessions')}</span>
              </div>
            </Card>
          )}
        </section>

        <footer className="mt-10 flex flex-col gap-2 border-t border-tanseek-line pt-5 text-xs text-tanseek-muted sm:flex-row sm:items-center sm:justify-between">
          <span>{t('Tanseek · Smart Timetable & Room Allocation')}</span>
          {USE_MOCK_API && <span className="rounded-brand-sm bg-white px-2.5 py-1 font-bold uppercase tracking-[0.08em]">{t('Mock API')}</span>}
        </footer>
      </main>
    </div>
  )
}
