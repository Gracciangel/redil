import { lazy } from 'react'

/** Carga diferida de vistas: el bundle inicial no arrastra las 16 pantallas. */
export const DashboardView = lazy(() =>
  import('@/views/DashboardView').then((m) => ({ default: m.DashboardView })),
)
export const MembersView = lazy(() =>
  import('@/views/MembersView').then((m) => ({ default: m.MembersView })),
)
export const EventsView = lazy(() =>
  import('@/views/EventsView').then((m) => ({ default: m.EventsView })),
)
export const AnnouncementsView = lazy(() =>
  import('@/views/AnnouncementsView').then((m) => ({ default: m.AnnouncementsView })),
)
export const SettingsView = lazy(() =>
  import('@/views/SettingsView').then((m) => ({ default: m.SettingsView })),
)
export const NotFoundView = lazy(() =>
  import('@/views/NotFoundView').then((m) => ({ default: m.NotFoundView })),
)
export const PrincipalView = lazy(() =>
  import('@/views/PrincipalView').then((m) => ({ default: m.PrincipalView })),
)
export const CongregationHomeView = lazy(() =>
  import('@/views/CongregationHomeView').then((m) => ({ default: m.CongregationHomeView })),
)
export const MemberHomeView = lazy(() =>
  import('@/views/MemberHomeView').then((m) => ({ default: m.MemberHomeView })),
)
export const MemberProfileView = lazy(() =>
  import('@/views/MemberProfileView').then((m) => ({ default: m.MemberProfileView })),
)
export const AccessRequiredView = lazy(() =>
  import('@/views/AccessRequiredView').then((m) => ({ default: m.AccessRequiredView })),
)
export const CodeView = lazy(() =>
  import('@/views/CodeView').then((m) => ({ default: m.CodeView })),
)
export const ProfileView = lazy(() =>
  import('@/views/ProfileView').then((m) => ({ default: m.ProfileView })),
)
export const BibleView = lazy(() =>
  import('@/views/BibleView').then((m) => ({ default: m.BibleView })),
)
export const CalendarView = lazy(() =>
  import('@/views/CalendarView').then((m) => ({ default: m.CalendarView })),
)
export const MinistriesView = lazy(() =>
  import('@/views/MinistriesView').then((m) => ({ default: m.MinistriesView })),
)
export const DirectoryView = lazy(() =>
  import('@/views/DirectoryView').then((m) => ({ default: m.DirectoryView })),
)
