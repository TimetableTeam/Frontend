import React, { useState } from 'react'
import { Button } from './UI'
import { USE_MOCK_API } from '../api/client'
import { MOCK_PASSWORD, publicMockAccounts } from '../data/mockAccounts'
import { useLanguage } from '../i18n/LanguageContext'
import ThemeToggle from './ThemeToggle'
import { useTheme } from '../theme/ThemeContext'

export default function LoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useState('scheduler@tanseek.test')
  const [password, setPassword] = useState(MOCK_PASSWORD)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const demoAccounts = publicMockAccounts()
  const { language, isRTL, toggleLanguage, t } = useLanguage()
  const { isDark } = useTheme()

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin?.({ email: email.trim(), password })
    } catch (err) {
      setError(err?.message || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  function chooseDemo(account) {
    setEmail(account.email)
    setPassword(MOCK_PASSWORD)
    setError('')
  }

  return (
    <main className="min-h-screen bg-tanseek-canvas p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mx-auto mb-3 flex max-w-5xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-brand-sm border border-tanseek-line bg-white px-3 text-xs font-bold text-tanseek-navy transition hover:bg-tanseek-canvas"
        >
          <span aria-hidden="true">←</span>
          <span>{t('Back to timetable')}</span>
        </button>

        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <button
          type="button"
          onClick={toggleLanguage}
          className="inline-flex h-10 items-center gap-2 rounded-brand-sm border border-tanseek-line bg-white px-3 text-xs font-bold text-tanseek-navy transition hover:bg-tanseek-canvas"
        >
          <span className="text-tanseek-teal">{language === 'en' ? 'ع' : 'EN'}</span>
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[18px] border border-tanseek-line bg-white shadow-soft lg:grid-cols-[0.8fr_1.2fr]">
        <section className="relative hidden min-h-[620px] overflow-hidden bg-tanseek-navy p-9 text-white lg:flex lg:flex-col lg:justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
          <img src="/assets/05-reversed.png" alt="Tanseek" className="w-[230px] max-w-full" />
          <div className="relative z-10 max-w-md">
            <p className="mb-4 inline-flex rounded-brand-sm bg-white/10 px-3 py-2 text-sm font-bold text-white">{t('Smart Timetable & Room Allocation')}</p>
            <h1 className="text-3xl font-bold leading-tight">{t('A clear place for every class.')}</h1>
            <p className="mt-4 text-sm leading-7 text-white/70">{t('Plan sections, staff, rooms and labs in one coordinated view. Detect hard conflicts before publication and resolve them with explainable alternatives.')}</p>
          </div>
          <div className="absolute -bottom-24 -right-16 grid grid-cols-7 gap-3 opacity-10">
            {Array.from({ length: 35 }).map((_, i) => <span key={i} className="h-12 w-12 rounded-brand-sm bg-white" />)}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-8">
          <div className="w-full max-w-md">
            <img src={isDark ? "/assets/05-reversed.png" : "/assets/01-horizontal.png"} alt="Tanseek" className="mb-6 w-[190px] max-w-[70%]" />
            <h2 className="text-2xl font-bold tracking-tight text-tanseek-navy">{t('Welcome back')}</h2>
            <p className="mt-2 text-sm text-tanseek-muted">{t('Staff sign in. Your role decides which workspace opens.')}</p>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-tanseek-ink">{t('University email')}</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="username" className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white px-4 text-sm text-tanseek-ink placeholder:text-tanseek-muted/60 focus:border-tanseek-teal" placeholder="name@university.edu" dir="ltr" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-tanseek-ink">{t('Password')}</span>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password" className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white px-4 text-sm text-tanseek-ink placeholder:text-tanseek-muted/60 focus:border-tanseek-teal" placeholder="••••••••••" dir="ltr" />
              </label>

              {error && (
                <div role="alert" className="rounded-brand-sm border border-tanseek-alert/30 bg-tanseek-alertSoft px-4 py-3 text-sm text-tanseek-alert">
                  {error}
                </div>
              )}

              <Button className="h-10 w-full disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loading}>
                {loading ? t('Signing in…') : t('Sign in')}
              </Button>
            </form>

            {USE_MOCK_API && (
              <div className="mt-5 rounded-brand border border-tanseek-line bg-tanseek-canvas p-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-tanseek-teal">{t('Demo accounts')}</p>
                    <p className="mt-1 text-xs leading-5 text-tanseek-muted">{t('Password for every account:')} <span className="font-bold text-tanseek-navy">{MOCK_PASSWORD}</span></p>
                  </div>
                  <span className="rounded-brand-sm bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-tanseek-muted">{t('Mock API')}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {demoAccounts.map(account => (
                    <button key={account.id} type="button" onClick={() => chooseDemo(account)} className={`rounded-brand-sm border bg-white p-2.5 text-left transition hover:border-tanseek-teal ${email.toLowerCase() === account.email.toLowerCase() ? 'border-tanseek-teal ring-2 ring-tanseek-teal/10' : 'border-tanseek-line'}`} dir="ltr">
                      <span className="block text-xs font-bold text-tanseek-navy">{t(account.role_label)}</span>
                      <span className="mt-1 block truncate text-[11px] text-tanseek-muted">{account.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
