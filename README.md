# Redil

PWA offline-first para gestionar una congregación evangélica: miembros, eventos y
avisos. Funciona sin conexión, se instala como aplicación y está preparada para
sincronizar con una API propia cuando la tengas lista.

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **vite-plugin-pwa** (Workbox) para el service worker, el precache y el manifest
- **IndexedDB** (vía `idb`) como base de datos local
- **React Router** para las rutas de la app
- CSS propio con tema claro/oscuro automático
- **Material UI 9** (`@mui/material` + Emotion) instalado y listo para usar, con
  **Roboto** autoalojada (subset latino, funciona offline) e `@mui/icons-material`

## Empezar

```bash
npm install
npm run dev
```

Abre http://localhost:5173.

### Scripts

| Script              | Qué hace                                            |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo (sin service worker)          |
| `npm run build`     | Comprueba tipos y genera la PWA en `dist/`           |
| `npm run preview`   | Sirve `dist/` para probar la PWA de verdad           |
| `npm run typecheck` | Solo comprobación de TypeScript                      |
| `npm run icons`     | Regenera los iconos PNG/SVG desde `scripts/`         |

> El service worker **solo se activa en producción**. Para probar la instalación y
> el modo offline usa `npm run build && npm run preview` (o despliega la app). La PWA
> requiere **HTTPS** o `localhost`.

## Material UI

Material UI v9 está instalado según su guía oficial. Para usar un componente:

```tsx
import Button from '@mui/material/Button'

export function Accion() {
  return <Button variant="contained">Guardar</Button>
}
```

La app mantiene su propio CSS por ahora. Si quieres que los componentes MUI hereden
los colores de Redil, añade un `ThemeProvider` con `createTheme()` y tus tokens en
`src/App.tsx`. No actives `CssBaseline` sin revisar `styles.css`: ambos resetean
estilos globales.

Roboto se importa en `src/main.tsx` solo con el subset latino (300/400/500/700)
para no inflar el precache de la PWA.

## Qué incluye la PWA

- `manifest.webmanifest` con nombre, colores, iconos normales y **maskable**, atajos
  a Miembros/Eventos/Avisos y modo `standalone`.
- Service worker con **precache del shell** (HTML, JS, CSS, iconos): la app abre
  instantáneamente y sin conexión tras la primera visita.
- Estrategia **NetworkFirst** para `/api/*` con respaldo en caché.
- **Botón de instalación** propio (evento `beforeinstallprompt`) e instrucciones
  para iOS.
- **Aviso de actualización**: cuando hay una versión nueva, la app pregunta antes
  de recargar (no se actualiza a tus espaldas).
- Barra de **estado offline** y badge de sincronización en la cabecera.
- Pantalla de error 404 dentro de la propia app.

## Datos y funcionamiento offline

Todo se guarda en IndexedDB (`redil`) en estos almacenes:

| Almacén         | Contenido                              |
| --------------- | -------------------------------------- |
| `members`       | Miembros de la congregación            |
| `events`        | Eventos con fecha y duración           |
| `announcements` | Avisos (con opción de fijar)           |
| `outbox`        | Cola de operaciones pendientes de subir |
| `settings`      | Nombre de la congregación y URL de API |

Cada creación, edición o borrado:

1. se escribe al instante en IndexedDB,
2. se añade a la cola `outbox`,
3. la interfaz se actualiza sin recargar.

Cuando hay conexión y una API configurada, la cola se envía en orden. Si falla la
red, se reintenta al volver la conexión y cada minuto. Los rechazos 4xx (salvo 429)
se reintentan hasta 5 veces y luego se descartan para no bloquear la cola.

### Contrato de la API

Configura la URL en **Ajustes → Sincronización** o con `VITE_API_URL`.

```http
PUT    {apiUrl}/members/{id}
PUT    {apiUrl}/events/{id}
PUT    {apiUrl}/announcements/{id}
DELETE {apiUrl}/{entity}/{id}
GET    {apiUrl}/health
```

- El cuerpo del `PUT` es el registro completo en JSON.
- `X-Redil-Op` identifica la operación para deduplicar reintentos.
- El servidor debe permitir CORS desde el origen de la app.
- Mientras no configures la URL, la app funciona 100 % en local y el badge muestra
  «Solo local».

## Copias de seguridad

En **Ajustes → Datos** puedes:

- **Exportar** todos los datos a un JSON (`redil-AAAA-MM-DD.json`).
- **Importar** una copia (se conservan ids y fechas, y se encola para sincronizar).
- Cargar **datos de ejemplo** para probar la app.
- **Borrar todo** el contenido local.

## Estructura

```
public/
  icons/                 iconos PNG de la PWA y marca para la cabecera
  apple-touch-icon.png
scripts/
  generate-icons.mjs     generador de iconos sin dependencias
src/
  components/            layout, modal, feedback, badges…
  lib/
    api.ts               cliente HTTP y contrato de la API
    backup.ts            exportar/importar copias
    db.ts                esquema IndexedDB
    format.ts            fechas, iniciales, plurales
    hooks.ts             carga de datos, online, sync
    live.ts              notificación de cambios
    repo.ts              CRUD + cola de sincronización
    seed.ts              datos de ejemplo
    settings.tsx         ajustes en contexto
    sync.ts              motor de sincronización
    types.ts             modelo de datos
  pages/                 Inicio, Miembros, Eventos, Avisos, Ajustes
  pwa/PWAProvider.tsx    instalación, actualizaciones, standalone
  App.tsx, main.tsx, styles.css
```

## Despliegue

Es una SPA estática: sirve `dist/` con fallback a `index.html` para todas las rutas.
El host elegido es **Firebase Hosting en plan Spark** (gratis, HTTPS/CDN y sin
badge). `firebase.json` ya trae el rewrite `** → /index.html`.

```bash
npm install
npm run build            # las VITE_* se incrustan en el bundle desde .env
npm i -g firebase-tools  # una sola vez
firebase login           # una sola vez
npm run deploy           # build + firebase deploy --only hosting
```

La URL queda en `https://<proyecto>.web.app`. Si se usa otro proyecto, cambiar
`.firebaserc`. Después hay que configurar los redirect URIs de Google y el Site
URL de Supabase con esa URL; el detalle está en `docs/CONTEXTO.md` **16.23**.

- **Netlify**: build `npm run build`, publish `dist`.
- **Vercel**: framework Vite, output `dist`.
- **Nginx**: `try_files $uri $uri/ /index.html;` y sirve el sitio por HTTPS.
- No cambies la ruta base (`base: '/'`) salvo que publiques en un subdirectorio; si
  lo haces, ajusta también `start_url` y `scope` del manifest en `vite.config.ts`.

Para que la instalación funcione, el sitio debe estar en **HTTPS** (o `localhost`).
