/**
 * Versiones de datos por canal. `bump()` sin canal sigue notificando a todos;
 * `bump('stats')` solo a quienes se suscribieron a ese canal.
 */
interface Subscription {
  listener: () => void
  channel?: string
}

let version = 0
const channelVersions = new Map<string, number>()
const listeners = new Set<Subscription>()

export function getVersion(channel?: string): number {
  return channel ? channelVersions.get(channel) ?? 0 : version
}

export function subscribe(listener: () => void, channel?: string): () => void {
  const subscription: Subscription = { listener, channel }
  if (channel && !channelVersions.has(channel)) channelVersions.set(channel, 0)
  listeners.add(subscription)
  return () => {
    listeners.delete(subscription)
  }
}

export function bump(channel?: string): void {
  if (channel) {
    channelVersions.set(channel, getVersion(channel) + 1)
    for (const subscription of listeners) {
      if (subscription.channel === channel) subscription.listener()
    }
    return
  }

  version += 1
  for (const active of channelVersions.keys()) {
    channelVersions.set(active, getVersion(active) + 1)
  }
  for (const subscription of listeners) subscription.listener()
}
