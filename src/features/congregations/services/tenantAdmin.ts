/**
 * Barrel de compatibilidad. Los servicios del tenant viven en módulos chicos
 * para cumplir el límite de 100 líneas por archivo.
 */
export { isTenantSessionError } from '@/store/CongregationStore'

export type { TenantMemberRole, CongregationMember } from './tenantMembers'
export { listCongregationMembers, updateMemberRole } from './tenantMembers'

export type { CongregationMinistry, TenantMinistryMember } from './tenantMinistries'
export {
  listTenantMinistries, createTenantMinistry, deleteTenantMinistry, updateTenantMinistry,
  listTenantMinistryMembers, assignMemberToMinistry, unassignMemberFromMinistry,
} from './tenantMinistries'

export type { MyProfile } from './tenantProfiles'
export {
  updateTenantProfile, changeTenantPassword, getMyProfile, updateMyProfile, changeMyPassword,
} from './tenantProfiles'
