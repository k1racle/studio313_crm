import { useEffect, useState } from 'react'

export default function PublicBooking() {
  const [height, setHeight] = useState(900)

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type !== 'studio313:widget-resize') return
      const nextHeight = Number(event.data.height || 0)
      if (nextHeight > 0) {
        setHeight(Math.ceil(nextHeight))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div className="min-h-screen bg-[#ebece8]">
      <iframe
        src="/api/booking/widget/"
        title="Онлайн-запись в Студию 313"
        loading="lazy"
        scrolling="no"
        className="mx-auto block w-full border-0"
        style={{ minHeight: `${height}px`, height: `${height}px` }}
      />
    </div>
  )
}
