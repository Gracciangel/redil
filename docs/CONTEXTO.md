# Redil — Contexto de proyecto y decisiones de arquitectura

> Documento vivo. Sirve para que cualquier sesión futura arranque con el mismo
> contexto. **Todo cambio relevante debe registrarse acá.**

Última actualización: 2026-11-24

---

## 1. Propósito del producto

Redil es una PWA para **congregaciones evangélicas**. La congregación es la unidad
organizacional central (**tenant**) y nuclear miembros, grupos/ministerios,
recursos, avisos y eventos.

### Reglas de negocio (vigentes)

| # | Regla | Fuente |
|---|-------|--------|
| R1 | Cada **miembro pertenece a una sola congregación**. | `src/supabase/scheme.md`, RPC `join_congregation` |
| R2 | Una congregación puede **compartir recursos, publicar anuncios y otorgar roles** a sus miembros (`admin`, `leader`, `member`). | `scheme.md` → `posts`, `news`, `memberships.role` |
| R3 | Cada congregación puede **crear ministerios o grupos** y asignarles **uno o varios miembros**. | `scheme.md` → `ministries`, `ministry_members` |
| R4 | La congregación es el **tenant / dueño de casa**; los miembros son los habitantes. Un miembro **entra a la casa solo si** (a) inicia sesión con Google **y** (b) recibe el acceso otorgado por el dueño. | Decisión del usuario, 2026-11-17 |
| R5 | El acceso es el **`invitation_code` de la congregación** (columna de `congregations`, ej. `BC783DD3`). El dueño lo entrega como QR o como texto; **no existe una tabla de códigos ni acceso automático**. | Decisión del usuario, 2026-11-17 |
| R6 | Al canjear el acceso solo se crea la **relación miembro ↔ tenant**. La asignación de **roles es un paso posterior**, decidida por el tenant. | Decisión del usuario, 2026-11-17 |
| R7 | Si el miembro ya inició sesión con Google pero **no tiene relación con ningún tenant**, la app le muestra **solo un modal bloqueante**: no ve las opciones del tenant ni su perfil de miembro de Redil. El modal ofrece dos botones: **Ingresar con QR** e **Ingresar mediante código de invitación**. | Decisión del usuario, 2026-11-17 |

> R1 está reforzada en base de datos: `public.join_congregation(p_code)` rechaza
> el ingreso si el usuario ya pertenece a otra congregación.
>
> R5 **confirma y precisa** el modelo existente: se usa la columna
> `congregations.invitation_code`; la novedad es que **el dueño es quien lo
> entrega** (QR o texto), no que el miembro lo descubra por su cuenta.
> Roles (R6) se asignan después, en un panel separado dentro del tenant.
> R7 bloquea toda la experiencia del miembro hasta que exista la membresía:
> el modal es la **única** UI visible para un usuario sin congregación.

---

## 1.1 Modelo de acceso a la casa (definido 2026-11-17 · implementado salvo auth)

### Modelo real: no hay tabla de códigos

El acceso **ya existe** en la base como columna de la congregación:
`public.congregations.invitation_code` (texto único). **No se crea** `access_codes`
ni ninguna tabla adicional. El dueño simplemente comparte ese código.

Fila real de ejemplo (credenciales omitidas a propósito):

| id | name | slug | invitation_code | vify |
|----|------|------|-----------------|------|
| `7398fbc1-3e53-45dc-8677-a3dd9aa58fde` | Igelsia nueva vida | `igelsia-nueva-vida` | `BC783DD3` | `true` |

### Flujo de ingreso

1. El dueño de casa entrega el `invitation_code` de su congregación (en un QR
   o como texto).
2. El miembro inicia sesión con Google (R4-a).
3. El miembro canjea el código → `join_congregation(p_code)` crea la fila en
   `memberships` y lo vincula al tenant (R4-b, respetando R1).
4. Los roles se asignan **después** (R6).

### RPCs

| RPC | Estado | Quién lo llama | Regla |
|-----|--------|----------------|-------|
| `preview_congregation(p_code)` | ✅ Existe en SQL y en `services/membership.ts` | Miembro | Devuelve `(id, name, city, country, photo_url)` para mostrar la congregación antes de canjear. |
| `join_congregation(p_code)` | ✅ Existe en SQL y en `services/membership.ts` | Miembro | Exige `auth.uid()`; valida `invitation_code`; inserta `memberships` con rol por defecto `member`; rechaza si ya pertenece a otra congregación (R1). |
| `get_my_membership()` | ✅ Creado en `rpcs/getMyMembership.sql` y en `redil_schema.sql`; consumido desde `services/membership.ts` | Miembro | Devuelve la congregación vinculada a `auth.uid()` o `null`. Es lo que decide si se muestra el modal de R7. |

> No se necesitan `create_access_code` ni `redeem_access_code`: el dueño no
> genera códigos nuevos, comparte el `invitation_code` que ya tiene su
> congregación. El QR es solo otra forma de entregar el mismo valor.

### Pantallas derivadas

| Pantalla | Responsabilidad |
|----------|-----------------|
| **Congregación → Accesos** (nueva) | Mostrar el `invitation_code` de la congregación y su QR para que el dueño lo entregue. No genera códigos ni asigna roles. |
| **Congregación → Roles** (futura) | Asignar/cambiar `admin`, `leader` o `member` una vez creada la membresía (R2/R6). |
| **Miembro → Modal de acceso requerido** (R7) | Si `get_my_membership()` devuelve `null`: **modal bloqueante**, sin opciones ni perfil, con **Ingresar con QR** e **Ingresar mediante código de invitación**. |
| **Miembro → Home** | Solo para miembros ya vinculados: eventos y avisos en solo lectura (lo que ya hace `MemberHomeView`). |

### Modal de acceso requerido (R7) — diseño

Caso práctico: el tenant comparte un QR con su `invitation_code`; el miembro
inicia sesión con Google; si no lo canjeó, **no ve las opciones del tenant ni su
perfil de miembro de Redil**. Lo único en pantalla es el modal.

| Elemento | Definición |
|----------|------------|
| Contenedor | `Dialog` de MUI, `maxWidth="xs"`, sin `onClose`. En MUI v9 eso impide cerrar con Escape o backdrop; no hay botón de cerrar. El único cierre es que exista la membresía (la view se desmonta al redirigir). |
| Título | "Necesitás ser parte de una congregación" |
| Cuerpo | Explica que su cuenta todavía no está asociada a ninguna congregación y que debe pedir el QR o el código al dueño de casa. |
| Botón 1 | **Ingresar con QR** → abre el escáner de cámara, lee el `invitation_code` y lo canjea con `join_congregation`. |
| Botón 2 | **Ingresar mediante código de invitación** → `TextField` para pegar el código y canjearlo con el mismo RPC. |
| Éxito | Se recarga `get_my_membership()`; el modal desaparece y se habilita la Home del miembro. |

> Ambos botones entregan **el mismo `invitation_code`** (R5); cambia solo el
> input (cámara vs. texto).

**Escáner QR resuelto:** se usa `BarcodeDetector` nativo (sin dependencias), con
fallback a un `TextField` manual cuando el navegador no lo soporta o la cámara
falla. Implementado en `QrScannerPanel.tsx`. El valor leído se normaliza a
mayúsculas antes de canjearlo.

### Autenticación: resuelto en código, pendiente de configuración en Supabase

`join_congregation` y `get_my_membership` necesitan `auth.uid()`. El login de
miembros ya usa **Supabase Auth con proveedor Google** (ver sección 5), así que
el UID del store es el mismo `auth.users.id` que usan los RPCs. El trigger
`on_auth_user_created` crea el `profiles` automáticamente.

> ⚠️ **Paso manual afuera del repo:** habilitar el provider Google en
> Supabase → Authentication → Providers → Google (Client ID / Secret de Google
> Cloud) y agregar la redirect URL `http://localhost:5173/login` (dev) y la de
> producción (p. ej. `https://<app>/login`) en *URL Configuration*. Sin esto,
> `signInWithOAuth` falla aunque el código esté correcto.

---

## 2. Premisa general de implementación (OBLIGATORIA)

Estas reglas son **no negociables** para todo el código nuevo:

1. **Responsabilidad propia por componente.** Cada componente hace una sola cosa
   y no comparte responsabilidades con otros.
2. **Un view es solo una view.** No ejecuta lógica de negocio, no llama a
   Supabase, no decide permisos. Solo **compone y presenta**. La carga de datos,
   el estado y las decisiones viven en **hooks / servicios / store**.
3. **UI con Material UI (MUI).** Todo componente visual nuevo se construye con
   `@mui/material` (y `@mui/icons-material` cuando hagan falta íconos).
4. **Persistencia vía RPC de Supabase.** Toda ejecución en base de datos se hace
   llamando a funciones RPC (`supabase.rpc(...)`), nunca con `INSERT/UPDATE`
   directos desde la vista. La lógica de negocio y los permisos viven en SQL
   (`security definer` + `search_path` + RLS).
5. **Documentar todo.** Cada decisión, cada pantalla nueva y cada RPC se
   registran en este archivo.

### Capas resultantes

```
View (MUI, presentación)
   ↓ props / callbacks
Hook (estado y orquestación)
   ↓
Service (llamada a supabase.rpc)
   ↓
RPC en PostgreSQL (reglas de negocio + RLS)
```

---

## 3. Stack y configuración

- Vite 8 + React 19 + TypeScript (strict, `noUnusedLocals`, `verbatimModuleSyntax`).
- Alias `@/*` → `./src/*`.
- Material UI 9 + Emotion, tema en `src/theme`, `CssBaseline` en `AppProviders`.
- React Router 7, rutas en `src/app/AppRoutes.tsx`.
- Zustand para el store de usuario (`src/store/Store.ts`).
- Supabase JS (`@supabase/supabase-js`) para datos **y** autenticación (Google vía Supabase Auth). Firebase quedó fuera del bundle; la dependencia y `src/firebase/configuration.ts` permanecen sin uso y son candidatos a eliminar en limpieza.
- PWA (vite-plugin-pwa) + IndexedDB (`idb`) para el modo offline.

---

## 4. Estado actual de Supabase (`src/supabase/`)

| Archivo | Responsabilidad |
|---------|-----------------|
| `supabase.ts` | Cliente `createClient`. Lee `VITE_SUPABASE_URL` / `VITE_AURL_SUPABASE` y `VITE_SUPABASE_ANON_KEY` / `VITE_URL_ANON`. Normaliza la URL quitando `/rest/v1`. |
| `scheme.md` | Documentación de tablas, enums y políticas RLS. |
| `redil_schema.sql` | Script maestro del esquema multitenant. |
| `login.ts` | Funciones de autenticación del frontend: `loginWithGoogle` (Supabase OAuth), `mapAuthUser`, `loginWithCongregation` (RPC) y `logout`. |
| `rpcs/congregation_auth.sql` | RPCs de registro/login de congregación. |
| `rpcs/createCongregation.sql` | Variante alineada de los RPCs de congregación. |
| `rpcs/joinCongregation.sql` | RPCs `preview_congregation` y `join_congregation`. |

### Tablas principales

`profiles`, `member_contacts`, `congregations`, `memberships`, `ministries`,
`ministry_members`, `posts`, `events`, `news`.

Enums: `membership_role` = `admin | leader | member`; `media_kind` = `image | video`.

### RPCs disponibles

| RPC | Parámetros | Devuelve | Regla clave |
|-----|-----------|----------|-------------|
| `create_congregation` | `p_name, p_slug, p_city?, p_country?, p_address?, p_admin_email, p_password` | `jsonb { id, invitation_code, vify }` | Guarda password con bcrypt (`pgcrypto`) y deja `vify=false`. |
| `login_congregation` | `p_admin_email, p_password` | `jsonb { ok, vify, congregation?, error? }` | Solo permite login si `vify=true` y el hash coincide. |
| `preview_congregation` | `p_code` | tabla `(id, name, city, country, photo_url)` | Vista previa pública por código de invitación (solo `authenticated`). |
| `join_congregation` | `p_code` | `uuid` | Exige `auth.uid()`; 1 usuario = 1 congregación. |
| `get_my_membership` | — | tabla `(congregation_id, name, slug, role)` | Devuelve la membresía de `auth.uid()` o vacío; decide el modal R7. |

---

## 5. Autenticación (unificada en Supabase)

| Flujo | Motor | Función | Observación |
|-------|-------|---------|-------------|
| Login de **miembro** | Supabase Auth (Google OAuth, redirect) | `loginWithGoogle()` en `src/supabase/login.ts` | No devuelve usuario: redirige a Google y vuelve a `/login` con la sesión. El UID es `auth.users.id`. |
| Sesión → store | Supabase Auth | `AuthProvider.tsx` | `getSession()` + `onAuthStateChange()` → `mapAuthUser()` → `useUserStore`. Fija `authReady`. |
| Login de **congregación** | Supabase RPC | `loginWithCongregation()` | Valida `admin_email` + password hasheada y exige `vify=true`. No crea sesión Auth. |
| Registro de **congregación** | Supabase RPC | `createCongregation()` en `src/features/congregations/services/congregations.ts` | Queda pendiente de validación. |
| Logout | Supabase Auth | `logout()` | `supabase.auth.signOut()` + limpia `localStorage.user`. |

- El proveedor sigue siendo **Google**; lo que cambió fue el servidor de sesión
  (Firebase → Supabase), necesario para que `auth.uid()` exista en los RPCs.
- `mapAuthUser()` traduce `user.user_metadata` / `app_metadata` a `IUser`.
  `uid = user.id`, `providerId = app_metadata.provider`, `rol = 2` (deuda R6).
- El trigger `on_auth_user_created` inserta la fila en `profiles` al crear el
  usuario, requisito para que `memberships.user_id` pueda referenciarlo.
- `PrincipalView` lee `?error=` / `#error=` del retorno OAuth y muestra
  "Inicio de sesión cancelado." cuando corresponde, limpiando la URL después.

### 5.1 Configuración manual requerida (fuera del repo)

1. Supabase Dashboard → **Authentication → Providers → Google**: habilitar y
   cargar Client ID / Client Secret de Google Cloud.
2. **Authentication → URL Configuration → Redirect URLs**: agregar
   `http://localhost:5173/login` para desarrollo y `https://<dominio>/login`
   para producción.
3. En Google Cloud, autorizar como URI de redirección el callback que muestra
   Supabase (`https://<proyecto>.supabase.co/auth/v1/callback`).

---

## 6. Alcance de la sesión 2026-11-17

1. ✅ Documentar el contexto para sesiones futuras (este archivo).
2. ✅ Crear la **pantalla principal de congregación** y la **pantalla principal de miembro**.
3. ✅ Para el punto 2, **reutilizar las pantallas ya definidas**.

---

## 7. Inventario de pantallas (descubierto en esta sesión)

### 7.1 Activas (enrutadas desde `src/app/AppRoutes.tsx`)

| Ruta | View | Hook / viewmodel | Origen de datos |
|------|------|------------------|-----------------|
| `/login` | `PrincipalView` | estado local + `useUserStore` | Supabase Auth (Google) / RPCs de congregación |
| `/` | `DashboardView` | `useDashboardView` | IndexedDB local (`lib/repo.ts`) |
| `/miembros` | `MembersView` | `useMembersView` | IndexedDB local |
| `/eventos` | `EventsView` | `useEventsView` | IndexedDB local |
| `/avisos` | `AnnouncementsView` | `useAnnouncementsView` | IndexedDB local |
| `/ajustes` | `SettingsView` | `useSettingsView` | local + API propia + PWA |
| `*` | `NotFoundView` | — | — |
| **`/congregacion`** | **`CongregationHomeView`** | **`useCongregationHome`** | configuración + usuario |
| **`/miembro`** | **`MemberHomeView`** | **`useMemberHome`** | IndexedDB + RPCs de membresía |

> Las negritas son las pantallas creadas en esta sesión.

### 7.2 Legacy (NO enlazadas; no usar)

`src/pages/Dashboard.tsx`, `Members.tsx`, `Events.tsx`, `Announcements.tsx`,
`Settings.tsx`, `NotFound.tsx` son una versión anterior basada en CSS global.
**Ningún archivo las importa.** Toda reutilización debe hacerse desde
`src/views/`, `src/features/` y `src/components/`.

### 7.3 Navegación

`src/components/Layout.tsx` define `NAV_ITEMS` y lo renderiza dos veces
(sidebar desktop + tabbar móvil) con `NavLink` de React Router. No se usa
`BottomNavigation` de MUI ni `useNavigate` en las views.

---

## 8. Pantallas creadas en esta sesión

### 8.1 `CongregationHomeView` — pantalla principal de la congregación

**Archivo:** `src/views/CongregationHomeView.tsx` · **Viewmodel:** `src/features/congregations/hooks/useCongregationHome.ts`

Es una **view pura**: no consulta Supabase, no decide permisos y no carga datos.
Solo compone:

1. Cabecera con nombre de congregación, nombre y email del administrador.
2. **`<DashboardView />` reutilizado** como resumen (miembros, eventos, avisos).
   Se mantiene su propia responsabilidad de carga/errores; el panel no la duplica.
3. Accesos ya definidos (`/miembros`, `/eventos`, `/avisos`) y un botón deshabilitado
   de "Ministerios y grupos" (R3) con `Tooltip` explicativo.

`useCongregationHome` solo expone `{ congregationName, adminEmail, adminName }`
desde `useSettings` + `useUserStore`. No hace fetch.

### 8.2 `MemberHomeView` — pantalla principal del miembro

**Archivo:** `src/views/MemberHomeView.tsx` · **Viewmodel:** `src/features/members/hooks/useMemberHome.ts`

Es una **view pura**. Presenta:

1. Saludo con el nombre del miembro y congregación.
2. `JoinCongregationPanel` para unirse por código de invitación.
3. Próximos eventos y últimos avisos en modo **solo lectura**, reutilizando
   `EventCard` y `AnnouncementCard` de `features/`.

`useMemberHome` es la **única** capa con lógica de esta pantalla:

- Carga `listEvents()` + `listAnnouncements()` de IndexedDB con `useAsyncData`.
- Calcula `upcoming` y `latestAnnouncements` (fijados primero, luego fecha).
- Orquesta los RPCs `preview_congregation` y `join_congregation` a través de los
  servicios existentes en `features/congregations/services/membership.ts`.
- Expone `{ loading, error, code, preview, previewing, joining, actionError,
  joinedCongregationId, handlePreview, handleJoin, ... }`.

### 8.3 `JoinCongregationPanel` — componente de presentación

**Archivo:** `src/features/congregations/components/JoinCongregationPanel.tsx`

Componente MUI (`Paper`, `TextField`, `Button`, `Alert`, `Chip`) que **no ejecuta
RPCs**: recibe el viewmodel y delega con callbacks (`onCodeChange`, `onPreview`,
`onJoin`). Antes de esta sesión los servicios de membresía no tenían consumidor
en la UI.

> ✅ **Reutilizado:** R5 confirma que el código es el `invitation_code` de
> `congregations`, que es justamente lo que este panel ya canjea. No se eliminó:
> ahora vive dentro del modal bloqueante de R7 (sección 1.1/8.6), sin cambios
> en su API.

### 8.4 Ajustes en componentes reutilizados (retrocompatibles)

| Archivo | Cambio | Motivo |
|---------|--------|--------|
| `features/events/components/EventCard.tsx` | `onEdit` y `onDelete` pasaron a ser opcionales; el bloque de iconos solo se renderiza si hay alguna acción. | Permitir modo solo lectura en `MemberHomeView` sin duplicar la card. Los usos actuales están intactos. |
| `features/announcements/components/AnnouncementCard.tsx` | `onEdit`, `onDelete` y **nuevo** `onTogglePinned` opcionales. Se quitó la llamada directa a `togglePinned()` del repo. | La card dejó de ejecutar persistencia: ahora es presentación pura. `AnnouncementsView` pasa la callback explícitamente. |
| `views/AnnouncementsView.tsx` | Importa `togglePinned` y lo pasa como `onTogglePinned`. | Trasladar la responsabilidad de datos al dueño de la vista. |

### 8.5 Rutas y navegación

`src/app/AppRoutes.tsx` agregó dentro de `ProtectedRoute` + `Layout`:

- `/congregacion` → `CongregationHomeView`
- `/miembro` → `MemberHomeView`

Y **fuera de `Layout`**, también dentro de `ProtectedRoute`:

- `/acceso` → `AccessRequiredView` (R7). Sin navegación ni perfil: solo el logo
  y el modal bloqueante.

Todas las rutas con `Layout` están envueltas por **`MemberAccessGuard`** (R7 global):
si el miembro autenticado no tiene membresía, redirige a `/acceso` antes de
renderizar cualquier pantalla. `/acceso` queda fuera del guard para evitar loops.

`src/components/Layout.tsx` agregó dos ítems a `NAV_ITEMS`:
`Congregación` (`/congregacion`, icono `users`) y `Miembro` (`/miembro`, icono `user`).

### 8.6 Implementación del modal R7 (archivos)

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/supabase/rpcs/getMyMembership.sql` | RPC `get_my_membership()`: membresía del usuario autenticado. Revoke a `public/anon`, grant a `authenticated`. |
| `src/supabase/redil_schema.sql` | Misma función + grants, para el esquema maestro. |
| `src/features/congregations/services/membership.ts` | `getMyMembership()` (nuevo), además de `previewCongregationByCode` y `joinCongregationByCode`. |
| `src/features/members/hooks/useMemberHome.ts` | Viewmodel: contenido de solo lectura + membresía + canje. Expone `hasMembership`, `membershipLoading`, `membershipError` y acepta `codeValue` en `handlePreview`/`handleJoin`. |
| `src/features/congregations/components/AccessRequiredModal.tsx` | Modal bloqueante: elige entre QR y código; reutiliza los otros dos componentes. No llama a Supabase. |
| `src/features/congregations/components/QrScannerPanel.tsx` | `BarcodeDetector` nativo + fallback manual. Solo entrega el código leído. |
| `src/features/congregations/components/JoinCongregationPanel.tsx` | Reutilizado sin cambios dentro del modal (vista de presentación del canje por texto). |
| `src/app/MemberAccessGuard.tsx` | Guard global de R7: consulta `get_my_membership()` y redirige a `/acceso` antes de renderizar cualquier ruta con `Layout`. Es tenant-aware: si hay sesión en `CongregationStore`, no consulta el RPC y deja pasar. |
| `src/views/AccessRequiredView.tsx` | View sin `Layout`; redirige a `/miembro` si ya hay membresía y a `/code` si hay sesión de tenant. |
| `src/views/MemberHomeView.tsx` | Si no hay membresía, redirige a `/acceso`; si la hay, muestra eventos y avisos en solo lectura. |

**Flujo resultante:** `/miembro` → `get_my_membership()` → si `null`, `<Navigate to="/acceso" replace />` → modal → QR o código → `join_congregation(p_code)` → se incrementa la versión de membresía → `get_my_membership()` devuelve datos → `/miembro`.

### 8.7 Migración de auth a Supabase (archivos)

| Archivo | Cambio |
|---------|--------|
| `src/supabase/login.ts` | `loginWithGoogle()` usa `supabase.auth.signInWithOAuth({ provider: 'google' })` con `redirectTo: <origin>/login`. Nuevo `mapAuthUser()`. `logout()` usa `supabase.auth.signOut()`. `loginWithCongregation()` queda igual. |
| `src/app/AuthProvider.tsx` | De `onAuthStateChanged` de Firebase a `supabase.auth.getSession()` + `onAuthStateChange()`. |
| `src/views/PrincipalView.tsx` | `auth()` ya no espera un `IUser`; lee errores OAuth de query/hash y limpia la URL. |
| `src/components/Layout.tsx` | Los dos botones de logout pasan a `void logout()`. |
| `src/store/Store.ts` | Comentario de `authReady` actualizado (Supabase en vez de Firebase). |

**Flujo de login:** botón Google → OAuth de Supabase → redirect a `/login` →
`AuthProvider` guarda el usuario en el store → `LoginRoute` redirige a `/` →
`/miembro` consulta `get_my_membership()` con el UID correcto.

### 8.8 Sesión del tenant y vista Code (paso 7)

El login de congregación no crea sesión de Supabase Auth, así que necesita su
propio estado persistido. `login_congregation` devuelve un objeto `congregation`
con `id`, `name`, `slug`, `city`, `country`, `invitation_code` y `admin_email`.

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/store/CongregationStore.ts` | Store de Zustand persistido en `localStorage` (`redil-congregation`) con `CongregationSession` (id, name, slug, invitation_code, admin_email, vify). |
| `src/supabase/login.ts` | `loginWithCongregation()` guarda la sesión devuelta por el RPC; `logout()` la limpia. |
| `src/app/AppRoutes.tsx` | `ProtectedRoute` acepta `user` **o** `congregation`. `LoginRoute` redirige al tenant a `/code`. Ruta `/code` dentro de `Layout`. |
| `src/app/MemberAccessGuard.tsx` | Con sesión de tenant omite `get_my_membership()` (ese RPC no puede funcionar sin `auth.uid()`) y deja pasar. |
| `src/lib/hooks.ts` | `useAsyncData(loader, deps, enabled)`: el tercer parámetro permite no ejecutar el loader en el guard. |
| `src/features/congregations/hooks/useCongregationCode.ts` | Viewmodel: lee solo `CongregationStore` y expone `code`, `name`, `adminEmail`. |
| `src/views/CodeView.tsx` | Vista de presentación: QR (`qrcode.react`), código con botón copiar y explicación. No genera códigos ni llama a Supabase. |
| `src/components/Layout.tsx` | Ítem "Code" con `icon: 'qr'`, marcado `tenantOnly` para que no aparezca en el menú del miembro. |
| `src/features/congregations/components/CongregationAccess.tsx` | Nuevo `onLoginSuccess()`: se dispara solo en el login (no en el registro) para navegar. |
| `src/views/PrincipalView.tsx` | Pasa `onLoginSuccess={() => navigate('/code', { replace: true })}`. |

