import { useMemo, useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'

import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function Integrations() {
  const [activeWidget, setActiveWidget] = useState('booking')

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

  return (
    <div className="space-y-6">
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
            <a
              href={currentWidget.src}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/88 px-4 py-2 text-sm font-semibold text-text-muted transition-all hover:bg-surface-strong hover:text-text"
            >
              <ExternalLink size={14} />
              Открыть отдельно
            </a>
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
                Если встроенный предпросмотр на вашем домене всё ещё режется браузером, используйте кнопку
                {' '}
                <span className="font-semibold text-text">«Открыть отдельно»</span>
                {' '}
                для быстрой проверки самого widget endpoint.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
