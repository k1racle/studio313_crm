export function formatFullName(user) {
  if (!user) return '—'
  const parts = [user.last_name, user.first_name, user.patronymic].filter(Boolean)
  return parts.length ? parts.join(' ') : user.username || '—'
}

export function formatShortName(user) {
  if (!user) return '—'
  const first = user.first_name || user.username || ''
  const last = user.last_name || ''
  if (last && first) return `${last} ${first}`
  return first || last || user.username || '—'
}
