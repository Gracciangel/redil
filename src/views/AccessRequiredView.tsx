import { Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import { LoadingList } from '@/components/Feedback'
import { AccessRequiredModal } from '@/features/congregations/components/AccessRequiredModal'
import { useMemberHome } from '@/features/members/hooks/useMemberHome'
import { useCongregationStore } from '@/store/CongregationStore'
import '../principalView.css'

/**
 * Pantalla de acceso requerido (R7).
 *
 * Se monta FUERA del Layout: un miembro sin tenant no ve navegación, opciones
 * ni perfil. Solo el modal. Es una view pura: delega todo en `useMemberHome`.
 */
export function AccessRequiredView() {
  const vm = useMemberHome()
  const congregation = useCongregationStore((s) => s.congregation)

  // R7 no aplica al dueño de casa: si cae acá, lo devolvemos a su Code.
  if (congregation) return <Navigate to="/code" replace />

  if (vm.membershipLoading) {
    return <LoadingList rows={2} />
  }

  if (vm.hasMembership) return <Navigate to="/miembro" replace />

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <img src="/icons/redil-logo-white.png" alt="Redil" className="principal-logo principal-logo--large" />
      <AccessRequiredModal
        code={vm.code}
        onCodeChange={vm.setCode}
        onPreview={(value) => void vm.handlePreview(value)}
        onJoin={(value) => void vm.handleJoin(value)}
        preview={vm.preview}
        previewing={vm.previewing}
        joining={vm.joining}
        error={vm.actionError}
        joinedCongregationId={vm.joinedCongregationId}
        membershipError={vm.membershipError}
      />
    </Box>
  )
}
