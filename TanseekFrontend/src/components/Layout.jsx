import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icons'
import { roles } from '../data/mockData'
import { USE_MOCK_API } from '../api/client'
import { useLanguage } from '../i18n/LanguageContext'
import ThemeToggle from './ThemeToggle'
import { canAccessPage } from '../auth/permissions'

const allNav = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'timetable', label: 'Timetable', icon: 'calendar' },
  { id: 'requirements', label: 'Requirements', icon: 'database' },
  { id: 'availability', label: 'My availability', icon: 'clock' },
  { id: 'labchecks', label: 'Lab checks', icon: 'equipment' },
  { id: 'rooms', label: 'Rooms & labs', icon: 'room' },
  { id: 'conflicts', label: 'Conflicts', icon: 'alert' },
  { id: 'master', label: 'Master data', icon: 'database' },
  { id: 'system', label: 'System administration', icon: 'shield' },
]

export default function Layout({ children, page, onPageChange, session, conflictCount = 0, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const { language, isRTL, toggleLanguage, t } = useLanguage()

  const user = session?.user || {}
  const role = user.role
  const nav = useMemo(() => allNav.filter(item => canAccessPage(user, item.id)), [user.role, user.permissions])
  const roleLabelRaw = user.role_label || roles.find(r => r.id === role)?.label || role
  const roleLabel = t(roleLabelRaw)
  const departmentLabel = user.department_name || t('University-wide access')

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-tanseek-canvas text-tanseek-ink">
      {mobileOpen && <button onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-tanseek-navy/35 lg:hidden" aria-label="Close menu" />}

      <aside className={`custom-scrollbar fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col overflow-y-auto bg-tanseek-navy px-5 py-6 text-white transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <img src="/assets/05-reversed.png" alt="Tanseek" className="w-[190px]" />
          <button className="rounded p-2 text-white/70 lg:hidden" onClick={() => setMobileOpen(false)}><Icon name="x" /></button>
        </div>

        <div className="mt-10 text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">{t('Workspace')}</div>
        <nav className="mt-3 space-y-1">
          {nav.map(item => {
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => { onPageChange(item.id); setMobileOpen(false) }}
                className={`flex w-full items-center justify-between rounded-brand-sm px-3 py-3 text-left text-sm transition ${active ? 'bg-white text-tanseek-navy' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
              >
                <span className="flex items-center gap-3"><Icon name={item.icon} size={20} />{t(item.label)}</span>
                {item.id === 'conflicts' && conflictCount > 0 && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? 'bg-tanseek-alertSoft text-tanseek-alert' : 'bg-tanseek-alert text-white'}`}>{conflictCount}</span>}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-5">
          <p className="text-xs text-white/45">{t('Current term')}</p>
          <p className="mt-1 text-sm font-bold">Fall 2026</p>
          <p className="mt-4 text-xs text-white/45">{t('Scope')}</p>
          <p className="mt-1 truncate text-sm font-bold" title={departmentLabel}>{departmentLabel}</p>
          <div className="mt-4 inline-flex rounded-brand-sm bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-white/70">{t(USE_MOCK_API ? 'Mock API' : 'Live API')}</div>
        </div>
      </aside>

      <div className="min-h-screen min-w-0 lg:ml-[264px]">
        <header dir="ltr" className="sticky top-0 z-20 flex h-[72px] items-center border-b border-tanseek-line bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
            <button onClick={() => setMobileOpen(true)} className="rounded-brand-sm border border-tanseek-line bg-white p-2 text-tanseek-navy lg:hidden"><Icon name="menu" /></button>
            <div>
              <p className="hidden text-[11px] font-bold uppercase tracking-[0.14em] text-tanseek-teal sm:block">{t('Tanseek workspace')}</p>
              <p className="text-sm font-bold text-tanseek-navy sm:mt-1">{departmentLabel}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2" dir="ltr">
            <ThemeToggle compact />

            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex h-10 items-center gap-2 rounded-brand-sm border border-tanseek-line bg-white px-3 text-xs font-bold text-tanseek-navy transition hover:bg-tanseek-canvas"
              aria-label={t('Language')}
              title={language === 'en' ? t('Arabic') : t('English')}
            >
              <span className="text-tanseek-teal">{language === 'en' ? 'ع' : 'EN'}</span>
              <span className="hidden sm:inline">{language === 'en' ? 'العربية' : 'English'}</span>
            </button>

            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(prev => !prev)}
                className="flex items-center gap-3 rounded-brand-sm px-2 py-1.5 text-left transition hover:bg-tanseek-canvas"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-brand-sm bg-tanseek-navySoft text-tanseek-navy"><Icon name="user" size={19}/></div>
                <div className="hidden sm:block">
                  <p className="max-w-[180px] truncate text-sm font-bold text-tanseek-navy">{user.name || 'Tanseek User'}</p>
                  <p className="max-w-[180px] truncate text-xs text-tanseek-muted">{user.email}</p>
                </div>
                <span className={`hidden text-xs text-tanseek-muted transition-transform sm:block ${userMenuOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {userMenuOpen && (
                <div
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className="absolute right-0 top-[calc(100%+10px)] z-50 w-[300px] overflow-hidden rounded-brand border border-tanseek-line bg-white shadow-xl"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-brand-sm bg-tanseek-navySoft text-tanseek-navy"><Icon name="user" size={20}/></div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-tanseek-navy">{user.name || 'Tanseek User'}</p>
                        <p className="mt-0.5 truncate text-xs text-tanseek-muted">{user.email}</p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-tanseek-line pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-tanseek-muted">{t('Role')}</p>
                      <p className="mt-1 text-sm font-bold text-tanseek-navy">{roleLabel}</p>
                      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-tanseek-muted">{t('Department')}</p>
                      <p className="mt-1 truncate text-sm text-tanseek-ink">{departmentLabel}</p>
                    </div>
                  </div>

                  <div className="border-t border-tanseek-line p-2">
                    <button
                      type="button"
                      onClick={() => { setUserMenuOpen(false); onLogout() }}
                      className="flex w-full items-center gap-3 rounded-brand-sm px-3 py-2.5 text-sm font-medium text-tanseek-alert transition hover:bg-tanseek-alertSoft"
                    >
                      <Icon name="logout" size={18} />
                      {t('Sign out')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1500px] p-4 md:p-8 lg:px-10" dir={isRTL ? 'rtl' : 'ltr'}>
          {children}
        </main>
      </div>
    </div>
  )
}