**Flujo:** login de tenant → RPC `login_congregation` → se persiste la sesión →
`onLoginSuccess()` navega a `/code` → QR + texto muestran el **mismo**
`invitation_code`. El QR codifica el código **en crudo** (sin URL), porque
`QrScannerPanel` entrega `rawValue` y el RPC hace `upper(trim(p_code))`.
Recargar `/code` funciona porque el store es persistido.

> Si el `login_congregation` deployado no devuelve el objeto `congregation`,
> ejecutar `src/supabase/rpcs/congregation_auth.sql` en el SQL Editor.

### 8.9 Tab limitado a las vistas definidas

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/components/Layout.tsx` | `NAV_ITEMS` reducido a Home, Perfil, Ajustes, Biblia, Calendario y Code (`tenantOnly`). Es la única fuente del sidebar y de la tabbar. |
| `src/app/AppRoutes.tsx` | Rutas nuevas `/perfil`, `/biblia` y `/calendario`. Las antiguas quedan como atajos internos, fuera del menú. |
| `src/features/profile/hooks/useProfileView.ts` | Viewmodel del Perfil: lee el store del miembro o del tenant y expone nombre, email, foto, bio y `isTenant`. |
| `src/views/ProfileView.tsx` | Foto, nombre, bio, ministerios/grupos y —solo tenant— acceso a "Miembros". Sin edición (eso es Ajustes). |
| `src/views/BibleView.tsx` | Módulo presente con `EmptyState`; no hay fuente de textos definida. |
| `src/views/CalendarView.tsx` | Agenda en solo lectura reutilizando `useDashboardView()` + bloque de "Fechas importantes" pendiente de L/R3. |
| `src/styles.css` | `.tabbar` usa `grid-auto-flow: column` en vez de 5 columnas fijas; `.tab-link span` con ellipsis. |

### 8.10 Cabecera, miembros del tenant y Ajustes

Pedido del usuario del 2026-11-17, resuelto en tres bloques:

**1. Cabecera.** `settings.congregationName` tenía como valor por defecto
`"Mi hola"` y se mostraba tal cual en el sidebar y el topbar.
`useSessionIdentity()` prioriza la sesión real: nombre del tenant si entró como
congregación, nombre/email del miembro si entró con Google.

**2. Miembros del tenant.** Como el login de congregación no crea
`auth.uid()`, se agregó un **token de sesión**: `login_congregation` emite un
`session_token` vigente 12 hs que se persiste en `CongregationStore` y se envía
a cada RPC del tenant. `list_congregation_members(p_token)` junta
`memberships` + `profiles` + `member_contacts` + `auth.users`. `MembersView`
usa ese RPC cuando hay tenant y sigue usando el store local para el miembro.

> ⚠️ Hay que ejecutar `src/supabase/rpcs/tenantAdmin.sql` en el SQL Editor.
> Reemplaza `login_congregation` con la versión que emite el token, agrega
> `bio` a `profiles`/`congregations` y crea `tenant_sessions`. Hasta que se
> ejecute, el login de tenant no traerá token y los RPCs darán "Sesión inválida".

**3. Ajustes.** Reemplazado por completo (decisión del usuario):

| Perfil | Secciones |
|--------|-----------|
| Miembro | Contraseña (Supabase Auth), foto, banner, bio (`update_my_profile`). |
| Tenant | Lo anterior + CRUD de ministerios/grupos y administración de usuarios (rol `admin`/`leader`/`member` y asignación a ministerios). |

Se quitaron las secciones técnicas anteriores (URL de API, sincronización,
PWA, exportar/importar datos y borrar todo).

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/supabase/rpcs/tenantAdmin.sql` | Sesión de tenant, RPCs de miembros/ministerios/roles/perfil y grants. |
| `src/supabase/redil_schema.sql` | Alineado: `bio`, `tenant_sessions` y `login_congregation` con token. |
| `src/store/CongregationStore.ts` | Agrega `sessionToken`, `photoUrl`, `bannerUrl` y `bio`. |
| `src/supabase/login.ts` | Guarda el token y los datos del perfil del tenant. |
| `src/features/profile/hooks/useSessionIdentity.ts` | Nombre real para la cabecera. |
| `src/features/congregations/services/tenantAdmin.ts` | Servicios RPC del tenant y del perfil del miembro. |
| `src/features/congregations/hooks/useTenantData.ts` | Hooks de miembros y ministerios con `reload`. |
| `src/features/congregations/components/TenantMemberList.tsx` | Lista de miembros vinculados en Supabase. |
| `src/views/MembersView.tsx` | Rama tenant (RPC) / rama local (IndexedDB). |
| `src/features/settings/hooks/useAccountSettings.ts` | Viewmodel de Ajustes por perfil. |
| `src/views/SettingsView.tsx` | Ajustes reemplazado según `rulesView.md`. |

### 8.11 Diagnóstico del 404 de `get_my_membership`

El 2026-11-17 aparecieron llamadas repetidas a
`POST /rest/v1/rpc/get_my_membership` con `404 (Not Found)`. Se verificó el
estado real del proyecto (`ghjdhnqphsflcajoacwq`) con llamadas directas usando
la anon key:

| RPC | Estado | Respuesta |
|-----|--------|-----------|
| `get_my_membership` | 404 | `PGRST202`: *"no matches were found in the schema cache"* |
| `list_congregation_members` | 400 | "Sesión de congregación inválida o vencida" → existe |
| `get_my_profile` | 200 | `[]` → existe |
| `login_congregation` | 200 | "Credenciales inválidas" → existe |

**Conclusión:** `tenantAdmin.sql` sí fue ejecutado, pero **`getMyMembership.sql`
no**. `redil_schema.sql` sí incluye la función (línea 445), así que lo más
probable es que ese script se haya ejecutado sobre una base que ya tenía los
tipos creados: `create type public.membership_role ...` falla al duplicarse y
corta el resto del archivo antes de llegar a la función.

PGRST202 también aparece cuando la función existe pero el rol que la llama no
tiene `execute`: `get_my_membership()` se otorga solo a `authenticated`, nunca a
`anon`. Por eso el guard llama al RPC únicamente si hay sesión de Supabase Auth.

**Corrección:** ejecutar `src/supabase/rpcs/getMyMembership.sql` en el SQL
Editor. Si la función ya existiera, conviene correr
`notify pgrst, 'reload schema';` para refreshear el caché de PostgREST.

**Endurecimiento en código:**

- `getMyMembership()` no llama al RPC si `supabase.auth.getSession()` no trae
  sesión, y traduce `PGRST202`/`PGRST404` a un mensaje que dice qué SQL ejecutar.
- `MemberAccessGuard` ya no confunde "falló la verificación" con "no tiene
  membresía": muestra el error con un botón **Reintentar** en vez de redirigir
  en silencio a `/acceso`. El flujo R7 normal (RPC responde `null`) queda igual.

### 8.12 Diagnóstico del 400 de `list_congregation_members`

Después de instalar `get_my_membership`, apareció
`POST /rest/v1/rpc/list_congregation_members 400 (Bad Request)`. El RPC **sí
existe**; el error es la excepción `P0001` que él mismo lanza:

> "Sesión de congregación inválida o vencida. Volvé a iniciar sesión."

`tenant_from_token(p_token)` no encontró el token vigente en `tenant_sessions`.
Causas probables, en orden:

1. La sesión persistida en `localStorage` (`redil-congregation`) es anterior a
   `tenantAdmin.sql`, así que no trae `session_token`.
2. Pasaron las 12 hs de vigencia del token (`expires_at`).
3. Se borraron las filas de `tenant_sessions` (por ejemplo, al recrear la tabla).

Para confirmarlo en SQL Editor:

```sql
select token, congregation_id, created_at, expires_at
from public.tenant_sessions
order by created_at desc;
```

Y comparar el `token` con `redil-congregation → state → congregation →
sessionToken` del `localStorage`. **La solución es cerrar sesión y volver a
entrar como congregación**: el nuevo `login_congregation` emite un token fresco.

**Endurecimiento en código:**

- `isTenantSessionError()` detecta ese `P0001` por su texto.
- `TenantSessionAlert` se muestra en Miembros y Ajustes: limpia la sesión
  persistida y lleva a `/login` con un botón *"Ingresar de nuevo"*.
- Los alerts genéricos de error ya no se muestran para ese caso, para no
  duplicar mensajes.

### 8.13 Vinculación efectiva de un miembro a un tenant (R1/R4/R7)

Estado verificado en la base real el 2026-11-18: `preview_congregation`,
`join_congregation` y `get_my_membership` existen y están otorgados a
`authenticated` (responden `401` para anon, que es lo esperado).

El eslabón débil es `public.profiles`: `memberships.user_id` es FK a
`profiles.id`, y el perfil se crea con el trigger `on_auth_user_created`. Si el
esquema se aplicó por partes, ese trigger puede no estar y el alta de membresía
falla con violación de FK. Se agregó `src/supabase/rpcs/memberJoinFix.sql`, que:

1. Crea/recrea `handle_new_user()` y el trigger `on_auth_user_created`.
2. Hace backfill de perfiles de usuarios de Auth que no tienen uno.
3. Reemplaza `join_congregation()` con una versión que **crea el perfil antes de
   insertar la membresía** si hiciera falta. Mantiene R1 (un usuario, una sola
   congregación) y la idempotencia por código.

#### Cómo probar el flujo completo

Precondición: ejecutar `memberJoinFix.sql` en el SQL Editor.

1. **Tenant**: cerrar sesión y entrar como congregación con email/contraseña.
   El banner debe mostrar el nombre de la congregación.
2. En **Code**, copiar el `invitation_code` (ej. `BC783DD3`).
3. En otro navegador o modo incógnito, entrar con **Google** como miembro.
   Debe caer en `/acceso` con el modal bloqueante.
4. Elegir **Ingresar mediante código de invitación** → pegar el código →
   *Buscar* (debe mostrar el nombre) → *Unirme*.
5. Debe redirigir a `/miembro` y mostrar el nombre de la congregación.
6. Volver al navegador del tenant y abrir **Miembros**: debe aparecer la persona.

#### Verificación en SQL

```sql
select u.email, p.name, c.name as congregacion, m.role, m.created_at
from public.memberships m
join public.profiles p on p.id = m.user_id
join public.congregations c on c.id = m.congregation_id
left join auth.users u on u.id = m.user_id
order by m.created_at desc;

-- Debe dar 0 filas (R1: ningún usuario en dos congregaciones):
select user_id, count(*) from public.memberships group by user_id having count(*) > 1;

-- Perfiles huérfanos (debe dar 0):
select u.id, u.email from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
```

Si el listado del tenant sigue dando el 400 de sesión, en el mismo navegador
del tenant usar el botón **Ingresar de nuevo** del aviso amarillo.

**Resultado verificado (2026-11-18):** la consulta de control devolvió
`angelgracci14@gmail.com · Angel Mugracci · Igelsia nueva vida · member`.
El alta por código funcionó de punta a punta.

### 8.14 Contador real del Home y rol de la membresía

Dos ajustes posteriores a la prueba:

1. **Card "Miembros" en 0.** `useDashboardView` contaba
   `listMembers()` de IndexedDB, que para el tenant está vacío. Ahora, cuando
   hay sesión de congregación, el conteo viene de `useCongregationMembers()`
   (RPC `list_congregation_members`). El flujo del miembro sigue usando el store
   local. Además, el Home muestra `TenantSessionAlert` si el token fue
   rechazado, para que un 0 por sesión vencida no pase desapercibido.

2. **Rol hardcodeado.** `IUser.rol` pasó de `1 | 2 | 3 | null` a
   `'admin' | 'leader' | 'member' | null`, alineado con
   `public.membership_role`. `mapAuthUser()` ya no escribe el `2` fijo: deja
   `rol: null` y `syncMyRole()` lo completa con `get_my_membership()` en dos
   momentos: al resolver la sesión en `AuthProvider` y justo después de
   `join_congregation` en `useMemberHome`. Si el miembro aún no pertenece a un
   tenant, el rol sigue `null` hasta que canjee el código. Habilita la deuda R6
   (capacidades L) sin cambiar la UI todavía.

| Archivo | Cambio |
|---------|--------|
| `src/features/dashboard/hooks/useDashboardView.ts` | Conteo de miembros vía RPC para el tenant. |
| `src/views/DashboardView.tsx` | Aviso de sesión vencida en el Home. |
| `src/interfaces/IUser.ts` | `rol` como string del enum de DB. |
| `src/features/congregations/services/membership.ts` | `syncMyRole()`. |
| `src/app/AuthProvider.tsx` | Sincroniza el rol al resolver la sesión. |
| `src/features/members/hooks/useMemberHome.ts` | Sincroniza el rol tras el alta. |

### 8.15 Fix de `list_congregation_members` (42804)

Con el token correcto (`34c3c02d-…`, vigente hasta 2026-11-19) el RPC seguía
dando 400, pero con otro código:

```
42804 · Returned type character varying(255) does not match expected type text in column 4
```

La columna 4 es `email`: `auth.users.email` es `varchar(255)` y la firma de la
función declara `email text`. PostgreSQL exige que los tipos devueltos
coincidan exactamente. El error estaba tapado: con un token inválido se lanzaba
primero la excepción *"Sesión de congregación inválida o vencida"* y nunca se
llegaba al `return query`.

**Fix:** `u.email::text` en `src/supabase/rpcs/tenantAdmin.sql` y el migrador
puntual `src/supabase/rpcs/fixListMembersEmail.sql`. No hace falta re-loguear:
el token sigue vigente, solo se reemplaza la función.

Generalización para el futuro: siempre que un RPC devuelva columnas de
`auth.users` (email, phone, metadata), castearlas al tipo declarado en el
`returns table`.

### 8.16 Capacidades (L): líder limitado a su ministerio o grupo

`rulesView.md` define al **líder** como quien puede crear/alterar/leer/eliminar
información de **su** ministerio o grupo y sumar/quitar miembros, y admite que
un usuario lidere varios. Con `memberships.role = 'leader'` solo sabíamos que
alguien era líder **en la congregación**, no **de qué** grupo. Sin ese alcance,
cualquier chequeo en el front sería ficticio.

**Solución:** agregar `ministry_members.ministry_role` (`leader` | `member`,
default `member`) y hacer que el servidor verifique el alcance con el helper
`public.leads_ministry(ministry_id)`. El front solo presenta: nunca decide si
un usuario puede editar; si intenta operar sobre un ministerio que no lidera,
el RPC lanza `No liderás este ministerio o grupo.`.

**Decisión de alcance:** el tenant conserva **crear y eliminar** ministerios y
grupos (Ajustes). El líder puede **editar nombre/ícono** y **gestionar
integrantes** de lo que lidera. Los cambios de rol global
(`memberships.role`) siguen siendo exclusivos del tenant.

RPCs nuevos (`src/supabase/rpcs/leaderCapabilities.sql`, **pendiente de
ejecutar en la base**):

| RPC | Permiso | Función |
|-----|---------|---------|
| `leads_ministry(id)` | `authenticated` | Helper interno: ¿el `auth.uid()` lidera ese ministerio? (o es admin). |
| `get_my_ministries()` | `authenticated` | Ministerios/grupos del usuario con `is_leader` y `member_count`. Alimenta el Perfil. |
| `list_ministry_members(id)` | líder | Integrantes + `ministry_role`. |
| `list_leaders_congregation_members()` | admin/leader | Candidatos a sumar, del mismo tenant. |
| `add_ministry_member(id, user)` | líder | Suma solo miembros de su congregación. |
| `remove_ministry_member(id, user)` | líder | Quita integrantes. |
| `set_ministry_member_role(id, user, role)` | líder | Cambia `leader`/`member` dentro del ministerio. |
| `update_ministry(id, name, icon)` | líder | Edita nombre/ícono de lo que lidera. |
| `set_tenant_ministry_member_role(token, id, user, role)` | tenant | Designa líderes desde Ajustes, validando token y tenant. |

Todos los RPCs que devuelven `email` usan `::text` para no repetir el 42804 de
la sección 8.15.

**Flujo desde la UI:**

1. El tenant entra a **Ajustes → Ministerios y grupos → Asignar miembros**,
   elige el miembro, el ministerio y el rol **Líder** (o **Miembro**).
   `handleAssignMember` asigna con `assign_member_to_ministry` y, si corresponde,
   llama a `setTenantMinistryMemberRole`.
2. El Perfil del miembro muestra los ministerios/grupos reales, el chip
   **"Líder de N"** y el botón *Gestionar mis ministerios*.
3. `/ministerios` (ruta interna, sin tab) presenta la vista pura
   `MinistriesView`: selector del ministerio liderado, edición de nombre/ícono,
   lista de integrantes con cambio de rol y botón *Quitar*, y alta de
   integrantes desde los miembros de la congregación.
4. El botón *Ministerios y grupos* del Home de la congregación ya no está
   deshabilitado. Como el tenant no tiene `auth.uid()`, esa misma vista le
   muestra un panel que lo deriva a Ajustes en vez del mensaje de "no liderás".

| Archivo | Cambio |
|---------|--------|
| `src/supabase/rpcs/leaderCapabilities.sql` | Esquema + helper + RPCs + permisos. |
| `src/supabase/redil_schema.sql` | `ministry_role` en el esquema maestro. |
| `src/features/congregations/services/leaderMinistries.ts` | Servicios RPC y tipos. |
| `src/features/congregations/hooks/useMyMinistries.ts` | Ministerios del usuario autenticado. |
| `src/features/profile/hooks/useProfileView.ts` | Datos reales + `ledCount`/`isLeader`. |
| `src/views/ProfileView.tsx` | Chip de líder y link a `/ministerios`. |
| `src/features/congregations/hooks/useMinistriesView.ts` | Viewmodel de (L). |
| `src/views/MinistriesView.tsx` | Vista pura de (L). |
| `src/features/settings/hooks/useAccountSettings.ts` | Designación de líder al asignar. |
| `src/views/SettingsView.tsx` | Selector *Rol en el grupo*. |
| `src/app/AppRoutes.tsx` | Ruta `/ministerios`. |
| `src/views/CongregationHomeView.tsx` | Botón habilitado. |

**Estado:** código listo y `typecheck` ✅; la base todavía no tiene los RPCs.
Hay que ejecutar `leaderCapabilities.sql` en Supabase SQL Editor antes de
probar la vista.

### 8.17 Correcciones posteriores al probar (L): badges, líder "de nada" y ABM

Al probar la primera versión aparecieron tres problemas, corregidos en esta
misma ronda:

**1. Badges de color por rol.** Nuevo componente presentacional
`src/features/congregations/components/RoleBadge.tsx`:

| Rol | Color | Label |
|-----|-------|-------|
| `admin` | rojo (`error`) | Admin |
| `leader` | azul (`primary`) | Líder |
| `member` | gris (`default`, outlined) | Miembro |

Se usa en Ajustes → *Usuarios*, en la lista de integrantes de cada ministerio
y en `MinistriesView`. Sirve para `memberships.role` y para `ministry_role`
porque los valores coinciden.

**2. Líder "de nada".** El primer Ajustes permitía poner `Rol = Líder` en la
sección *Usuarios*, que es el rol **global** (`memberships.role`). Eso creaba
un líder sin ministerio asociado: no tenía nada que administrar y `/ministerios`
quedaba vacío. Correcciones:

- El selector global ya no ofrece *Líder* (queda `disabled` solo para mostrar
  el valor de members que ya lo tuvieran) y `handleRoleChange` lo rechaza con
  un aviso que deriva al usuario a designar dentro de un grupo.
- La designación de líder es **exclusivamente por ministerio** (`Rol en el
  grupo`), antes de asignar o después desde el selector de cada integrante.
- Como consecuencia, `list_leaders_congregation_members()` acepta ahora a
  quien lidera *algún* ministerio aunque su rol global sea `member`. Sin este
  cambio, esos líderes no podían ver los candidatos para sumar integrantes.

**3. ABM de ministerios y grupos.** Ajustes pasó de crear/eliminar a
**Alta · Modificación · Baja**, con gestión de integrantes:

- **Alta:** nombre + tipo (ministerio/grupo).
- **Modificación:** nombre, tipo e ícono por ministerio (`Editar`).
- **Baja:** confirmación previa (`Eliminar`).
- Cada ministerio se puede **abrir** (*Integrantes*) para ver quién lo compone,
  cambiar el rol de cada uno (`Miembro` ↔ `Líder`), quitarlo, y sumar miembros
  de la congregación con el rol elegido.

RPCs nuevos, en el mismo `leaderCapabilities.sql` (**re-ejecutar el archivo**,
es idempotente):

| RPC | Uso |
|-----|-----|
| `list_tenant_ministry_members(token, ministry_id)` | Integrantes de un ministerio con su `ministry_role`. |
| `update_tenant_ministry(token, ministry_id, name, is_group, icon)` | Modificación desde Ajustes. |

| Archivo | Cambio |
|---------|--------|
| `src/features/congregations/components/RoleBadge.tsx` | Badge compartido. |
| `src/features/congregations/services/tenantAdmin.ts` | Servicios de listar/actualizar ministerio del tenant. |
| `src/features/congregations/hooks/useTenantData.ts` | `useTenantMinistryMembers`. |
| `src/features/settings/hooks/useAccountSettings.ts` | ABM + designación por grupo + rechazo de líder global. |
| `src/views/SettingsView.tsx` | ABM desplegable por ministerio y badges. |
| `src/views/MinistriesView.tsx` | Badge de rol reutilizado. |

**Estado:** `typecheck` ✅. Falta re-ejecutar `leaderCapabilities.sql` para que
los dos RPCs nuevos y el fix de `list_leaders_congregation_members` estén en
la base.

### 8.18 Alta de ministerios desde el Perfil del tenant

El Perfil del tenant ahora tiene un bloque **Ministerios y grupos de la
congregación** con un alta inline (nombre + tipo → *Crear*) y el listado de lo
ya creado. Usa el mismo RPC `create_tenant_ministry` de Ajustes, así que no hay
lógica duplicada en la base: cambia el lugar desde donde se invoca, no el
alcance. El botón *Administrar en Ajustes* lleva al ABM completo (editar,
eliminar, integrantes y roles).

La view sigue siendo pura: el formulario y los mensajes vienen de
`useProfileView`, que llama a `useTenantMinistries()` y `createTenantMinistry`.
El bloque también muestra `TenantSessionAlert` si el token venció.

