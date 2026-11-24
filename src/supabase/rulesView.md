# Reglas para las vistas segnu perfil 

#glosario 
  - tenant     = congregacion 
  - usuario    = usuario
  - ministerio = grupo de alta jerarquia que pertenece a una congregacion y gestiona actividades normativas en un culto o servicio
  - grupo      = grupo de menor jerarquia que pertenece a una congregacion y gestiona actividades dentro de una congregacion. 
  - lider      = usuario designado por una congregacion que puede alterar crear leer o eliminar informacion relacionada a un ministerio o grupo (un usuario puede liderar varios ministerios y grupos) puede sumar o eliminar miembros de su grupo o ministerio.

  - miembro    = usuario que pertenece a una congregacion el cual solo puede gestionar su perfil dentro de los alcances permitidos. 

##Premisa general 
 - cada miembro accede de la misma forma, los roles y alcances que puede tener un miembro depende exclusivamente del tenant al que esta asociado 
   ##Ejemplo 
        - usuario a pertenece a tenant a1, el tenant a1 puede crear desde su perfil ministerios, grupos, anuncios, asignar a usuario como miembro o lider de un ministerio o grupo
        - el usuario puede ser miembro de varios ministerios, pero un ministerio o grupo solo puede ser parte de un tenant
  
##Vistas 
las opciones que tienen (L) significan que tambien un miembro con rol de Lider tiene la misma capacidad. 
  tenant 
    - home
       - visualizar anuncios 
       - versiculo del dia
       - mas definiciones a futuro 
    - perfil 
       - imagen de perfil 
       - nombre de usuario 
       - lista con ministerios
       - lista con grupos 
       - lista con los miembros del tenant
       - bio
       - mas defniciones a futuro 
    - ajustes
       - cambio de contrasenia 
       - cambio de imagen de perfil (a definir)
       - cambio de imagen de banner (a definir)
       - canbio de mensaje bio 
       - crud para ministerios grupos y usuarios (L solo para el ministerio o grupo que lidera)
    - biblia 
       - aun no esta definido el modulo pero esta presente 
    - calendario
       - calendario con fechas importantes 
       - agenda para asignar fechas importantes a un miembro en particular (L)
    - Code
       - generar QR para compartir y asociar nuevos miembros
       - ver codigo de invitacion del tenant
  
  usuario (mismo perfil que el lider, solo que el lider tiene capacidades que el uusario no tiene)
    - home
       - visualizar anuncios 
       - versiculo del dia
       - mas definiciones a futuro 
    - perfil 
       - imagen de perfil 
       - nombre de usuario 
       - ministerios o grupos al que pertenece 
       - bio
       - mas defniciones a futuro 
    - ajustes
       - cambio de contrasenia 
       - cambio de imagen de perfil (a definir)
       - cambio de imagen de banner (a definir)
       - canbio de mensaje bio 
    - biblia 
       - aun no esta definido el modulo pero esta presente 
    - calendario
       - calendario con fechas importantes 
       - agenda con fechas designadas ejemplo un lidea te asigno para una actividad en particular en una fecha determinada



# Perfiles, avatares y portada

#Redil se extendera como una red social interna y externa 
por reglas de negocio, los usuarios de un tenant podran ver los perfiles de otros usuarios del mismo tenant y si y solo si el tenant esta verificado podran ver los perfiles de otros mimebros de otros tenant. 
De manera que la verificacion del tenant es la que permite abrirse a otros tenant compartiendo sus anuncios (si lo desean) y visitar perfiles de otros tenants y sus miembros relacionados, en un futuro poder hacer posteos en un mural feed 

## Cambios 

1 - Tanto la **foto de perfil** como la **portada** se eligen desde un selector de Unsplash: se buscan imagenes, se hace clic en una y se guarda su URL (`photo_url` / `banner_url`) mediante RPC; no se escribe a mano ni se sube un archivo. Cada imagen se edita por separado (ver "Foto de perfil y portada" mas abajo). 

2 - Cada miembro o tenant podra tener un perfil 'visitable' o explorable, esto es que un miembro de un tenant puede ver el perfil de otro miembro del mismo tenant pudiendo acceder a su bio, informacion sobre su actividad o relacion con el tenant (si es lider o miembro), se extiende la visualizacion de perfiles cuando el tenant esta verificado y puede ser alcanzable por otros tenant y otros miembros 
EL BUCKET DE IMAGENES QUEDA DESCARTADO: Unsplash permite usar la URL directamente (hotlinking) para foto y portada.
SI MAS ADELANTE SE QUIERE SUBIR FOTOS PROPIAS, recien ahi se define el bucket en Supabase y se migra a Cloudflare.


## Foto de perfil y portada 

