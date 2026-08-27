import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckSquare,
  Clapperboard,
  CreditCard,
  Layers3,
  Newspaper,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import api from '../api/axios'
import Card from '../components/ui/Card'
import WorkdayOverview from '../components/WorkdayOverview'
import { useAuth } from '../contexts/AuthContext'

const taskStatusColors = {
  new: '#5B8DEF',
  in_progress: '#F59E0B',
  approval: '#EC4899',
  review: '#8B5CF6',
  content_placement: '#14B8A6',
  done: '#22C55E',
  canceled: '#64748B',
}

const productionStatusColors = {
  new: '#5B8DEF',
  shooting: '#F97316',
  editing: '#8B5CF6',
  review: '#14B8A6',
  corrections: '#EC4899',
  sent_to_client: '#22C55E',
}

const publicationStatusColors = {
  draft: '#64748B',
  approval: '#EC4899',
  scheduled: '#5B8DEF',
  published: '#22C55E',
  cancelled: '#F97316',
}

const quickLinks = [
  { path: '/tasks', label: 'Задачи', desc: 'Kanban, календарь и список задач', icon: CheckSquare, permission: 'tasks.view' },
  { path: '/bookings', label: 'Запись', desc: 'Календарь и клиентские слоты', icon: Calendar, permission: 'bookings.view' },
  { path: '/projects', label: 'Проекты', desc: 'Управление студийными проектами', icon: Layers3, permission: 'projects.view' },
  { path: '/production', label: 'Производство', desc: 'Съёмка, монтаж, отсмотр и правки', icon: Clapperboard, permission: 'production.view' },
  { path: '/media-plan', label: 'Медиа-план', desc: 'Контент, площадки и публикации', icon: Newspaper, permission: 'media_plan.view' },
  { path: '/finance', label: 'Финансы', desc: 'Платежи, долги и отчёты', icon: CreditCard, permission: 'finance.view' },
]

function StatusChartCard({ title, eyebrow, data, colors, icon: Icon }) {
  return (
    <Card
      title={title}
      eyebrow={eyebrow}
      action={(
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={18} />
        </span>
      )}
      className="h-full"
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={18} margin={{ top: 8, right: 8, left: -18, bottom: 34 }}>
            <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.18)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              angle={-18}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip
              cursor={{ fill: 'rgba(34,80,255,0.06)' }}
              formatter={(value) => [value, 'Количество']}
              labelFormatter={(label) => label}
            />
            <Bar dataKey="count" radius={[10, 10, 0, 0]} maxBarSize={44}>
              {data.map(item => (
                <Cell key={item.status} fill={colors[item.status] || '#2250ff'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (user?.capabilities?.includes('finance.view')) {
      api.get('/analytics/dashboard/').then(res => setStats(res.data)).catch(console.error)
    }
  }, [user?.capabilities])

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
      <WorkdayOverview />
      <section className="soft-panel overflow-hidden rounded-[34px]">
        <div className="rounded-[30px] bg-[linear-gradient(160deg,#0b1322,#112241_55%,#1e4cff)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,40,0.26)]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickLinks.filter(item => user?.capabilities?.includes(item.permission)).map(item => {
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

      {stats && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <StatusChartCard
            title="Статусы задач"
            eyebrow="Нагрузка"
            data={stats.tasks_by_status}
            colors={taskStatusColors}
            icon={CheckSquare}
          />
          <StatusChartCard
            title="Статусы производства"
            eyebrow="Продакшн"
            data={stats.productions_by_status}
            colors={productionStatusColors}
            icon={Clapperboard}
          />
          <StatusChartCard
            title="Статусы медиаплана"
            eyebrow="Контент"
            data={stats.publications_by_status}
            colors={publicationStatusColors}
            icon={BarChart3}
          />
        </section>
      )}
    </div>
  )
}
