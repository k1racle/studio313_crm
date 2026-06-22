export default function Badge({ children, variant = 'gray' }) {
  const variants = {
    gray: 'bg-subtle text-text',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
    green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
    red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}
