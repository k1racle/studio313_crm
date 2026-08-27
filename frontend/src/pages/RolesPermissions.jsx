import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, ShieldCheck, Users } from 'lucide-react'

import api from '../api/axios'
import { usePageHeaderContent } from '../contexts/PageHeaderContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'

const emptyRole = { name: '', slug: '', description: '', permissions: [] }

export default function RolesPermissions() {
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [users, setUsers] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [open, setOpen] = useState(false)
  const [newRole, setNewRole] = useState(emptyRole)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [rolesRes, permissionsRes, usersRes] = await Promise.all([
      api.get('/auth/roles/'), api.get('/auth/permissions/'), api.get('/auth/users/'),
    ])
    const roleItems = rolesRes.data.results || rolesRes.data
    setRoles(roleItems)
    setPermissions(permissionsRes.data)
    setUsers(usersRes.data.results || usersRes.data)
    const nextId = activeId || roleItems[0]?.id
    setActiveId(nextId)
    const active = roleItems.find(role => role.id === nextId) || roleItems[0]
    setDraft(active ? { ...active, permissions: [...active.permissions] } : null)
  }

  useEffect(() => { load() }, [])

  const selectRole = role => {
    setActiveId(role.id)
    setDraft({ ...role, permissions: [...role.permissions] })
  }

  const grouped = useMemo(() => permissions.reduce((result, item) => {
    if (!result[item.group]) result[item.group] = []
    result[item.group].push(item)
    return result
  }, {}), [permissions])

  const saveRole = async () => {
    if (!draft) return
    setSaving(true)
    try {
      await api.patch(`/auth/roles/${draft.id}/`, {
        name: draft.name,
        description: draft.description,
        permissions: draft.permissions,
      })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const createRole = async event => {
    event.preventDefault()
    const res = await api.post('/auth/roles/', newRole)
    setOpen(false)
    setNewRole(emptyRole)
    await load()
    selectRole(res.data)
  }

  const assignRole = async (userId, roleId) => {
    await api.patch(`/auth/users/${userId}/`, { custom_role: roleId || null })
    setUsers(current => current.map(user => user.id === userId
      ? { ...user, custom_role: roleId ? Number(roleId) : null, custom_role_detail: roles.find(role => role.id === Number(roleId)) || null }
      : user))
  }

  const headerActions = useMemo(() => (
    <Button onClick={() => setOpen(true)}><Plus size={16} />Новая роль</Button>
  ), [])
  usePageHeaderContent(headerActions)

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="soft-panel h-fit overflow-hidden rounded-[26px]">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-text"><ShieldCheck size={18} className="text-primary" />Роли</div>
        </div>
        <div className="p-2">
          {roles.map(role => (
            <button key={role.id} type="button" onClick={() => selectRole(role)} className={`mb-1 w-full rounded-2xl px-3 py-3 text-left last:mb-0 ${activeId === role.id ? 'bg-primary text-white' : 'hover:bg-subtle'}`}>
              <div className="font-semibold">{role.name}</div>
              <div className={`mt-0.5 text-xs ${activeId === role.id ? 'text-white/70' : 'text-text-muted'}`}>{role.users_count} сотрудников</div>
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-5">
        {draft && (
          <section className="soft-panel rounded-[28px] p-5 md:p-6">
            <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <Input label="Название роли" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />
                <div className="mt-3">
                  <label className="mb-2 block text-sm font-semibold text-text">Описание</label>
                  <textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} rows={2} className="w-full rounded-[20px] border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-primary" />
                </div>
              </div>
              <Button onClick={saveRole} disabled={saving}><Save size={16} />{saving ? 'Сохраняем…' : 'Сохранить'}</Button>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {Object.entries(grouped).map(([group, items]) => (
                <fieldset key={group} className="rounded-2xl border border-border/80 p-4">
                  <legend className="px-2 text-sm font-semibold text-text">{group}</legend>
                  <div className="space-y-2.5">
                    {items.map(permission => (
                      <label key={permission.code} className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-subtle">
                        <input type="checkbox" checked={draft.permissions.includes(permission.code)} onChange={event => setDraft(current => ({ ...current, permissions: event.target.checked ? [...current.permissions, permission.code] : current.permissions.filter(code => code !== permission.code) }))} className="mt-0.5 h-5 w-5 accent-primary" />
                        <span className="text-sm leading-5 text-text">{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>
        )}

        <section className="soft-panel overflow-hidden rounded-[28px]">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4 font-semibold text-text"><Users size={18} className="text-primary" />Роли сотрудников</div>
          <div className="divide-y divide-border">
            {users.map(user => (
              <div key={user.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-text">{[user.last_name, user.first_name, user.patronymic].filter(Boolean).join(' ') || user.username}</div>
                  <div className="mt-0.5 text-xs text-text-muted">{user.position || user.email || user.username}</div>
                </div>
                <select value={user.custom_role || ''} onChange={event => assignRole(user.id, event.target.value)} className="min-h-11 w-full rounded-[18px] border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary">
                  <option value="">Системная роль: {user.role}</option>
                  {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Новая роль">
        <form onSubmit={createRole} className="space-y-4">
          <Input label="Название" required value={newRole.name} onChange={event => setNewRole({ ...newRole, name: event.target.value })} />
          <Input label="Код роли латиницей" required pattern="[a-z0-9-]+" placeholder="producer-assistant" value={newRole.slug} onChange={event => setNewRole({ ...newRole, slug: event.target.value.toLowerCase() })} />
          <Input label="Описание" value={newRole.description} onChange={event => setNewRole({ ...newRole, description: event.target.value })} />
          <div className="modal-actions flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit">Создать</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