| Archivo | Cambio |
|---------|--------|
| `src/features/profile/hooks/useProfileView.ts` | Listado y alta de ministerios del tenant. |
| `src/views/ProfileView.tsx` | Bloque de alta + listado + link a Ajustes. |

---

## 9. Decisiones arquitectónicas

| Decisión | Motivo | Consecuencia |
|----------|--------|--------------|
| `/` sigue siendo `DashboardView` | No cambiar el comportamiento actual ni inventar detección de rol sin auth unificada. | Las dos homes nuevas se acceden por `/congregacion` y `/miembro`. |
| La view reutiliza `DashboardView` en vez de reimplementar el resumen | "Reutilizar pantallas ya definidas" + responsabilidad única. | Si cambia el resumen, cambia en un solo lugar. |
| Las cards reciben callbacks opcionales | Una card es presentación; quién puede editar lo decide el padre. | `MemberHomeView` muestra contenido sin acciones de administración. |
| Los RPCs se llaman solo desde servicios/hooks | Premisa general: DB vía RPC y fuera de la vista. | La view no conoce Supabase. |
| Ministerios/Grupos queda deshabilitado | R3 no tiene RPCs ni pantalla propia todavía. | Evitar una UI que prometa algo que la DB no soporta. |
| Guard R7 global, no solo en `/miembro` | Al entrar con Google se aterriza en `/`, que es `DashboardView` con todo el nav visible. | `MemberAccessGuard` envuelve todas las rutas con `Layout`; `/acceso` queda afuera para no hacer loop. |
| El guard no toca el login de congregación | Ese flujo es un RPC con password y no crea sesión de Supabase Auth, así que nunca llega al guard. | No se bloquea a los admins de congregación. |

---

## 10. Deuda técnica / pendientes

1. ~~Unificar autenticación.~~ **Resuelto en código:** miembros usan Supabase
   Auth (Google) y congregaciones siguen con su RPC. Queda como paso manual la
   configuración del provider y las redirect URLs (sección 5.1).
2. **`rol: 2` hardcodeado** en `mapAuthUser()` (`login.ts`). No hay distinción
   real entre `admin`, `leader` y `member` en el store; se puede tomar de
   `get_my_membership()` cuando se implemente R6.
3. **R3 sin implementar:** faltan RPCs de ministerios/grupos y su pantalla; el
   botón correspondiente está deshabilitado a propósito.
4. **Código de invitación no persistido en el cliente.** El registro devuelve
   `invitation_code`, pero no se guarda en `settings`; por eso la home de
   congregación no lo muestra todavía.
5. **Tabbar con 7 ítems** tras agregar las dos rutas: revisar el responsive en
   pantallas chicas (no hay `BottomNavigation` de MUI todavía).
6. **`src/pages/` duplicado y sin uso:** candidato a eliminar en otra sesión.
7. **`IError.detils`** tiene un typo en el nombre del campo; se mantiene por
   compatibilidad con los callers existentes.

### 10.1 Pendiente del modelo de acceso (R4–R7)

- ⚠️ **Paso manual (no código):** configurar el proveedor Google y las redirect
  URLs en Supabase (sección 5.1) para que el login OAuth funcione. El código ya
  usa Supabase Auth, así que `auth.uid()` y `profiles` quedan resueltos.
- Limpieza opcional: eliminar la dependencia `firebase` y
  `src/firebase/configuration.ts`, que ya no se importan desde `src/`.
- Agregar la pantalla **Accesos** en la congregación: mostrar el
  `invitation_code` existente y su QR. No genera códigos nuevos.
- La asignación de roles va en un panel posterior (R6).
- ~~Reforzar R1~~ → resuelto en la revisión del punto 4 (sección 10.2).

### 10.2 Revisión de aislamiento de tenants / R1 (punto 4 de la hoja de ruta)

**Hallazgos**

| # | Hallazgo | Estado |
|---|----------|--------|
| 1 | Había **dos versiones distintas** de `join_congregation`: la de `redil_schema.sql` usaba `on conflict (congregation_id, user_id) do nothing` y **no respetaba R1** (un usuario podía quedar en dos congregaciones); la de `rpcs/joinCongregation.sql` sí rechazaba al usuario vinculado a otro tenant. | ✅ Alineadas: `redil_schema.sql` adoptó la versión con chequeo de R1. |
| 2 | `memberships` tenía `unique (congregation_id, user_id)` pero **no** `unique (user_id)`. R1 vivía solo en una función; cualquier INSERT directo podía mezclar tenants. | ✅ Agregado `unique (user_id)` al esquema maestro + migración `rpcs/enforceR1.sql`. |
| 3 | La versión del esquema maestro comparaba `invitation_code = p_code` sin normalizar; la otra usaba `upper(trim(...))`. | ✅ Alineado a `upper(trim(p_code))` + `limit 1`. |
| 4 | `get_my_membership()` usa `limit 1`: si existieran duplicados, elegía uno arbitrariamente. | ✅ Resuelto de raíz por el `unique (user_id)`. |
| 5 | El store local (IndexedDB, `lib/repo.ts`) **no tiene `congregation_id`** y `logout()` no lo limpia. Si dos cuentas comparten dispositivo, la segunda ve los datos offline de la primera. | ⚠️ Pendiente: parte del trabajo de capa offline (punto 7). Mínimo: limpiar datos locales al hacer logout. |
| 6 | No hay política RLS de `insert` en `memberships`. Hoy no hace falta porque `join_congregation` es `security definer`, pero cualquier alta futura desde el backoffice debe hacerse por RPC (o agregar la política con `is_admin`). | 📝 Anotado para puntos 5 y 6. |

**Cómo aplicar la corrección en una base ya creada**

Ejecutar en **Supabase → SQL Editor** el archivo:

```
src/supabase/rpcs/enforceR1.sql
```

Es idempotente. Primero muestra un query de diagnóstico: si devuelve filas, hay usuarios en más de un tenant y hay que resolverlos antes de que el `unique (user_id)` pueda crearse.

**Verificación esperada**

```sql
-- debe devolver 0 filas
select user_id, count(*) from public.memberships group by user_id having count(*) > 1;
```

---

## 11. Convenciones de nombres

- Views: `src/views/<Nombre>View.tsx`, exportan `<Nombre>View`.
- Features por dominio: `src/features/<dominio>/{components,hooks,services}`.
- Servicios de datos: `src/features/<dominio>/services/<cosa>.ts`, exportan
  funciones async que devuelven datos o tiran `Error` (nunca manejan UI).
- Hooks: `src/features/<dominio>/hooks/use<Cosa>.ts`.
- Interfaces: `src/interfaces/I<Cosa>.ts`.
- Componentes de presentación: aceptan datos + callbacks; nunca importan
  `supabase`, `repo` ni `api`.

---

## 12. Registro de cambios de la sesión

- 2026-11-17: Creación de este documento con premisa, reglas R1–R3, inventario de
  Supabase y estado de autenticación.
- 2026-11-17: Inventario de views/features/rutas activas y detección de `src/pages/`
  como código legacy no enlazado.
- 2026-11-17: Nuevas views `CongregationHomeView` y `MemberHomeView`, sus hooks
  viewmodel, `JoinCongregationPanel`, rutas `/congregacion` y `/miembro`, ítems de
  navegación y cards adaptadas a modo solo lectura.
- 2026-11-17: `npm run typecheck` y `npm run build` pasan sin errores tras los
  cambios (quedan solo los warnings preexistentes de tamaño de chunk y del
  dynamic import de `supabase.ts`).
- 2026-11-17: Definición de R4/R5/R6 (dueño de casa, acceso por código/QR entregado
  por el dueño, roles en un paso posterior). Inicialmente se propuso una tabla
  `access_codes` (corregida más abajo). **Aún no implementado.**
- 2026-11-17: Definición de R7: modal bloqueante para miembros sin tenant, con
  dos caminos de ingreso (QR / código de invitación) y sin acceso a opciones ni
  perfil. Se agrega el RPC `get_my_membership` y el diseño del modal.
- 2026-11-17: **Corrección del modelo:** no existe tabla `access_codes`; el acceso
  es la columna `congregations.invitation_code` (ej. `BC783DD3`). Se descartan
  `create_access_code` y `redeem_access_code`; se reutilizan los RPCs existentes
  `preview_congregation` y `join_congregation`. `JoinCongregationPanel` vuelve a
  ser válido y se adaptará al modal de R7.
- 2026-11-17: **Implementación de R7**: RPC `get_my_membership()` (SQL + servicio),
  `useMemberHome` con estado de membresía, `AccessRequiredModal`, `QrScannerPanel`
  (BarcodeDetector + fallback), `AccessRequiredView` y ruta `/acceso` sin Layout.
  `MemberHomeView` redirige a `/acceso` cuando no hay membresía. Sigue pendiente
  la migración de Firebase a Supabase Auth para que `auth.uid()` exista.
- 2026-11-17: `npm run typecheck` y `npm run build` pasan tras la implementación
  de R7 (mismos warnings preexistentes de chunk y dynamic import). Se ajustó el
  modal a MUI v9: ya no existe `disableEscapeKeyDown`, se omite `onClose`.
- 2026-11-17: **Migración de auth a Supabase Auth (Google)**: mismo proveedor,
  nueva sesión. `loginWithGoogle` usa `signInWithOAuth` con redirect a `/login`;
  `AuthProvider` usa `getSession()` + `onAuthStateChange`; nuevo `mapAuthUser`;
  `logout` usa `signOut()`. Se actualizó `PrincipalView`, `Layout` y el store.
  Queda como paso manual habilitar el provider y las redirect URLs en Supabase.
  `npm run typecheck` y `npm run build` pasan; el bundle bajó ~98 kB al salir
  Firebase del código activo (la dependencia sigue instalada, sin uso).
- 2026-11-17: **Guard global de R7**: al entrar con Google se aterrizaba en `/`
  y se veían todas las pantallas. Se agregó `src/app/MemberAccessGuard.tsx`
  alrededor de las rutas con `Layout`, dejando `/acceso` afuera. El login de
  congregación (RPC, sin sesión Auth) no se ve afectado. `npm run build` pasa.
- 2026-11-17: **Revisión R1 (punto 4)**: se detectaron dos `join_congregation`
  divergentes y falta de `unique (user_id)`. Se alinearon en `redil_schema.sql`
  y se agregó la migración idempotente `rpcs/enforceR1.sql`. Hallazgos completos
  en la sección 10.2.
- 2026-11-17: **Code del tenant (primera vista del paso 7)**: sesión del tenant
  persistida en `CongregationStore`, `MemberAccessGuard` tenant-aware, ruta
  `/code`, ícono/nav `qr` solo para tenant, y `CodeView` con QR + copiar. El
  `invitation_code` del QR es el mismo texto que el escáner canjea. `npm run
  typecheck` y `npm run build` pasan (se instaló `qrcode.react@4.2.0`).
- 2026-11-17: **Tab limitado a las vistas definidas**: el menú pasó de 8 a 6
  entradas (Home, Perfil, Ajustes, Biblia, Calendario + Code solo tenant). Se
  crearon `ProfileView`, `BibleView` y `CalendarView` con sus rutas; las viejas
  rutas quedaron como atajos internos. La tabbar se adaptó a 5/6 columnas.
  `npm run typecheck` y `npm run build` pasan.
- 2026-11-17: **Cabecera + miembros del tenant + Ajustes**: se reemplazó el
  rótulo "Mi hola" por el nombre real de la sesión; se agregó token de sesión de
  tenant (`rpcs/tenantAdmin.sql`) para listar sus miembros desde Supabase; y se
  reemplazó Ajustes por contraseña/foto/banner/bio + CRUD de
  ministerios/grupos/usuarios. `npm run typecheck` y `npm run build` pasan.
- 2026-11-17: **Diagnóstico del 404 de `get_my_membership`** (sección 8.11):
  consulta directa a Supabase confirmó `PGRST202` (función ausente) mientras el
  resto de los RPCs del tenant sí existen. Falta ejecutar `getMyMembership.sql`.
  El servicio ahora no llama sin sesión Auth y traduce el error; el guard muestra
  el motivo con **Reintentar** en vez de redirigir en silencio.
- 2026-11-17: **Diagnóstico del 400 de `list_congregation_members`** (sección
  8.12): el token de sesión del tenant es rechazado por `P0001`. Se agregó
  `isTenantSessionError` y `TenantSessionAlert` para ofrecer reingreso en vez de
  dejar un error crudo en consola.
- 2026-11-18: **Vinculación miembro <-> tenant** (sección 8.13): verificados los
  RPCs en la base real y creado `rpcs/memberJoinFix.sql` para garantizar el
  trigger de perfil y el alta de membresía aunque el esquema se haya aplicado
  por partes. Documentado el paso a paso de prueba y las consultas de control.
- 2026-11-18: **Contador real y rol sincronizado** (sección 8.14): el Home del
  tenant cuenta los miembros desde Supabase en vez de IndexedDB; `IUser.rol`
  dejó de ser un número fijo y se toma de `get_my_membership()`.
- 2026-11-18: **Fix 42804 en `list_congregation_members`** (sección 8.15):
  `auth.users.email` es `varchar(255)` y la función devolvía `text`. Creado
  `rpcs/fixListMembersEmail.sql`. Explicado por qué el error estaba tapado.
- 2026-11-18: **Capacidades (L)** (sección 8.16): alcance por ministerio con
  `ministry_role`, RPCs que validan `leads_ministry`, vista `/ministerios` y
  designación de líderes desde Ajustes. Falta ejecutar el SQL en la base.
- 2026-11-18: **Correcciones posteriores a la prueba** (sección 8.17): badges
  de color por rol, se eliminó el líder "de nada" (el rol solo se da dentro de
  un ministerio) y Ajustes pasó a tener ABM completo de ministerios/grupos.
  Re-ejecutar `leaderCapabilities.sql`.
- 2026-11-18: **Alta de ministerios desde el Perfil del tenant** (sección 8.18):
  formulario inline en el Perfil, reutilizando `create_tenant_ministry`.
- 2026-11-18: **Perfiles visitables / red social** (sección 15): directorio de
  perfiles propios y externos con reglas de verificación, flag de anuncios
  compartidos y RPCs correspondientes. Storage/selector de archivos queda para
  el final, según la nota de `rulesView.md`.

---

## 13. Hoja de ruta acordada (2026-11-17)

Trabajar **por partes**, en este orden:

| # | Paso | Estado | Detalle |
|---|------|--------|---------|
| 1 | Inicio de sesión con Google **solo para usuarios/miembros** | ✅ | Supabase Auth (Google OAuth) + `AuthProvider` + guard R7. |
| 2 | Registro e inicio de sesión para **tenants** (congregaciones) | ✅ | RPCs `create_congregation` / `login_congregation` con `vify`. |
| 3 | Verificación de miembro para ser parte de una congregación | ✅ | `invitation_code` → `join_congregation()` → `memberships` → modal R7 resuelto. |
| 4 | Asegurar que cada tenant tenga sus miembros vinculados **sin mezclarse** | ⚠️ **En revisión** | Hallazgos y corrección SQL en la sección 10.2. Falta ejecutar `enforceR1.sql` en la base real. |
| 5 | Proceso de **desvinculación** de un miembro de un tenant (backoffice) | 📝 Documentar | Solo documentación por ahora: no implementar UI ni RPC todavía. |
| 6 | Proceso de **verificación de un tenant** (`vify: false → true`) | ⬜ Falta | Definir quién lo ejecuta (backoffice/admin) y con qué RPC; hoy `login_congregation` bloquea a los no verificados. |
| 7 | Desarrollo de **pantallas para usuarios y tenants** | 🔄 En curso | Reglas en `src/supabase/rulesView.md` (sección 14). **Code del tenant ✅** (8.8), **Perfil/Ajustes ✅**, **capacidades (L) ✅ en código, pendiente de ejecutar SQL** (8.16). Siguen: Home según reglas (anuncios + versículo), Calendario con fechas asignadas y revisar el scope offline por tenant (hallazgo 5 de 10.2). |

---

## 14. Reglas de vistas por perfil (`src/supabase/rulesView.md`)

### Glosario

| Término | Definición |
|---------|------------|
| tenant | congregación |
| ministerio | grupo de alta jerarquía de una congregación; gestiona actividades normativas del culto/servicio |
| grupo | grupo de menor jerarquía de una congregación; gestiona actividades internas |
| líder | usuario designado por la congregación que puede crear/alterar/leer/eliminar información de **su** ministerio o grupo y sumar/quitar miembros. Puede liderar varios. |
| miembro | usuario perteneciente a una congregación; solo gestiona su propio perfil dentro de los alcances permitidos |

**Premisa:** todos los miembros acceden de la misma forma; los roles y alcances **los define exclusivamente el tenant** al que están asociados. Un usuario puede pertenecer a varios ministerios/grupos, pero un ministerio o grupo pertenece a **un solo tenant**. La marca **(L)** significa que un líder tiene esa misma capacidad, limitada a lo que lidera.

### Matriz de vistas

| Vista | Tenant | Usuario / miembro |
|-------|--------|-------------------|
| **Home** | Anuncios + versículo del día | Anuncios + versículo del día |
| **Perfil** | Foto, nombre, alta de ministerios/grupos, miembros del tenant, bio | Foto, nombre, ministerios/grupos a los que pertenece, bio |
| **Ajustes** | Contraseña, foto, banner, bio, CRUD de ministerios/grupos/usuarios (L: solo lo que lidera) | Contraseña, foto, banner, bio |
| **Biblia** | Módulo no definido, pero presente | Módulo no definido, pero presente |
| **Calendario** | Fechas importantes + agenda para asignar fechas a un miembro (L) | Calendario + fechas asignadas por un líder |
| **Code** (solo tenant) | Generar QR y ver el `invitation_code` | — |

**Tab / menú (2026-11-17):** `Layout.tsx` muestra **solo** estas pantallas, en
este orden: Home (`/`), Perfil (`/perfil`), Ajustes (`/ajustes`), Biblia
(`/biblia`), Calendario (`/calendario`) y Code (`/code`, únicamente tenant).
Las rutas heredadas (`/congregacion`, `/miembro`, `/miembros`, `/eventos`,
`/avisos`) siguen vivas como atajos internos desde el Home, el Perfil y los
guards, pero **ya no aparecen en el tab**. La tabbar pasó de 5 columnas fijas a
columnas automáticas para adaptarse a 5 tabs (miembro) o 6 (tenant).

### Condicionamientos técnicos para implementarlas

1. **El tenant no tiene sesión de Supabase Auth.** El login de congregación es un RPC con password: `auth.uid()` es `null`, así que las vistas de tenant **no pueden usar** `get_my_membership()`. ✅ Resuelto: `loginWithCongregation()` persiste lo que devuelve `login_congregation` (id, name, slug, `invitation_code`, `admin_email`, `vify`) en `CongregationStore` (sección 8.8).
2. **Ministerios/grupos**: ya tienen RPCs y ABM completo (secciones 8.16 y 8.17). El tenant además crea desde su Perfil (8.18).
3. **Versículo del día y Biblia** no tienen fuente de datos definida: solo se muestra el módulo / un contenido estático por ahora.
4. **Roles**: el enum `membership_role` es `admin | leader | member`. El store del miembro toma el rol real de `get_my_membership()` (sección 8.14) y las capacidades (L) se otorgan **dentro** de un ministerio, no por el rol global (8.17).

---

## 15. Perfiles, avatares y portada (red social interna y externa)

Sección agregada por el usuario a `src/supabase/rulesView.md` (# Perfiles,
avatares y portada). Redil se extiende como red social interna y externa.

### Reglas de negocio

- **Interna:** los usuarios de un tenant pueden ver los perfiles de otros
  usuarios del **mismo tenant**: bio, información sobre su actividad y su
  relación con el tenant (`admin` / `leader` / `member`),además de sus
  ministerios y grupos.
- **Externa:** solo si el tenant está **verificado** (`vify = true`) se pueden
  ver perfiles de miembros de **otros tenants** y compartir anuncios.
- A futuro: mural/feed con posteos.
- La imagen física se guarda en un bucket de **Supabase** y se migra después a
  Cloudflare. **Lo dejamos para lo último**, según la nota original.

### Decisiones tomadas para esta primera parte

| Punto | Decisión |
|-------|----------|
| Verificación para perfiles cruzados | Deben estar verificados **ambos** tenants (el del visitante y el del perfil visitado). El helper `can_cross_tenants(from, to)` lo valida en el servidor. |
| Compartir anuncios | Flag **`share_announcements` por congregación** (default `false`). Un tenant verificado decide si sus anuncios se muestran a otros tenants. |
| Orden | Primero perfiles visitables (reglas + vista); el selector de archivos y el bucket quedan para el final. |
| Fotos y portada hoy | Siguen siendo URLs guardadas en `photo_url` / `banner_url` (las columnas ya existen). |

### Base de datos

`src/supabase/rpcs/socialProfiles.sql` (**pendiente de ejecutar**):

| RPC | Quién lo llama | Regla |
|-----|----------------|-------|
| `get_my_social_context()` | miembro | Devuelve `congregation_id`, `name`, `slug`, `vify` y `role` del usuario autenticado. |
| `can_cross_tenants(from, to)` | helper | Ambos verificados y distintos. |
| `profiles_of_congregation(cid)` | helper | Perfiles con bio, rol, ministerios/grupos y `led_count`. |
| `list_tenant_profiles(token)` | tenant | Perfiles de su congregación. |
| `list_my_tenant_profiles()` | miembro | Perfiles de la congregación del usuario. |
| `list_verified_congregations(token)` / `list_verified_congregations_for_member()` | tenant / miembro | Otras congregaciones verificadas; exige que la propia también lo esté. |
| `list_external_profiles(token, cid)` / `list_external_profiles_for_member(cid)` | tenant / miembro | Perfiles de otro tenant, validando `can_cross_tenants`. |
| `get_public_tenant_profile(token, slug)` | tenant | Perfil público de otra congregación por `slug`. |
| `list_shared_announcements(token, cid)` / `list_shared_announcements_for_member(cid)` | tenant / miembro | Anuncios del otro tenant solo si tiene `share_announcements = true`. |

### UI

- Ruta interna **`/directorio`** (no entra al tab), con dos pestañas:
  *Mi congregación* y *Otras congregaciones* (esta última deshabilitada si no
  hay verificación).
- Cada perfil muestra avatar, nombre, badge de rol, chip *Líder de N*, bio y
  los ministerios/grupos a los que pertenece.
- Al elegir otra congregación se muestran sus anuncios compartidos (si los
  habilitó) y los perfiles de sus miembros.
- Link *Explorar perfiles* desde el Perfil, para tenant y miembro.

| Archivo | Cambio |
|---------|--------|
| `src/supabase/rpcs/socialProfiles.sql` | Flag + RPCs + permisos. |
| `src/supabase/redil_schema.sql` | `share_announcements` en `congregations`. |
| `src/features/social/services/socialProfiles.ts` | Servicios RPC. |
| `src/features/social/hooks/useDirectoryView.ts` | Viewmodel del directorio. |
| `src/views/DirectoryView.tsx` | Vista pura del directorio. |
| `src/app/AppRoutes.tsx` | Ruta `/directorio`. |
| `src/views/ProfileView.tsx` | Link *Explorar perfiles*. |

**Estado:** `typecheck` ✅. Falta ejecutar `socialProfiles.sql` en Supabase SQL
Editor. El bucket y el selector de archivos siguen pendientes (último paso).

---

## 16. Ajustes pedidos antes del bucket (2026-11-18)

### 16.1 Conteos del Home en localStorage

El Home de la congregación muestra ahora, además de *Miembros*, *Eventos
próximos* y *Avisos*, dos tarjetas nuevas: **Ministerios** y **Grupos**.

Para no consultar Supabase en cada render:

- Los conteos se guardan en `localStorage` con clave `redil-stats`, por
  `congregation_id` (`src/store/StatsStore.ts`): `members`, `ministries`,
  `groups` y `cachedAt`.
- `useCongregationStats()` solo llama a los RPCs (`list_congregation_members` +
  `list_tenant_ministries`) **si no hay cache** para esa congregación.
