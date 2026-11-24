import { Dialog, DialogTitle } from '@mui/material'
import type { MinistryItem } from '../hooks/useMinistriesData'
import { MinistryEditForm, type MinistryEditFormProps } from './MinistryEditForm'

interface Props extends MinistryEditFormProps {
  open: boolean
  item: MinistryItem | null
}

/** Modal de edición de un ministerio o grupo, con líder e integrantes. */
export function MinistryEditDialog({ open, item, ...form }: Props) {
  if (!item) return null
  return (
    <Dialog
      open={open}
      onClose={form.busy !== null ? undefined : form.onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Editar {item.isGroup ? 'grupo' : 'ministerio'}</DialogTitle>
      <MinistryEditForm {...form} />
    </Dialog>
  )
}
