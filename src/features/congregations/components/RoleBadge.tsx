import { Chip } from '@mui/material'

export type BadgeRole = 'admin' | 'leader' | 'member'

const STYLES: Record<BadgeRole, { label: string; color: 'error' | 'primary' | 'default' }> = {
  admin: { label: 'Admin', color: 'error' },
  leader: { label: 'Líder', color: 'primary' },
  member: { label: 'Miembro', color: 'default' },
}

/**
 * Badge de rol, compartido por Ajustes y la vista (L).
 * Sirve tanto para `memberships.role` como para `ministry_role` (coinciden
 * en los valores leader/member). Es presentación pura: no decide permisos.
 */
export function RoleBadge({ role, size = 'small' }: { role: string; size?: 'small' | 'medium' }) {
  const style = STYLES[role as BadgeRole] ?? STYLES.member
  return <Chip size={size} color={style.color} label={style.label} variant={style.color === 'default' ? 'outlined' : 'filled'} />
}
