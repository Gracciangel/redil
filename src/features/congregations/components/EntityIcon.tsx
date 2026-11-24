import type { SvgIconComponent } from '@mui/icons-material'
import type { SvgIconProps } from '@mui/material'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import ChurchOutlinedIcon from '@mui/icons-material/ChurchOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import ChildCareOutlinedIcon from '@mui/icons-material/ChildCareOutlined'
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import VideoCameraFrontOutlinedIcon from '@mui/icons-material/VideoCameraFrontOutlined'
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined'

/** Tipos con ícono por defecto, usados en el Home y en el directorio. */
export type EntityKind = 'members' | 'ministries' | 'groups' | 'events' | 'announcements'

export const ENTITY_ICONS: Record<EntityKind, SvgIconComponent> = {
  members: PeopleOutlinedIcon,
  ministries: ChurchOutlinedIcon,
  groups: GroupsOutlinedIcon,
  events: EventOutlinedIcon,
  announcements: CampaignOutlinedIcon,
}

/** Claves guardadas en `ministries.icon`, con etiqueta para los selectores. */
export const MINISTRY_ICON_OPTIONS: ReadonlyArray<{
  key: string
  label: string
  icon: SvgIconComponent
}> = [
  { key: 'ministry', label: 'Ministerio', icon: ChurchOutlinedIcon },
  { key: 'group', label: 'Grupo', icon: GroupsOutlinedIcon },
  { key: 'music', label: 'Música', icon: MusicNoteOutlinedIcon },
  { key: 'word', label: 'Palabra', icon: MenuBookOutlinedIcon },
  { key: 'children', label: 'Niños', icon: ChildCareOutlinedIcon },
  { key: 'charity', label: 'Caridad', icon: FavoriteOutlinedIcon },
  { key: 'home', label: 'Casa / hogar', icon: HomeOutlinedIcon },
  { key: 'teaching', label: 'Enseñanza', icon: SchoolOutlinedIcon },
  { key: 'media', label: 'Medios', icon: VideoCameraFrontOutlinedIcon },
  { key: 'service', label: 'Servicio', icon: HandshakeOutlinedIcon },
]

export function iconFor(kind: EntityKind, iconKey?: string | null): SvgIconComponent {
  return MINISTRY_ICON_OPTIONS.find((option) => option.key === iconKey)?.icon ?? ENTITY_ICONS[kind]
}

export interface EntityIconProps extends SvgIconProps {
  kind: EntityKind
  /** Clave de `ministries.icon`; si no existe, usa el ícono del tipo. */
  iconKey?: string | null
}

/** Ícono compartido: miembros, ministerios, grupos, eventos y avisos. */
export function EntityIcon({ kind, iconKey, ...props }: EntityIconProps) {
  const Icon = iconFor(kind, iconKey)
  return <Icon {...props} />
}