- El botón *Actualizar conteos* del Home fuerza un refresco manual.
- Un login nuevo de congregación invalida la cache de ese `congregation_id`.
- Las mutaciones que cambian los totales (crear/editar/eliminar ministerio o
  grupo, desde Perfil o Ajustes) actualizan la cache al terminar.
- Asignar/quitar integrantes cambia `member_count` del grupo, pero no los
  conteos globales del Home, así que no fuerza refetch.

### 16.2 Edición de perfil dentro de Perfil

La edición de **contraseña, bio, foto y portada** salió de Ajustes y vive en un
modal que se abre desde el Perfil:

- Botón de ícono **Editar** en el encabezado.
- Ícono de cámara sobre la **portada** y sobre la **foto**; cada uno abre el
  modal enfocado en ese campo.
- Modal con pestañas *Perfil* y *Contraseña* (`ProfileEditDialog.tsx`).
- La lógica está en `useProfileEditor.ts` y reutiliza los RPCs existentes
  (`update_tenant_profile` / `update_my_profile`, `change_tenant_password` /
  `supabase.auth.updateUser`).
- Ajustes quedó solo con ABM de ministerios/grupos, integrantes y roles, y un
  aviso con link *Ir a Perfil*.

Mientras no se habilite el bucket, los campos de imagen siguen siendo URLs;
el helper text del modal ya anticipa el futuro selector de archivos.

### 16.3 Iconografía

Se centralizó en `EntityIcon.tsx`:

- Íconos por tipo: **miembros**, **ministerios**, **grupos**, **eventos** y
  **avisos** (`ENTITY_ICONS`).
- Opciones para `ministries.icon` (`MINISTRY_ICON_OPTIONS`): ministerio, grupo,
  música, palabra, niños, caridad, casa, enseñanza, medios y servicio.
- Si una congregación no guardó una clave de ícono, se usa el ícono del tipo.
- Se usan en el Home, el Panel de congregación, Perfil, Directorio, Ajustes y
  la vista (L) de ministerios. En Ajustes y (L) el ícono se elige con un select
  que muestra cada opción.

### 16.4 Lenguaje para el usuario final

*Tenant* sigue siendo el nombre técnico (código, stores, RPCs, comentarios),
pero en la UI se dice **congregación**. Se corrigieron los textos visibles del
Perfil (*Miembros de la congregación*) y del Directorio (*otras congregaciones*,
*verificación de la congregación*).

| Archivo | Cambio |
|---------|--------|
| `src/store/StatsStore.ts` | Cache persistida de conteos. |
| `src/features/congregations/services/congregationStats.ts` | Cálculo y refresh de conteos. |
| `src/features/congregations/hooks/useCongregationStats.ts` | Hook con cache. |
| `src/features/dashboard/hooks/useDashboardView.ts` | Conteos cacheados + totales de ministerios/grupos. |
| `src/views/DashboardView.tsx` | Tarjetas nuevas, botón de actualizar e íconos. |
| `src/features/congregations/components/EntityIcon.tsx` | Íconos compartidos. |
| `src/features/profile/hooks/useProfileEditor.ts` | Lógica del modal de edición. |
| `src/features/profile/components/ProfileEditDialog.tsx` | Modal de edición. |
| `src/views/ProfileView.tsx` | Botón de editar, cámaras, portada e íconos. |
| `src/features/settings/hooks/useAccountSettings.ts` | Ajustes sin edición de perfil. |
| `src/views/SettingsView.tsx` | Ajustes + selector de íconos. |
| `src/views/MinistriesView.tsx` | Íconos en la vista (L). |
| `src/views/DirectoryView.tsx` | Íconos y lenguaje "congregación". |
| `src/supabase/login.ts` | Invalida la cache al iniciar sesión. |

### 16.5 Errores relevados al probar

- **Warning de foco en el Perfil:** al abrir el modal desde el ícono de cámara,
  el botón seguía enfocado mientras MUI ponía `aria-hidden` en `#root`. Se hace
  `blur()` del elemento activo antes de abrir el diálogo.
- **`400` en `list_verified_congregations`:** el body real era
  `42702 column reference "id" is ambiguous`. Varios RPCs de
  `socialProfiles.sql` tenían columnas `id` sin calificar dentro de funciones
  `RETURNS TABLE (id, …)`, donde `id` también es una variable de salida. Se
  calificaron todas (`c.id`, `c.vify`, `c.share_announcements`) y se cambió el
  mensaje *"otros tenants"* por *"otras congregaciones"*. Hay que **volver a
  ejecutar `socialProfiles.sql`** para que el fix llegue a la base.

### 16.6 Home, Perfil, Ajustes y Calendario (último pedido)

- **Home (`DashboardView`):** quedó reducido a las tarjetas que son enlaces
  directos a cada sección: Miembros, Ministerios, Grupos, Eventos y Avisos
  (3 para miembros, 5 para congregación). El greeting y el nombre de la sesión
  siguen arriba; el refresh manual solo para la congregación. Los listados de
  eventos/avisos viven en sus vistas y en el Calendario.
- **Perfil (`ProfileView`):** identidad, biografía, ministerios y grupos se
  muestran juntos en una sola tarjeta, con la portada y el avatar con sus
  cámaras. La congregación además crea ministerios/grupos ahí y ve un bloque de
  Miembros con acceso a `/miembros`. El líder ve el chip *Líder de N* y el
  acceso a *Gestionar mis ministerios*. La edición sigue pasando por
  `useProfileEditor`.
- **Ajustes (`SettingsView`):** la sección **Miembros** es la primera del panel
  de la congregación, con ícono `EntityIcon kind="members"`, el conteo
  `vm.members.length` y un link a `/miembros`. Debajo quedan Ministerios y
  grupos con su ABM; el rol global se sigue editando en la sección Miembros y
  el liderazgo dentro de cada ministerio/grupo.
- **Calendario (`CalendarView` + `useCalendarView`):** grilla mensual local
  (42 celdas, arrancando en lunes), navegación entre meses, *Ir a hoy* y contador
  de actividades por día. Al seleccionar una fecha se abren las acciones sobre
  ese día: **Nueva actividad**, editar o eliminar. El formulario
  (`EventFormDialog`) tiene campos separados **Fecha** y **Horario**, más
  duración, lugar y descripción; al crear desde una fecha del calendario usa
  ese día por defecto y la próxima hora redonda. Todo sale del repo local
  (`listEvents` / `saveEvent` / `deleteEvent`) y la view sigue siendo pura.

| Archivo | Cambio |
| --- | --- |
| `src/views/DashboardView.tsx` | Home con solo cards enlaces. |
| `src/views/ProfileView.tsx` | Perfil unificado con ministerios/grupos. |
| `src/views/SettingsView.tsx` | Sección Miembros destacada primero. |
| `src/views/CalendarView.tsx` | Calendario mensual con acciones por fecha. |
| `src/features/calendar/hooks/useCalendarView.ts` | Viewmodel nuevo del calendario. |
| `src/features/events/components/EventFormDialog.tsx` | Fecha y Horario separados. |
| `src/lib/format.ts` | Helpers de fecha/hora (`toDateInputValue`, `toTimeInputValue`, `fromDateAndTime`, `nextHourTimeValue`). |

### 16.7 Ministerios se gestiona en Ministerios, no en Ajustes

El card *Ministerios* del Home ya apuntaba a `/ministerios`, pero esa vista
mandaba a Ajustes. Se invirtió: **`/ministerios` es la única vista de gestión**
y Ajustes solo administra miembros.

- **Vista (`MinistriesView`):** a la izquierda, el listado con el **ícono
  asignado** (`EntityIcon` con `iconKey`), el tipo (ministerio/grupo) y la
  cantidad de miembros. A la derecha, el detalle del seleccionado: nombre,
  tipo, ícono, **quién es el líder** y sus **integrantes**, con acciones de
  alta/edición/baja, cambio de rol y sumar/quitar personas — todo en la misma
  pantalla, sin ir a Ajustes.
- **Alcance:** la congregación ve todos los ministerios y puede crearlos,
  editarlos y borrarlos; el líder ve solo los que lidera (`get_my_ministries`
  filtrado por `is_leader`) y puede editar nombre/ícono e integrantes. El líder
  se deriva del integrante con `ministry_role = 'leader'`, sin RPC nuevo.
- **Sin permisos en la vista:** `ministryActions.ts` elige el RPC según la
  sesión (token de congregación vs. `auth.uid()` del líder). La vista solo
  presenta lo que devuelve `useMinistriesManagement`.
- **Ajustes:** conserva *Miembros* como sección principal y agrega un acceso
  *Ir a Ministerios*. Se simplificó `useAccountSettings` (ya no tiene ABM) y se
  eliminó el viejo `useMinistriesView`. El link de *Administrar* en el Perfil
  ahora apunta a `/ministerios`.
- **Reglas aplicadas:** vistas puras, componentes separados en
  `features/congregations/components` y `features/settings/components`, hooks
  de carga/acciones por separado, y **ningún archivo tocado supera las 100
  líneas** (verificado con un conteo sobre todos los archivos del cambio).

| Archivo | Cambio |
| --- | --- |
| `src/views/MinistriesView.tsx` | Vista única de gestión de ministerios. |
| `src/views/SettingsView.tsx` | Solo miembros + acceso a Ministerios. |
| `src/views/ProfileView.tsx` | Link a Ministerios. |
| `src/features/congregations/hooks/useMinistriesData.ts` | Carga unificada tenant/líder. |
| `src/features/congregations/hooks/useMinistryCrud.ts` | Formularios y ABM. |
| `src/features/congregations/hooks/useMinistriesManagement.ts` | Viewmodel compuesto. |
| `src/features/congregations/hooks/useActionRunner.ts` | Patrón busy/notice compartido. |
| `src/features/congregations/services/ministryActions.ts` | Adaptador de RPCs por sesión. |
| `src/features/congregations/components/Ministry*` | Listado, detalle, integrantes, alta e ícono. |
| `src/features/settings/hooks/useAccountSettings.ts` | Solo roles globales de miembros. |
| `src/features/settings/components/*` | Secciones de Ajustes separadas de la vista. |

### 16.8 Selector de íconos sin etiquetas

En `MinistryIconSelect` (usado por `MinistryDetail`) el desplegable mostraba
ícono **y** el nombre de cada opción (*Música*, *Palabra*, etc.), además del
texto *Predeterminado*. Ahora cada `MenuItem` muestra **solo el glifo**: se
quitaron `ListItemIcon`/`ListItemText` y se centró la celda. El nombre queda
como `aria-label` para lectores de pantalla, y la opción por defecto usa un
ícono de *restablecer* en lugar de texto. El ancho del campo se achicó a 96 px
y la etiqueta del campo queda fija (`shrink`) para que no se superponga cuando
no hay ícono elegido.

| Archivo | Cambio |
| --- | --- |
| `src/features/congregations/components/MinistryIconSelect.tsx` | Opciones con solo ícono; `aria-label` para accesibilidad. |

### 16.9 Acciones por ministerio y modal de edición

El listado de ministerios/grupos estaba bien, pero no tenía acciones sobre
cada ítem y la edición era un formulario inline. Ahora:

- **Listado (`MinistryList`):** cada fila tiene un ícono de **editar** y otro de
  **borrar** (este último solo para la congregación). El clic en el nombre
  sigue seleccionando el ministerio para ver su detalle.
- **Modal (`MinistryEditDialog` / `MinistryEditForm`):** al editar se abre un
  diálogo con **nombre, ícono** (selector de solo glifos), **tipo** (solo
  congregación), **líder**, la lista de **integrantes** con cambio de rol y
  botón *Quitar*, y el alta para **sumar miembros**. Guardar aplica nombre/tipo/
  ícono; rol, líder y altas se aplican al elegirlos, como antes.
- **Líder:** `handleLeader` baja al líder anterior a `member` y sube al nuevo a
  `leader` en una sola operación; se puede dejar *Sin líder*. Vale para
  ministerios y grupos por igual, ya que comparten el mismo componente.
- **Detalle lateral:** pasó a solo lectura (ícono, nombre, tipo, líder e
  integrantes) con su propio botón *Editar* que abre el mismo modal. Así no
  hay dos formularios compitiendo.
- El borrado sigue pasando por `ConfirmDialog` y cierra el modal si el
  ministerio eliminado era el que se estaba editando.

| Archivo | Cambio |
| --- | --- |
| `src/views/MinistriesView.tsx` | Vista pura con listado, detalle y modal. |
| `src/features/congregations/hooks/useMinistryCrud.ts` | `editingId`, `openEdit`/`closeEdit` y `handleLeader`. |
| `src/features/congregations/hooks/useMinistriesManagement.ts` | Abre el modal sincronizando la selección. |
| `src/features/congregations/components/MinistryList.tsx` | Iconos de editar/borrar por fila. |
| `src/features/congregations/components/MinistryEditDialog.tsx` | Modal contenedor. |
| `src/features/congregations/components/MinistryEditForm.tsx` | Formulario del modal. |
| `src/features/congregations/components/MinistryEditModal.tsx` | Conexión modal ↔ viewmodel. |
| `src/features/congregations/components/MinistryLeaderSelect.tsx` | Selector de líder. |
| `src/features/congregations/components/MinistryDetail.tsx` | Detalle de solo lectura. |
| `src/features/congregations/components/MinistryMemberList.tsx` | Modo `readOnly` para el detalle. |
| `src/features/congregations/components/MinistryMembersPanel.tsx` | Resumen sin acciones. |

**Estado:** `typecheck` ✅ y `build` ✅ (con el warning preexistente de chunk
>500 kB). Todos los archivos del cambio tienen ≤ 100 líneas. Según el usuario,
`leaderCapabilities.sql` y `socialProfiles.sql` ya fueron ejecutados en
Supabase. Queda para el final el bucket de Storage y el selector de archivos
para foto/portada.

### 16.10 Lista visible de miembros para sumar y exclusión de líderes

En el modal de Ministerios/Grupos el alta seguía siendo un desplegable
(`MinistryAddMember`) que no listaba a los miembros de la congregación. Se
reemplazó por una **lista visible** con un botón *Sumar* por fila.

- **`MinistryCandidateList`:** muestra nombre, apellido y correo de cada
  candidato. Filtra a los que ya pertenecen al ministerio (`assignedIds`) **y a
  quienes son líderes** (`member.role !== 'leader'`). Si no queda nadie,
  explica el motivo en vez de mostrar un selector vacío.
- **Un líder no se puede sumar como miembro:** ya tiene alcance (L) en su
  ministerio; el filtro se aplica antes de renderizar, en el componente, para
  que ni siquiera aparezca la opción. Aplica igual a ministerios y grupos.
- **`handleAdd(userId: string)`:** recibe el `user_id` directamente desde la
  fila; se sacó el estado `candidateId` y el mensaje de error del selector
  viejo. `useActionRunner` quedó solo con `notice`/`busy`/`run`/`setNotice`
  (se eliminó el helper `fail`, que ya no se usa).
- **Fix de mapeo:** `listLeadersCongregationMembers` devolvía el `role` real del
  RPC pero se hardcodeaba como `'member'`. Se extrajeron los mapeos a
  `ministryMappers.ts` y ahora `ministryRole(row.role)` conserva `leader`, que
  es lo que permite el filtro anterior.

| Archivo | Cambio |
| --- | --- |
| `src/features/congregations/components/MinistryCandidateList.tsx` | Lista visible; excluye asignados y líderes. |
| `src/features/congregations/components/MinistryEditForm.tsx` | Usa la lista en lugar de `MinistryAddMember`. |
| `src/features/congregations/components/MinistryEditModal.tsx` | Sin `candidateId`/`onCandidate`. |
| `src/features/congregations/hooks/useMinistryCrud.ts` | `handleAdd(userId)`; sin `candidateId` ni `fail`. |
| `src/features/congregations/hooks/useActionRunner.ts` | Se removió `fail`. |
| `src/features/congregations/services/leaderMinistries.ts` | Mapea el `role` real vía mappers. |
| `src/features/congregations/services/ministryMappers.ts` | Mappers extraídos (≤ 100 líneas). |
| `src/features/congregations/components/MinistryAddMember.tsx` | Eliminado. |

**Estado:** `typecheck` ✅ y `build` ✅ (con el warning preexistente de chunk
>500 kB). Todos los archivos del cambio tienen ≤ 100 líneas. Verificado con
`curl` que `list_congregation_members` devuelve HTTP 200 con los miembros, así
que el problema era de UI/mapeo, no de RPC. Falta probar en navegador la lista
del modal, el filtro de líderes y el alta/baja.

### 16.11 Toast de actualización con tipo y nombre

Al guardar la edición, el toast decía genérico *«Ministerio o grupo
actualizado.»*. Ahora `handleSave` arma el texto con el **tipo y el nombre
vigentes en el formulario**:

- `ministerio {nombre} actualizado`
- `grupo {nombre} actualizado`

Se usa `editName.trim()` (el mismo valor que se persiste) y `editIsGroup` para
elegir el tipo, de modo que si se cambió el tipo o el nombre en el modal, el
mensaje refleja lo recién guardado. El alta sigue con su mensaje propio
(*«Ministerio creado.»* / *«Grupo creado.»*).

| Archivo | Cambio |
| --- | --- |
| `src/features/congregations/hooks/useMinistryCrud.ts` | `handleSave` compone el toast con tipo + nombre. |

**Estado:** `typecheck` ✅ y `build` ✅ (con el warning preexistente de chunk
>500 kB). El archivo tiene 94 líneas (≤ 100).

### 16.12 `rulesView.md`: foto de perfil y portada

Se actualizó la sección *Foto de perfil y portada* de `src/supabase/rulesView.md`,
que estaba reducida a una línea con la aclaración *«(pendiente)»*. Ahora queda
dividida en:

- **Estado actual:** foto, portada y bio se editan desde el modal de Perfil
  (pestaña *Perfil*), hoy como URLs de texto persistidas por RPC
  (`update_my_profile` / `update_tenant_profile`). El miembro con Google arranca
  con la foto de su cuenta y puede reemplazarla.
- **Reglas:** cada perfil solo cambia su propia imagen (ser líder no habilita
  cambiar la de otros); la congregación cambia su imagen del directorio y el
  miembro la suya; visibilidad en Perfil y perfiles visitables (mismo tenant
  siempre, cross-tenant solo con ambos `vify`); todo pasa por viewmodel + RPC;
  placeholders cuando falta foto o portada.
- **Pendiente:** selector de archivos con preview, bucket de Supabase Storage
  (referencia en base), migración posterior a Cloudflare y opción de usar
  imágenes de Unsplash por URL para la portada.

También se ajustó el ítem 1 de *Cambios* para aclarar que el selector y el bucket
son el paso pendiente, y la nota de *LO DEJAMOS PARA LO ULTIMO* para vincularlo
con ese selector.

| Archivo | Cambio |
| --- | --- |
| `src/supabase/rulesView.md` | Sección *Foto de perfil y portada* desarrollada. |

**Estado:** cambio documental; no afecta compilación. Sin cambios de código.

### 16.13 Congregación visible en el perfil

Nueva regla de *Usuarios*: todo perfil de miembro debe mostrar a qué
congregación pertenece, con dos textos según quién mire:

- **El propio miembro** (`/perfil`): solo el nombre, p. ej. *Nueva vida*.
- **Otra persona que visita el perfil** (tarjetas del directorio): *Pertenece a
  {nombre de la congregación}*.

Implementación:

- `ProfileCongregationLine` es el componente presentacional reutilizable: recibe
  `name`, `visiting` y `sx`; con `visiting` antepone «Pertenece a». Devuelve
  `null` si no hay nombre.
- `useProfileView` carga `getMyMembership()` (solo para miembros) y expone
  `congregationName` con `membership.data?.name`. No se agregó ningún RPC: la
  membresía ya traía el nombre.
- `ProfileView` muestra el nombre del titular y deja «Congregación» para el
  tenant. `DirectoryView` pasa `ownCongregationName` en la pestaña *Mi
  congregación* y `selectedCongregation.name` en *Otras congregaciones*, con
  `visiting` para que diga «Pertenece a …».
- La regla también quedó registrada en `src/supabase/rulesView.md`, sección
  *Usuarios*.

| Archivo | Cambio |
| --- | --- |
| `src/features/profile/components/ProfileCongregationLine.tsx` | Nuevo componente (22 líneas). |
| `src/features/profile/hooks/useProfileView.ts` | Carga la membresía y expone `congregationName`. |
| `src/views/ProfileView.tsx` | Línea de congregación del titular. |
| `src/features/social/hooks/useDirectoryView.ts` | Expone `ownCongregationName`. |
| `src/views/DirectoryView.tsx` | «Pertenece a …» en las tarjetas. |
| `src/supabase/rulesView.md` | Regla agregada en *Usuarios*. |

**Estado:** `typecheck` ✅ y `build` ✅ (con el warning preexistente de chunk
>500 kB). El componente nuevo tiene 22 líneas; los demás archivos tocados ya
superaban las 100 líneas antes de este cambio (deuda preexistente informada en
la verificación del 21/11) y crecieron pocas líneas. Sin cambios de SQL.

### 16.14 Avisos persistidos en `news` y visibilidad por `is_global`

Pedido: solamente la congregación (tenant) puede crear, editar y borrar avisos;
el miembro nunca ve *Nuevo aviso*. Los avisos dejan de vivir en IndexedDB y pasan
a guardarse en `public.news`, dentro del apartado *Avisos* del tenant y del Home
del miembro.

**SQL**

- `src/supabase/rpcs/newsAnnouncements.sql` es nuevo e idempotente. Crea (si
  falta) `news.is_global boolean not null default false` y define seis RPCs:
  `list_tenant_news(p_token)` (todos los del tenant, globales y privados),
  `create_tenant_news`, `update_tenant_news` y `delete_tenant_news` (CRUD con
  `tenant_from_token`, siempre limitado a `congregation_id` y con
  `created_by = null` porque la congregación no tiene `auth.uid()`),
  `list_my_news()` (todos los avisos de la congregación del miembro) y
  `list_public_news(p_congregation_id)` (solo `is_global = true`).
- `src/supabase/rpcs/socialProfiles.sql`: los dos listados de anuncios
  compartidos entre tenants ahora filtran `and n.is_global`, para que un aviso
  privado nunca se filtre a otra congregación.
- `src/supabase/redil_schema.sql`: la tabla `news` documenta la columna
  `is_global boolean not null default false`.

**Front**

- `newsService.ts` (90 líneas) concentra los seis RPCs y el mapeo `snake_case` →
  `camelCase`; reemplaza a `lib/repo` para avisos, que sigue usándose solo en
  backup y en pantallas heredadas.
- `useAnnouncementsView.ts` (82 líneas) elige el loader según la sesión y expone
  `canManage`. El tenant administra por token; el miembro solo lee. Después de
  crear, editar o borrar llama a `refreshCongregationStats()` para que el
  contador del Home quede alineado con la DB.
- `NewsCard.tsx` (48) y `NewsFormDialog.tsx` (73) son componentes nuevos: el
  formulario incluye el checkbox *Público (visible para todos)* y el texto
  aclaratorio de que sin marcarlo lo ven solo los miembros.
- `AnnouncementsView.tsx` (82) queda como view pura: el botón *Nuevo aviso* y
  las acciones de editar/borrar se renderizan solo cuando `canManage`.
- `MemberHomeView.tsx` y `useMemberHome.ts` muestran los últimos avisos con
  `NewsCard`, cargados por `listMyNews()`. `useMemberHome` bajó a 61 líneas al
  extraer `useMemberJoin.ts` (66) con el canje del `invitation_code`.
- `useDashboardView.ts` (47): el tenant toma `announcementsCount` de la cache de
  conteos y el miembro lo toma de `list_my_news()`. No queda ninguna lectura de
  avisos desde IndexedDB en el Home.
- `StatsStore.ts`, `congregationStats.ts` y `useCongregationStats.ts` suman la
  clave `announcements`. El merge `{ ...EMPTY, ...stats }` tolera caches
  persistidas antes de este cambio, que no tenían esa clave.
- Se eliminaron `AnnouncementCard.tsx` y `AnnouncementFormDialog.tsx`, que ya no
  tenían consumidores.
