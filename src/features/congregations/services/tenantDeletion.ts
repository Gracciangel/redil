import { callRpc } from '@/supabase/supabase'
import { requireToken } from './tenantRpc'

/** Baja física e irreversible. La frase exacta es la confirmación del RPC. */
export async function deleteTenantMember(userId: string): Promise<void> {
  await callRpc('delete_tenant_member', {
    p_token: requireToken(),
    p_user_id: userId,
    p_confirmation: 'ELIMINAR MIEMBRO',
  })
}

/** «Dejar Redil»: borra la congregación, sus datos y las cuentas de sus miembros. */
export async function deleteTenantCongregation(): Promise<void> {
  await callRpc('delete_congregation', {
    p_token: requireToken(),
    p_confirmation: 'DEJAR REDIL',
  })
}
