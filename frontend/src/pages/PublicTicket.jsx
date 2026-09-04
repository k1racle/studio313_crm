import { useEffect, useState } from 'react'

export default function PublicTicket() {
  const [height, setHeight] = useState(900)

  useEffect(() => {
    document.title = 'Новое обращение — Студия 313'

    const handleMessage = (event) => {
      if (event.data?.type !== 'studio313:widget-resize') return
      const nextHeight = Number(event.data.height || 0)
      if (nextHeight > 0) setHeight(Math.ceil(nextHeight))
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div className="min-h-screen bg-[#f5faff]">
      <iframe
        src="/api/helpdesk/widget/"
        title="Создать обращение в Студию 313"
        scrolling="no"
        className="mx-auto block w-full border-0"
        style={{ minHeight: `${height}px`, height: `${height}px` }}
      />
    </div>
  )
}
