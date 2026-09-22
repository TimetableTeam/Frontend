import React, { useEffect, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card } from './UI'
import { Icon } from './Icons'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-tanseek-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] leading-5 text-tanseek-muted">{hint}</span>}
    </label>
  )
}

export default function ProfileSettings({ currentUser, onUserUpdated }) {
  const { t } = useLanguage()
  const [name, setName] = useState(currentUser?.name || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [error, setError] = useState('')
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    setName(currentUser?.name || '')
  }, [currentUser?.id, currentUser?.name])

  async function saveProfile(event) {
    event.preventDefault()
    setError('')
    setProfileMessage('')

    const nextName = name.trim()
    if (!nextName) {
      setError(t('Full name is required.'))
      return
    }

    setSavingProfile(true)
    try {
      const payload = await tanseekApi.updateMyProfile({ name: nextName })
      const user = payload?.user || payload
      setProfileMessage(t('Profile updated.'))
      onUserUpdated?.(user)
    } catch (err) {
      setError(err?.message || t('Could not update your profile.'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword(event) {
    event.preventDefault()
    setError('')
    setPasswordMessage('')

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError(t('Complete all password fields.'))
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setError(t('New password must be at least 8 characters.'))
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError(t('New passwords do not match.'))
      return
    }

    setSavingPassword(true)
    try {
      await tanseekApi.changeMyPassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMessage(t('Password changed successfully.'))
    } catch (err) {
      setError(err?.message || t('Could not change your password.'))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={t('ACCOUNT')}
        title={t('Profile settings')}
        description={t('Update your display name and password. Your email, role and department are managed by the system administrator.')}
      />

      {error && <div className="mb-5 rounded-brand-sm border border-tanseek-alert/30 bg-tanseek-alertSoft px-4 py-3 text-sm text-tanseek-alert">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-brand-sm bg-tanseek-navySoft text-tanseek-navy"><Icon name="user" size={20} /></div>
            <div>
              <h2 className="font-bold text-tanseek-navy">{t('Personal information')}</h2>
              <p className="mt-1 text-xs leading-5 text-tanseek-muted">{t('You can change your name. Email, role and department stay controlled by administration.')}</p>
            </div>
          </div>

          {profileMessage && <div className="mt-5 rounded-brand-sm border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{profileMessage}</div>}

          <form onSubmit={saveProfile} className="mt-6 space-y-4">
            <Field label={t('Full name')}>
              <input
                value={name}
                onChange={event => setName(event.target.value)}
                className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink outline-none focus:border-tanseek-teal"
              />
            </Field>

            <Field label={t('University email')} hint={t('Contact a Super Admin if the login email needs to change.')}>
              <input
                value={currentUser?.email || ''}
                disabled
                dir="ltr"
                className="h-11 w-full cursor-not-allowed rounded-brand-sm border border-tanseek-line bg-tanseek-canvas px-3 text-sm text-tanseek-muted"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('Role')}>
                <input value={currentUser?.role_label || currentUser?.role || ''} disabled className="h-11 w-full cursor-not-allowed rounded-brand-sm border border-tanseek-line bg-tanseek-canvas px-3 text-sm text-tanseek-muted" />
              </Field>
              <Field label={t('Department')}>
                <input value={currentUser?.department_name || t('University-wide access')} disabled className="h-11 w-full cursor-not-allowed rounded-brand-sm border border-tanseek-line bg-tanseek-canvas px-3 text-sm text-tanseek-muted" />
              </Field>
            </div>

            <Button type="submit" disabled={savingProfile}>{savingProfile ? t('Saving…') : t('Save changes')}</Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-brand-sm bg-tanseek-navySoft text-tanseek-navy"><Icon name="shield" size={20} /></div>
            <div>
              <h2 className="font-bold text-tanseek-navy">{t('Change password')}</h2>
              <p className="mt-1 text-xs leading-5 text-tanseek-muted">{t('Use your current password, then choose a new password with at least 8 characters.')}</p>
            </div>
          </div>

          {passwordMessage && <div className="mt-5 rounded-brand-sm border border-tanseek-teal/25 bg-tanseek-tealSoft px-4 py-3 text-sm font-bold text-tanseek-navy">{passwordMessage}</div>}

          <form onSubmit={changePassword} className="mt-6 space-y-4">
            <Field label={t('Current password')}>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={event => setPasswordForm(current => ({ ...current, currentPassword: event.target.value }))}
                className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink outline-none focus:border-tanseek-teal"
              />
            </Field>
            <Field label={t('New password')}>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={event => setPasswordForm(current => ({ ...current, newPassword: event.target.value }))}
                className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink outline-none focus:border-tanseek-teal"
              />
            </Field>
            <Field label={t('Confirm new password')}>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={event => setPasswordForm(current => ({ ...current, confirmPassword: event.target.value }))}
                className="h-11 w-full rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm text-tanseek-ink outline-none focus:border-tanseek-teal"
              />
            </Field>

            <Button type="submit" disabled={savingPassword}>{savingPassword ? t('Saving…') : t('Change password')}</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
