import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Users as UsersIcon, ShieldCheck, Trash2, Edit2, Plus, RefreshCcw } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { AuthUser, UserRole } from '../lib/types'
import { createUser, deleteUser, listUsers, updateUser } from '../lib/api'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../contexts/AuthContext'

const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: 'Administrator', value: 'admin' },
  { label: 'Project Manager', value: 'project_manager' },
  { label: 'Team Member', value: 'team_member' },
  { label: 'Finance', value: 'finance' }
]

type TeamFormValues = {
  name: string
  email: string
  role: UserRole
  hourly_rate: string
  password: string
}

const TEAM_FORM_DEFAULT: TeamFormValues = {
  name: '',
  email: '',
  role: 'team_member',
  hourly_rate: '0',
  password: ''
}

export function Team() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formValues, setFormValues] = useState<TeamFormValues>({ ...TEAM_FORM_DEFAULT })
  const [activeUser, setActiveUser] = useState<AuthUser | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canManage = user?.role === 'admin'

  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    return users.filter((member) => {
      const matchesRole = roleFilter === 'all' || member.role === roleFilter
      const term = searchTerm.trim().toLowerCase()
      const matchesSearch =
        !term ||
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term)
      return matchesRole && matchesSearch
    })
  }, [roleFilter, searchTerm, users])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listUsers({ limit: 100 })
      setUsers(response.users ?? [])
    } catch (err) {
      console.error('Failed to load users', err)
      setError('Unable to load team. Please try again later.')
      showToast({
        title: 'Failed to load team',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setActiveUser(null)
    setFormValues({ ...TEAM_FORM_DEFAULT })
    setIsModalOpen(true)
  }

  const openEditModal = (member: AuthUser) => {
    setActiveUser(member)
    setFormValues({
      name: member.name,
      email: member.email,
      role: member.role,
      hourly_rate: member.hourly_rate ? String(member.hourly_rate) : '0',
      password: ''
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSubmitting(false)
    setActiveUser(null)
    setFormValues({ ...TEAM_FORM_DEFAULT })
  }

  const handleFieldChange =
    (field: keyof TeamFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormValues((prev) => ({
        ...prev,
        [field]: event.target.value
      }))
    }

  const handleSubmit = async () => {
    if (!formValues.name.trim()) {
      showToast({
        title: 'Name required',
        description: 'Please provide a full name for the user.',
        variant: 'error'
      })
      return
    }

    if (!formValues.email.trim()) {
      showToast({
        title: 'Email required',
        description: 'A valid email address is required.',
        variant: 'error'
      })
      return
    }

    if (!activeUser && !formValues.password.trim()) {
      showToast({
        title: 'Password required',
        description: 'Please set an initial password for the new account.',
        variant: 'error'
      })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: formValues.name.trim(),
        email: formValues.email.trim(),
        role: formValues.role,
        hourly_rate: Number(formValues.hourly_rate || 0),
        ...(formValues.password.trim() ? { password: formValues.password.trim() } : {})
      }

      if (activeUser) {
        const updated = await updateUser(activeUser.id, payload)
        showToast({
          title: 'User updated',
          description: updated.name,
          variant: 'success'
        })
      } else {
        const created = await createUser(payload as Parameters<typeof createUser>[0])
        showToast({
          title: 'User created',
          description: created.name,
          variant: 'success'
        })
      }

      await loadUsers()
      closeModal()
    } catch (error) {
      console.error('Failed to save user', error)
      showToast({
        title: 'Unable to save user',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (member: AuthUser) => {
    if (user && member.id === user.id) {
      showToast({
        title: 'Action not allowed',
        description: 'You cannot remove your own account.',
        variant: 'error'
      })
      return
    }

    const confirmed = window.confirm(`Are you sure you want to remove ${member.name}?`)
    if (!confirmed) return

    try {
      await deleteUser(member.id)
      showToast({
        title: 'User removed',
        description: member.name,
        variant: 'success'
      })
      await loadUsers()
    } catch (error) {
      console.error('Failed to delete user', error)
      showToast({
        title: 'Unable to delete user',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error'
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Team</h1>
          <p className="text-slate-400">Invite and manage teammates across your company.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={loadUsers} disabled={loading} className="gap-2">
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canManage && (
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="w-4 h-4" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Directory</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <Input
              label="Search"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Select
              label="Role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}
              options={[
                { label: 'All', value: 'all' },
                ...ROLE_OPTIONS
              ]}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Hourly Rate</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Joined</th>
                  {canManage && <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="py-6 text-center text-slate-400 text-sm">
                      Loading team...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="py-6 text-center text-slate-400 text-sm">
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((member) => (
                    <tr key={member.uuid} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-slate-100 flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300">
                          <UsersIcon className="w-4 h-4" />
                        </span>
                        {member.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">{member.email}</td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        <Badge
                          variant={
                            member.role === 'admin'
                              ? 'warning'
                              : member.role === 'project_manager'
                              ? 'info'
                              : member.role === 'finance'
                              ? 'success'
                              : 'default'
                          }
                        >
                          {member.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">₹{Number(member.hourly_rate ?? 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right text-sm text-slate-300">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="w-9 h-9" onClick={() => openEditModal(member)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-9 h-9"
                              onClick={() => handleDelete(member)}
                              disabled={user ? member.id === user.id : false}
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={activeUser ? 'Edit Team Member' : 'Invite Team Member'}
      >
        <div className="space-y-4">
          <Input label="Full Name" value={formValues.name} onChange={handleFieldChange('name')} required />
          <Input label="Email" type="email" value={formValues.email} onChange={handleFieldChange('email')} required />
          <Select
            label="Role"
            value={formValues.role}
            onChange={handleFieldChange('role')}
            options={ROLE_OPTIONS}
          />
          <Input
            label="Hourly Rate (₹)"
            type="number"
            min="0"
            step="0.5"
            value={formValues.hourly_rate}
            onChange={handleFieldChange('hourly_rate')}
          />
          <Input
            label={activeUser ? 'Reset Password (optional)' : 'Temporary Password'}
            type="password"
            value={formValues.password}
            onChange={handleFieldChange('password')}
            placeholder={activeUser ? 'Leave blank to keep current password' : 'At least 8 characters'}
            required={!activeUser}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {!canManage && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-800/60 bg-slate-900/40 p-4 text-sm text-slate-400">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          Only administrators can invite or edit team members. Contact your admin if you need changes.
        </div>
      )}
    </div>
  )
}

