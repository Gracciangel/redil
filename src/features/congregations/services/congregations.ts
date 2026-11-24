import { supabase } from '@/supabase/supabase'
import type { ICongregation } from '@/interfaces/ICongregation'

export interface CreateCongregationResult {
  id: string
  invitation_code: string
  vify?: boolean
}

export interface CreateCongregationInput extends ICongregation {
  adminEmail: string
  password: string
}

export async function createCongregation(input: CreateCongregationInput): Promise<CreateCongregationResult> {
  const { data, error } = await supabase.rpc('create_congregation', {
    p_name: input.name.trim(),
    p_slug: input.slug.trim().toLowerCase(),
    p_city: input.city?.trim() || null,
    p_country: input.country?.trim() || null,
    p_address: input.address?.trim() || null,
    p_admin_email: input.adminEmail.trim().toLowerCase(),
    p_password: input.password,
  })

  if (error) throw new Error(error.message)

  if (data && typeof data === 'object' && 'id' in data) {
    const d = data as { id: string; invitation_code?: string; vify?: boolean }
    return {
      id: String(d.id),
      invitation_code: String(d.invitation_code ?? ''),
      vify: Boolean(d.vify),
    }
  }

  return { id: String(data), invitation_code: '' }
}