- `src/supabase/rulesView.md` incorpora la sección *Avisos* con quién puede
  publicar y el significado de `is_global`.

| Archivo | Cambio |
| --- | --- |
| `src/supabase/rpcs/newsAnnouncements.sql` | CRUD de `news` por token + lecturas por miembro y pública. |
| `src/supabase/rpcs/socialProfiles.sql` | Anuncios compartidos filtrados por `is_global`. |
| `src/supabase/redil_schema.sql` | `news.is_global` documentado. |
| `src/features/announcements/services/newsService.ts` | Service RPC de avisos (nuevo). |
| `src/features/announcements/hooks/useAnnouncementsView.ts` | Viewmodel con `canManage` y refresh de stats. |
| `src/features/announcements/components/NewsCard.tsx` | Card presentacional (nueva). |
| `src/features/announcements/components/NewsFormDialog.tsx` | Formulario con flag público (nuevo). |
| `src/views/AnnouncementsView.tsx` | Alta y acciones solo para el tenant. |
| `src/features/members/hooks/useMemberHome.ts` | Avisos desde `list_my_news()`; 61 líneas. |
| `src/features/members/hooks/useMemberJoin.ts` | Canje de código extraído (nuevo, 66 líneas). |
| `src/views/MemberHomeView.tsx` | Usa `NewsCard`. |
| `src/features/dashboard/hooks/useDashboardView.ts` | Contador de avisos desde DB/cache. |
| `src/store/StatsStore.ts` | `announcements` en `CongregationCounts`. |
| `src/features/congregations/services/congregationStats.ts` | `listTenantNews()` en el conteo. |
| `src/features/congregations/hooks/useCongregationStats.ts` | `EMPTY` con avisos y merge de caches viejas. |
| `src/supabase/rulesView.md` | Regla de avisos y `is_global`. |

**Estado:** `typecheck` ✅ y `build` ✅ (con el warning preexistente de chunk
>500 kB). Todos los archivos TS/TSX tocados quedaron ≤ 100 líneas. Queda
**ejecutar en Supabase** `newsAnnouncements.sql` y re-ejecutar
`socialProfiles.sql`, volver a iniciar sesión como congregación (el token de
pruebas venció) y verificar en navegador `/avisos` y el Home del miembro.

### 16.15 Portada elegida desde Unsplash (sin escribir la URL)

Decisión del usuario: para la **foto de portada** se usa la API oficial de
Unsplash con Access Key; se descarta subir archivos físicos y se descarta
también escribir la URL a mano. La foto de perfil no cambia: sigue siendo una
URL de texto.

**Configuración**

- Agregar en `.env`: `VITE_UNSPLASH_ACCESS_KEY=...` y reiniciar Vite. La key se
  obtiene en `https://unsplash.com/oauth/applications` → *New Application*;
  el modo demo da 50 requests por hora, suficiente para el picker.
- `src/vite-env.d.ts` declara el tipo opcional de esa variable. Si falta la key,
  el picker muestra un aviso y no deja buscar; no hay campo manual de respaldo.

**Implementación**

- `services/unsplash.ts` (58 líneas): `searchUnsplash(query)` llama a
  `GET https://api.unsplash.com/search/photos` con `client_id`,
  `orientation=landscape`, `content_filter=high`, `per_page=12` y cachea cada
  término en memoria para no gastar requests al reabrir el modal. Mapea
  `urls.regular` (URL a guardar), `urls.small` (miniatura), nombre del
  fotógrafo y link de la foto.
- `hooks/useUnsplashPicker.ts` (40 líneas): maneja término, resultados,
  carga y error. La búsqueda se dispara con el botón *Buscar* o Enter; con key
  hace una carga inicial con el término `iglesia`.
- `components/UnsplashBannerPicker.tsx` (83 líneas): reemplaza el
  `TextField` de *URL de la portada*. Muestra la portada actual, grilla de
  miniaturas, borde en la seleccionada, *Quitar portada* y el crédito del
  fotógrafo con link a Unsplash cuando se elige una imagen.
- `components/ProfilePasswordForm.tsx` (30 líneas): se extrajo el formulario
  de contraseña para que `ProfileEditDialog` baje a 99 líneas. El modal sigue
  siendo la única vista de edición y no llama a Supabase ni a Unsplash.
- `ProfileEditDialog.tsx` pasa `vm.bannerUrl` al picker y recibe la URL con
  `onSelect`; el guardado sigue pasando por `useProfileEditor` →
  `update_my_profile` / `update_tenant_profile`. No hicieron falta RPCs ni
  columnas nuevas.
- `src/supabase/rulesView.md`: se actualizó la sección *Foto de perfil y
  portada*: portada por picker, foto por URL, bucket descartado para la
  portada.

| Archivo | Cambio |
| --- | --- |
| `src/features/profile/services/unsplash.ts` | Service de búsqueda en Unsplash (nuevo). |
| `src/features/profile/hooks/useUnsplashPicker.ts` | Hook del picker, con búsqueda explícita y cache (nuevo). |
| `src/features/profile/components/UnsplashBannerPicker.tsx` | Grilla de portadas, selección y crédito (nuevo). |
| `src/features/profile/components/ProfilePasswordForm.tsx` | Formulario de contraseña extraído (nuevo). |
| `src/features/profile/components/ProfileEditDialog.tsx` | Portada con picker; 99 líneas. |
| `src/vite-env.d.ts` | Tipado de `VITE_UNSPLASH_ACCESS_KEY`. |
| `src/supabase/rulesView.md` | Regla de portada por Unsplash. |

**Estado:** `typecheck` ✅ y `build` ✅ (con el warning preexistente de chunk
>500 kB). Todos los archivos TS/TSX tocados quedaron ≤ 100 líneas. Falta que
el usuario cargue la Access Key en `.env` y reinicie el servidor para probar la
búsqueda en el navegador. Pendiente no bloqueante: mostrar el crédito también
sobre la portada pública de `ProfileView` (hoy aparece al elegirla, dentro del
modal); para eso habría que persistir también `banner_credit`, que hoy no está
en la base.

### 16.16 Foto y portada separadas, ambas con Unsplash

Corrección a 16.15. El usuario cargó la Access Key (verificada: la API responde
200 para `iglesia`) y pidió tres cambios:

1. Al editar la foto no debía aparecer el selector de portada: ahora son
   secciones independientes.
2. La foto de perfil también debe elegirse desde Unsplash, no escribirse a mano.
3. El término inicial de búsqueda pasa de `iglesia` a **`paisaje`**.

**Límites aclarados:** el modo demo de Unsplash permite **50 requests/hora**;
una vez aprobada la aplicación para producción, **1000 requests/hora**. Las
imágenes servidas desde `images.unsplash.com` no consumen ese cupo. Como el
service cachea cada término por variante en memoria, la carga inicial cuesta
una request por variante y repetir el mismo término no vuelve a consultar.
Si hay muchos usuarios buscando términos distintos, el siguiente paso sería una
Edge Function con cache global.

**Cambios de código**

- `services/unsplash.ts` (65 líneas): `searchUnsplash(query, variant)` con
  `UnsplashVariant = 'photo' | 'banner'`; orientación `squarish` para foto y
  `landscape` para portada; clave de cache `${variant}:${term}`; término
  por defecto `paisaje`.
- `hooks/useUnsplashPicker.ts` (42 líneas): recibe la variante y se la pasa al
  service; mantiene búsqueda explícita por botón/Enter.
- `components/UnsplashImagePicker.tsx` (87 líneas): reemplaza a
  `UnsplashBannerPicker.tsx`, que se eliminó. Mismo flujo de búsqueda, grilla y
  crédito, con preview circular para foto y preview ancha para portada.
- `components/ProfileDetailsForm.tsx` (67 líneas): nuevo. Muestra los botones
  *Foto*, *Portada* y *Bio* y renderiza solo la sección activa, según
  `vm.focus`. Antes el modal mostraba ambos pickers/formularios juntos.
- `components/ProfileEditDialog.tsx` bajó a 56 líneas: solo compone pestañas,
  el formulario correspondiente y el cierre. El guardado sigue pasando por
  `useProfileEditor` → `update_my_profile` / `update_tenant_profile`; los campos
  que no están visibles conservan el valor ya persistido.
- `src/supabase/rulesView.md`: foto y portada con Unsplash, separación por
  secciones, término `paisaje` y límites de requests.

| Archivo | Cambio |
| --- | --- |
| `src/features/profile/services/unsplash.ts` | Variante foto/portada, orientación y cache por variante. |
| `src/features/profile/hooks/useUnsplashPicker.ts` | Hook parametrizado por variante. |
| `src/features/profile/components/UnsplashImagePicker.tsx` | Picker genérico para foto y portada (nuevo). |
| `src/features/profile/components/UnsplashBannerPicker.tsx` | Eliminado, reemplazado por el genérico. |
| `src/features/profile/components/ProfileDetailsForm.tsx` | Secciones Foto / Portada / Bio (nuevo). |
| `src/features/profile/components/ProfileEditDialog.tsx` | 56 líneas, solo compone el modal. |
| `src/supabase/rulesView.md` | Reglas y límites actualizados. |

**Estado:** `typecheck` ✅ y `build` ✅ (con el warning preexistente de chunk
>500 kB). Todos los archivos TS/TSX tocados quedaron ≤ 100 líneas. Queda
probar en el navegador: abrir *Perfil*, alternar entre *Foto* y *Portada* y
confirmar que cada picker busca con `paisaje` y guarda su propia URL.

### 16.17 Auditoría previa a la primera prueba productiva

Relevamiento solo lectura en cuatro frentes (SQL/RLS, sesiones y accesos,
carga y escalabilidad, y verificación directa en Supabase/build). **No se
modificó código de aplicación.** Es el diagnóstico previo al deploy.

#### Bloqueantes (sí o sí antes de la prueba)

1. **Key de Unsplash expuesta en el bundle (crítica).** `VITE_UNSPLASH_ACCESS_KEY`
   se inyecta en el cliente y viaja como `client_id`; verifiqué la clave literal
   dentro de `dist/assets/index-*.js`. Cualquier visitante puede robarla y agotar
   la cuota (50/h demo, 1000/h producción). Requiere mover la búsqueda detrás de
   una Edge Function o proxy con cache global; no se resuelve con ofuscación.
2. **`profiles_of_congregation()` sin validación (alta).**
   `rpcs/socialProfiles.sql:55-97` es `security definer`, con grant a
   `authenticated`, y no exige `auth.uid()`, token ni `vify`. Cualquier usuario
   Google con un `congregation_id` ajeno volca nombre, apellido, foto, bio, rol,
   ministerios y grupos de todos sus miembros. Rompe la regla de perfiles
   visitables solo dentro del tenant o entre ambos verificados.
3. **`list_public_news()` abierta (alta).** `rpcs/newsAnnouncements.sql:171-190,205`
   es `security definer` con grant a `anon`, sin exigir `vify` en ambas ni
   `share_announcements`. Cualquier anónimo lee los avisos `is_global` de
   cualquier congregación, aunque no esté verificada o haya desactivado el
   compartir.
4. **`is_leader()` mal definido (alta).** `redil_schema.sql:221-232` mira
   `memberships.role in ('admin','leader')`, no
   `ministry_members.ministry_role`. Las policies de ministerios, eventos y
   avisos (`redil_schema.sql:552-606`) dan privilegios de tenant a ese rol global
   y dejan afuera a los líderes reales de ministerio. Escalada de permisos.
5. **Definiciones en conflicto de `login_congregation` (alta).**
   `rpcs/congregation_auth.sql:74-128` y `rpcs/createCongregation.sql:65-119`
   redefinen la función sin insertar en `tenant_sessions` ni devolver
   `session_token`, pisando la versión correcta de `rpcs/tenantAdmin.sql:31-91`.
   Si se ejecutan en el orden equivocado, `login.ts:126` guarda
   `sessionToken=null` y todos los RPCs del tenant fallan. Además
   `congregation_auth.sql:92-95` usa `limit 1` sin `unique(lower(admin_email))`:
   dos congregaciones con el mismo email pueden emitir el token de otra.
6. **R1 no confirmada en la DB real (alta).** `rpcs/enforceR1.sql` (índice
   `unique(user_id)` en `memberships`) figura como pendiente. Sin ella,
   `is_member`/`shares_congregation` filtran datos de dos tenants a la vez.
   También hay que confirmar la ejecución final de `newsAnnouncements.sql` y la
   re-ejecución de `socialProfiles.sql` (eliminación del error `42702`).
7. **Sin SPA fallback configurado (alta).** No hay `netlify.toml`, `vercel.json`
   ni `_redirects`; con `BrowserRouter`, una visita directa a `/perfil` o
   `/directorio` da 404 en el host. Configurar en la plataforma de deploy.
8. **Token de prueba vencido (operativo).** El token `34c3c02d-…` devuelve
   «Sesión de congregación inválida o vencida». Hay que relogear con
   `nuevavida@gmail.com` antes de probar `/avisos` y el Home del miembro.

#### Importantes (arreglar antes o apenas arranque la prueba)

- **Logout incompleto:** `supabase/login.ts:156-163` no limpia `redil-stats`,
  IndexedDB ni el store de usuario; el próximo usuario del dispositivo ve
  contadores, miembros y eventos del anterior.
- **Token sin expiración local ni revocación:** `store/CongregationStore.ts:28-35`
  persiste `sessionToken` en `localStorage` sin `expiresAt`; `tenant_from_token`
  valida 12 h pero no revoca al cambiar clave ni revalida `vify`
  (`rpcs/tenantAdmin.sql:94-103,336-356`). La expiración se detecta por regex
  del mensaje y solo en 5 vistas.
- **Guards por sesión/rol ausentes:** `AppRoutes.tsx:50-69` usa un único
  `MemberAccessGuard`; `ProtectedRoute` solo comprueba `user || congregation`.
  `MemberAccessGuard.tsx:25,28` saltea la verificación si hay congregación
  persistida. La separación tenant↔miembro queda librada a `Boolean(congregation)`
  en cada hook.
- **Updates RLS sin restricción de columnas:** `redil_schema.sql:528-545` permite
  a un admin auto-setear `vify`/`share_announcements`/`password_hash` y mover
  `user_id`/`congregation_id`. `ministry_members_insert/delete` (`:563-568`) usan
  `is_leader()` global en vez de `leads_ministry()`.
- **`VITE_API_URL` ausente:** `repo.ts:52` lo usa y no está en `.env`; la única UI
  para configurarlo está en `pages/Settings.tsx`, que no es la ruta activa
  (`views/SettingsView.tsx`). La cola offline queda `unconfigured`.
- **`bump()` global:** `lib/hooks.ts:26,33-60` + `lib/live.ts:20-22` recargan
  *todos* los `useAsyncData` montados ante cualquier write local. Tormenta de
  RPCs al escribir.
- **Sin timeout/retry:** `supabase.ts:19` y los services no usan `AbortSignal`;
  `lib/api.ts:33-57` y `sync.ts:83-104` bloquean la cola ante el primer fallo de
  red, sin backoff.
- **Caché de contadores sin expiración:** `store/StatsStore.ts` guarda `cachedAt`
  pero `useCongregationStats.ts:32-38` nunca lo valida; cambios desde otro
  dispositivo quedan invisibles.
- **Doble fuente de verdad:** avisos/perfiles viven en RPC, miembros/eventos en
  IndexedDB (`useDashboardView.ts:23-24`); la cola `sync.ts:62-116` solo hace
  push, sin pull ni resolución de conflictos.
- **Errores crudos:** salvo `membership.ts:33-42`, los services re-lanzan
  `error.message` y no mapean 401/404/`PGRST202`; `MemberAccessGuard.tsx:32-46`
  ofrece «Reintentar» ante un 401 sin opción de re-login.

#### Seguridad base verificada ✅

- Sin `service_role`/secret keys en `.env`; sin secrets hardcoded ni
  `console.log` de tokens en `src`.
- Sin `dangerouslySetInnerHTML`, `innerHTML` ni `eval`.
- RLS bloquea el acceso directo con anon key: `congregations`, `news`,
  `memberships` y `tenant_sessions` devuelven `[]`.
- RPCs existentes y respondiendo: `list_tenant_news`, `list_my_news`,
  `list_public_news`, `list_shared_announcements`, `list_shared_announcements_for_member`,
  `update_tenant_news`, `get_my_social_context`. El 404 de
  `list_shared_announcements(p_congregation_id)` fue por un nombre de parámetro
  equivocado en la prueba; con `p_token` responde.
- `vify` en ambas congregaciones sí se exige en `list_external_profiles`,
  `list_shared_announcements*`, `get_public_tenant_profile` y
  `list_verified_congregations*`. No se exige en los dos hallazgos 2 y 3.

#### Deuda no bloqueante

`firebase@^13.3.0` (4 high en `npm audit` vía `@grpc/grpc-js`) está huérfano:
solo lo importa `src/firebase/configuration.ts`, que nadie usa. Sacarlo de
`package.json` y borrar ese archivo limpia el audit sin cambio rompiente.
También: unificar los aliases legacy `VITE_AURL_SUPABASE`/`VITE_URL_ANON`,
code splitting de rutas (chunk actual ~973 kB), caché de Unsplash con TTL,
`aria-label` en el logout y rotar el OAuth client de Google por el secret
expuesto.

**Estado:** auditoría cerrada, sin cambios de código. Próximo paso: convertir
este diagnóstico en fixes priorizados, empezando por los bloqueantes.

### 16.18 Preparación del primer deploy de producción

El usuario aclaró que la **Access Key de Unsplash es pública por diseño** (es la
Secret Key la que no se publica) y que solo sirve para recuperar imágenes. Por
eso el hallazgo 1 de 16.17 pasa a **riesgo aceptado**: el único impacto posible
es el agotamiento de la cuota (50 req/h demo, 1000 req/h aprobada), no un
acceso indebido a datos. Queda pendiente, pero **no bloquea el deploy**.

A continuación se aplicaron todos los demás ítems bloqueantes e importantes.

#### Seguridad SQL / RLS

| Archivo | Cambio |
| --- | --- |
| `src/supabase/redil_schema.sql` | R1 explícita (`unique(user_id)`), índice único `lower(admin_email)`, triggers que impiden cambiar por PostgREST `vify`, `share_announcements`, `admin_email`, `password_hash`, `invitation_code` y la identidad de una membresía; `is_admin()` definido antes que `is_leader()`; `is_leader(cid) = is_admin(cid) OR lidera algún ministerio del tenant`; `leads_ministry(uuid)`; `login_congregation` alineado con la versión canónica. |
| `src/supabase/rpcs/socialProfiles.sql` | La consulta pasó a `_profiles_of_congregation_data(uuid)` **sin grant**. El wrapper público `profiles_of_congregation(p_cid)` exige `auth.uid()` y solo permite `is_member(p_cid)` o `can_cross_tenants(mi_tenant, p_cid)`. Los 4 callers internos usan la función privada, conservando sus validaciones. |
| `src/supabase/rpcs/newsAnnouncements.sql` | `list_public_news` devuelve 0 filas si el tenant no tiene `vify` **y** `share_announcements` en true. Firma y grant a `anon` intactos. |
| `src/supabase/rpcs/tenantAdmin.sql` | `login_congregation` devuelve además `expires_at`; índice único de email; `change_tenant_password` usa el flag interno para poder escribir el hash. |
| `src/supabase/rpcs/congregation_auth.sql` y `createCongregation.sql` | `login_congregation` reescrito idéntico al canónico (token + `expires_at`), con la tabla `tenant_sessions` y el índice de email. |
| `src/supabase/redil_schema.sql` (ajuste final) | `ministries_insert` y `ministries_delete` quedaron solo para `is_admin`; `ministries_update` es `is_admin OR leads_ministry(id)`. Así un líder **no** puede crear/borrar ministerios ajenos ni editar los que no lidera. |

**Orden de ejecución en Supabase (DB nueva):**

1. `src/supabase/redil_schema.sql`
2. `src/supabase/rpcs/congregation_auth.sql`
3. `src/supabase/rpcs/createCongregation.sql`
4. `src/supabase/rpcs/tenantAdmin.sql` (canónica al final)
5. `src/supabase/rpcs/fixListMembersEmail.sql`
6. `src/supabase/rpcs/enforceR1.sql`
7. `src/supabase/rpcs/joinCongregation.sql`
8. `src/supabase/rpcs/memberJoinFix.sql`
9. `src/supabase/rpcs/getMyMembership.sql`
10. `src/supabase/rpcs/leaderCapabilities.sql`
11. `src/supabase/rpcs/socialProfiles.sql`
12. `src/supabase/rpcs/newsAnnouncements.sql`
13. `src/supabase/rpcs/fixContactsScope.sql` (alcance de contactos por ministerio; ver 16.29)
14. `src/supabase/rpcs/songbook.sql` (cancionero, flag `uses_songbook` y RPCs; ver 16.32)
15. `src/supabase/rpcs/deleteCongregation.sql` (baja de miembros y de congregación; ver 16.33)
16. `src/supabase/rpcs/pastorCongregation.sql` (datos del pastor; ver 16.37)

**En una DB que ya existe NO correr `redil_schema.sql` entero** (no es
idempotente): aplicar los cambios a mano. Antes de crear los índices únicos,
correr el diagnóstico de `enforceR1.sql` para detectar duplicados previos.

#### Sesiones y accesos

- `CongregationStore.ts`: `expiresAt`, `TENANT_SESSION_MS` (12 h),
  `isSessionExpired()` e `isTenantSessionError()` centralizados. Sesiones
  viejas sin `expiresAt` las decide el backend.
- `login.ts`: `clearTenantSession()`, `clearAuthSession()` (limpia store y
  `localStorage.user` en sync; si falla el signOut remoto fuerza el local),
  `isAuthSessionError()`, `validateCongregationSession()` y `logout()` completo
  (Auth + tenant + `redil-stats` + IndexedDB + redirect). `loginWithCongregation`
  cierra Auth antes de abrir tenant; `loginWithGoogle` baja la sesión tenant.
  Ajuste posterior: un fallo de red en la validación **no deslogea** al usuario;
  solo lo hace un error de token confirmado por el backend.
- `AuthProvider.tsx`: si hay sesión Auth, baja la de tenant (nunca coexisten).
- `MemberAccessGuard.tsx`: distingue 401/JWT (**Iniciar sesión**) de red/RPC
  ausente (**Reintentar**), sin importar Supabase directo.
- `TenantSessionAlert.tsx`: sin props = aviso global por vencimiento local;
  con `error` = aviso de vista por error del backend. Así se pueden montar
  ambos sin duplicar mensajes.
- `AppRoutes.tsx`: `ProtectedRoute` valida la sesión tenant contra
  `list_tenant_news` antes de renderizar; monta el alert global una sola vez;
  `LoginRoute` ignora sesiones vencidas localmente.
- `StatsStore.ts`: nuevo `reset()` para vaciar la caché en logout/cambio de sesión.

#### Carga, errores y escalabilidad

- `src/lib/http.ts` (nuevo): `fetchWithTimeout` (15 s) y `withAbort`.
- `src/lib/errors.ts` (nuevo): `toAppError()` traduce 401, `PGRST202`, 404,
  403, 5xx y timeout a español rioplatense.
- `src/supabase/supabase.ts`: `createClient` con `global.fetch` con timeout y
  `callRpc()` compartido con abort y errores mapeados.
- `src/lib/api.ts`: timeout en `sendOperation`/`pingApi`.
- `src/lib/sync.ts`: timeout por operación, incremento de `attempts`, backoff
  5 s → 60 s, `nextAttemptAt`, y un fallo ya no bloquea las siguientes. Se
  restauró `refreshPending()` que los callers seguían importando.
- `src/lib/live.ts` y `hooks.ts`: canales para `bump('stats')` / `useAsyncData`
  (infra lista; los callers actuales siguen con `bump()` global).
- `useCongregationStats.ts`: TTL de 5 min sobre `cachedAt`, con timer para
  refrescar si sigue montado.
- Services migrados al `callRpc` compartido: `newsService`, `leaderMinistries`,
  `socialProfiles`, `membership`, `unsplash`.

