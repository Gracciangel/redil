import { saveAnnouncement, saveEvent, saveMember, saveSettings } from './repo'
import type { MemberRole } from './types'

interface DemoPerson {
  name: string
  phone: string
  email: string
  group: string
  role: MemberRole
}

const DEMO_PEOPLE: DemoPerson[] = [
  { name: 'María González', phone: '600 111 222', email: 'maria@ejemplo.com', group: 'Alabanza', role: 'lider' },
  { name: 'José Ramírez', phone: '600 222 333', email: 'jose@ejemplo.com', group: 'Diaconía', role: 'diacono' },
  { name: 'Ana Torres', phone: '600 333 444', email: 'ana@ejemplo.com', group: 'Escuela dominical', role: 'lider' },
  { name: 'Luis Fernández', phone: '600 444 555', email: 'luis@ejemplo.com', group: 'Jóvenes', role: 'miembro' },
  { name: 'Carmen Rojas', phone: '600 555 666', email: 'carmen@ejemplo.com', group: 'Intercesión', role: 'miembro' },
  { name: 'Pedro Salas', phone: '600 666 777', email: 'pedro@ejemplo.com', group: 'Recepción', role: 'miembro' },
  { name: 'Ruth Medina', phone: '600 777 888', email: 'ruth@ejemplo.com', group: 'Mujeres', role: 'lider' },
  { name: 'Daniel Ortiz', phone: '600 888 999', email: 'daniel@ejemplo.com', group: 'Jóvenes', role: 'miembro' },
]

/** Próxima ocurrencia del día de la semana indicado (0 = domingo). */
function nextWeekday(weekday: number, hour: number, minute = 0): string {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  const diff = (weekday - date.getDay() + 7) % 7
  date.setDate(date.getDate() + diff)
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 7)
  return date.toISOString()
}

/**
 * Carga un conjunto de datos de ejemplo para probar la app.
 * No borra lo que ya exista: añade registros.
 */
export async function loadDemoData(): Promise<void> {
  for (const person of DEMO_PEOPLE) {
    await saveMember({ ...person, notes: '' })
  }

  await saveEvent({
    title: 'Culto dominical',
    description: 'Alabanza, predicación y Santa Cena.',
    location: 'Salón principal',
    startsAt: nextWeekday(0, 10, 0),
    durationMinutes: 90,
  })

  await saveEvent({
    title: 'Estudio bíblico',
    description: 'Estudio del evangelio de Juan, capítulo a capítulo.',
    location: 'Sala de reuniones',
    startsAt: nextWeekday(3, 19, 30),
    durationMinutes: 75,
  })

  await saveEvent({
    title: 'Reunión de jóvenes',
    description: 'Tiempo de alabanza, testimonios y juegos.',
    location: 'Salón pequeño',
    startsAt: nextWeekday(5, 19, 30),
    durationMinutes: 90,
  })

  await saveEvent({
    title: 'Desayuno de mujeres',
    description: 'Compartir y orar juntas. Trae algo para desayunar.',
    location: 'Salón principal',
    startsAt: nextWeekday(6, 9, 30),
    durationMinutes: 120,
  })

  await saveAnnouncement({
    title: 'Bienvenidos a Redil',
    body: 'Esta es una congregación de ejemplo. Puedes editar o borrar estos datos desde Ajustes y empezar a registrar a tu propia congregación.',
    pinned: true,
  })

  await saveAnnouncement({
    title: 'Clases de bautismo',
    body: 'Las inscripciones están abiertas. Habla con el pastor si quieres participar.',
    pinned: false,
  })

  await saveAnnouncement({
    title: 'Colecta de alimentos',
    body: 'Este mes recogemos alimentos no perecederos para las familias del barrio. El punto de entrega está en la entrada.',
    pinned: false,
  })

  await saveSettings({ demoLoaded: true })
}
