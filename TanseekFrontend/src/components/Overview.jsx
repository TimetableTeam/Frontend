import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from './PageHeader'
import { Button, Card, MetricCard, StatusBadge } from './UI'
import { Icon } from './Icons'
import { tanseekApi } from '../api/tanseekApi'
import { useLanguage } from '../i18n/LanguageContext'

function relativeTime(iso, language) {
  if (!iso) return ''
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime())
  const minutes = Math.floor(diffMs / 60000)
  if (language === 'ar') {
    if (minutes < 1) return 'الآن'
    if (minutes < 60) return `منذ ${minutes} د`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `منذ ${hours} س`
    return `منذ ${Math.floor(hours / 24)} يوم`
  }
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function LoadingOverview({ text }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map(item => (
        <Card key={item} className="min-h-[145px] animate-pulse p-5">
          <div className="h-3 w-28 rounded bg-tanseek-navySoft" />
          <div className="mt-5 h-8 w-20 rounded bg-tanseek-navySoft" />
          <div className="mt-3 h-3 w-36 rounded bg-tanseek-navySoft" />
        </Card>
      ))}
      <p className="sr-only">{text}</p>
    </div>
  )
}

export default function Overview({ conflictCount = 0, currentUser }) {
  const { t, language } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadOverview() {
    setLoading(true)
    setError('')
    try {
      const payload = await tanseekApi.getOverview()
      setData(payload)
    } catch (err) {
      setError(err?.message || 'Could not load overview data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [currentUser?.id])

  const metrics = useMemo(() => {
    const list = Array.isArray(data?.metrics) ? data.metrics : []
    return list.map(metric => metric.label === 'Hard conflicts'
      ? { ...metric, value: String(conflictCount), tone: conflictCount ? 'alert' : 'teal' }
      : metric)
  }, [data, conflictCount])

  const readinessItems = useMemo(() => {
    const items = Array.isArray(data?.readiness?.items) ? [...data.readiness.items] : []
    if (data?.readiness?.total_conflicts != null) {
      const total = Number(data.readiness.total_conflicts || 0)
      const resolved = total === 0 ? 100 : Math.max(0, Math.min(100, Math.round(((total - conflictCount) / total) * 100)))
      items.push(['Conflicts resolved', resolved])
    }
    return items
  }, [data, conflictCount])

  const isPlanningReadiness = Boolean(data?.readiness)
  const blocked = data?.kind === 'planning' && conflictCount > 0

  return (
    <>
      <PageHeader
        eyebrow={t(data?.eyebrow || 'Planning summary')}
        title={t('Overview')}
        description={t(data?.description || 'A quick view of schedule readiness, room utilization and items that need action before publication.')}
        actions={!loading && !error ? (
          <button
            type="button"
            onClick={loadOverview}
            className="inline-flex h-10 items-center gap-2 rounded-brand-sm border border-tanseek-line bg-white px-3 text-sm font-bold text-tanseek-navy transition hover:bg-tanseek-canvas"
          >
            <Icon name="clock" size={16} />
            {t('Refresh')}
          </button>
        ) : null}
      />

      {loading ? <LoadingOverview text={t('Loading overview…')} /> : error ? (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-brand-sm bg-tanseek-alertSoft text-tanseek-alert"><Icon name="alert" size={19} /></div>
            <div className="flex-1">
              <h2 className="font-bold text-tanseek-navy">{t('Could not load overview')}</h2>
              <p className="mt-1 text-sm text-tanseek-muted">{error}</p>
              <Button className="mt-4" variant="secondary" onClick={loadOverview}>{t('Try again')}</Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(metric => (
              <MetricCard
                key={metric.label}
                label={t(metric.label)}
                value={t(String(metric.value))}
                helper={t(metric.helper || '')}
                icon={metric.icon || 'grid'}
                tone={metric.tone || 'navy'}
              />
            ))}
          </div>

          <div className={`mt-6 grid gap-6 ${isPlanningReadiness || data?.summary ? 'xl:grid-cols-[1.25fr_.75fr]' : ''}`}>
            {isPlanningReadiness ? (
              <Card className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-tanseek-navy">{t(data.readiness.title || 'Publication readiness')}</h2>
                    <p className="mt-1 text-sm text-tanseek-muted">{t(data.readiness.subtitle || '')}</p>
                  </div>
                  {data?.kind === 'planning' ? (
                    <StatusBadge status={blocked ? 'conflict' : 'available'}>{blocked ? t('Blocked') : t('Ready')}</StatusBadge>
                  ) : null}
                </div>

                <div className="mt-6 space-y-5">
                  {readinessItems.map(([label, rawValue]) => {
                    const value = Number(rawValue || 0)
                    return (
                      <div key={label}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-bold text-tanseek-ink">{t(label)}</span>
                          <span className="text-tanseek-muted">{value}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-tanseek-navySoft">
                          <div className="h-full rounded-full bg-tanseek-teal transition-[width] duration-300" style={{ width: `${value}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            ) : data?.summary ? (
              <Card className="p-5 md:p-6">
                <h2 className="text-lg font-bold text-tanseek-navy">{t('Live summary')}</h2>
                <p className="mt-1 text-sm text-tanseek-muted">{t('Calculated from the current mock workspace, not fixed demo numbers.')}</p>
                <div className="mt-5 divide-y divide-tanseek-line">
                  {data.summary.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-tanseek-muted">{t(label)}</span>
                      <span className="text-sm font-bold text-tanseek-navy">{t(String(value))}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card className="p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-tanseek-navy">{t('Recent activity')}</h2>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-tanseek-muted">{t('Live')}</span>
              </div>

              {!data?.recent_activity?.length ? (
                <div className="mt-6 rounded-brand-sm border border-dashed border-tanseek-line bg-tanseek-canvas p-6 text-center text-sm text-tanseek-muted">
                  {t('No recent activity yet.')}
                </div>
              ) : (
                <div className="mt-5 divide-y divide-tanseek-line">
                  {data.recent_activity.map(item => (
                    <div key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-brand-sm bg-tanseek-navySoft text-tanseek-navy"><Icon name="check" size={16} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-tanseek-ink">{t(item.title)}</p>
                        <p className="mt-1 text-xs leading-5 text-tanseek-muted">{t(item.detail)}</p>
                        {item.actor && <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-tanseek-muted">{item.actor}</p>}
                      </div>
                      <span className="whitespace-nowrap text-[11px] text-tanseek-muted">{relativeTime(item.at, language)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  )
}
