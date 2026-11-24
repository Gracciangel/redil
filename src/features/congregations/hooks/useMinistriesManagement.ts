import { useEffect, useState } from 'react'
import type { MinistryItem } from './useMinistriesData'
import { useMinistriesData } from './useMinistriesData'
import { useMinistryCrud } from './useMinistryCrud'

/** Viewmodel de Ministerios: compone carga, selección y acciones de edición. */
export function useMinistriesManagement() {
  const [selectedId, setSelectedId] = useState('')
  const data = useMinistriesData(selectedId)
  const crud = useMinistryCrud(data.isTenant)

  useEffect(() => {
    if (selectedId || data.ministries.length === 0) return
    setSelectedId(data.ministries[0].id)
  }, [data.ministries, selectedId])

  function openEdit(item: MinistryItem) {
    setSelectedId(item.id)
    crud.openEdit(item)
  }

  return { ...data, ...crud, selectedId, setSelectedId, openEdit }
}
