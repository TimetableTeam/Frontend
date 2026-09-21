import React from 'react'
import { Icon } from './Icons'
import { useLanguage } from '../i18n/LanguageContext'

export function StatusBadge({ status, children }) {
  const { t } = useLanguage()
  const styles = {
    available: 'bg-tanseek-tealSoft text-tanseek-navy border-tanseek-teal/25',
    ok: 'bg-tanseek-tealSoft text-tanseek-navy border-tanseek-teal/25',
    pending: 'bg-tanseek-navySoft text-tanseek-muted border-tanseek-line',
    conflict: 'bg-tanseek-alertSoft text-tanseek-alert border-tanseek-alert/25',
    active: 'bg-tanseek-tealSoft text-tanseek-navy border-tanseek-teal/25',
    draft: 'bg-tanseek-navySoft text-tanseek-muted border-tanseek-line',
    ready: 'bg-tanseek-tealSoft text-tanseek-navy border-tanseek-teal/25',
    confirmed: 'bg-tanseek-tealSoft text-tanseek-navy border-tanseek-teal/25',
  }
  return <span className={`inline-flex items-center gap-1.5 rounded-brand-sm border px-2.5 py-1 text-xs font-bold ${styles[status] || styles.pending}`}>{status === 'conflict' && <Icon name="alert" size={13} />}{children || t(status)}</span>
}

export function Button({ children, variant = 'primary', icon, className = '', ...props }) {
  const variants = {
    primary: 'bg-tanseek-navy text-white hover:bg-tanseek-ink border-tanseek-navy',
    secondary: 'bg-white text-tanseek-navy hover:bg-tanseek-canvas border-tanseek-line',
    accent: 'bg-tanseek-teal text-tanseek-navy hover:brightness-95 border-tanseek-teal',
    danger: 'bg-tanseek-alert text-white hover:brightness-95 border-tanseek-alert',
    ghost: 'bg-transparent text-tanseek-muted hover:text-tanseek-navy hover:bg-white border-transparent',
  }
  return (
    <button className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-brand-sm border px-4 py-2 text-sm font-bold transition ${variants[variant]} ${className}`} {...props}>
      {icon && <Icon name={icon} size={18} />}{children}
    </button>
  )
}

export function Card({ children, className = '' }) {
  return <section className={`rounded-brand border border-tanseek-line bg-white ${className}`}>{children}</section>
}

export function MetricCard({ label, value, helper, icon, tone = 'navy' }) {
  const toneClass = tone === 'alert' ? 'text-tanseek-alert bg-tanseek-alertSoft' : tone === 'teal' ? 'text-tanseek-navy bg-tanseek-tealSoft' : 'text-tanseek-navy bg-tanseek-navySoft'
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-tanseek-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-tanseek-navy">{value}</p>
          <p className="mt-1 text-xs text-tanseek-muted">{helper}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-brand-sm ${toneClass}`}><Icon name={icon} size={20} /></div>
      </div>
    </Card>
  )
}
