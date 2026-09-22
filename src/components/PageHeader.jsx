import React from 'react'

export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-tanseek-teal">{eyebrow}</p>}
        <h1 className="text-3xl font-bold tracking-tight text-tanseek-navy md:text-[34px]">{title}</h1>
        {description && <p className="mt-2 text-sm leading-6 text-tanseek-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