#### Config de deploy

- Eliminado `firebase` de `package.json` y borrado `src/firebase/` (tenía una
  API key hardcodeada y nadie lo importaba). `npm audit --omit=dev --audit-level=high`
  → **0 vulnerabilidades**. `package-lock.json` actualizado.
- `.env.example` nuevo con todas las variables y aviso de no poner secretos en
  `VITE_*`. Se mantienen los aliases legacy solo como fallback.
- `public/_redirects`, `netlify.toml` y `vercel.json` nuevos: SPA fallback para
  que las rutas directas no den 404.
- `src/vite-env.d.ts`: declaradas todas las `VITE_*`.
- `src/app/lazyViews.ts` nuevo: carga diferida de las 16 vistas. El chunk
  principal pasó de ~973 kB a **258 kB**; el build ya no avisa de chunk grande.
- `tenantAdmin.ts` (212 líneas) se dividió en `tenantRpc.ts`,
  `tenantMembers.ts`, `tenantMinistries.ts` y `tenantProfiles.ts`;
  `tenantAdmin.ts` quedó como barrel de compatibilidad de 21 líneas.

**Verificación:** `npm run typecheck` ✅ y `npm run build` ✅ (sin warnings de
chunk). `npm audit --omit=dev --audit-level=high` → 0. Todos los archivos
TS/TSX **tocados** quedaron ≤ 100 líneas; sigue la deuda preexistente de
archivos viejos (`src/pages/*`, `ProfileView`, `repo.ts`, etc.), que no bloquea
el deploy.

#### Pasos manuales que faltan antes de publicar

1. Ejecutar el orden SQL indicado arriba en Supabase (en DB existente, aplicar
   los cambios a mano y correr primero el diagnóstico de R1).
2. Cargar en el host `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y
   `VITE_UNSPLASH_ACCESS_KEY`. `VITE_API_URL` es opcional: sin ella la cola
   offline queda desactivada y los cambios siguen en IndexedDB.
3. Agregar la URL productiva a los *redirect URIs* del OAuth client de Google y
   a la lista de URLs permitidas de Supabase Auth. **Rotar el client**, porque
   el secret estuvo expuesto.
4. Relogear la congregación con `nuevavida@gmail.com` (el token de prueba
   venció) y verificar `/avisos`, Home del miembro y ambos pickers.
5. Definir quién ejecuta el paso 6 (`vify: false → true`, hoy sin backoffice) y
   documentar el paso 5 (desvinculación de miembro).
6. No hay repo git: los cambios están sin commitear ni pushear.

Deuda acordada, no bloqueante: mover la búsqueda de Unsplash detrás de una Edge
Function con cache global, migrar los callers a los canales de `bump()`,
espejar avisos/perfiles en IndexedDB con pull y resolución de conflictos, y
limpiar las referencias residuales a `memberships.role='leader'` como líder
global en `leaderCapabilities.sql`.

### 16.19 Idempotencia de R1 y migración para DB existente

Al ejecutar `enforceR1.sql` en la base real apareció:

```
ERROR: 42P07: relation "memberships_user_id_key" already exists
CONTEXT: SQL statement "alter table public.memberships
    add constraint memberships_user_id_key unique (user_id)"
PL/pgSQL function inline_code_block line 3 at SQL statement
```

**No es un problema de datos: R1 ya estaba aplicada.** El bloque `exception
when duplicate_object` del script no cubre el código `42P07` (`duplicate_table`),
que es lo que Postgres devuelve en esta versión. Como el `DO` abortó, no se
ejecutaron las funciones `preview_congregation` / `join_congregation` que vienen
después.

**Cambio:** `rpcs/enforceR1.sql` ahora consulta `pg_constraint` antes de hacer
el `alter table`, en vez de atrapar excepciones. Es realmente idempotente.

**Archivo nuevo:** `rpcs/deployExistingDb.sql`. Como `redil_schema.sql` no es
idempotente y no se puede correr entero sobre la base real, este script aplica
solo los cambios de seguridad necesarios: R1, email único, los dos triggers de
columnas sensibles, `is_admin`/`is_leader`/`leads_ministry` y las policies de
`ministries`/`ministry_members` con alcance por ministerio. Usa `if not
exists`, `create or replace`, `drop policy if exists` y `drop trigger if exists`.

**Orden revisado para una DB existente:**

1. `rpcs/enforceR1.sql` (corregido)
2. `rpcs/deployExistingDb.sql` (nuevo)
3. `rpcs/congregation_auth.sql` → `createCongregation.sql` → `tenantAdmin.sql`
4. `rpcs/fixListMembersEmail.sql` → `joinCongregation.sql` → `memberJoinFix.sql`
5. `rpcs/getMyMembership.sql` → `leaderCapabilities.sql`
6. `rpcs/socialProfiles.sql` → `newsAnnouncements.sql`
7. `rpcs/fixContactsScope.sql` (alcance de contactos por ministerio; ver 16.29)
8. `rpcs/songbook.sql` (cancionero, flag `uses_songbook` y RPCs; ver 16.32)
9. `rpcs/deleteCongregation.sql` (baja de miembros y de congregación; ver 16.33)
10. `rpcs/pastorCongregation.sql` (datos del pastor; requiere que la tabla
    `pastor_congregation` ya exista; ver 16.37)

**Verificación sugerida después de correrlos:**

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.memberships'::regclass and contype = 'u';
-- debe aparecer: UNIQUE (user_id)

select user_id, count(*) as congregaciones
from public.memberships
group by user_id having count(*) > 1;
-- debe devolver 0 filas
```

### 16.20 Ejecución del SQL en la base real y cierre de grants

El usuario ejecutó en Supabase los pasos 1 a 6 del orden de 16.19:

- `enforceR1.sql`: 0 filas en el diagnóstico → ningún usuario en dos tenants.
- `deployExistingDb.sql`: sin errores.
- `congregation_auth.sql`, `createCongregation.sql`, `tenantAdmin.sql`: sin errores.
- `fixListMembersEmail.sql`, `joinCongregation.sql`, `memberJoinFix.sql`: sin errores.
- `getMyMembership.sql`, `leaderCapabilities.sql`, `socialProfiles.sql`,
  `newsAnnouncements.sql`: sin errores.

**Verificación final en SQL:** aparecen las tres constraints esperadas en
`memberships` (`(congregation_id, user_id)`, `(id, congregation_id)` y
`UNIQUE (user_id)` → R1). `profiles_of_congregation` referencia al helper
privado `_profiles_of_congregation_data`.

**Pruebas con anon key desde la app:**

| RPC | Resultado | Evaluación |
| --- | --- | --- |
| `list_public_news` (tenant real y uuid random) | `200 []` | ✅ No filtra datos. |
| `profiles_of_congregation` | `401 / 42501` | ✅ Sin grant para anon. |
| `get_my_social_context` | `200 []` | ✅ Sin sesión, sin datos. |
| `can_cross_tenants` | `200 false` | ❌ Grant viejo de anon. |

**Hallazgo nuevo:** en Supabase, `revoke ... from public` **no** elimina grants
explícitos históricos de `anon`. Por eso `can_cross_tenants` (y potencialmente
otras funciones `authenticated`) seguían ejecutables con la anon key.

**Corrección:** se agregó `, anon` a los revoke de las funciones que no deben
ser públicas en `rpcs/socialProfiles.sql` (`get_my_social_context`,
`can_cross_tenants`, `list_my_tenant_profiles`,
`list_verified_congregations_for_member`, `list_external_profiles_for_member`,
`list_shared_announcements_for_member`) y en `rpcs/newsAnnouncements.sql`
(`list_my_news`). Las funciones que sí funcionan con token de tenant mantienen
el grant a `anon` a propósito, porque en ese flujo no hay `auth.uid()`.

**Pendiente inmediato:** volver a ejecutar `socialProfiles.sql` y
`newsAnnouncements.sql` con los revoke corregidos y repetir la prueba de
`can_cross_tenants` con anon (debe dar `401 / 42501`).

### 16.21 Elección de host y configuración de Firebase Hosting

El usuario pidió un servidor gratuito que **no sea Netlify ni muestre un badge**
estilo Netlify, y dudaba entre GitHub Pages y Firebase. Se eligió **Firebase
Hosting en plan Spark** porque:

- El rewrite SPA es nativo (`** → /index.html`); GitHub Pages no tiene rewrites
  y las rutas directas (`/perfil`, `/avisos`) responderían 404.
- No hace falta repo git: hoy no hay ninguno y Pages exigiría crear, commitear
  y pushear primero.
- La URL queda en la raíz (`https://<proyecto>.web.app`); con Pages sería un
  subpath y habría que cambiar `base` de Vite, el manifest y los redirects.
- Spark incluye HTTPS y CDN sin tarjeta; límites 10 GB de storage y
  ~360 MB/día de transferencia, suficientes para la prueba productiva.
- No muestra ningún badge visible.

**Archivos nuevos:**

- `firebase.json`: `public: dist`, rewrite `** → /index.html`, y headers
  `no-cache` para `index.html` y `sw.js` (clave para que el service worker no
  quede trabado en una versión vieja).
- `.firebaserc`: proyecto por defecto `redil-5bb15`, el que ya existía en el
  `src/firebase/configuration.ts` eliminado en 16.18. Si ese proyecto tiene
  billing activo o no accesible, cambiar ese valor por un proyecto nuevo en
  Spark.

**Cambios:** `package.json` sumó `"deploy": "npm run build && firebase deploy --only hosting"`.
`.gitignore` ignoró `firebase-debug.log*` y `.firebase/`.

**Flujo de deploy:** las `VITE_*` se incrustan en el bundle, así que el build se
hace local con el `.env` cargado; el host solo recibe `dist`. No sirve definir
variables de entorno en Firebase Hosting para este build local.

**Pasos del usuario:** `npm i -g firebase-tools` → `firebase login` →
verificar/crear el proyecto Spark → `npm run deploy`. Después agregar en Google
Cloud Console y Supabase Auth los redirect URIs
`https://<proyecto>.web.app/login` y
`https://<proyecto>.firebaseapp.com/login`, y rotar el OAuth client expuesto.

### 16.22 Primer deploy: redirect OAuth y correcciones de UI

El deploy en Firebase Hosting se completó, pero aparecieron tres problemas.

#### 1) Google redirige a `localhost` (`ERR_CONNECTION_REFUSED`)

El código **no** tiene `localhost` hardcodeado: `login.ts` usa
`redirectTo: ${window.location.origin}/login`. Por lo tanto el destino lo está
imponiendo la configuración del proveedor, no la app.

Causa probable: el **Site URL de Supabase Auth sigue apuntando a localhost**.
En el flujo OAuth, Google redirige a Supabase
(`https://<ref>.supabase.co/auth/v1/callback`) y Supabase devuelve al navegador
al Site URL; si ese valor es `http://localhost:5173`, el navegador intenta
abrir localhost y falla.

Configuración a aplicar:

- **Google Cloud Console → APIs & Services → Credentials → OAuth client (Web)**:
  - Authorized redirect URIs: `https://ghjdhnqphsflcajoacwq.supabase.co/auth/v1/callback`.
  - Authorized JavaScript origins: `https://ghjdhnqphsflcajoacwq.supabase.co`
    y `https://redil-5bb15.web.app`.
- **Supabase → Authentication → URL Configuration**:
  - **Site URL**: `https://redil-5bb15.web.app` (este es el que faltaba).
  - **Redirect URLs**: `https://redil-5bb15.web.app/login` y
    `https://redil-5bb15.firebaseapp.com/login`.
- Rotar el OAuth client: el secret estuvo expuesto en el proyecto.

#### 2) La tarjeta «Miembros» aparecía para el miembro

`DashboardView.tsx` mostraba siempre el `StatCard` de Miembros. Ahora solo se
renderiza cuando `vm.isTenant` es true. El grid de escritorio del miembro pasó
de 3 a 2 columnas (Eventos y Avisos); el del tenant se mantuvo en 5.

#### 3) El tenant no podía abrir el perfil de un miembro

`TenantMemberList.tsx` era solo presentación: las filas no enlazaban a ningún
lado. Se agregó:

- `src/views/MemberProfileView.tsx` (nuevo, 74 líneas): vista pura del perfil
  de otro miembro (foto, nombre, rol, biografía, ministerios y grupos).
- `src/features/social/hooks/useMemberProfileView.ts` (nuevo, 30 líneas):
  elige `list_tenant_profiles(p_token)` para el tenant y
  `list_my_tenant_profiles()` para el miembro, y filtra por `userId`. No decide
  permisos: los RPC ya validan la sesión y el tenant.
- Ruta `miembros/:userId` en `AppRoutes.tsx` y export lazy en `lazyViews.ts`.
- Cada fila de `TenantMemberList` ahora es un `Paper component={RouterLink}` hacia
  esa ruta.

El perfil de **otro tenant** sigue sin ser abrible desde esta vista: el
directorio externo solo muestra tarjetas, y el alcance cross-tenant requiere
`vify` en ambas congregaciones.

**Verificación:** `npm run typecheck` ✅ y `npm run build` ✅. Los seis archivos
TS/TSX tocados quedaron ≤ 100 líneas (máximo 93).

**Faltan acciones del usuario:** aplicar la config OAuth/Supabase indicada,
correr `npm run deploy` otra vez para subir este build, y re-ejecutar
`rpcs/socialProfiles.sql` + `rpcs/newsAnnouncements.sql` con los revoke
corregidos (pendiente del 16.20).

### 16.23 Guía operativa: cómo funciona Redil y cómo se despliega

Esta sección resume el funcionamiento y el procedimiento de publicación para
que cualquier persona pueda retomar el proyecto sin leer todo el historial.

---

#### 1. Cómo funciona el proyecto

##### Modelo de datos y vocabulario

- El usuario final dice **congregación**. En código, SQL y comentarios se usa
  *tenant* para el mismo concepto.
- Una persona pertenece a **una sola congregación** (regla R1). La base lo
  garantiza con `memberships_user_id_key · UNIQUE (user_id)`.
- **No existe un líder global**. El rol `memberships.role` lo administra la
  congregación (`admin`/`leader`/`member`); el permiso real de liderazgo sale de
  `ministry_members.ministry_role = 'leader'` y solo alcanza a **su**
  ministerio o grupo. Las policies usan `is_admin(...) OR leads_ministry(...)`.
- Perfiles: dentro de la propia congregación siempre se pueden ver. Entre
  congregaciones distintas solo si **ambas** tienen `vify = true`.
  `share_announcements` nace en `false`: un tenant debe habilitar
  explícitamente la difusión de sus avisos globales.

##### Las dos sesiones

| Sesión | Ingreso | Identidad | Dónde vive |
| --- | --- | --- | --- |
| Congregación (tenant) | RPC `login_congregation` con email + contraseña | `session_token` opaco, 12 hs, en `tenant_sessions`. **`auth.uid()` es null** | localStorage `redil-congregation` (zustand persist) |
| Miembro | Supabase Auth con Google | `auth.uid()` + fila en `memberships` | Supabase Auth + store de usuario |

Reglas clave:

- Nunca coexisten. `AuthProvider` baja la sesión tenant si detecta Auth;
  `loginWithCongregation` cierra Auth antes de abrir la sesión tenant.
- `ProtectedRoute` valida el token del tenant contra `list_tenant_news` antes de
  renderizar. `expiresAt` es una estimación local de 12 hs; el backend manda.
- Un fallo de red **no** deslogea; solo lo hace un error confirmado de token.
- `TenantSessionAlert` avisa y ofrece reingresar. `MemberAccessGuard` aplica R7:
  sin membresía no se entra, con botón «Iniciar sesión» ante un 401.

##### Capas del código

```
src/views/*                 Vistas puras. Solo presentan; no llaman Supabase
                            ni deciden permisos.
src/features/**/hooks/*     Viewmodels: estado, loaders y datos listos para la UI.
src/features/**/services/*  Llamadas a RPC y mapeo de filas a tipos del front.
src/app/*                   Router, guards y carga diferida (lazyViews.ts).
src/supabase/*              Cliente, login, definiciones SQL de los RPC.
src/store/*                 zustand + persist (usuario, congregación, contadores).
src/lib/*                   http/errors/sync/db/hooks/live/format/repo.
```

Toda escritura de negocio pasa por RPC `security definer`. RLS bloquea el
acceso directo con la anon key. **Nunca** hay `service_role` ni Secret Key en
el front: las `VITE_*` se incrustan en el bundle y son públicas por diseño.

##### Datos locales y PWA

- IndexedDB (`src/lib/repo.ts` con `idb`) guarda miembros, eventos y calendario
  para funcionar sin conexión. La cola `outbox` reintenta con timeout de 15 s y
  backoff de 5 s a 60 s; requiere `VITE_API_URL`. Sin esa variable la cola
  queda desactivada y los cambios siguen en el dispositivo.
- Los contadores del Home viven en `redil-stats` por congregación, con TTL de
  5 minutos y botón «Actualizar».
- El service worker usa `registerType: 'prompt'`: cuando hay versión nueva, la
  app avisa y el usuario decide cuándo actualizar.
- Foto y portada se eligen desde Unsplash (búsqueda inicial `paisaje`), sin
  subir archivos. La Access Key es pública; el riesgo de cuota está aceptado.

##### Rutas principales

`/login` · `/acceso` (modal R7) · `/` (Home) · `/perfil` · `/ajustes` ·
`/biblia` · `/calendario` · `/code` · `/directorio` · `/miembros` ·
`/miembros/:userId` · `/ministerios` · `/eventos` · `/avisos` · `/miembro` ·
`/congregacion`.

`DashboardView`, `MembersView` y `AnnouncementsView` cambian de contenido
según la sesión. El Home del tenant muestra 5 tarjetas; el del miembro, 2
(Eventos y Avisos). Desde la lista de Miembros del tenant se abre el perfil de
cada persona.

---

#### 2. Cómo se despliega

##### Requisitos

- Node + npm instalados.
- Firebase CLI global (`npm i -g firebase-tools`) y sesión iniciada
  (`firebase login`).
- Un proyecto Firebase en **plan Spark** (gratis, sin badge, HTTPS y CDN).
- Supabase ya migrado: ver el orden SQL de **16.18** (DB nueva) o **16.19**
  (DB existente), más el cierre de grants del **16.20**.

##### Variables de entorno

Copiar `.env.example` como `.env` y completar:

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | sí | URL del proyecto, sin `/rest/v1` |
| `VITE_SUPABASE_ANON_KEY` | sí | anon key pública; la seguridad la da RLS |
| `VITE_UNSPLASH_ACCESS_KEY` | no | búsqueda de fotos y portadas |
| `VITE_API_URL` | no | endpoint de la cola offline |

`VITE_AURL_SUPABASE` y `VITE_URL_ANON` son aliases legacy: solo se mantienen
como fallback en `src/supabase/supabase.ts`. **Nunca** poner una service_role
key ni la Secret Key de Unsplash en un `VITE_*`.

##### Archivos de configuración del host

- `firebase.json`: `public: dist`, rewrite `** → /index.html` (needed para que
  `/perfil` y `/avisos` no den 404 al entrar directo), y `no-cache` para
  `index.html` y `sw.js`.
- `.firebaserc`: proyecto por defecto (`redil-5bb15`). Si ese proyecto tiene
  billing o no es accesible, reemplazar por uno nuevo en Spark.
- `public/_redirects`, `netlify.toml`, `vercel.json`: fallbacks equivalentes
  por si se decide usar otro host.
- `.gitignore`: excluye `dist/`, `.env`, `.firebase/` y logs.

##### Comandos

```bash
npm install
npm run typecheck        # verificación rápida
npm run build            # tsc + vite build → dist/
npm i -g firebase-tools  # una sola vez
firebase login           # una sola vez, con tu cuenta Google
firebase projects:list   # confirmar el proyecto activo
npm run deploy           # build + firebase deploy --only hosting
```

Al terminar, Firebase muestra la URL: `https://<proyecto>.web.app`
(también responde `https://<proyecto>.firebaseapp.com`).

**Importante:** el build se hace **local**, con el `.env` cargado. Definir
variables en el panel de Firebase no cambia el bundle: las `VITE_*` ya quedaron
incrustadas en `dist/assets/*.js`.

#### Configuración externa posterior al primer deploy

1. **Google Cloud Console → Credentials → OAuth client (Web)**:
   - Redirect URI: `https://<ref-supabase>.supabase.co/auth/v1/callback`.
   - JavaScript origins: la URL de Supabase y `https://<proyecto>.web.app`.
2. **Supabase → Authentication → URL Configuration**:
   - Site URL: `https://<proyecto>.web.app`. Si queda en `localhost`, Google
     terminará redirigiendo a localhost con `ERR_CONNECTION_REFUSED`.
   - Redirect URLs: `https://<proyecto>.web.app/login` y
     `https://<proyecto>.firebaseapp.com/login`.
3. OAuth client: ya modificado por el usuario, sin rotación pendiente.
4. Relogear la congregación con `nuevavida@gmail.com` (el token de prueba
   venció) y probar: Home, `/avisos`, `/miembros` → perfil de un miembro,
   ambos pickers de Unsplash y el login de miembro con Google.

##### Actualizar la app

Cada cambio de código requiere un nuevo `npm run deploy`. El service worker
preguntará si se quiere actualizar; hasta que se acepte, el navegador puede
seguir mostrando la versión anterior. Para forzar en una prueba: *hard reload*
o borrar el caché del sitio.

##### Problemas frecuentes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `ERR_CONNECTION_REFUSED` al entrar con Google | Site URL de Supabase en localhost | Poner la URL `*.web.app` como Site URL y agregar los redirect URIs |
| 404 al abrir `/perfil` directo | Falta el rewrite SPA | Confirmar `firebase.json` y volver a deployar |
| Pantalla en blanco | Build con variables faltantes | Revisar `.env` y correr `npm run build` local |
| Spinner que no termina | RPC colgada o sin timeout | Ya hay timeout de 15 s; revisar consola y red |
| «Sesión vencida» | Token de 12 hs vencido | Reingresar como congregación |
| Imágenes no cargan | Cuota de Unsplash agotada | Riesgo aceptado; esperar o migrar la búsqueda a una Edge Function con caché |

El hosting tiene versión historial: si un deploy sale mal, se puede revertir
desde la consola de Firebase Hosting.

---

**Estado del deploy:** publicado en Firebase Hosting y con login Google
verificado por el usuario (16.24 y 16.25). Sigue pendiente la auditoría en vivo
de los grants del 16.20; el fix de contactos de 16.29 sí fue ejecutado.

Además se actualizó `README.md`: la sección **Despliegue** ahora documenta
Firebase Hosting/Spark con los comandos reales y deriva a esta guía (16.23)
para la configuración de OAuth y los detalles de funcionamiento.

### 16.24 OAuth: diagnóstico del retorno a `localhost:3000` y paso a PKCE

El usuario reportó que, al iniciar sesión con Google, el navegador terminaba en:

```
http://localhost:3000/#access_token=...&provider_token=...&refresh_token=...
```

**Diagnóstico:** el JWT tiene `iss = https://ghjdhnqphsflcajoacwq.supabase.co/auth/v1`,
así que Google redirigió correctamente al callback de Supabase. El salto
posterior a `localhost:3000` lo hace **Supabase**, no la app:

- El código calcula `redirectTo: ${window.location.origin}/login`. En dev el
  puerto es **5173** (`vite.config.ts`), nunca 3000.
- Supabase solo redirige a una URL que esté en su lista **Redirect URLs**. Si
  el `redirectTo` no coincide exactamente, cae al **Site URL**, que hoy sigue
  siendo `http://localhost:3000`. Por eso aparece el raíz con el token en el
  hash.

**Configuración a aplicar en Supabase → Authentication → URL Configuration:**

- **Site URL**: `https://redil-5bb15.web.app` en producción (si se prueba en
  local, `http://localhost:5173`).
- **Redirect URLs**, una por línea, sin comodines innecesarios:
  - `https://redil-5bb15.web.app/login`
  - `https://redil-5bb15.firebaseapp.com/login`
  - `http://localhost:5173/login`
  - `http://localhost:3000/login` (solo si el usuario prueba en ese puerto)

