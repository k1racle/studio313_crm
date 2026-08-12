import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Calendar, CreditCard, Users } from 'lucide-react'

import api from '../api/axios'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

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

  const unpaidTotal = report?.unpaid?.reduce((sum, item) => sum + item.remaining_amount, 0) || 0

  return (
    <div>
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[220px_220px_auto]">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm text-text-muted">С</span>
            <Input type="date" value={from} onChange={event => setFrom(event.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm text-text-muted">По</span>
            <Input type="date" value={to} onChange={event => setTo(event.target.value)} />
          </div>
          <div className="flex items-center xl:justify-end">
            <Button onClick={load}>Обновить</Button>
          </div>
        </div>
      </Card>

      {report && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="animate-fade-in" bodyClassName="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-[0_14px_34px_rgba(16,185,129,0.22)]">
                  <CreditCard size={24} />
                </div>
                <div className="min-w-0">
                  <div className="text-3xl font-semibold text-text">{report.total_paid.toLocaleString('ru-RU')} ₽</div>
                  <div className="mt-1 text-sm text-text-muted">Оплачено за период</div>
                </div>
              </div>
            </Card>

            <Card className="animate-fade-in" bodyClassName="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-[0_14px_34px_rgba(239,68,68,0.22)]">
                  <Calendar size={24} />
                </div>
                <div className="min-w-0">
                  <div className="text-3xl font-semibold text-text">{report.unpaid.length}</div>
                  <div className="mt-1 text-sm text-text-muted">Неоплаченных записей</div>
                </div>
              </div>
            </Card>

            <Card className="animate-fade-in" bodyClassName="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_14px_34px_rgba(249,115,22,0.22)]">
                  <Users size={24} />
                </div>
                <div className="min-w-0">
                  <div className="text-3xl font-semibold text-text">{unpaidTotal.toLocaleString('ru-RU')} ₽</div>
                  <div className="mt-1 text-sm text-text-muted">Сумма к оплате</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
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
                      {report.by_service.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
            <div className="-mx-6 overflow-x-auto px-6">
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
                  {report.unpaid.map(item => (
                    <tr key={item.id} className="border-b border-border hover:bg-subtle">
                      <td className="py-3 text-text">{item.client__name}</td>
                      <td className="py-3 text-text">{item.service__name}</td>
                      <td className="py-3 text-text-muted">{new Date(item.start_time).toLocaleString('ru-RU')}</td>
                      <td className="py-3">
                        <Badge variant={item.status === 'pending' ? 'yellow' : item.status === 'confirmed' ? 'blue' : 'gray'}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-text">{item.service__price.toLocaleString('ru-RU')} ₽</td>
                      <td className="py-3 text-success">{item.paid_amount.toLocaleString('ru-RU')} ₽</td>
                      <td className="py-3 font-medium text-danger">{item.remaining_amount.toLocaleString('ru-RU')} ₽</td>
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
