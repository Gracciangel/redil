import {
  assignMemberToMinistry,
  createTenantMinistry,
  deleteTenantMinistry,
  unassignMemberFromMinistry,
  updateTenantMinistry,
} from './tenantAdmin'
import {
  addMinistryMember,
  removeMinistryMember,
  setMinistryMemberRole,
  setTenantMinistryMemberRole,
  updateMinistry,
  type MinistryRole,
} from './leaderMinistries'

/**
 * Adapta una misma acción al tipo de sesión. La congregación opera con token
 * (`list_*_tenant_*`); el líder, con `auth.uid()` y alcance por ministerio.
 * Así la vista y el viewmodel no tienen que decidir permisos.
 */
export interface MinistryActions {
  create(name: string, isGroup: boolean): Promise<void>
  update(id: string, name: string, isGroup: boolean, icon: string | null): Promise<void>
  remove(id: string): Promise<void>
  addMember(id: string, userId: string): Promise<void>
  dropMember(id: string, userId: string): Promise<void>
  setRole(id: string, userId: string, role: MinistryRole): Promise<void>
}

export function ministryActions(isTenant: boolean): MinistryActions {
  if (isTenant) {
    return {
      create: (name, isGroup) => createTenantMinistry(name, isGroup),
      update: (id, name, isGroup, icon) => updateTenantMinistry(id, name, isGroup, icon),
      remove: (id) => deleteTenantMinistry(id),
      addMember: (id, userId) => assignMemberToMinistry(id, userId),
      dropMember: (id, userId) => unassignMemberFromMinistry(id, userId),
      setRole: (id, userId, role) => setTenantMinistryMemberRole(id, userId, role),
    }
  }

  return {
    create: async () => {
      throw new Error('Solo la congregación puede crear ministerios.')
    },
    update: (id, name, _isGroup, icon) => updateMinistry(id, name, icon),
    remove: async () => {
      throw new Error('Solo la congregación puede eliminar ministerios.')
    },
    addMember: (id, userId) => addMinistryMember(id, userId),
    dropMember: (id, userId) => removeMinistryMember(id, userId),
    setRole: (id, userId, role) => setMinistryMemberRole(id, userId, role),
  }
}
