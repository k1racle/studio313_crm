import { useEffect, useState, useRef } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import { FileText, Video, Images, Plus, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'

const kindLabels = {
  text: 'Текст',
  video: 'Видео',
  slides: 'Слайды',
}

const kindIcons = {
  text: FileText,
  video: Video,
  slides: Images,
}

const kindOptions = [
  { value: '', label: 'Все типы' },
  { value: 'text', label: 'Текст' },
  { value: 'video', label: 'Видео' },
  { value: 'slides', label: 'Слайды' },
]

const kindFormOptions = [
  { value: 'text', label: 'Текст' },
  { value: 'video', label: 'Видео' },
  { value: 'slides', label: 'Слайды' },
]

const emptyForm = {
  title: '',
  description: '',
  kind: 'text',
  category_id: '',
  text_content: '',
  video_url: '',
  is_published: true,
  order: 0,
}

export default function KnowledgeBase() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ kind: '', category: '', search: '' })
  const [loading, setLoading] = useState(false)

  const [detailItem, setDetailItem] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [slideFile, setSlideFile] = useState(null)
  const [slideCaption, setSlideCaption] = useState('')

  const fileRef = useRef(null)

  const loadItems = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.kind) params.kind = filters.kind
      if (filters.category) params.category = filters.category
      if (filters.search) params.search = filters.search
      const res = await api.get('/knowledge/items/', { params })
      setItems(res.data.results || res.data)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    const res = await api.get('/knowledge/categories/')
    setCategories(res.data.results || res.data)
  }

  useEffect(() => {
    loadItems()
    loadCategories()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(loadItems, 300)
    return () => clearTimeout(timeout)
  }, [filters])

  const openDetail = async (item) => {
    setCurrentSlide(0)
    if (!item.slides) {
      try {
        const res = await api.get(`/knowledge/items/${item.id}/`)
        setDetailItem(res.data)
      } catch (err) {
        console.error(err)
        setDetailItem(item)
      }
    } else {
      setDetailItem(item)
    }
    setDetailOpen(true)
  }

  const openCreate = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (item, e) => {
    e?.stopPropagation()
    setEditingItem(item)
    setForm({
      title: item.title,
      description: item.description || '',
      kind: item.kind,
      category_id: item.category?.id || '',
      text_content: item.text_content || '',
      video_url: item.video_url || '',
      is_published: item.is_published,
      order: item.order || 0,
    })
    setFormOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      category_id: form.category_id || null,
      order: Number(form.order) || 0,
    }
    try {
      if (editingItem) {
        await api.put(`/knowledge/items/${editingItem.id}/`, payload)
      } else {
        await api.post('/knowledge/items/', payload)
      }
      setFormOpen(false)
      setEditingItem(null)
      setForm(emptyForm)
      loadItems()
    } catch (err) {
      console.error(err)
      alert('Не удалось сохранить материал')
    }
  }

  const handleDelete = async (item, e) => {
    e?.stopPropagation()
    if (!confirm(`Удалить материал «${item.title}»?`)) return
    await api.delete(`/knowledge/items/${item.id}/`)
    loadItems()
  }

  const handleAddSlide = async (e) => {
    e.preventDefault()
    if (!slideFile || !editingItem) return
    const data = new FormData()
    data.append('item', editingItem.id)
    data.append('image', slideFile)
    data.append('caption', slideCaption)
    try {
      await api.post('/knowledge/slides/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSlideFile(null)
      setSlideCaption('')
      if (fileRef.current) fileRef.current.value = ''
      const res = await api.get(`/knowledge/items/${editingItem.id}/`)
      setEditingItem(res.data)
      loadItems()
    } catch (err) {
      console.error(err)
      alert('Не удалось добавить слайд')
    }
  }

  const handleDeleteSlide = async (slideId) => {
    if (!confirm('Удалить слайд?')) return
    await api.delete(`/knowledge/slides/${slideId}/`)
    const res = await api.get(`/knowledge/items/${editingItem.id}/`)
    setEditingItem(res.data)
    loadItems()
  }

  const categoryOptions = [
    { value: '', label: 'Все категории' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ]

  const categoryFormOptions = [
    { value: '', label: 'Без категории' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">База знаний</h1>
          <p className="text-text-muted">Обучающие материалы и инструкции</p>
        </div>
        {user?.is_manager && (
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1.5" />
            Новый материал
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <Select value={filters.kind} onChange={e => setFilters({ ...filters, kind: e.target.value })} options={kindOptions} />
          <Select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} options={categoryOptions} />
          <Input
            icon={<Search size={16} />}
            placeholder="Поиск по названию или описанию..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            className="w-full sm:w-80"
          />
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-10 text-text-muted">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-text-muted">Материалы не найдены</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => {
            const Icon = kindIcons[item.kind] || FileText
            return (
              <Card
                key={item.id}
                onClick={() => openDetail(item)}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text truncate">{item.title}</h3>
                    <div className="text-xs text-text-muted mt-0.5">
                      {kindLabels[item.kind]}
                      {item.category && ` • ${item.category.name}`}
                    </div>
                    {item.description && (
                      <p className="text-sm text-text-muted mt-2 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
                {user?.is_manager && (
                  <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t border-border" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => openEdit(item, e)} className="p-1.5 text-text-muted hover:text-primary hover:bg-subtle rounded-lg transition-colors" title="Изменить">
                      <Pencil size={16} />
                    </button>
                    <button onClick={(e) => handleDelete(item, e)} className="p-1.5 text-text-muted hover:text-danger hover:bg-subtle rounded-lg transition-colors" title="Удалить">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={detailItem?.title} size="lg">
        {detailItem && (
          <div className="space-y-4">
            <div className="text-sm text-text-muted">
              {kindLabels[detailItem.kind]}
              {detailItem.category && ` • ${detailItem.category.name}`}
            </div>
            {detailItem.description && <p className="text-text">{detailItem.description}</p>}

            {detailItem.kind === 'text' && (
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-text bg-subtle p-4 rounded-lg">
                {detailItem.text_content}
              </div>
            )}

            {detailItem.kind === 'video' && detailItem.video_url && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video src={detailItem.video_url} controls className="w-full h-full" />
              </div>
            )}

            {detailItem.kind === 'slides' && (
              <div>
                {detailItem.slides?.length > 0 ? (
                  <div className="relative bg-subtle rounded-lg overflow-hidden">
                    <img
                      src={detailItem.slides[currentSlide].image_url}
                      alt={detailItem.slides[currentSlide].caption || ''}
                      className="w-full max-h-[60vh] object-contain bg-surface"
                    />
                    {detailItem.slides[currentSlide].caption && (
                      <div className="px-4 py-2 text-sm text-text bg-surface border-t border-border">
                        {detailItem.slides[currentSlide].caption}
                      </div>
                    )}
                    {detailItem.slides.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentSlide(s => (s > 0 ? s - 1 : detailItem.slides.length - 1))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-surface/90 rounded-full shadow text-text hover:bg-surface"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={() => setCurrentSlide(s => (s < detailItem.slides.length - 1 ? s + 1 : 0))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-surface/90 rounded-full shadow text-text hover:bg-surface"
                        >
                          <ChevronRight size={20} />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">
                          {currentSlide + 1} / {detailItem.slides.length}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-text-muted">Нет слайдов</div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={formOpen} onClose={() => { setFormOpen(false); setEditingItem(null); setForm(emptyForm); setSlideFile(null); setSlideCaption('') }} title={editingItem ? 'Изменить материал' : 'Новый материал'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Название" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Описание</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              rows="3"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Тип" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })} options={kindFormOptions} />
            <Select label="Категория" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} options={categoryFormOptions} />
            <Input label="Порядок" type="number" value={form.order} onChange={e => setForm({ ...form, order: e.target.value })} />
          </div>
          {form.kind === 'text' && (
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Текст материала</label>
              <textarea
                value={form.text_content}
                onChange={e => setForm({ ...form, text_content: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                rows="8"
              />
            </div>
          )}
          {form.kind === 'video' && (
            <Input label="Ссылка на видео" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} />
          )}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={e => setForm({ ...form, is_published: e.target.checked })}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-sm text-text">Опубликовано</span>
          </label>

          {editingItem?.kind === 'slides' && (
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="font-medium text-text">Слайды</h4>
              {editingItem.slides?.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {editingItem.slides.map(slide => (
                    <div key={slide.id} className="relative group">
                      <img src={slide.image_url} alt={slide.caption} className="w-full h-24 object-cover rounded-lg" />
                      {slide.caption && <div className="text-xs text-text-muted truncate mt-1">{slide.caption}</div>}
                      <button
                        type="button"
                        onClick={() => handleDeleteSlide(slide.id)}
                        className="absolute top-1 right-1 p-1 bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileRef}
                  onChange={e => setSlideFile(e.target.files[0])}
                  className="block w-full text-sm text-text file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-white hover:file:bg-primary-dark"
                />
                <Input
                  placeholder="Подпись"
                  value={slideCaption}
                  onChange={e => setSlideCaption(e.target.value)}
                  className="w-48"
                />
                <Button type="button" onClick={handleAddSlide} disabled={!slideFile}>Добавить</Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setFormOpen(false); setEditingItem(null); setForm(emptyForm) }}>Отмена</Button>
            <Button type="submit">{editingItem ? 'Сохранить' : 'Создать'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
