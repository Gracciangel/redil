import { supabase } from '@/supabase/supabase'
import { callRpc, requireToken } from './tenantRpc'

export interface MyProfile {
  name: string
  surname: string
  photoUrl: string | null
  bannerUrl: string | null
  bio: string | null
}

export interface ProfileInput {
  photoUrl: string | null
  bannerUrl: string | null
  bio: string | null
}

export async function updateTenantProfile(input: ProfileInput): Promise<void> {
  await callRpc('update_tenant_profile', {
    p_token: requireToken(),
    p_photo_url: input.photoUrl, p_banner_url: input.bannerUrl, p_bio: input.bio,
  })
}

export async function changeTenantPassword(newPassword: string): Promise<void> {
  await callRpc('change_tenant_password', {
    p_token: requireToken(), p_new_password: newPassword,
  })
}

/** Perfil del miembro autenticado: usa auth.uid(), no el token del tenant. */
export async function getMyProfile(): Promise<MyProfile | null> {
  const rows = await callRpc<Array<Record<string, unknown>>>('get_my_profile', {})
  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row) return null
  return {
    name: String(row.name ?? ''),
    surname: String(row.surname ?? ''),
    photoUrl: row.photo_url ? String(row.photo_url) : null,
    bannerUrl: row.banner_url ? String(row.banner_url) : null,
    bio: row.bio ? String(row.bio) : null,
  }
}

export async function updateMyProfile(input: ProfileInput): Promise<void> {
  await callRpc('update_my_profile', {
    p_photo_url: input.photoUrl, p_banner_url: input.bannerUrl, p_bio: input.bio,
  })
}

export async function changeMyPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message || 'No se pudo cambiar la contraseña.')
}
