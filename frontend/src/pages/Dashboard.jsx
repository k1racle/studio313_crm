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
  Copy,
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
import Button from '../components/ui/Button'

const taskStatusLabels = {
  new: 'Новая',
  in_progress: 'В работе',
  approval: 'На согласовании',
  review: 'На проверке',
  content_placement: 'Выкладка контента',
  done: 'Выполнена',
  canceled: 'Отменена',
}

const taskStatusColors = {
  new: '#5B8DEF',
  in_progress: '#F59E0B',
  approval: '#EC4899',
  review: '#8B5CF6',
  content_placement: '#14B8A6',
  done: '#22C55E',
  canceled: '#64748B',
}

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
  const [activeWidget, setActiveWidget] = useState('booking')

  useEffect(() => {
    api.get('/analytics/dashboard/').then(res => setStats(res.data)).catch(console.error)
  }, [])

  const widgetOptions = useMemo(() => ([
    {
      key: 'booking',
      label: 'Запись',
      src: `${window.location.origin}/api/booking/widget/`,
      iframeCode: `<iframe src="${window.location.origin}/api/booking/widget/" width="400" height="500"></iframe>`,
    },
    {
      key: 'helpdesk',
      label: 'Helpdesk',
      src: `${window.location.origin}/api/helpdesk/widget/`,
      iframeCode: `<iframe src="${window.location.origin}/api/helpdesk/widget/" width="400" height="500"></iframe>`,
    },
  ]), [])

  const currentWidget = widgetOptions.find(item => item.key === activeWidget) || widgetOptions[0]

  const copyWidgetCode = async () => {
    try {
      await navigator.clipboard.writeText(currentWidget.iframeCode)
    } catch (error) {
      console.error(error)
    }
  }

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
        <div>
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
                    {stats.tasks_by_status.map(item => (
                      <Cell key={item.status} fill={taskStatusColors[item.status] || '#2250ff'} />
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
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {widgetOptions.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveWidget(item.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    item.key === currentWidget.key
                      ? 'bg-[linear-gradient(135deg,var(--primary),#5b7cff)] text-white shadow-[0_12px_30px_rgba(34,80,255,0.24)]'
                      : 'border border-border/80 bg-surface/88 text-text-muted hover:bg-surface-strong hover:text-text'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <Button type="button" size="sm" variant="secondary" onClick={copyWidgetCode} className="ml-auto">
                <Copy size={14} />
                Скопировать iframe
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="overflow-hidden rounded-[26px] border border-border/70 bg-[linear-gradient(180deg,#0a1020,#13254a)] p-3 shadow-[0_24px_60px_rgba(15,23,40,0.18)]">
                <div className="mb-3 flex items-center justify-between rounded-[18px] border border-white/10 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/68">
                  <span>Предпросмотр</span>
                  <span>{currentWidget.label}</span>
                </div>
                <div className="overflow-hidden rounded-[22px] bg-white">
                  <iframe
                    title={`widget-preview-${currentWidget.key}`}
                    src={currentWidget.src}
                    className="h-[520px] w-full border-0"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[24px] border border-border/70 bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  {currentWidget.iframeCode}
                </div>
                <div className="rounded-[24px] border border-border/70 bg-surface-strong/92 px-4 py-4 text-sm text-text-muted">
                  Этот iframe можно вставить на внешний сайт как есть. Встроенный блок слева показывает, как виджет выглядит для клиента до интеграции.
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
