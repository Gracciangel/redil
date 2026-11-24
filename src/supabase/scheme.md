## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `surname` | `text` |  |
| `photo_url` | `text` |  Nullable |
| `banner_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `member_contacts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `phone` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  |

## Table `congregations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `slug` | `text` |  Unique |
| `address` | `text` |  Nullable |
| `country` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `invitation_code` | `text` |  Unique |
| `minister_id` | `uuid` |  Nullable |
| `photo_url` | `text` |  Nullable |
| `banner_url` | `text` |  Nullable |
| `admin_email` | `text` |  Nullable, login de congregación |
| `password_hash` | `text` |  Nullable, contraseña cifrada (bcrypt/pgcrypto) |
| `vify` | `bool` |  Default `false`; si es `true` la congregación puede iniciar sesión |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `memberships`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `congregation_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `role` | `membership_role` |  |
| `created_at` | `timestamptz` |  |

## Table `ministries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `congregation_id` | `uuid` |  |
| `name` | `text` |  |
| `is_group` | `bool` |  |
| `icon` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `ministry_members`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `congregation_id` | `uuid` |  |
| `ministry_id` | `uuid` |  |
| `membership_id` | `uuid` |  |
| `created_at` | `timestamptz` |  |

## Table `posts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `congregation_id` | `uuid` |  |
| `author_id` | `uuid` |  Nullable |
| `body` | `text` |  Nullable |
| `media_url` | `text` |  Nullable |
| `media_type` | `media_kind` |  Nullable |
| `allow_download` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `congregation_id` | `uuid` |  |
| `created_by` | `uuid` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `location` | `text` |  Nullable |
| `starts_at` | `timestamptz` |  |
| `ends_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `news`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `congregation_id` | `uuid` |  |
| `created_by` | `uuid` |  Nullable |
| `title` | `text` |  |
| `body` | `text` |  Nullable |
| `image_url` | `text` |  Nullable |
| `published_at` | `timestamptz` |  |

## Custom Types / Enums

### `membership_role`

`admin` | `leader` | `member`

### `media_kind`

`image` | `video`

## RLS Policies

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `profiles_select` | SELECT | authenticated | PERMISSIVE | `((id = ( SELECT auth.uid() AS uid)) OR shares_congregation(id))` | — |
| `profiles_update_own` | UPDATE | authenticated | PERMISSIVE | `(id = ( SELECT auth.uid() AS uid))` | `(id = ( SELECT auth.uid() AS uid))` |

### `member_contacts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `contacts_select` | SELECT | authenticated | PERMISSIVE | `((user_id = ( SELECT auth.uid() AS uid)) OR leads_user(user_id))` | — |
| `contacts_insert_own` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `contacts_update_own` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |
| `contacts_delete_own` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |

### `ministries`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ministries_select` | SELECT | authenticated | PERMISSIVE | `is_member(congregation_id)` | — |
| `ministries_insert` | INSERT | authenticated | PERMISSIVE | — | `is_leader(congregation_id)` |
| `ministries_update` | UPDATE | authenticated | PERMISSIVE | `is_leader(congregation_id)` | `is_leader(congregation_id)` |
| `ministries_delete` | DELETE | authenticated | PERMISSIVE | `is_leader(congregation_id)` | — |

### `congregations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `congregations_select` | SELECT | authenticated | PERMISSIVE | `is_member(id)` | — |
| `congregations_update` | UPDATE | authenticated | PERMISSIVE | `is_admin(id)` | `is_admin(id)` |
| `congregations_delete` | DELETE | authenticated | PERMISSIVE | `is_admin(id)` | — |

### `memberships`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `memberships_select` | SELECT | authenticated | PERMISSIVE | `is_member(congregation_id)` | — |
| `memberships_update` | UPDATE | authenticated | PERMISSIVE | `is_admin(congregation_id)` | `is_admin(congregation_id)` |
| `memberships_delete` | DELETE | authenticated | PERMISSIVE | `((user_id = ( SELECT auth.uid() AS uid)) OR is_admin(congregation_id))` | — |

### `ministry_members`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ministry_members_select` | SELECT | authenticated | PERMISSIVE | `is_member(congregation_id)` | — |
| `ministry_members_insert` | INSERT | authenticated | PERMISSIVE | — | `is_leader(congregation_id)` |
| `ministry_members_delete` | DELETE | authenticated | PERMISSIVE | `is_leader(congregation_id)` | — |

### `posts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `posts_select` | SELECT | authenticated | PERMISSIVE | `is_member(congregation_id)` | — |
| `posts_insert` | INSERT | authenticated | PERMISSIVE | — | `(is_member(congregation_id) AND (author_id = ( SELECT auth.uid() AS uid)))` |
| `posts_update` | UPDATE | authenticated | PERMISSIVE | `((author_id = ( SELECT auth.uid() AS uid)) OR is_leader(congregation_id))` | `(is_member(congregation_id) AND ((author_id = ( SELECT auth.uid() AS uid)) OR is_leader(congregation_id)))` |
| `posts_delete` | DELETE | authenticated | PERMISSIVE | `((author_id = ( SELECT auth.uid() AS uid)) OR is_leader(congregation_id))` | — |

### `events`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `events_select` | SELECT | authenticated | PERMISSIVE | `is_member(congregation_id)` | — |
| `events_insert` | INSERT | authenticated | PERMISSIVE | — | `is_leader(congregation_id)` |
| `events_update` | UPDATE | authenticated | PERMISSIVE | `is_leader(congregation_id)` | `is_leader(congregation_id)` |
| `events_delete` | DELETE | authenticated | PERMISSIVE | `is_leader(congregation_id)` | — |

### `news`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `news_select` | SELECT | authenticated | PERMISSIVE | `is_member(congregation_id)` | — |
| `news_insert` | INSERT | authenticated | PERMISSIVE | — | `is_leader(congregation_id)` |
| `news_update` | UPDATE | authenticated | PERMISSIVE | `is_leader(congregation_id)` | `is_leader(congregation_id)` |
| `news_delete` | DELETE | authenticated | PERMISSIVE | `is_leader(congregation_id)` | — |

