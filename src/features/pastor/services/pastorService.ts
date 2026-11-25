import { requireToken } from '@/features/congregations/services/tenantRpc'
import { callRpc } from '@/supabase/supabase'

type Row = Record<string, unknown>

export interface PastorCongregation {
  id: number | null
  name: string
  surname: string
  bio: string
  credential1: string
  credential2: string
  credential3: string
  isComplete: boolean
  createdAt: string | null
}

export type PastorInput = Pick<
  PastorCongregation,
  'name' | 'surname' | 'bio' | 'credential1' | 'credential2' | 'credential3'
>

const EMPTY: PastorCongregation = {
  id: null, name: '', surname: '', bio: '',
  credential1: '', credential2: '', credential3: '',
  isComplete: false, createdAt: null,
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function toPastor(value: Row | undefined): PastorCongregation {
  if (!value) return EMPTY
  return {
    id: typeof value.id === 'number' ? value.id : Number(value.id) || null,
    name: text(value.name),
    surname: text(value.surname),
    bio: text(value.bio),
    credential1: text(value.credential1),
    credential2: text(value.credential2),
    credential3: text(value.credential3),
    isComplete: Boolean(value.is_complete),
    createdAt: value.created_at ? text(value.created_at) : null,
  }
}

async function request(name: string, params: Record<string, unknown>): Promise<PastorCongregation> {
  const rows = await callRpc<Row[] | Row>(name, params)
  return toPastor(Array.isArray(rows) ? rows[0] : rows)
}

/** Se llama al abrir el perfil del tenant: lee datos y si está completo. */
export function readPastorCongregation(): Promise<PastorCongregation> {
  return request('get_pastor_congregation', { p_token: requireToken() })
}

export function savePastorCongregation(input: PastorInput): Promise<PastorCongregation> {
  return request('save_pastor_congregation', {
    p_token: requireToken(),
    p_name: input.name, p_surname: input.surname, p_bio: input.bio,
    p_credential1: input.credential1,
    p_credential2: input.credential2,
    p_credential3: input.credential3,
  })
}
