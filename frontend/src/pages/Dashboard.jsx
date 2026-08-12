import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  CreditCard,
  HeadphonesIcon,
  Layers3,
  Sparkles,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import api from '../api/axios'
import Badge from '../components/ui/Badge'
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

const taskStatusVariant = {
  new: 'blue',
  in_progress: 'yellow',
  approval: 'cyan',
  review: 'purple',
  content_placement: 'indigo',
  done: 'green',
  canceled: 'gray',
}

const chartColors = ['#2250ff', '#5b7cff', '#0f1728', '#4d6edb', '#7c93ff', '#9bb0ff']

const quickLinks = [
  { path: '/tasks', label: 'Задачи', desc: 'Kanban, календарь и список задач', icon: CheckSquare },
  { path: '/bookings', label: 'Запись', desc: 'Календарь и клиентские слоты', icon: Calendar },
  { path: '/projects', label: 'Проекты', desc: 'Управление студийными проектами', icon: Layers3 },
  { path: '/finance', label: 'Финансы', desc: 'Платежи, долги и отчеты', icon: CreditCard },
  { path: '/helpdesk', label: 'Хелпдеск', desc: 'Запросы и клиентская поддержка', icon: HeadphonesIcon },
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
        <div className="grid gap-6 px-6 py-7 md:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:py-8">
          <div>
            <div className="kicker text-primary">Обзор студии</div>
            <h1 className="page-title mt-3 text-text">CRM, которая выглядит как продукт, а не как шаблонная админка.</h1>
            <p className="page-subtitle mt-4 text-base leading-7">
              Здесь быстрый доступ к операционке студии: задачи, запись клиентов, проекты, долги, доступы и внутренняя работа команды.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Badge variant="blue">Studio 313</Badge>
              <Badge variant="indigo">Синий / Белый / Черный</Badge>
              <Badge variant="gray">Рабочая CRM</Badge>
            </div>
          </div>

          <div className="rounded-[30px] bg-[linear-gradient(160deg,#0b1322,#112241_55%,#1e4cff)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,40,0.26)]">
            <div className="mb-3 flex items-center gap-2 text-blue-100/84">
              <Sparkles size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.22em]">Быстрый старт</span>
            </div>
            <div className="text-2xl font-semibold leading-tight">Основные действия команды доступны в один клик.</div>
            <div className="mt-4 text-sm leading-6 text-white/70">
              Сделали упор на аккуратную навигацию, более статусный визуал и комфортную повседневную работу без визуального шума.
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {quickLinks.slice(0, 4).map(item => {
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

      {stats && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card title="Выручка по месяцам" eyebrow="Финансы">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.revenue_by_month}>
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#5f6b85' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#5f6b85' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={value => [`${value} ₽`, 'Выручка']} />
                  <Bar dataKey="total" fill="#2250ff" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

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
        </section>
      )}

      {stats && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card title="Горящие дедлайны" eyebrow="Приоритет">
            <div className="space-y-3">
              {stats.upcoming_deadlines.length ? stats.upcoming_deadlines.map(task => (
                <Link
                  key={task.id}
                  to={`/tasks?task=${task.id}`}
                  className="flex items-center justify-between gap-4 rounded-[24px] border border-border/70 bg-surface/60 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,40,0.05)] transition-all hover:-translate-y-0.5 hover:border-primary/20"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-text">{task.title}</div>
                    <div className="mt-1 text-sm text-text-muted">
                      {task.assignees?.length ? task.assignees.map(user => user.first_name || user.username).join(', ') : 'Исполнитель не назначен'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-danger">{new Date(task.due_date).toLocaleString('ru-RU')}</div>
                    <div className="mt-2">
                      <Badge variant={taskStatusVariant[task.status] || 'gray'}>{taskStatusLabels[task.status] || task.status}</Badge>
                    </div>
                  </div>
                </Link>
              )) : <div className="text-sm text-text-muted">Срочных дедлайнов нет</div>}
            </div>
          </Card>

          <Card title="Должники" eyebrow="Финансы">
            <div className="space-y-3">
              {stats.debtors.length ? stats.debtors.map(item => (
                <Link
                  key={item.id}
                  to="/finance"
                  className="flex items-center justify-between gap-4 rounded-[24px] border border-border/70 bg-surface/60 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,40,0.05)] transition-all hover:-translate-y-0.5 hover:border-primary/20"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-text">{item.client__name}</div>
                    <div className="mt-1 text-sm text-text-muted">{item.service__name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-danger">{item.remaining_amount.toLocaleString('ru-RU')} ₽</div>
                    <div className="mt-1 text-xs text-text-muted">из {item.service__price.toLocaleString('ru-RU')} ₽</div>
                  </div>
                </Link>
              )) : <div className="text-sm text-text-muted">Задолженностей нет</div>}
            </div>
          </Card>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Быстрые ссылки" eyebrow="Навигация">
          <div className="grid gap-3 md:grid-cols-2">
            {quickLinks.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="group rounded-[24px] border border-border/70 bg-surface/60 p-4 shadow-[0_10px_24px_rgba(15,23,40,0.05)] transition-all hover:-translate-y-0.5 hover:border-primary/20"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                      <Icon size={20} />
                    </span>
                    <ArrowRight size={15} className="text-text-muted transition-colors group-hover:text-primary" />
                  </div>
                  <div className="font-semibold text-text">{item.label}</div>
                  <div className="mt-1 text-sm text-text-muted">{item.desc}</div>
                </Link>
              )
            })}
          </div>
        </Card>

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
