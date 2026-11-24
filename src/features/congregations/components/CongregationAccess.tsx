import { useMemo, useState, type FormEvent } from 'react'
import { Alert, Box, Button, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { PasswordField } from '@/components/PasswordField'
import type { ICongregation } from '@/interfaces/ICongregation'
import { loginWithCongregation } from '@/supabase/login'
import { createCongregation } from '../services/congregations'
import { PendingValidationView } from './PendingValidationView'
import { LATAM_COUNTRIES, useCountryProvinces, useProvinceCities } from '../hooks/useLatinAmericaLocations'

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

interface Props {
  onSuccess?: (message: string) => void
  onTabChange?: (tab: number) => void
  /** Se llama solo cuando el login de tenant termine correctamente. */
  onLoginSuccess?: () => void
}

export function CongregationAccess({ onSuccess, onTabChange, onLoginSuccess }: Props) {
  const [tab, setTab] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const [adminUser, setAdminUser] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  const [form, setForm] = useState<ICongregation>({ name: '', slug: '', country: '', city: '', address: '' })
  const [province, setProvince] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const suggestedSlug = useMemo(() => slugify(form.name), [form.name])

  const { provinces, loading: loadingProvinces, error: provincesError } = useCountryProvinces(form.country)
  const { cities, loading: loadingCities, error: citiesError } = useProvinceCities(form.country, province)

  async function handleAdminLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      const result = await loginWithCongregation(adminUser, adminPassword)
      if (result.error) {
        const detail = `${result.msj} ${result.detils ?? ''}`
        if (/pendiente de validación|no está validada/i.test(detail)) {
          setPendingEmail(adminUser.trim())
          return
        }
        setError(result.detils ? `${result.msj} ${result.detils}` : result.msj)
      } else {
        setNotice(result.msj || 'Sesión iniciada correctamente.')
        onSuccess?.(result.msj || 'Sesión iniciada correctamente.')
        onLoginSuccess?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (!form.name.trim()) return setError('El nombre de la congregación es obligatorio.')
    const slug = (slugTouched ? form.slug : suggestedSlug).trim()
    if (!slug) return setError('El slug es obligatorio.')
    if (!form.country) return setError('Seleccioná un país.')
    if (!province) return setError('Seleccioná una provincia.')
    if (!form.city) return setError('Seleccioná una ciudad.')

    const email = registerEmail.trim().toLowerCase()
    const password = registerPassword
    if (!email) return setError('Ingresá un email de administrador.')
    if (!password || password.length < 6) return setError('Ingresá una contraseña (mínimo 6 caracteres).')

    const location = `${province}, ${form.city}`

    setBusy(true)
    try {
      await createCongregation({
        ...form,
        slug,
        city: location,
        adminEmail: email,
        password,
      })
      setPendingEmail(email)
      onSuccess?.('Congregación registrada, pendiente de validación.')
      setForm({ name: '', slug: '', country: '', city: '', address: '' })
      setProvince('')
      setRegisterEmail('')
      setRegisterPassword('')
      setSlugTouched(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la congregación.')
    } finally {
      setBusy(false)
    }
  }

  if (pendingEmail) {
    return <PendingValidationView email={pendingEmail} onBack={() => setPendingEmail(null)} />
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 520 }}>
      {loadingProvinces && <LoadingOverlay label="Cargando provincias…" />}
      {loadingCities && <LoadingOverlay label="Cargando ciudades…" />}
      <Tabs
        value={tab}
        onChange={(_, v) => {
          setTab(v)
          setError(null)
          setNotice(null)
          onTabChange?.(v)
        }}
        variant="fullWidth"
        sx={{ mb: 1, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
      >
        <Tab label="Iniciar sesión" />
        <Tab label="Registrar" />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 1, py: 0.5 }} className="slide-transition">{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 1, py: 0.5 }} className="slide-transition">{notice}</Alert>}

      <Box key={tab} className="slide-transition">
        {tab === 0 ? (
          <Box component="form" onSubmit={handleAdminLogin}>
            <Stack spacing={1.25}>
              <Typography variant="caption" color="text.secondary">
                Acceso para administradores de congregación.
              </Typography>
              <TextField
                size="small"
                label="Usuario / Email"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                autoComplete="username"
                fullWidth
              />
              <PasswordField
                label="Contraseña" value={adminPassword}
                onChange={setAdminPassword} autoComplete="current-password"
              />
              <Button type="submit" variant="contained" size="small" disabled={busy}>
                {busy ? 'Ingresando…' : 'Entrar como admin'}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleCreate} style={{marginTop:'5%'}}>
            <Stack spacing={1.25}>
              
              <TextField
                size="small"
                label="Nombre de la congregación"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value
                  setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }))
                }}
                required
                fullWidth
              />
              <TextField
                size="small"
                label="Slug"
                value={slugTouched ? form.slug : suggestedSlug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                }}
                required
                fullWidth
              />

              <TextField
                select
                size="small"
                label="País"
                value={form.country}
                onChange={(e) => {
                  setForm((f) => ({ ...f, country: e.target.value, city: '' }))
                  setProvince('')
                }}
                required
                fullWidth
              >
                <MenuItem value="">Seleccioná un país</MenuItem>
                {LATAM_COUNTRIES.map((c) => (
                  <MenuItem key={c.apiName} value={c.label}>{c.label}</MenuItem>
                ))}
              </TextField>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  select
                  size="small"
                  label="Provincia / Estado"
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value)
                    setForm((f) => ({ ...f, city: '' }))
                  }}
                  required
                  fullWidth
                  disabled={!form.country || loadingProvinces}
                  helperText={provincesError}
                >
                  <MenuItem value="">Seleccioná una provincia</MenuItem>
                  {provinces.map((p) => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Ciudad"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  required
                  fullWidth
                  disabled={!province || loadingCities}
                  helperText={citiesError}
                >
                  <MenuItem value="">Seleccioná una ciudad</MenuItem>
                  {cities.map((city) => (
                    <MenuItem key={city} value={city}>{city}</MenuItem>
                  ))}
                </TextField>
              </Stack>

              <TextField
                size="small"
                label="Dirección"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                fullWidth
              />
              <TextField
                size="small"
                label="Email de administrador"
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                autoComplete="email"
                required
                fullWidth
              />
              <PasswordField
                label="Contraseña" value={registerPassword}
                onChange={setRegisterPassword} autoComplete="new-password"
                required helperText="Mínimo 6 caracteres."
              />
              <Button type="submit" variant="contained" size="small" disabled={busy}>
                {busy ? 'Registrando…' : 'Registrar congregación'}
              </Button>

            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  )
}