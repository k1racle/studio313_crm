import { useEffect, useState } from 'react'
import api from '../api/axios'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Calendar, CreditCard, Users, Briefcase } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Finance() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(today)
  const [report, setReport] = useState(null)

  const load = async () => {
    const params = {}
    if (from) params.from = from
    if (to) params.to = to
    const res = await api.get('/analytics/finance/', { params })
    setReport(res.data)
  }

  useEffect(() => {
    load()
  }, [])

  const unpaidTotal = report?.unpaid?.reduce((sum, u) => sum + u.remaining_amount, 0) || 0

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Финансы</h1>
          <p className="text-text-muted">Отчёты по платежам и задолженностям</p>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <Input type="date" label="С" value={from} onChange={e => setFrom(e.target.value)} />
          <Input type="date" label="По" value={to} onChange={e => setTo(e.target.value)} />
          <Button onClick={load}>Обновить</Button>
        </div>
      </Card>

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white shrink-0">
                <CreditCard size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-text">{report.total_paid.toLocaleString('ru')} ₽</div>
                <div className="text-sm text-text-muted">Оплачено за период</div>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center text-white shrink-0">
                <Calendar size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-text">{report.unpaid.length}</div>
                <div className="text-sm text-text-muted">Неоплаченных записей</div>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shrink-0">
                <Users size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-text">{unpaidTotal.toLocaleString('ru')} ₽</div>
                <div className="text-sm text-text-muted">Сумма к оплате</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card title="Выручка по месяцам" className="lg:col-span-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.by_month}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={value => [`${value} ₽`, 'Выручка']} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="По услугам">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={report.by_service} dataKey="total" nameKey="booking__service__name" cx="50%" cy="50%" outerRadius={80} label>
                      {report.by_service.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={value => [`${value} ₽`, '']} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card title="Задолженности" className="overflow-hidden">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-text-muted">
                    <th className="pb-3 font-medium">Клиент</th>
                    <th className="pb-3 font-medium">Услуга</th>
                    <th className="pb-3 font-medium">Дата</th>
                    <th className="pb-3 font-medium">Статус</th>
                    <th className="pb-3 font-medium">Сумма</th>
                    <th className="pb-3 font-medium">Оплачено</th>
                    <th className="pb-3 font-medium">Остаток</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {report.unpaid.map(u => (
                    <tr key={u.id} className="border-b border-border hover:bg-subtle">
                      <td className="py-3 text-text">{u.client__name}</td>
                      <td className="py-3 text-text">{u.service__name}</td>
                      <td className="py-3 text-text-muted">{new Date(u.start_time).toLocaleString('ru')}</td>
                      <td className="py-3"><Badge variant={u.status === 'pending' ? 'yellow' : u.status === 'confirmed' ? 'blue' : 'gray'}>{u.status}</Badge></td>
                      <td className="py-3 text-text">{u.service__price.toLocaleString('ru')} ₽</td>
                      <td className="py-3 text-success">{u.paid_amount.toLocaleString('ru')} ₽</td>
                      <td className="py-3 text-danger font-medium">{u.remaining_amount.toLocaleString('ru')} ₽</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.unpaid.length === 0 && <div className="p-4 text-center text-text-muted">Нет задолженностей</div>}
          </Card>
        </>
      )}
    </div>
  )
}
