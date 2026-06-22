import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { X } from 'lucide-react'

export default function StickerPicker({ onSelect, onClose }) {
  const [stickers, setStickers] = useState([])

  useEffect(() => {
    api.get('/chat/stickers/').then(res => setStickers(res.data.results || res.data))
  }, [])

  return (
    <div className="absolute bottom-full right-0 mb-2 bg-surface border border-border rounded-xl shadow-lg p-3 w-64 z-20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text">Стикеры</span>
        <button onClick={onClose} className="p-1 text-text-muted hover:text-text hover:bg-subtle rounded-lg transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 max-h-60 overflow-auto">
        {stickers.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="aspect-square hover:bg-subtle rounded-lg p-1 transition-colors"
            title={s.name}
          >
            <img src={s.image} alt={s.name} className="w-full h-full object-contain" />
          </button>
        ))}
        {stickers.length === 0 && <div className="col-span-4 text-xs text-text-muted text-center py-4">Нет стикеров</div>}
      </div>
    </div>
  )
}
