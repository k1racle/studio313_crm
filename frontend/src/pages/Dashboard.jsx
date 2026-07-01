import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { CheckSquare, Users, Calendar, HeadphonesIcon, ArrowRight, Code, CreditCard, AlertCircle, Clock } from 'lucide-react'

const taskStatusLabels = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  content_placement: 'Выкладка контента',
  done: 'Выполнена',
  canceled: 'Отменена',
}

const taskStatusVariant = {
  new: 'blue',
  in_progress: 'yellow',
  review: 'purple',
  content_placement: 'indigo',
  done: 'green',
  canceled: 'gray',
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const quickLinks = [
  { path: '/tasks', label: 'Задачи', desc: 'Kanban и список', icon: CheckSquare },
  { path: '/bookings', label: 'Запись', desc: 'Календарь и оплата', icon: Calendar },
  { path: '/projects', label: 'Проекты', desc: 'Управление проектами', icon: Code },
  { path: '/finance', label: 'Финансы', desc: 'Отчёты и долги', icon: CreditCard },
  { path: '/helpdesk', label: 'Хелпдеск', desc: 'Обращения клиентов', icon: HeadphonesIcon },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/analytics/dashboard/').then(res => setStats(res.data)).catch(console.error)
  }, [])

  const statItems = [
    { key: 'active_tasks', label: 'Активные задачи', icon: CheckSquare, color: 'bg-blue-500', value: stats ? stats.tasks_by_status.reduce((s, i) => s + (['done', 'canceled'].includes(i.status) ? 0 : i.count), 0) : 0 },
    { key: 'clients', label: 'Клиенты', icon: Users, color: 'bg-green-500', value: stats ? '—' : 0 },
    { key: 'bookings', label: 'Записи', icon: Calendar, color: 'bg-purple-500', value: stats ? stats.bookings_by_status.reduce((s, i) => s + i.count, 0) : 0 },
    { key: 'paid', label: 'Оплачено', icon: CreditCard, color: 'bg-orange-500', value: stats ? `${Math.round(stats.totals.paid).toLocaleString('ru')} ₽` : '0 ₽' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Главная</h1>
        <p className="text-text-muted">Обзор активности студии</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {statItems.map(item => {
          const Icon = item.icon
          return (
            <Card key={item.key} className="flex items-center gap-4">
              <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-white shrink-0`}>
                <Icon size={24} />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-text">{stats ? item.value : '—'}</div>
                <div className="text-sm text-text-muted truncate">{item.label}</div>
              </div>
            </Card>
          )
        })}
      </div>

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card title="Выручка по месяцам" className="lg:col-span-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.revenue_by_month}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={value => [`${value} ₽`, 'Выручка']} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Задачи по статусам">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.tasks_by_status} dataKey="count" nameKey="status" cx="40%" cy="50%" outerRadius={70} label>
                    {stats.tasks_by_status.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={value => [value, 'Кол-во']} />
                  <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12 }} formatter={value => taskStatusLabels[value] || value} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card title="Горящие дедлайны">
            <div className="space-y-3">
              {stats.upcoming_deadlines.length ? stats.upcoming_deadlines.map(t => (
                <Link key={t.id} to={`/tasks?task=${t.id}`} className="flex items-center justify-between p-3 bg-subtle rounded-lg hover:bg-primary/10 transition-colors">
                  <div>
                    <div className="font-medium text-text">{t.title}</div>
                    <div className="text-xs text-text-muted">{t.assignee__first_name || t.assignee__username || 'Не назначен'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-danger">{new Date(t.due_date).toLocaleString('ru')}</div>
                    <Badge variant={taskStatusVariant[t.status]}>{taskStatusLabels[t.status]}</Badge>
                  </div>
                </Link>
              )) : <div className="text-text-muted text-sm">Нет горящих дедлайнов</div>}
            </div>
          </Card>
          <Card title="Должники">
            <div className="space-y-3">
              {stats.debtors.length ? stats.debtors.map(d => (
                <Link key={d.id} to="/finance" className="flex items-center justify-between p-3 bg-subtle rounded-lg hover:bg-primary/10 transition-colors">
                  <div>
                    <div className="font-medium text-text">{d.client__name}</div>
                    <div className="text-xs text-text-muted">{d.service__name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-danger">{d.remaining_amount.toLocaleString('ru')} ₽</div>
                    <div className="text-xs text-text-muted">из {d.service__price.toLocaleString('ru')} ₽</div>
                  </div>
                </Link>
              )) : <div className="text-text-muted text-sm">Нет задолженностей</div>}
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card title="Быстрые ссылки">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickLinks.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="group p-4 border border-border rounded-lg hover:border-primary hover:shadow-sm transition-all bg-surface"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={20} className="text-primary" />
                    <ArrowRight size={16} className="text-text-muted group-hover:text-primary transition-colors" />
                  </div>
                  <div className="font-medium text-text">{item.label}</div>
                  <div className="text-sm text-text-muted">{item.desc}</div>
                </Link>
              )
            })}
          </div>
        </Card>
        <Card title="Виджеты для сайта">
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-subtle rounded-lg font-mono break-all text-xs text-text-muted">
              &lt;iframe src=&quot;{window.location.origin}/api/booking/widget/&quot; width=&quot;400&quot; height=&quot;500&quot;&gt;&lt;/iframe&gt;
            </div>
            <div className="p-3 bg-subtle rounded-lg font-mono break-all text-xs text-text-muted">
              &lt;iframe src=&quot;{window.location.origin}/api/helpdesk/widget/&quot; width=&quot;400&quot; height=&quot;500&quot;&gt;&lt;/iframe&gt;
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