### Estado actual
- Tanto la congregacion como el miembro pueden editar **foto de perfil**, **portada** y **bio** desde el modal de Perfil, pero en **secciones separadas**: los botones *Foto*, *Portada* y *Bio* dentro de la pestaña *Perfil*. La contraseña se cambia en la pestaña *Contraseña*.
- **Foto y portada** se eligen desde un picker de Unsplash: grilla de miniaturas, busqueda por termino y un clic guarda `urls.regular` en `photo_url` / `banner_url` con `update_my_profile` / `update_tenant_profile`. La key va en `VITE_UNSPLASH_ACCESS_KEY`.
- El termino inicial de busqueda es **`paisaje`**. La foto usa orientacion `squarish` y la portada `landscape`; los resultados se cachean por termino y variante.
- La vista solo presenta: no llama a Supabase ni decide permisos. El miembro que entra con Google arranca con la foto de su cuenta y puede reemplazarla por una propia.

### Reglas
1. Cada perfil (tenant o miembro) solo puede cambiar **su propia** foto y portada. Ser lider no habilita cambiar la imagen de otros miembros.
2. La congregacion cambia la imagen que la representa en el directorio; el miembro, la que ven los demas dentro de la congregacion.
3. Foto y portada se muestran en Perfil y en los perfiles visitables: dentro del mismo tenant siempre; entre tenants solo si ambos estan verificados (`vify`).
4. Toda alta o cambio pasa por el viewmodel y por RPC, nunca directo desde la vista.
5. Si no hay portada, se muestra un placeholder; si no hay foto propia, se usa la de Google (miembro) o las iniciales (congregacion).
6. Ni la foto ni la portada se tipean: se seleccionan del picker de Unsplash; al elegirlas se muestra el **credito del fotografo** con link a la foto.
7. Elegir una foto **no muestra ni modifica** el picker de portada, y viceversa: cada seccion trabaja solo con su campo.

### Limites y pendiente
- Unsplash demo: **50 request/hora**; en produccion aprobada, **1000 request/hora**. Las imagenes servidas desde `images.unsplash.com` no cuentan. Cacheamos cada termino por variante para no repetir consultas en la misma sesion.
- Con muchos usuarios buscando terminos distintos, conviene meter la busqueda detras de una Edge Function con cache global.
- Mostrar el **credito del fotografo** tambien sobre la imagen publica de `ProfileView` (hoy aparece dentro del modal al elegirla). Para eso habria que persistir `photo_credit` y `banner_credit`, que hoy no estan en la base.
- No hay bucket: se guarda solo la URL de Unsplash. Si se quieren subir fotos propias en el futuro, recien ahi evaluar Supabase Storage y Cloudflare.

## Usuarios 
- Cada perfil de miembro debe mostrar a que congregacion pertenece:
  - si el perfil lo mira el propio miembro: solo el **nombre de la congregacion** (ejemplo: *Nueva vida*).
  - si lo mira otra persona que visita ese perfil: **Pertenece a {nombre de la congregacion}**.
- Ambos textos aparecen en Perfil: en `/perfil` para el titular y en las tarjetas del directorio para los visitantes.

## Avisos
- Solamente la **congregacion (tenant)** puede crear, editar y eliminar avisos. El miembro nunca ve la opcion *Nuevo aviso*: dentro de su congregacion solo puede leerlos.
- Los avisos se guardan en la base (tabla `news`) y aparecen en el apartado *Avisos* del tenant y en el Home del miembro. No dependen de IndexedDB.
- `is_global = true`: aviso publico, visible en el perfil del tenant y, si corresponde, compartido con otros tenants verificados. `is_global = false`: solo lo ven los miembros de esa congregacion.
- Ser lider de un ministerio o grupo **no** habilita publicar avisos: esa capacidad pertenece al tenant, no al lider.
- Toda lectura o escritura pasa por viewmodel + RPC; la vista no decide permisos ni llama a Supabase.

##para calendario es importante entender que, un tenant puede hacer CRUD sobre el calendario eligiendo fechas especiales para eventos o anuncios debe almacenarse en la base 

##el miembro no tiene calendario solo puede ver fechas especiales en el calendario marcadas clickea y ve el anuncion o evento definido
##el miembro con rol de lider podra usar elcaleario para hacer crud tambien, mas adelante usaremos las fechas definidas para manejar las notificaciones



## Usuarios 

##- Cada perfil de cada miembro debe mostrar a que congrgacion corresponde el texto debe decir 
si el perfil lo mira el miembro mismo --> nombre de la congregacion 
ejemplo Nueva vida
si lo mira otra persona , alguien qu visita ese perfil 
debe decir Pertenece a {nombre de la congregacion}

Estos textos deben aparecer en perfil 