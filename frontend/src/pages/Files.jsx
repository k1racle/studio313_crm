import { useEffect, useState, useRef } from 'react'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import SearchableSelect from '../components/ui/SearchableSelect'
import {
  Folder, FileText, Image as ImageIcon, Film, Headphones, File as FileIcon,
  Upload, Plus, Trash2, ChevronDown, ChevronRight, X, Search, FolderOpen
} from 'lucide-react'

function formatBytes(bytes) {
  if (!bytes) return ''
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}

function getFileIcon(type, name) {
  const ext = name?.split('.').pop()?.toLowerCase()
  if (type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return ImageIcon
  if (type?.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return Film
  if (type?.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(ext)) return Headphones
  if (ext === 'pdf') return FileText
  return FileIcon
}

function isPreviewable(type, name) {
  const ext = name?.split('.').pop()?.toLowerCase()
  if (type?.startsWith('image/')) return true
  if (type?.startsWith('video/')) return true
  if (type?.startsWith('audio/')) return true
  if (ext === 'pdf') return true
  return false
}

function FileItem({ file, onMove, onDelete, onPreview }) {
  const Icon = getFileIcon(file.file?.type, file.name)
  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('files/file-id', String(file.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="flex items-center gap-2 p-2 rounded-lg bg-surface border border-border hover:bg-subtle cursor-move group"
    >
      <button
        type="button"
        onClick={() => onPreview(file)}
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
      >
        <Icon size={18} className="text-primary shrink-0" />
        <div className="min-w-0">
          <div className="text-sm text-text truncate">{file.name}</div>
          <div className="text-[10px] text-text-muted">{formatBytes(file.size)}</div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onDelete(file)}
        className="p-1 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
        title="Удалить"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function FolderTree({ folder, projectId, onMove, onDeleteFile, onPreview, onDeleteFolder, level = 0 }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-2">
      <div
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-primary/10') }}
        onDragLeave={e => { e.currentTarget.classList.remove('bg-primary/10') }}
        onDrop={async (e) => {
          e.preventDefault()
          e.stopPropagation()
          e.currentTarget.classList.remove('bg-primary/10')
          const fileId = e.dataTransfer.getData('files/file-id')
          if (!fileId) return
          await onMove(Number(fileId), { folder: folder.id, project: projectId })
        }}
        className="flex items-center gap-2 p-2 rounded-lg bg-subtle border border-border cursor-pointer hover:bg-hover transition-colors"
        style={{ marginLeft: level * 12 }}
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={16} className="text-text-muted" /> : <ChevronRight size={16} className="text-text-muted" />}
        <FolderOpen size={16} className="text-primary" />
        <span className="text-sm font-medium text-text flex-1 truncate">{folder.name}</span>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onDeleteFolder(folder) }}
          className="p-1 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
          title="Удалить папку"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {open && (
        <div className="mt-1 space-y-1">
          {folder.files?.map(file => (
            <div key={file.id} style={{ marginLeft: level * 12 + 12 }}>
              <FileItem file={file} onMove={onMove} onDelete={onDeleteFile} onPreview={onPreview} />
            </div>
          ))}
          {folder.children?.map(child => (
            <FolderTree
              key={child.id}
              folder={child}
              projectId={projectId}
              onMove={onMove}
              onDeleteFile={onDeleteFile}
              onPreview={onPreview}
              onDeleteFolder={onDeleteFolder}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Files() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [allProjects, setAllProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const [previewFile, setPreviewFile] = useState(null)
  const [folderModal, setFolderModal] = useState({ open: false, projectId: '', parentId: null })
  const [folderName, setFolderName] = useState('')

  const uploadInputRef = useRef(null)
  const [uploadTarget, setUploadTarget] = useState({ projectId: '', folderId: null })

  const loadTree = async () => {
    setLoading(true)
    try {
      const params = selectedProject ? { project: selectedProject } : {}
      const res = await api.get('/files/', { params })
      setProjects(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects/')
      setAllProjects(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadTree()
    loadProjects()
  }, [selectedProject])

  const handleMove = async (fileId, target) => {
    try {
      await api.patch(`/files/files/${fileId}/`, {
        project: target.project,
        folder: target.folder || null,
      })
      loadTree()
    } catch (err) {
      console.error(err)
      alert('Не удалось переместить файл')
    }
  }

  const handleDeleteFile = async (file) => {
    if (!confirm(`Удалить файл «${file.name}»?`)) return
    try {
      await api.delete(`/files/files/${file.id}/`)
      loadTree()
    } catch (err) {
      console.error(err)
      alert('Не удалось удалить файл')
    }
  }

  const handleDeleteFolder = async (folder) => {
    if (!confirm(`Удалить папку «${folder.name}»? Все вложенные папки и файлы будут удалены.`)) return
    try {
      await api.delete(`/files/folders/${folder.id}/`)
      loadTree()
    } catch (err) {
      console.error(err)
      alert('Не удалось удалить папку')
    }
  }

  const handleUploadClick = (projectId, folderId = null) => {
    setUploadTarget({ projectId, folderId })
    uploadInputRef.current?.click()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const data = new FormData()
    data.append('file', file)
    data.append('project', uploadTarget.projectId)
    if (uploadTarget.folderId) data.append('folder', uploadTarget.folderId)
    try {
      await api.post('/files/files/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      loadTree()
    } catch (err) {
      console.error(err)
      alert('Не удалось загрузить файл')
    }
    e.target.value = ''
  }

  const handleCreateFolder = async (e) => {
    e.preventDefault()
    if (!folderName.trim()) return
    try {
      await api.post('/files/folders/', {
        name: folderName.trim(),
        project: folderModal.projectId,
        parent: folderModal.parentId,
      })
      setFolderName('')
      setFolderModal({ open: false, projectId: '', parentId: null })
      loadTree()
    } catch (err) {
      console.error(err)
      alert('Не удалось создать папку')
    }
  }

  const filteredProjects = projects.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.files?.some(f => f.name.toLowerCase().includes(q)) ||
      hasFolderMatch(p.folders, q)
    )
  })

  function hasFolderMatch(folders, q) {
    return folders?.some(folder =>
      folder.name.toLowerCase().includes(q) ||
      folder.files?.some(f => f.name.toLowerCase().includes(q)) ||
      hasFolderMatch(folder.children, q)
    )
  }

  const renderPreview = () => {
    if (!previewFile) return null
    const url = previewFile.file
    const ext = previewFile.name?.split('.').pop()?.toLowerCase()
    if (url?.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) || (previewFile.file?.type && previewFile.file.type.startsWith('image/'))) {
      return <img src={url} alt={previewFile.name} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
    }
    if (url?.match(/\.(mp4|mov|avi|mkv)(\?.*)?$/i) || (previewFile.file?.type && previewFile.file.type.startsWith('video/'))) {
      return <video src={url} controls className="max-w-full max-h-[80vh] rounded-lg" />
    }
    if (url?.match(/\.(mp3|wav|ogg)(\?.*)?$/i) || (previewFile.file?.type && previewFile.file.type.startsWith('audio/'))) {
      return <audio src={url} controls className="w-full" />
    }
    if (ext === 'pdf') {
      return <iframe src={url} title={previewFile.name} className="w-full h-[80vh] rounded-lg" />
    }
    return (
      <div className="text-center py-12">
        <FileIcon size={64} className="mx-auto text-text-muted mb-4" />
        <p className="text-text-muted mb-4">Предпросмотр не поддерживается</p>
        <a href={url} download className="text-primary hover:underline">Скачать файл</a>
      </div>
    )
  }

  const projectOptions = [{ value: '', label: 'Все проекты' }, ...allProjects.map(p => ({ value: p.id, label: p.name }))]

  return (
    <div>
      <input
        ref={uploadInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Файлы</h1>
          <p className="text-text-muted">Хранилище файлов по проектам</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="w-full sm:w-64">
          <SearchableSelect
            value={selectedProject}
            onChange={val => setSelectedProject(val)}
            options={projectOptions}
          />
        </div>
        <div className="flex-1">
          <Input
            icon={<Search size={16} />}
            placeholder="Поиск по файлам и папкам..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && <div className="text-text-muted">Загрузка...</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        {filteredProjects.map(project => (
          <div
            key={project.id}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-primary/30') }}
            onDragLeave={e => { e.currentTarget.classList.remove('ring-2', 'ring-primary/30') }}
            onDrop={async (e) => {
              e.preventDefault()
              e.currentTarget.classList.remove('ring-2', 'ring-primary/30')
              const fileId = e.dataTransfer.getData('files/file-id')
              if (!fileId) return
              await handleMove(Number(fileId), { project: project.id, folder: null })
            }}
            className="bg-surface rounded-xl border border-border p-4 transition-shadow"
          >
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-border">
              <h3 className="font-semibold text-text truncate">{project.name}</h3>
              <div className="flex items-center gap-1">
                <Button type="button" size="sm" variant="secondary" onClick={() => handleUploadClick(project.id)} title="Загрузить файл">
                  <Upload size={14} />
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setFolderModal({ open: true, projectId: project.id, parentId: null })} title="Создать папку">
                  <Folder size={14} />
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {project.folders?.map(folder => (
                <FolderTree
                  key={folder.id}
                  folder={folder}
                  projectId={project.id}
                  onMove={handleMove}
                  onDeleteFile={handleDeleteFile}
                  onPreview={setPreviewFile}
                  onDeleteFolder={handleDeleteFolder}
                />
              ))}
              {project.files?.map(file => (
                <FileItem
                  key={file.id}
                  file={file}
                  onMove={handleMove}
                  onDelete={handleDeleteFile}
                  onPreview={setPreviewFile}
                />
              ))}
              {!project.folders?.length && !project.files?.length && (
                <div className="text-sm text-text-muted text-center py-6">Нет файлов</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.name}
        size="xl"
      >
        <div className="flex justify-center">
          {renderPreview()}
        </div>
      </Modal>

      <Modal
        isOpen={folderModal.open}
        onClose={() => setFolderModal({ open: false, projectId: '', parentId: null })}
        title="Новая папка"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <Input
            label="Название папки"
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setFolderModal({ open: false, projectId: '', parentId: null })}>Отмена</Button>
            <Button type="submit">Создать</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
