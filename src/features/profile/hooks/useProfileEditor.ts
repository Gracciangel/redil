import { useState, type FormEvent } from 'react'
import { bump } from '@/lib/live'
import { useAsyncData } from '@/lib/hooks'
import { useCongregationStore } from '@/store/CongregationStore'
import { useUserStore } from '@/store/Store'
import {
  changeMyPassword,
  changeTenantPassword,
  getMyProfile,
  updateMyProfile,
  updateTenantProfile,
} from '@/features/congregations/services/tenantAdmin'

export type ProfileFocus = 'profile' | 'password' | 'photo' | 'banner'

export interface ProfileNotice {
  tone: 'ok' | 'error'
  text: string
}

export type ProfileEditorVM = ReturnType<typeof useProfileEditor>

function loadMyProfile() {
  return getMyProfile()
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.'
}

/**
 * Viewmodel del modal de edición del Perfil.
 *
 * La edición de contraseña, bio, foto y portada (de la congregación o del
 * miembro) vive acá. La view solo presenta el modal y las acciones.
 */
export function useProfileEditor() {
  const congregation = useCongregationStore((s) => s.congregation)
  const user = useUserStore((s) => s.user)
  const isTenant = Boolean(congregation)
  const { data: myProfile } = useAsyncData(loadMyProfile, [], !isTenant)

  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState<ProfileFocus>('profile')
  const [photoUrl, setPhotoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [bio, setBio] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [notice, setNotice] = useState<ProfileNotice | null>(null)
  const [busy, setBusy] = useState<'profile' | 'password' | null>(null)

  // Valores que muestra la view aunque el modal esté cerrado.
  const displayPhotoUrl = congregation?.photoUrl ?? myProfile?.photoUrl ?? user?.photoURL ?? null
  const displayBannerUrl = congregation?.bannerUrl ?? myProfile?.bannerUrl ?? null
  const displayBio = congregation?.bio ?? myProfile?.bio ?? null

  function openDialog(nextFocus: ProfileFocus = 'profile') {
    // MUI pone aria-hidden en el resto de la página mientras el modal está
    // abierto. Si el foco queda en el botón que lo abrió (la cámara), el
    // navegador avisa. Lo sacamos antes de abrir para que el foco entre al modal.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    setPhotoUrl(displayPhotoUrl ?? '')
    setBannerUrl(displayBannerUrl ?? '')
    setBio(displayBio ?? '')
    setPassword('')
    setConfirmPassword('')
    setNotice(null)
    setFocus(nextFocus)
    setOpen(true)
  }

  function closeDialog() {
    if (busy) return
    setOpen(false)
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = {
      photoUrl: photoUrl.trim() || null,
      bannerUrl: bannerUrl.trim() || null,
      bio: bio.trim() || null,
    }
    setBusy('profile')
    setNotice(null)
    try {
      if (congregation) {
        await updateTenantProfile(input)
        const current = useCongregationStore.getState().congregation
        if (current) useCongregationStore.getState().setCongregation({ ...current, ...input })
      } else {
        await updateMyProfile(input)
        const current = useUserStore.getState().user
        if (current) useUserStore.getState().setUser({ ...current, photoURL: input.photoUrl })
      }
      bump()
      setNotice({ tone: 'ok', text: 'Datos de perfil guardados.' })
    } catch (error) {
      setNotice({ tone: 'error', text: messageOf(error) })
    } finally {
      setBusy(null)
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    if (password.length < 6) {
      setNotice({ tone: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' })
      return
    }
    if (password !== confirmPassword) {
      setNotice({ tone: 'error', text: 'Las contraseñas no coinciden.' })
      return
    }

    setBusy('password')
    try {
      if (congregation) await changeTenantPassword(password)
      else await changeMyPassword(password)
      setPassword('')
      setConfirmPassword('')
      setNotice({ tone: 'ok', text: 'Contraseña actualizada.' })
    } catch (error) {
      setNotice({ tone: 'error', text: messageOf(error) })
    } finally {
      setBusy(null)
    }
  }

  return {
    isTenant,
    open,
    focus,
    setFocus,
    openDialog,
    closeDialog,
    photoUrl,
    setPhotoUrl,
    bannerUrl,
    setBannerUrl,
    bio,
    setBio,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    notice,
    busy,
    displayPhotoUrl,
    displayBannerUrl,
    displayBio,
    handleSaveProfile,
    handleChangePassword,
  }
}
