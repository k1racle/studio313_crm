import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  Clapperboard,
  CreditCard,
  Layers3,
  Newspaper,
  Users,
} from 'lucide-react'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

import api from '../api/axios'
import Card from '../components/ui/Card'

const taskStatusLabels = {
  new: 'Новая',
  in_progress: 'В работе',
  approval: 'На согласовании',
  review: 'На проверке',
  content_placement: 'Выкладка контента',
  done: 'Выполнена',
  canceled: 'Отменена',
}

const chartColors = ['#2250ff', '#5b7cff', '#0f1728', '#4d6edb', '#7c93ff', '#9bb0ff']

const quickLinks = [
  { path: '/tasks', label: 'Задачи', desc: 'Kanban, календарь и список задач', icon: CheckSquare },
  { path: '/bookings', label: 'Запись', desc: 'Календарь и клиентские слоты', icon: Calendar },
  { path: '/projects', label: 'Проекты', desc: 'Управление студийными проектами', icon: Layers3 },
  { path: '/production', label: 'Производство', desc: 'Съемка, монтаж, отсмотр и правки', icon: Clapperboard },
  { path: '/media-plan', label: 'Медиа-план', desc: 'Контент, площадки и публикации', icon: Newspaper },
  { path: '/finance', label: 'Финансы', desc: 'Платежи, долги и отчеты', icon: CreditCard },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/analytics/dashboard/').then(res => setStats(res.data)).catch(console.error)
  }, [])

  const statItems = useMemo(() => ([
    {
      key: 'active_tasks',
      label: 'Активные задачи',
      value: stats ? stats.tasks_by_status.reduce((sum, item) => sum + (['done', 'canceled'].includes(item.status) ? 0 : item.count), 0) : '—',
      icon: CheckSquare,
      tone: 'from-blue-600 to-blue-500',
    },
    {
      key: 'clients',
      label: 'Клиенты',
      value: stats?.totals?.clients ?? stats?.clients_count ?? '—',
      icon: Users,
      tone: 'from-slate-900 to-slate-700',
    },
    {
      key: 'bookings',
      label: 'Записи',
      value: stats ? stats.bookings_by_status.reduce((sum, item) => sum + item.count, 0) : '—',
      icon: Calendar,
      tone: 'from-indigo-600 to-blue-500',
    },
    {
      key: 'paid',
      label: 'Оплачено',
      value: stats ? `${Math.round(stats.totals.paid).toLocaleString('ru-RU')} ₽` : '—',
      icon: CreditCard,
      tone: 'from-blue-700 to-slate-900',
    },
  ]), [stats])

  return (
    <div className="space-y-6">
      <section className="soft-panel overflow-hidden rounded-[34px]">
        <div className="px-6 py-7 md:px-8 lg:py-8">
          <div className="rounded-[30px] bg-[linear-gradient(160deg,#0b1322,#112241_55%,#1e4cff)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,40,0.26)]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {quickLinks.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="rounded-[22px] border border-white/10 bg-white/8 p-4 transition-all hover:-translate-y-0.5 hover:bg-white/12"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <Icon size={18} className="text-blue-200" />
                      <ArrowRight size={15} className="text-white/54" />
                    </div>
                    <div className="font-semibold">{item.label}</div>
                    <div className="mt-1 text-sm text-white/62">{item.desc}</div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statItems.map(item => {
          const Icon = item.icon
          return (
            <Card key={item.key} className="animate-fade-in" bodyClassName="p-5">
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br ${item.tone} text-white shadow-[0_14px_34px_rgba(15,23,40,0.18)]`}>
                  <Icon size={24} />
                </div>
                <div className="min-w-0">
                  <div className="text-3xl font-semibold text-text">{item.value}</div>
                  <div className="mt-1 text-sm text-text-muted">{item.label}</div>
                </div>
              </div>
            </Card>
          )
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        {stats && (
          <Card title="Статусы задач" eyebrow="Нагрузка">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.tasks_by_status} dataKey="count" nameKey="status" cx="40%" cy="50%" outerRadius={78} innerRadius={42}>
                    {stats.tasks_by_status.map((item, index) => (
                      <Cell key={item.status} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={value => [value, 'Количество']} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={value => taskStatusLabels[value] || value}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <Card title="Виджеты для сайта" eyebrow="Интеграции">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-border/70 bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              {`<iframe src="${window.location.origin}/api/booking/widget/" width="400" height="500"></iframe>`}
            </div>
            <div className="rounded-[24px] border border-border/70 bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              {`<iframe src="${window.location.origin}/api/helpdesk/widget/" width="400" height="500"></iframe>`}
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
