import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingList } from '@/components/Feedback'
import { Icon } from '@/components/Icons'
import { InstallCard } from '@/components/InstallCard'
import {
  dateBadge,
  formatEventDay,
  formatLongDate,
  formatRelative,
  formatTimeRange,
} from '@/lib/format'
import { useAsyncData } from '@/lib/hooks'
import { listAnnouncements, listEvents, listMembers } from '@/lib/repo'
import { useSettings } from '@/lib/settings'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 13) return 'Buenos días'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function DashboardPage() {
  const { settings } = useSettings()
  const { data, loading, error } = useAsyncData(async () => {
    const [members, events, announcements] = await Promise.all([
      listMembers(),
      listEvents(),
      listAnnouncements(),
    ])
    return { members, events, announcements }
  })

  if (error) return <ErrorState message={error.message} />

  const now = Date.now()
  const upcoming = (data?.events ?? [])
    .filter(
      (event) =>
        new Date(event.startsAt).getTime() + event.durationMinutes * 60_000 >= now,
    )
    .slice(0, 4)
  const latestAnnouncements = (data?.announcements ?? []).slice(0, 3)

  return (
    <div className="page">
      <header className="dashboard-hero">
        <p className="eyebrow">Inicio</p>
        <h1>{greeting()}</h1>
        <p className="page-subtitle">
          {formatLongDate()} · {settings.congregationName}
        </p>
      </header>

      <InstallCard />

      {loading && !data ? (
        <LoadingList rows={4} />
      ) : (
        <>
          <section className="stats-grid" aria-label="Resumen">
            <Link to="/miembros" className="stat-card">
              <span className="stat-icon stat-icon-users">
                <Icon name="users" size={20} />
              </span>
              <span className="stat-value">{data?.members.length ?? 0}</span>
              <span className="stat-label">Miembros</span>
            </Link>
            <Link to="/eventos" className="stat-card">
              <span className="stat-icon stat-icon-events">
                <Icon name="calendar" size={20} />
              </span>
              <span className="stat-value">
                {(data?.events ?? []).filter(
                  (event) =>
                    new Date(event.startsAt).getTime() +
                      event.durationMinutes * 60_000 >=
                    now,
                ).length}
              </span>
              <span className="stat-label">Eventos próximos</span>
            </Link>
            <Link to="/avisos" className="stat-card">
              <span className="stat-icon stat-icon-announcements">
                <Icon name="megaphone" size={20} />
              </span>
              <span className="stat-value">{data?.announcements.length ?? 0}</span>
              <span className="stat-label">Avisos</span>
            </Link>
          </section>

          <div className="dashboard-grid">
            <section className="panel" aria-labelledby="next-events-title">
              <header className="panel-header">
                <h2 id="next-events-title">Próximos eventos</h2>
                <Link to="/eventos" className="text-link">
                  Ver todos <Icon name="chevronRight" size={16} />
                </Link>
              </header>

              {upcoming.length === 0 ? (
                <EmptyState
                  icon="calendar"
                  title="No hay eventos próximos"
                  description="Añade un culto, un estudio bíblico o una actividad."
                  action={
                    <Link to="/eventos" className="btn btn-secondary btn-sm">
                      <Icon name="plus" size={16} />
                      Crear evento
                    </Link>
                  }
                />
              ) : (
                <ul className="event-mini-list">
                  {upcoming.map((event) => {
                    const badge = dateBadge(event.startsAt)
                    return (
                      <li key={event.id} className="event-mini">
                        <span className="date-badge date-badge-sm">
                          <span>{badge.weekday}</span>
                          <strong>{badge.day}</strong>
                          <span>{badge.month}</span>
                        </span>
                        <div className="event-mini-copy">
                          <h3>{event.title}</h3>
                          <p>
                            {formatEventDay(event.startsAt)} ·{' '}
                            {formatTimeRange(event.startsAt, event.durationMinutes)}
                            {event.location ? ` · ${event.location}` : ''}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="panel" aria-labelledby="latest-announcements-title">
              <header className="panel-header">
                <h2 id="latest-announcements-title">Últimos avisos</h2>
                <Link to="/avisos" className="text-link">
                  Ver todos <Icon name="chevronRight" size={16} />
                </Link>
              </header>

              {latestAnnouncements.length === 0 ? (
                <EmptyState
                  icon="megaphone"
                  title="Todavía no hay avisos"
                  description="Publica información importante para la congregación."
                  action={
                    <Link to="/avisos" className="btn btn-secondary btn-sm">
                      <Icon name="plus" size={16} />
                      Publicar aviso
                    </Link>
                  }
                />
              ) : (
                <ul className="announcement-mini-list">
                  {latestAnnouncements.map((announcement) => (
                    <li key={announcement.id} className="announcement-mini">
                      <div className="announcement-mini-top">
                        <h3>{announcement.title}</h3>
                        {announcement.pinned && (
                          <span className="badge badge-pinned">
                            <Icon name="pin" size={12} />
                            Fijado
                          </span>
                        )}
                      </div>
                      <p className="announcement-mini-body">{announcement.body}</p>
                      <p className="announcement-mini-date">
                        {formatRelative(announcement.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
