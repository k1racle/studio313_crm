import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VoiceMessage({ src, isMe }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => setDuration(audio.duration)
    const onTime = () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
    }
    const onEnded = () => {
      setPlaying(false)
      setProgress(0)
      setCurrentTime(0)
    }
    const onError = () => setError(true)

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [src])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio || error) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().catch(() => setError(true))
      setPlaying(true)
    }
  }

  const handleSeek = (e) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    audio.currentTime = pct * duration
  }

  const barColor = isMe ? 'bg-white/30' : 'bg-primary/30'
  const progressColor = isMe ? 'bg-white' : 'bg-primary'
  const iconColor = isMe ? 'text-primary' : 'text-primary'

  return (
    <div className={`flex items-center gap-2 min-w-[180px] max-w-full rounded-full px-3 py-2 ${isMe ? 'bg-white/20' : 'bg-primary/10'}`}>
      <button
        type="button"
        onClick={toggle}
        className={`flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm ${iconColor} hover:scale-105 transition-transform`}
      >
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className="h-8 flex items-center cursor-pointer group"
          onClick={handleSeek}
          title="Клик для перемотки"
        >
          <div className={`relative w-full h-1.5 rounded-full overflow-hidden ${barColor}`}>
            <div className={`absolute left-0 top-0 h-full rounded-full ${progressColor}`} style={{ width: `${progress}%` }} />
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${progressColor} opacity-0 group-hover:opacity-100 transition-opacity`}
              style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
        </div>
      </div>
      <div className={`text-[10px] tabular-nums ${isMe ? 'text-white/80' : 'text-text-muted'}`}>
        {error ? 'ошибка' : formatDuration(playing || currentTime ? currentTime : duration)}
      </div>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  )
}
