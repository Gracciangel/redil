import type { PastorCongregation } from '../services/pastorService'

const IMAGE = /\.(png|jpe?g|webp|gif)(\?.*)?$/i

/** Las credenciales son rutas; las imagenes se muestran como miniatura. */
export function credentialsOf(pastor: PastorCongregation): string[] {
  return [pastor.credential1, pastor.credential2, pastor.credential3]
    .map((value) => value.trim())
    .filter(Boolean)
}

export function isImageCredential(value: string): boolean {
  return IMAGE.test(value)
}

export function credentialLabel(index: number): string {
  return `Credencial ${index + 1}`
}