En Google Cloud Console el único redirect URI debe ser
`https://ghjdhnqphsflcajoacwq.supabase.co/auth/v1/callback`; las URLs de la app
**no** van ahí, van en Supabase.

**Cambio de código:** `src/supabase/supabase.ts` ahora crea el cliente con
`auth.flowType = 'pkce'` y `detectSessionInUrl: true`. En el flujo PKCE el
retorno trae `?code=...` en la query y el cliente lo canjea por la sesión: el
`access_token` y el `provider_token` dejan de quedar expuestos en el hash de la
URL. `AuthProvider.tsx` ya consume la sesión con `getSession()` y
`onAuthStateChange`, así que no necesita cambios.

**Seguridad:** el token que el usuario pegó en el reporte es una credencial
válida y contiene también un `provider_token` de Google. Hay que revocar las
sesiones de ese usuario desde Supabase Auth y rotar el OAuth client.

**Verificación:** `npm run typecheck` ✅ y `npm run build` ✅. Queda pendiente
correr `npm run deploy` para subir este build y aplicar la configuración de
Supabase indicada arriba.

### 16.25 Corrección visual de la PWA instalada en iOS (iPhone 12 Pro)

El usuario instaló la app desde Safari en un iPhone 12 Pro y reportó que «la
pantalla no se ve del todo correcto», sin captura. Se revisaron `index.html`,
`vite.config.ts`, `Layout.tsx`, `OfflineBar.tsx`, `UpdateToast.tsx` y
`styles.css`, y se corrigieron cuatro problemas concretos:

#### 1) Topbar tapada por el status bar / notch

`index.html` ya tiene `viewport-fit=cover` y
`apple-mobile-web-app-status-bar-style=black-translucent`, o sea que el
contenido arranca en `y=0`, **debajo** del reloj y del notch. Pero en el media
query de ≤900 px la topbar tenía `padding: 10px 16px` y no reservaba
`env(safe-area-inset-top)`: el logo y el nombre quedaban cortados.

Ahora:

```css
padding: calc(10px + env(safe-area-inset-top))
         calc(16px + env(safe-area-inset-right))
         10px
         calc(16px + env(safe-area-inset-left));
```

También se agregó `.app-body:has(> .offline-bar) .topbar { padding-top: 10px; }`
para no duplicar el espacio cuando aparece la barra de «sin conexión»
(Safari 15.4+ soporta `:has()`).

#### 2) Tabbar transparente y sin fondo

`.tabbar` era `position: fixed` con `backdrop-filter: blur(18px)` pero **sin
`background`**. En iOS el blur sobre fondo transparente no se compone de forma
confiable: el contenido que scrollea se ve detrás y la barra parece rota. Se le
puso `background-color: #000000`, se quitó el `backdrop-filter` (ya no aporta
nada con fondo opaco) y se agregaron los safe-area laterales e inferior. La
topbar recibió el mismo tratamiento.

#### 3) Barra offline sin safe-area

`.offline-bar` es el primer elemento de `.app-body` y aparece solo cuando no
hay conexión. Estaba en `y=0`, también debajo del notch. Ahora su padding
superior incluye `env(safe-area-inset-top)` y los laterales incluyen los
correspondientes.

#### 4) Colores del chrome inconsistentes

`theme_color` valía `#280728` y `background_color` `#171414`, mientras que el
fondo real de la app y de la topbar/tabbar es `#000000`. En la PWA instalada,
la barra de estado / splash cortaba con un violeta ajeno al layout. Ambos
valores (en `index.html` y en el manifest de `vite.config.ts`) pasaron a
`#000000`.

#### 5) `background-attachment: fixed` innecesario

`body` tenía `background-image: var(--bg-black)` (un color sólido) con
`background-attachment: fixed` y `background-size: cover`. En iOS Safari esa
combinación provoca repintados raros durante el scroll. Se quitaron ambas
propiedades; `background-color` alcanza.

**Archivos tocados:** `src/styles.css`, `index.html`, `vite.config.ts` (128
líneas: deuda preexistente, de las decisiones originales). No se modificó
ningún componente React: `Layout.tsx`, `OfflineBar.tsx` y `UpdateToast.tsx`
quedaron intactos.

**Verificación:** `npm run build` ✅ (tsc + Vite + precache de 86 entradas).

**Cómo visualizar / probar la PWA:**

- En desarrollo: `npm run dev` y, en Chrome DevTools, el botón de *Device
  Toolbar* con el preset **iPhone 12 Pro**. Sirve para revisar el layout
  responsive, **pero no emula** `env(safe-area-inset-*)` ni el status bar
  translúcido de Safari iOS, así que no alcanza para validar estos fixes.
- En producción: abrir `https://redil-5bb15.web.app` en Safari → botón
  *Compartir* → **Agregar a pantalla de inicio** → abrir el ícono desde la
  pantalla de inicio (así se ejecuta en modo `standalone`, no como pestaña).
- Requisito: HTTPS. Firebase Hosting ya lo provee; `localhost` también sirve
  para la instalación en emulador.

**Prueba pendiente del usuario:** correr `npm run deploy`, aceptar la
actualización del service worker (o hacer *hard reload* / borrar caché del
sitio), abrir la PWA desde la pantalla de inicio del iPhone y revisar: que el
logo de la topbar no quede bajo el notch, que la tabbar tenga fondo negro
sólido al scrollear y que no haya saltos raros al desplazarse. Si sigue habiendo
un problema, hace falta una captura y la pantalla exacta para afinar.

### 16.26 Auditoría integral y métricas (2026-11-24)

Se generó `docs/auditoria.html`: informe **autocontenido** (sin dependencias
externas, imprime bien y sirve para abrir en cualquier navegador) con los siete
ejes pedidos —seguridad, inicio de sesión, miembros del tenant, escalabilidad,
código sucio, amplitud de archivos y rendimiento a 100.000 usuarios— más
resumen ejecutivo, historial de lo hecho y metodología. Incluye tablas, flujos
paso a paso, severidades y citas `archivo:línea`.

**Aclaración de alcance:** «100.000 usuarios en simultáneo» se interpretó como
**100.000 usuarios concurrentes activos**, no solo 100.000 cuentas registradas.
El usuario aclaró además que la pregunta **no es si alcanza el plan de Supabase
hoy**, sino si el código está preparado para esa concurrencia **sin romperse ni
lagarse**. Por eso los límites de Spark/Free pasaron a ser contexto secundario
y el veredicto del eje 7 es «código no preparado». Todas las proyecciones están
marcadas como estimaciones: no se corrió prueba de carga ni se midió
TTFB/latencia real.

**Métricas medidas sobre el working directory:** 140 archivos TS/TSX · 11.361
líneas · 28 archivos >100 líneas y 112 ≤100 · CSS 2.029 · SQL 2.856 (13
archivos) · docs 2.639 (CONTEXTO + README) · 60 definiciones de función SQL · 7 policies · 54
`GRANT` · 10 tablas · 11 índices · 9 triggers · 224 `export function` · 14
`callRpc(` · 95 `useState(` · 28 `useEffect(` · 0 `TODO/FIXME` · 4 `console.`
· 1 `eslint-disable` · 0 `any` explícito · 20 rutas · 0 tests. Build: `dist/`
con 90 archivos / 1,82 MB y precache de 86 entradas (81 únicas) / ~1,45 MB.
Nota: el conteo preliminar de 23 `TODO/FIXME` fue un falso positivo de una
búsqueda sin distinción de mayúsculas que matcheó la palabra «todo»; con
coincidencia exacta hay **0**.

**Calidad de código:** no hay `any`, `@ts-ignore`, `TODO` ni `FIXME`; hay 1
`eslint-disable` justificado y 4 `console.*`. La deuda es estructural: dos
implementaciones de `callRpc` con distinto timeout/traducción de errores,
tres formas de leer el token del tenant con distinta validación,
`isTenant = Boolean(congregation)` repetido en 9 hooks, `initials()`
triplicado, 5 vocabularios de roles, canales del `bump()` sin consumidores,
`src/pages/*` legacy sin enlaces, `SyncBadge`/`useSettingsView`/`lib/backup`
muertos, 3 motores de estilos, 2 librerías de iconos y sin scripts de
`lint`/`test`/`format`. Si se cuenta CSS, son 29 archivos >100 líneas: los
28 TS/TSX del informe más `src/styles.css`.

**Cifras de referencia para el escalado (contexto, no veredicto):** 100.000 ×
1,45 MB ≈ 145 GB de precache en una oleada, unas 403 veces los 360 MB/día del
plan Spark; el cupo alcanza para ~248 instalaciones frías por día. Supabase
Free/Nano: 500 MB de DB, 500 MB de RAM, CPU compartida, 5 GB de egress, 50k
MAU, 60 conexiones directas y 200 clientes de pooler. Los límites se tomaron de
la documentación oficial de Firebase y Supabase; se enlazan en la metodología
del HTML. El bloqueante para el código es el fan-out de refetch, los listados
completos y el precache que anula el code splitting, no el tamaño del plan.

**Concordancia entre informes:** los 74 `SECURITY DEFINER` revisados tienen
`set search_path`, pero 56 usan la forma no endurecida
`set search_path = public, extensions` y 19 la endurecida. Respecto de
`list_public_news`, los informes coinciden en que la función valida `vify`,
`share_announcements` e `is_global` dentro del SQL: se reclasificó como
**riesgo medio / decisión de producto** (acceso público deliberado), no como
un bypass cross-tenant. La UI sigue usando `list_shared_announcements`, que sí
exige sesión y `can_cross_tenants`.

**Correcciones según el feedback del usuario (24/11/2026):** el usuario confirmó
que **el login con Google funciona correctamente con el último deploy** y que
**el OAuth client ya fue modificado y no presenta riesgo**. En consecuencia se
sacaron del informe todas las referencias a login roto, OAuth en riesgo y
deploy pendiente; el incidente de credenciales en la URL quedó solo como
antecedente histórico. No se debe volver a listar como tareas: revocar/rotar el
OAuth client, aplicar Site URL/Redirect URLs ni correr `npm run deploy`.

**Acciones que siguen pendientes y están reflejadas en el informe:** revocar el
token de tenant (`revoke_tenant_session`) y purgar `tenant_sessions`;
corregir `newsAnnouncements.sql` (hoy revoca solo `from public`) y
re-ejecutarlo junto con `socialProfiles.sql` con `revoke ... from public, anon`;
quitar la escritura de `news` por RLS a
líderes; alinear `list_leaders_congregation_members()` con
`leads_ministry()` (el alcance de contactos ya se cerró en 16.29); corregir el
bug de `toAppError()`/`isAuthSessionError()`
(«venció» vs «vencid»); paginación, agregados, canales por entidad, precache
mínimo y prueba de carga. El detalle con prioridades, responsables, plazos y
criterios está en 16.28; el fix de contactos ejecutado está en 16.29.

**Archivos tocados en esta ronda:** `docs/auditoria.html`, este documento y
(el 24/11/2026, después de la ejecución en vivo) el nuevo
`src/supabase/rpcs/fixContactsScope.sql`. No se modificó ningún archivo TS/TSX
ni de configuración.

### 16.27 Plan de refactoring: archivos ≤100 líneas (2026-11-24)

El usuario pidió «un plan de refactoring para poder achicar la línea de
archivos». Se agregó la sección 8 de `docs/auditoria.html` con fases y
criterios de verificación:

- **F0 · Preparación:** scripts `lint`/`test`/`format`, incluir `scripts/**` en
  typecheck, unificar los 3 motores de estilos en Emotion y las 2 librerías de
  iconos en `@mui/icons-material`.
- **F1 · Código muerto:** borrar `src/pages/*` (7 archivos / 1.729 líneas),
  `SyncBadge`, `useSettingsView`, `lib/backup` y `lib/api`. Es la mayor
  reducción y la de menor riesgo porque las rutas usan `src/views/*`.
- **F2 · Abstracciones compartidas:** un solo `callRpc` canónico, un
  `requireToken()`, un `useSessionKind()`, un `initials()` y un mapa de roles.
- **F3 · Vistas grandes:** partir `ProfileView` (262), `CalendarView` (196),
  `DirectoryView` (189), `MembersView` (148) y `CodeView` (129) en componentes
  + viewmodels, sin lógica de Supabase ni permisos en la vista.
- **F4 · Componentes y utilidades:** `CongregationAccess` (304),
  `QrScannerPanel`, `Layout`, `Icons`, `Modal`, `repo.ts`, `format.ts` y
  `PWAProvider`; datos geo a un módulo de constantes.
- **F5 · Cierre:** actualizar métricas y comentarios desactualizados.

Regla de aceptación: todo archivo **tocado** queda en ≤100 líneas, con
`npm run typecheck` limpio y sin cambios de comportamiento. La deuda
preexistente no se reescribe entera de una vez: se documenta y se reduce por
fases. El patrón a preservar es `ministryActions.ts` (decisión tenant/líder
fuera de la vista).

### 16.28 Plan de acción para estabilizar lo crítico (2026-11-24)

El usuario pidió «crear un plan de acción para estabilizar lo crítico a medio o
esperado». Se agregó la sección 9 de `docs/auditoria.html`: tabla con prioridad
P0/P1/P2, responsable, plazo estimado, criterio de aceptación y estado.

- **Cerrado por confirmación del usuario:** login Google con el último deploy y
  OAuth client modificado sin riesgo.
- **P0 pendiente:** revocación del token tenant y purga de sesiones; quitar
  escritura de `news` por RLS; alinear roles de liderazgo; re-ejecutar los SQL
  con `revoke ... from anon` y auditar grants en vivo; arreglar «venció» vs
  «vencid».
- **P1:** unificar `callRpc`/`requireToken`/`useSessionKind`, rate limit y
  lockout, borrar código muerto, agregar CSP y headers, podar datos sensibles
  de los docs.
- **P2:** paginación + `get_tenant_counts()` + `get_member_profile()` +
  índices con `EXPLAIN ANALYZE`; `bump()` por canal con SWR/dedupe/
  `AbortController`; sync con jitter y `Retry-After`; precache mínimo, tests y
  observabilidad. Cambiar de plan (Blaze/Pro) queda **al final**, solo si las
  métricas lo justifican.

Criterio de «estabilizado»: token tenant revocable, sin líder global con
acceso cruzado, grants de `anon` auditados en la DB y expiración de sesión con
el botón correcto. Recién después se mide robustez con prueba de carga.

### 16.29 Alcance de contactos por ministerio y portabilidad a otro proyecto (2026-11-24)

El usuario compartió el esquema real de la DB y ejecutó en Supabase el SQL
reemplazante de `contacts_select` sin errores. Se guardó como
`src/supabase/rpcs/fixContactsScope.sql` para que no quede solo en el chat.

**Qué cambió:** `leads_user(user_id)` miraba `memberships.role` (el rol global),
así que un `leader` de cualquier ministerio veía los contactos de todos los
miembros de la congregación. La nueva función `leads_member_contact(p_user_id)`
exige que el consultor sea `admin` de la congregación del dueño del contacto, o
que compartan un ministerio donde el consultor tenga
`ministry_members.ministry_role = 'leader'`. La policy quedó:

```sql
using (user_id = auth.uid() or public.leads_member_contact(user_id))
```

El esquema confirmó además que `memberships.user_id` es `Unique`, así que R1 sí
está aplicada en vivo, y que `ministry_members` ya trae `congregation_id`,
`ministry_id`, `membership_id` y `ministry_role`: suficiente para la consulta.

**Inventario SQL en el repo:** 17 archivos (el esquema maestro
`redil_schema.sql` más 16 en `rpcs/`). Del total, 15 entran en el orden vigente
para DB nueva (ahora con `pastorCongregation.sql` como paso 16) y
`deployExistingDb.sql` se usa solo en el orden de 16.19 para DB existente.
También están documentados el cierre de grants de 16.20 y la guía operativa de
16.23. `redil_schema.sql` **no es idempotente**: para una DB ya creada se usa
`deployExistingDb.sql`.

**Lo que NO está en el repo y por eso no se migra con SQL:**

- El `.env` con la URL y la anon key del proyecto (ignorado por git; solo está
  `.env.example`). Las `VITE_*` se incrustan en el bundle, así que hay que
  recargar `.env` y correr `npm run build` de nuevo.
- Las credenciales de Google OAuth: client ID/secret, Site URL y Redirect URLs
  se configuran en Supabase Auth y Google Cloud Console, no se ejecutan.
- Los datos: congregaciones, miembros, ministerios, avisos y eventos viven en
  la DB, no en el repo. Hay que exportarlos e importarlos del proyecto viejo.
- Un sistema de migraciones automático: hoy los scripts se pegan a mano en el
  SQL Editor y en orden.

**Para cambiar de proyecto:** crear el proyecto nuevo → ejecutar los 15 SQL en
orden (16.18) → configurar OAuth y URLs → copiar `.env.example` a `.env` con la
nueva URL y anon key → `npm run build` → `npm run deploy` → importar los datos.
La estructura y los permisos se levantan solos; credenciales y contenido no.

### 16.30 Overlay de carga global con spinner centrado (2026-11-24)

El usuario pidió «un spinner de carga siempre al centro de la pantalla con un
overlay blur que ocupe toda la pantalla». Confirmó que el alcance es la **carga
global de la app**, no la de las listas.

**Componente nuevo:** `src/components/LoadingOverlay.tsx`. Usa `Backdrop` de MUI
con `inset: 0`, fondo `rgba(10, 5, 12, 0.68)`, `backdropFilter: blur(6px)` (y su
prefijo `-webkit-` para iOS) y `zIndex: 9999`, por encima de la tabbar, los
modales propios y los de MUI. El `CircularProgress` va dentro de un `Stack`
centrado, con una etiqueta opcional (`Cargando…` por defecto) y
`role="status"` / `aria-live="polite"`.

**Puntos donde se reemplazó la carga global:**

| Archivo | Antes | Ahora |
| --- | --- | --- |
| `src/app/AppRoutes.tsx` | `<div className="page">Cargando…</div>` (falta `authReady`) | `<LoadingOverlay />` |
| `src/app/AppRoutes.tsx` | `<div className="page">Verificando sesión…</div>` (validación del token tenant) | `<LoadingOverlay label="Verificando sesión…" />` |
| `src/app/AppRoutes.tsx` | `Suspense fallback={<LoadingList rows={4} />}` | `Suspense fallback={<LoadingOverlay />}` |
| `src/app/MemberAccessGuard.tsx` | `<LoadingList rows={3} />` mientras carga la membresía (R7) | `<LoadingOverlay label="Verificando acceso…" />` |

**Qué NO cambió en esa ronda:** los `LoadingList` in-place de vistas y páginas,
los estados `saving`/`busy` de los formularios y las pantallas de error. El blur
es el mismo patrón que ya usa `.modal-backdrop`; la restricción de iOS sobre
`backdrop-filter` aplicaba a la topbar y la tabbar con fondo transparente, que
siguen con fondo negro opaco. **Los `LoadingList` pasaron al overlay en 16.31.**

**Archivos tocados:** el componente nuevo, `src/app/AppRoutes.tsx`,
`src/app/MemberAccessGuard.tsx` y este documento. Ningún TS/TSX tocado supera
las 100 líneas.

### 16.31 Mostrar/ocultar contraseña y spinner en toda carga de datos (2026-11-24)

El usuario pidió dos cosas: un *hide/show* para la contraseña en registro e
inicio de sesión, y usar el spinner «en todo lugar donde tenga que cargar
información».

#### Contraseña visible u oculta

**Componente nuevo:** `src/components/PasswordField.tsx` (51 líneas). Es un
`TextField` con `type={visible ? 'text' : 'password'}` y un `IconButton` al final
(`Visibility` / `VisibilityOff`) con `aria-label` acorde. El `onMouseDown`
evita perder el foco al togglear. Acepta `label`, `value`, `onChange`,
`autoComplete`, `required` y `helperText`.

**Dónde se usa:**

- `src/features/congregations/components/CongregationAccess.tsx`: login de la
  congregación (`current-password`) y registro (`new-password`, mínimo 6). El
  archivo pasó de 304 a 287 líneas.
- `src/features/profile/components/ProfilePasswordForm.tsx`: «Nueva contraseña»
  y «Repetir contraseña» del modal de Perfil.

#### Spinner en toda carga de información

En vez de editar una por una las ~20 pantallas, `LoadingList` (en
`src/components/Feedback.tsx`, 90 líneas) dejó de dibujar skeletons y ahora
**delega en `LoadingOverlay`**. Conserva el prop opcional `rows` para no romper
las llamadas existentes; ya no se usa. Con eso todas las vistas que ya tenían
un estado `loading` (directorio, avisos, eventos, ministerios, miembros,
calendario, perfil, home, acceso, ajustes y las páginas legacy) muestran el
mismo spinner centrado con blur.

**Cargas que no pasaban por `LoadingList` y se agregaron aparte:**

| Archivo | Estado | Overlay |
| --- | --- | --- |
| `src/features/congregations/components/CongregationAccess.tsx` | `loadingProvinces` / `loadingCities` | Se sacaron los `CircularProgress` inline de los selects |
| `src/features/profile/components/UnsplashImagePicker.tsx` | `picker.loading` | «Buscando imágenes…» |
| `src/lib/settings.tsx` | carga inicial de ajustes desde IndexedDB | «Cargando ajustes…» |
| `src/views/DirectoryView.tsx` | `congregationsLoading` / `announcementsLoading` | «Cargando congregaciones…» / «Cargando avisos…» |

**Qué sigue igual:** los estados `saving` / `busy` de guardar, borrar,
sincronizar o publicar. Son operaciones de escritura, no carga de información,
y mantienen el texto del botón («Guardando…», «Eliminando…», etc.). Tampoco se
tocaron las pantallas de error ni el `busy` del login con Google, que es una
redirección a OAuth.

**Verificación:** `npm run typecheck` y `npm run build` sin errores. Archivos
nuevos y modificados: 51 / 90 / 87 / 65 / 31 / 208 / 287 líneas; los de deuda
preexistente (`DirectoryView` y `CongregationAccess`) no crecieron de forma
significativa y el segundo incluso se achicó.

### 16.32 Cancionero por congregación con cifrado privado por ministerio (2026-11-24)

El usuario pidió un cancionero asociado a la congregación, visible para todos en
su parte pública, con un uso especial dentro de los ministerios. Antes de
escribir SQL se confirmaron cuatro decisiones:

