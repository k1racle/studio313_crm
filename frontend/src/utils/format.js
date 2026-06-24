export function formatFullName(user) {
  if (!user) return '—'
  const parts = [user.last_name, user.first_name, user.patronymic].filter(Boolean)
  return parts.length ? parts.join(' ') : user.username || '—'
}

export function formatShortName(user) {
  if (!user) return '—'
  const last = user.last_name || ''
  const firstInitial = user.first_name ? `${user.first_name[0]}.` : ''
  const patronymicInitial = user.patronymic ? `${user.patronymic[0]}.` : ''
  const initials = `${firstInitial}${patronymicInitial}`.trim()
  if (last && initials) return `${last} ${initials}`
  return last || user.first_name || user.username || '—'
}

export function getInitials(user) {
  if (!user) return '?'
  const first = (user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()
  const last = user.last_name?.[0]?.toUpperCase()
  return last ? `${last}${first}` : first
}
