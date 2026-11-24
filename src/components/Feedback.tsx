import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icons'
import { LoadingOverlay } from './LoadingOverlay'

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <label className="field" htmlFor={htmlFor}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="page-header">
      <div className="page-header-copy">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  )
}

/**
 * Compatibilidad: antes dibujaba skeletons en el lugar. Ahora delega en el
 * overlay global para que toda carga de información use el mismo spinner.
 * `rows` se conserva para no tocar cada llamada; ya no se usa.
 */
export function LoadingList(_props: { rows?: number } = {}) {
  return <LoadingOverlay />
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="empty-state empty-state-error" role="alert">
      <span className="empty-icon">
        <Icon name="alert" size={26} />
      </span>
      <h2>Algo ha ido mal</h2>
      <p>{message}</p>
    </div>
  )
}
