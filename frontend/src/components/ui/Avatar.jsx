import { getInitials } from '../../utils/format'

export default function Avatar({ user, size = 32, className = '' }) {
  const style = { width: size, height: size }
  const textSize = size < 28 ? 'text-[10px]' : size < 40 ? 'text-xs' : 'text-sm'

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt=""
        className={`rounded-full object-cover ${className}`}
        style={style}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-primary text-white flex items-center justify-center font-semibold ${textSize} ${className}`}
      style={style}
    >
      {getInitials(user)}
    </div>
  )
}