| Tema | Decisión |
| --- | --- |
| Visibilidad | Cualquiera ve **título, artista, tono original y letra sin cifrado**. Letra con acordes, colores y transposición quedan para miembros del ministerio habilitado (o admin del tenant). |
| Vínculo | Columna `uses_songbook` en `ministries`, declarada **al crear el ministerio**. No hay tablas `songbooks` ni `ministry_songbooks`. |
| Colores | **Paleta fija por nota** (12 colores de Redil, `src/features/songbook/lib/notes.ts`). No se replica onStage literalmente: su ayuda oficial indica un color elegido por persona para todos los acordes y otro para MD Notes, no un color por nota ([cifrado](https://help.getonstage.app/songs-and-library/songs-chords-lyrics/), [vista](https://help.getonstage.app/songs-and-library/songs-view-mode/), [tono del equipo](https://help.getonstage.app/songs-and-library/songs-change-key-team/)). El usuario eligió explícitamente «color por nota». |
| Notación y tono | Alternancia **Americano** (`C`, `Dm`) / **Europeo** (`Do`, `Re m`). El cambio de tono es **global del ministerio**, no personal: lo aplica **solo** quien tiene `ministry_members.ministry_role = 'leader'` en ese ministerio. El admin del tenant administra canciones, pero **no** el tono. |

#### Capa SQL

**Archivo nuevo:** `src/supabase/rpcs/songbook.sql` (idempotente; se ejecuta
después de `fixContactsScope.sql`, paso 14 en 16.18 y paso 8 en 16.19). Crea:

- `songs` (por `congregation_id`): título, artista, `original_key`, `content`
  en formato ChordPro (`[C]texto`) y timestamps.
- `ministries.uses_songbook boolean not null default false` vía `add column if
  not exists`.
- `ministry_song_transpositions` (ministerio, canción, semitones -12..12) con
  PK compuesta.
- Helpers `songbook_is_member` / `songbook_is_leader` / `songbook_can_edit_ministry`.
- `songbook_public_songs(cid)`: quita los corchetes con `regexp_replace` y es la
  única lectura con grant a `anon`.
- `songbook_ministry_songs(mid)`: exige `uses_songbook` y pertenencia; devuelve
  el ChordPro completo más el semitono vigente.
- `songbook_set_transpose(mid, sid, semitones)`: valida rango y exige **solo**
  `ministry_role = 'leader'` del ministerio; `songbook_can_edit_ministry`
  devuelve el mismo valor para ocultar el control en la UI.
- `songbook_create_song` / `update` / `delete` y `songbook_set_ministry_usage`:
  exigen token de congregación vigente (`tenant_from_token`).
- `revoke ... from public` y `grant` explícitos: las escrituras y los RPCs con
  cifrado quedan para `authenticated`; el catálogo público queda para `anon`.

`create_tenant_ministry` **no cambió**: ya devuelve el `uuid` del ministerio. El
alta con el checkbox llama después a `songbook_set_ministry_usage`; si el SQL todavía
no se ejecutó, la creación del ministerio sigue funcionando y solo falla esa
habitualización opcional. La validación de semitones se escribió con comparaciones
explícitas (`< -12 or > 12`) para evitar dudas de precedencia con `is not true`.

#### Capa frontend

| Capa | Archivos |
| --- | --- |
| Modelo | `src/features/songbook/types.ts` (`SongSummary`, `SongSheetData`, `SongbookMinistry`, `SongInput`, `Notation`, segmentos de letra). |
| Cifrado | `lib/notes.ts` (notas, colores y equivalencia europea) y `lib/chords.ts` (`chordParts`, `transposeChord`, `colorForChord`, `parseChordPro`). |
| Servicios | `services/songbook.ts`: adapta los RPCs; las escrituras usan `requireToken()` y las lecturas `callRpc()` con timeout. |
| Viewmodel | `hooks/useSongbook.ts`: resuelve el `congregation_id` (token, `?cid=`, código público o `getMyMembership()`), el ministerio activo, el alcance y las acciones. La vista no decide permisos. |
| Componentes | `ChordChip`, `SongSheet`, `TransposeControl`, `SongList`, `MinistryPicker`, `SongFormDialog` y `PublicCongregationPicker`. |
| Vista | `src/views/SongbookView.tsx`: repertorio a la izquierda, partitura a la derecha y diálogos de alta/edición y borrado. Es una vista pura. |

**Cableado:** export en `src/app/lazyViews.ts`, ruta `/cancionero` en
`AppRoutes.tsx` e ítem «Canciones» en `Layout.tsx` con el ícono `sparkles`
(`IconName` no tiene `music`; `book` ya está usado por Biblia). Como la letra
pública debe verse sin sesión, `/cancionero` queda fuera de `MemberAccessGuard`
(pero dentro de `Layout`); `ProtectedRoute` solo saltea la validación de Auth y
tenant para esa ruta. El visitante elige la congregación con el componente
`PublicCongregationPicker` (usa `preview_congregation(p_code)`, ya existente) o
con `?cid=<uuid>`; los usuarios con sesión no ven ese selector. El alta de
ministerios pasó a incluir el checkbox «Usar
el cancionero en este ministerio o grupo»: `MinistryCreateForm.tsx`,
`useMinistryCrud.ts`, `MinistryActions.create`, `tenantMinistries.ts` y
`MinistriesView.tsx`. El switch de `MinistryPicker` permite habilitar o quitar el
flag después, solo para la congregación.

**Comportamiento de la transposición:** `TransposeControl` muestra `−`, `+` y
`Original` dentro de -12..12; los botones se deshabilitan para todos salvo el
líder del ministerio seleccionado. `useSongbook` no habilita el control por tener
sesión de congregación: `canEditTone` sale del RPC `songbook_can_edit_ministry`
(que ya no admite bypass de admin) y `handleTranspose` vuelve a chequearlo antes
de llamar. Así un cambio de tono nunca lo hace una persona cualquiera ni queda
grabado por una sesión administrativa accidental. La notación es preferencia
local de cada persona (`useState`, no se guarda en DB) y solo cambia cómo se
muestran las notas; el color se calcula sobre la nota ya transitada.

El usuario remarcó esta regla durante la implementación: «el único que puede
cambiar el tono es el líder del ministerio, esto evita que varias personas
cambien el tono de una canción y se almacene cosas equivocadas». Por eso se
sacaron los dos accesos que la relajaban: el `is_admin()` en
`songbook_is_leader` y el `canManage ||` en `canEditTone`. La UI de ministerios
ya deja un solo líder a la vez (`handleLeader` baja al anterior a `member`).

**Verificación:** `npm run typecheck` y `npm run build` sin errores; el bundle
diferido `SongbookView` quedó en ~19 kB. Los TS/TSX nuevos tienen 19 a 99
líneas (`SongbookView` 99, `useSongbook` 81, `AppRoutes` 94); los modificados
siguen dentro del límite salvo `Layout.tsx` (132 líneas, deuda preexistente que
no creció de forma relevante).

**Pendiente del usuario:** ejecutar `src/supabase/rpcs/songbook.sql` en el SQL
Editor. Hasta entonces `uses_songbook` no existe en vivo y las RPCs del
cancionero devuelven `PGRST202`; el resto de la app sigue igual. No se publicó
con `npm run deploy` en esta ronda.

### 16.33 Baja física de miembros y de la congregación: «Dejar Redil» (2026-11-24)

El usuario pidió dos RPC para borrar: un miembro del tenant y una congregación
completa. Ante la duda sobre perfiles globales confirmó que en **los dos casos se
borran también los usuarios de Supabase Auth**, no solo la vinculación. También
pidió que el disparador esté **dentro del perfil del tenant** con una opción
llamada **«Dejar Redil»**, y que se cablee en la UI existente.

#### Capa SQL

**Archivo nuevo:** `src/supabase/rpcs/deleteCongregation.sql` (idempotente; paso
15 en 16.18 y paso 9 en 16.19; ejecuta después de `tenantAdmin.sql` porque usa
`tenant_from_token`). Todas las funciones son `security definer` con
`search_path` fijo, autorizadas solo por el token vigente de la congregación
(no hay `auth.uid()` en esa sesión) y con una frase de confirmación exacta para
evitar llamados accidentales.

| RPC | Firma | Confirmación | Qué borra |
| --- | --- | --- | --- |
| `delete_tenant_member` | `(p_token uuid, p_user_id uuid, p_confirmation text)` | `ELIMINAR MIEMBRO` | `posts` / `news` / `events` creados por esa persona en este tenant, su `memberships`, sus `ministry_members`, `member_contacts`, `profiles` y `auth.users`. Valida antes que el usuario pertenezca a la congregación del token. |
| `delete_congregation` | `(p_token uuid, p_confirmation text)` | `DEJAR REDIL` | Para cada miembro borra contacto, perfil y cuenta Auth; después borra `tenant_sessions` y la fila de `congregations`. El `on delete cascade` de esa fila barre ministerios, grupos, canciones, transposiciones, eventos, avisos y publicaciones. |

`congregations.minister_id` queda en `null` automáticamente por su FK
`on delete set null`. El orden dentro de `delete_tenant_member` importa: primero
se borra el contenido filtrando por `author_id` / `created_by`, porque si se
borrara el perfil primero esas columnas pasarían a `null` y ya no se podría
filtrar. Los grants son explícitos: `revoke ... from public` y `grant ... to anon,
authenticated` (el tenant llama con la anon key + token).

**Advertencia documentada:** ambas operaciones son **irreversibles**. Borrar
`auth.users` no se puede deshacer desde la app; la frase de confirmación es una
segunda barrera además del `ConfirmDialog` de la UI.

#### Capa frontend

| Archivo | Rol |
| --- | --- |
| `src/features/congregations/services/tenantDeletion.ts` | Adapta los dos RPC con `requireToken()` y las frases exactas. La vista no conoce SQL. |
| `src/features/congregations/components/DeleteMemberButton.tsx` | Botón «Eliminar de Redil» con `ConfirmDialog`; al confirmar vuelve a `/miembros`. Se muestra en `MemberProfileView` solo para el tenant. |
| `src/features/congregations/components/LeaveRedilCard.tsx` | Zona de peligro en `ProfileView`: pide escribir `DEJAR REDIL`, llama al RPC, ejecuta `logout({ redirect: false })` y navega a `/login`. |
| `src/views/ProfileView.tsx` y `src/views/MemberProfileView.tsx` | Solo renderizan los componentes; no toman decisiones de permisos. |

La baja de un miembro se entra desde el listado de Miembros tocando su tarjeta y
luego «Eliminar de Redil». La baja total se entra desde **Perfil → Dejar Redil**
cuando hay sesión de congregación.

**Verificación:** `npm run build` sin errores; los componentes nuevos tienen
menos de 100 líneas. `ProfileView` ya era deuda preexistente y solo recibió dos
líneas.

**Pendiente del usuario:** ejecutar `src/supabase/rpcs/deleteCongregation.sql`
en el SQL Editor. Probarlo primero con una congregación descartable: confirma
que desaparezcan sus canciones y que los usuarios ya no puedan iniciar sesión.
No se publicó con `npm run deploy` en esta ronda.

### 16.34 Pantalla de espera por validación y tilde azul de congregación verificada (2026-11-24)

El usuario pidió «cambiar el layout para cuando una congregación está pendiente
de validación» y un «tilde azul, estilo Twitter» que indique que la cuenta de
Redil de una congregación está validada. Como hoy `login_congregation` **no
permite entrar** con `vify=false`, se confirmaron dos decisiones antes de
escribir código:

| Tema | Decisión |
| --- | --- |
| Congregación pendiente | **Pantalla de espera dedicada**, sin sesión y sin tocar SQL. El login sigue bloqueado como hasta ahora. Se descartó darle un token: `tenant_from_token` no filtra por `vify` y tendría acceso completo a los RPCs del tenant. |
| Tilde azul | Solo en la **cabecera de la app** (topbar y sidebar) y en el **Perfil de la congregación**. Queda fuera del directorio y de los perfiles de miembros. |

#### Estado de espera

**Archivo nuevo:** `src/features/congregations/components/PendingValidationView.tsx`
(63 líneas). Vista pura, sin Supabase ni decisiones de permisos: recibe el email
del administrador y un callback `onBack`. Muestra el reloj, el texto «Tu
congregación está en revisión», tres pasos (registro recibido → verificación de
datos → acceso habilitado), un aviso de que no hace falta volver a registrar y
un botón para volver al inicio.

`CongregationAccess.tsx` pasó de 287 a 283 líneas: reemplaza el viejo
`Dialog` de «Registro recibido» por esta vista y detecta el caso pendiente tanto
al registrar como al intentar login. La detección es por mensaje
(`/pendiente de validación|no está validada/i`) sobre `msj + detils` de
`loginWithCongregation`; en ese caso no se setea el error rojo ni se crea sesión.
`PrincipalView` no se tocó: el cambio de layout queda contenido en el flujo de
congregación.

#### Tilde azul

**Archivo nuevo:** `src/components/VerifiedBadge.tsx` (20 líneas). Usa el ícono
`Verified` de MUI con color fijo `#1d9bf0` (azul Twitter), `aria-label` y
`Tooltip` accesible. Es el único lugar que define el color y el tamaño.

| Archivo | Cambio |
| --- | --- |
| `src/features/profile/hooks/useSessionIdentity.ts` | Expone `verified: Boolean(congregation.vify)` para el tenant; `false` para miembros. |
| `src/components/Layout.tsx` | Renderiza el badge junto al nombre en el sidebar y en la topbar, solo si `isTenant && verified`. |
| `src/features/profile/hooks/useProfileView.ts` | Expone `verified` en `ProfileVM` con el mismo valor. |
| `src/views/ProfileView.tsx` | Lo muestra al lado del nombre en la tarjeta, solo para el tenant. |

La sesión de congregación ya persistía `vify` en `CongregationStore`, así que
no hizo falta consultar la DB de nuevo: el badge aparece apenas entra el tenant
verificado y desaparece con el logout. El estado `vify=false` solo se ve desde
el login/registro, porque la app no acepta sesiones pendientes.

**Verificación:** `npm run typecheck` y `npm run build` sin errores; el bundle
de `PrincipalView` pasó de ~10,5 kB a ~11,7 kB y el de `ProfileView` de ~21,8 a
~21,9 kB. Los archivos nuevos tienen 20 y 63 líneas. Los modificados ya eran
deuda preexistente: `CongregationAccess` bajó a 283, `useSessionIdentity` 41,
`useProfileView` 141, `Layout` 140 y `ProfileView` 269. **No se ejecutó SQL ni
se publicó** con `npm run deploy` en esta ronda.

### 16.35 Salida real de R7 cuando el login con Google fue un error (2026-11-24)

El usuario reportó que al entrar con Google por error queda trabado en la
pantalla de solicitud de código (R7): el storage guarda sus datos y el modal no
tiene salida. Pidió reutilizar el «Volver» existente, pero con un `clear()` que
permita volver a elegir entre Miembro y Congregación.

#### Qué pasaba

`AccessRequiredModal` es un `Dialog` sin `onClose` (a propósito: en MUI v9 no se
cierra con Escape ni con backdrop). Su único «Volver» estaba dentro del modo
`code` y solo hacía `setMode('choose')`, o sea volvía al selector de QR/código
sin salir del modal. El guard de `MemberAccessGuard` redirige a `/acceso` a todo
usuario autenticado sin membresía, así que no había forma de volver al login.

#### Cambio

| Archivo | Cambio |
| --- | --- |
| `src/features/congregations/components/AccessRequiredModal.tsx` | Nuevo prop `onExit: () => void`. Agrega una caption y un botón **«Volver al inicio»** siempre visible, fuera de los modos `choose`/`qr`/`code`. El «Volver» interno pasó a decir «Volver a opciones» para que no se confundan. Sigue siendo una vista pura: no importa Supabase. |
| `src/views/AccessRequiredView.tsx` (54 líneas) | Define `handleExit()`: `await logout({ redirect: false })` y `navigate('/login', { replace: true })`. Pasa el handler como `onExit`. |
| `src/supabase/login.ts` | `logout()` ahora hace también `localStorage.clear()` con try/catch, además de lo que ya hacía: `clearAuthSession()` (Auth + `user`), `clearTenantSession()` (token + contadores) y `clearAllData()` (IndexedDB: miembros, eventos, avisos y outbox). Es el mismo `logout` que usan el menú lateral y «Dejar Redil», así que no hay una segunda lógica de limpieza. |

El barrido es explícito porque las keys que podían quedar son `user`,
`redil-congregation`, `redil-stats` y los tokens de Supabase Auth. Después de
`logout()` no hay usuario ni congregación en el store, así que `ProtectedRoute`
también mandaría a `/login`; la navegación explícita solo evita un frame con la
R7 vieja.

**Verificación:** `npm run typecheck` y `npm run build` sin errores. El bundle
de `AccessRequiredView` pasó de ~7,5 kB a ~8,0 kB. `AccessRequiredView` quedó en
54 líneas; `AccessRequiredModal` en 133 (deuda preexistente, +10). No se tocó
SQL ni se publicó con `npm run deploy`.

### 16.36 Módulo de Biblia extraído de tdgApp e integrado en Redil (2026-11-24)

El usuario pidió extraer el módulo de Biblia de `C:\Users\angel\tdgApp` y traerlo
a Redil. Después de mapear el proyecto externo se confirmaron las decisiones:
lector con búsqueda por referencia, favoritos y apariencia, versículo del día
**siempre visible en el Home y distinto cada día**; favoritos y preferencias
**solo locales**; RV1960 **dividido por libro**; y `/biblia` **solo con sesión**
(igual que hoy, dentro de `MemberAccessGuard`). No se trajo el editor de
tarjetas para compartir.

#### Qué se trajo y qué se reescribió

Portable: los 66 libros (`BibleBook.ts` → `lib/books.ts`), el JSON RV1960, la
indexación 0-based, los saltos `/n` y la búsqueda por referencia. Nativo, por lo
tanto reescrito en MUI/web: `expo-sqlite` → `localStorage` + `fetch`,
`FlatList` → `Box` con CSS grid, `PanResponder`/swipe → botones, `Share` → Web
Share API con copia al portapapeles, y los iconos de Expo → `@mui/icons-material`.
Se descartaron `CardEditor`, `useCardEditor`, `view-shot`, `image-picker`, Lottie
y los fondos `.webp` porque el usuario no pidió tarjetas.

#### Datos

| Archivo | Cambio |
| --- | --- |
| `tools/biblia-rv1960.json` | Copia literal de la fuente de tdgApp (4.008.791 bytes, 66 libros, 31.103 versículos, 9.209 marcadores `/n`). |
| `tools/split-bible.mjs` | Script reproducible (`npm run biblia:split`) que genera un JSON por libro y un índice de cantidades por capítulo. |
| `public/biblia/<key>.json` | 66 archivos minificados, `string[][]`: capítulos 0-based y versículos 0-based. Solo se descarga el libro abierto. |
| `public/biblia/index.json` | `Record<bookKey, number[]>`: cuántos versículos tiene cada capítulo. Permite dibujar la grilla de capítulos sin bajar el texto. |
| `vite.config.ts` | Runtime caching `CacheFirst` en `/biblia/` con caché `redil-biblia` (80 entradas, 1 año). `globPatterns` ya excluía `.json`, así que ninguno de los 67 archivos entra en el precache. |

#### Código nuevo

| Capa | Archivos |
| --- | --- |
| Tipos y constantes | `src/features/bible/lib/types.ts`, `books.ts`, `bookUtils.ts`, `share.ts`. `findBook()` ignora tildes, mayúsculas y espacios extra, así que «Juan 3:16», «juan 3:16» y «1 Corintios 13:4» funcionan. |
| Servicios | `services/bibleService.ts` (índice y libros con promise-cache, normalización de `/n`, parser de referencias), `services/verseOfDay.ts`, `services/bibleLocal.ts`. |
| Local | `redil-bible-favorites` y `redil-bible-preferences` en `localStorage`, con validación al leer. No hay tablas, RPCs ni grants nuevos. |
| Hooks | `useBible` (modos, paso libros/capítulos/lectura, selección, búsqueda, favoritos y preferencias), `useBibleFavorites`, `useBiblePreferences`, `useVerseOfDay`, `useVerseOfDayCard`. |
| Componentes | `BibleModeSelector`, `BibleBookGrid`, `BibleChapterGrid`, `BibleReader`, `BibleVerseRow`, `BibleSearchBar`, `BibleFavorites`, `BibleAppearancePanel` y `VerseOfDayCard`. Todos separados y por debajo de 100 líneas. |
| Vistas | `src/views/BibleView.tsx` (99 líneas) quedó como vista pura; `src/views/DashboardView.tsx` (98 líneas) inserta `<VerseOfDayCard {...verseOfDay} />` antes de los contadores, para tenant y miembro. |

El versículo del día usa los 7.958 versículos del Nuevo Testamento en orden y
elige por número de día local módulo 7.958: dos días consecutivos nunca
repiten referencia. Solo baja el libro elegido. La tarjeta del Home tiene
favorito, compartir y un enlace a `/biblia?ref=<referencia>`; la vista abre esa
referencia al montarse. El lector permite navegar AT/NT, cambiar de capítulo,
resaltar una palabra, cambiar colores/tamaño y volver desde favoritos.

**Verificación:** `npm run typecheck` y `npm run build` sin errores; 67 JSON en
`dist/biblia`, runtime caching presente en `dist/sw.js` y ningún JSON en el
precache (los 100 entries/1,57 MiB del precache son los mismos de antes).
Comprobación con el índice generado: 400 días consecutivos → 400 referencias
únicas, 0 repeticiones (por ejemplo `hechos 9:13` y `hechos 9:14`). Los archivos
nuevos tienen entre 13 y 86 líneas; `BibleView` 99 y `DashboardView` 98.
`vite.config.ts` pasó de 128 a 139 líneas (deuda preexistente documentada en el
plan de refactoring). No se ejecutó SQL ni se publicó con `npm run deploy`.

---

### 16.37 Datos del pastor de la congregación (2026-11-24)

El usuario detectó que no había datos del pastor y pidió una tabla nueva
vinculada por FK a `congregations`: `pastor_congregation`. **La tabla ya la creó
el usuario, así que el SQL no la crea.** Nombre y apellido son obligatorios; bio
y tres credenciales (rutas a diplomas o reconocimientos) son opcionales. El
usuario eligió que los cargue el tenant desde la app, que las credenciales se
muestren como miniaturas de imagen y —tras la aclaración— que **la tarjeta
aparezca únicamente en el Perfil del tenant**; no en el Home ni en `/miembro`,
aunque el pedido original mencionaba «el muro». No se suben archivos: los
campos guardan rutas.

Al iniciar sesión se lee el estado (`is_complete = nombre y apellido
presentes`) de forma no bloqueante. Si el RPC todavía no se ejecutó, el error se
ignora a propósito para no dejar al usuario afuera.

#### Capa SQL

**Archivo nuevo:** `src/supabase/rpcs/pastorCongregation.sql` (idempotente;
paso 16 en DB nueva y paso 10 en DB existente). Va **después de**
`tenantAdmin.sql` porque usa `public.tenant_from_token(p_token)`. Activa RLS y
hace `revoke all` de la tabla a `anon`/`authenticated`: solo se accede por RPC.

| RPC | Firma | Confirmación |
| --- | --- | --- |
| `get_pastor_congregation` | `(uuid) → fila con is_complete` | `stable security definer`, token vencido con el mensaje canónico. Sin fila: campos vacíos e `is_complete=false`. |
| `save_pastor_congregation` | `(uuid, text, text, text, text, text, text)` | `security definer`, `nullif(btrim(...))`, exige nombre y apellido, inserta o actualiza **una sola fila** por congregación. |

Ambos filtran por `congregation_id = tenant_from_token(p_token)`, dan grants
explícitos a `anon, authenticated` (el tenant entra con token, sin
`auth.uid()`) y terminan con `notify pgrst, 'reload schema'`.

#### Capa frontend

| Archivo | Rol | Líneas |
| --- | --- | ---: |
| `src/features/pastor/services/pastorService.ts` | DTO y lectura/escritura con `callRpc` + `requireToken()` | 66 |
| `src/features/pastor/lib/credentials.ts` | rutas no vacías; miniatura si es imagen, si no `Chip` enlazado | 18 |
| `src/features/pastor/hooks/usePastorCongregation.ts` | viewmodel con `useAsyncData` + `useActionRunner` | 19 |
| `src/features/pastor/hooks/usePastorCongregationBoot.ts` | lectura al iniciar sesión; ignora errores | 16 |
| `src/features/pastor/components/PastorCongregationCard.tsx` | tarjeta con «Completar»/«Editar», bio y credenciales | 70 |
| `src/features/pastor/components/PastorCongregationDialog.tsx` | formulario de nombre, apellido, bio y 3 credenciales | 73 |
| `src/views/TenantProfileView.tsx` | envoltorio que agrega la tarjeta solo si `isTenant` | 14 |
| `src/app/AppRoutes.tsx` | `/perfil` usa `TenantProfileView` y dispara el boot | 96 |
| `src/app/lazyViews.ts` | lazy de `TenantProfileView` | 60 |

`ProfileView` quedó intacto (269 líneas, deuda preexistente): la tarjeta se
monta como hermana, no dentro del perfil existente.

**Verificación:** `npm run typecheck` y `npm run build` sin errores; el build
generó el chunk `TenantProfileView` (4,20 kB) y el precache pasó de 100 a 101
entries (1.576,71 KiB). Todos los archivos nuevos y tocados quedaron ≤100
líneas. No se ejecutó SQL en vivo ni se publicó con `npm run deploy`.

**Pendiente del usuario:** ejecutar `src/supabase/rpcs/pastorCongregation.sql`
en el SQL Editor y probar en una congregación descartable: sin fila debe dar
`is_complete=false`, «Completar» debe guardar nombre y apellido, y la bio y las
credenciales-imagen deben verse en `/perfil` del tenant.
