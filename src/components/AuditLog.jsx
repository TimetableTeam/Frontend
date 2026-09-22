import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card } from './UI'
import { Icon } from './Icons'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

export default function AuditLog() {
  const { language, t } = useLanguage()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const payload = await tanseekApi.getAuditLog()
      setRecords(payload?.records || [])
    } catch (err) {
      setError(err?.message || 'Could not load audit log.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter(record => [record.title, record.detail, record.actor, record.category].join(' ').toLowerCase().includes(q))
  }, [records, query])

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    } catch {
      return value
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t('Super Admin')}
        title={t('Audit log')}
        description={t('Track who changed accounts, academic setup, requirements, rooms, registrations and schedule workflow actions.')}
        actions={<Button variant="secondary" onClick={load}>{t('Refresh')}</Button>}
      />

      <Card className="mb-5 p-4">
        <label className="relative block max-w-xl">
          <Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-tanseek-muted" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('Search audit log')} className="h-10 w-full rounded-brand-sm border border-tanseek-line bg-white pl-10 pr-3 text-sm" />
        </label>
      </Card>

      {loading ? (
        <Card className="p-6 text-sm text-tanseek-muted">{t('Loading audit log…')}</Card>
      ) : error ? (
        <div className="rounded-brand border border-tanseek-alert/25 bg-tanseek-alertSoft p-4 text-sm text-tanseek-alert">{error}</div>
      ) : visible.length === 0 ? (
        <Card className="grid min-h-[260px] place-items-center p-8 text-sm text-tanseek-muted">{t('No audit events found.')}</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-tanseek-canvas text-[11px] uppercase tracking-[.08em] text-tanseek-muted">
                <tr><th className="px-5 py-3">{t('Action')}</th><th className="px-4 py-3">{t('Actor')}</th><th className="px-4 py-3">{t('Category')}</th><th className="px-5 py-3">{t('Time')}</th></tr>
              </thead>
              <tbody className="divide-y divide-tanseek-line">
                {visible.map(record => (
                  <tr key={record.id}>
                    <td className="px-5 py-4"><p className="text-sm font-bold text-tanseek-navy">{record.title}</p><p className="mt-1 text-xs text-tanseek-muted">{record.detail}</p></td>
                    <td className="px-4 py-4 text-sm text-tanseek-ink">{record.actor || 'Tanseek'}</td>
                    <td className="px-4 py-4"><span className="rounded-brand-sm bg-tanseek-navySoft px-2 py-1 text-xs font-bold text-tanseek-navy">{record.category}</span></td>
                    <td className="px-5 py-4 text-xs text-tanseek-muted">{formatDate(record.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
