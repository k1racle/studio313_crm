import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'

import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

function buildResponsiveIframeCode(src, title, maxWidth, minHeight) {
  return `<div style="width:100%;max-width:${maxWidth}px;">
  <iframe
    src="${src}"
    title="${title}"
    loading="lazy"
    scrolling="no"
    style="display:block;width:100%;min-height:${minHeight}px;border:0;overflow:hidden;"
  ></iframe>
</div>
<script>
  (function () {
    const root = document.currentScript.previousElementSibling;
    const iframe = root && (root.tagName === 'IFRAME' ? root : root.querySelector('iframe'));
    if (!iframe) return;

    function handleMessage(event) {
      const data = event.data || {};
      if (event.source !== iframe.contentWindow) return;
      if (data.type !== 'studio313:widget-resize') return;
      if (typeof data.height !== 'number' || data.height <= 0) return;
      iframe.style.height = Math.ceil(data.height) + 'px';
    }

    window.addEventListener('message', handleMessage);
    iframe.addEventListener('load', function () {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'studio313:widget-parent-ready' }, '*');
      }
    });
  })();
<\/script>`
}

export default function Integrations() {
  const [activeWidget, setActiveWidget] = useState('booking')
  const [previewHeight, setPreviewHeight] = useState(760)
  const previewIframeRef = useRef(null)

  const widgetOptions = useMemo(() => ([
    {
      key: 'booking',
      label: 'Запись',
      src: `${window.location.origin}/api/booking/widget/`,
      fallbackHeight: 760,
      iframeCode: buildResponsiveIframeCode(
        `${window.location.origin}/api/booking/widget/`,
        'Виджет записи Studio 313',
        1180,
        760,
      ),
    },
    {
      key: 'helpdesk',
      label: 'Helpdesk',
      src: `${window.location.origin}/api/helpdesk/widget/`,
      fallbackHeight: 620,
      iframeCode: buildResponsiveIframeCode(
        `${window.location.origin}/api/helpdesk/widget/`,
        'Виджет helpdesk Studio 313',
        1160,
        620,
      ),
    },
  ]), [])

  const currentWidget = widgetOptions.find(item => item.key === activeWidget) || widgetOptions[0]

  useEffect(() => {
    setPreviewHeight(currentWidget.fallbackHeight)
  }, [currentWidget])

  useEffect(() => {
    const handleMessage = (event) => {
      const iframe = previewIframeRef.current
      const data = event.data || {}
      if (!iframe || event.source !== iframe.contentWindow) return
      if (data.type !== 'studio313:widget-resize') return
      if (typeof data.height !== 'number' || data.height <= 0) return
      setPreviewHeight(Math.max(420, Math.ceil(data.height)))
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

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
                  ref={previewIframeRef}
                  scrolling="no"
                  className="w-full border-0"
                  style={{ height: `${previewHeight}px` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[24px] border border-border/70 bg-slate-950 px-4 py-4 font-mono text-xs leading-6 text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                {currentWidget.iframeCode}
              </div>
              <div className="rounded-[24px] border border-border/70 bg-surface-strong/92 px-4 py-4 text-sm text-text-muted">
                В этом коде iframe сам растягивается по ширине контейнера и автоматически получает нужную высоту
                {' '}
                от самого виджета через <span className="font-semibold text-text">postMessage</span>.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
