import React from 'react'
import { Icon } from './Icons'
import { useTheme } from '../theme/ThemeContext'
import { useLanguage } from '../i18n/LanguageContext'

export default function ThemeToggle({ compact = false }) {
  const { isDark, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const label = isDark ? t('Light mode') : t('Dark mode')

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-brand-sm border border-tanseek-line bg-white px-3 text-xs font-bold text-tanseek-navy transition hover:bg-tanseek-canvas"
      aria-label={label}
      title={label}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={18} />
      {!compact && <span className="hidden sm:inline">{label}</span>}
    </button>
  )
}
