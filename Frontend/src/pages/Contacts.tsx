import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Plus, Edit2, Trash2, RefreshCcw } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { Contact, ContactType } from '../lib/types'
import { createContact, deleteContact, listContacts, updateContact } from '../lib/api'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../contexts/AuthContext'

type ContactFormValues = {
  name: string
  type: ContactType
  email: string
  phone: string
  address: string
}

const CONTACT_TYPES: { label: string; value: ContactType }[] = [
  { label: 'Client', value: 'client' },
  { label: 'Vendor', value: 'vendor' },
  { label: 'Both', value: 'both' }
]

const CONTACT_FORM_DEFAULT: ContactFormValues = {
  name: '',
  type: 'client',
  email: '',
  phone: '',
  address: ''
}

export function Contacts() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ContactType>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formValues, setFormValues] = useState<ContactFormValues>({ ...CONTACT_FORM_DEFAULT })
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canManage = user ? ['admin', 'project_manager', 'finance'].includes(user.role) : false

  useEffect(() => {
    loadContacts()
  }, [])

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesType = typeFilter === 'all' || contact.type === typeFilter
      const matchesSearch =
        !searchTerm ||
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.phone ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      return matchesType && matchesSearch
    })
  }, [contacts, searchTerm, typeFilter])

  const loadContacts = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listContacts({ limit: 100 })
      setContacts(response.contacts ?? [])
    } catch (err) {
      console.error('Failed to load contacts', err)
      setError('Unable to load contacts. Please try again later.')
      showToast({
        title: 'Failed to load contacts',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setActiveContact(null)
    setFormValues({ ...CONTACT_FORM_DEFAULT })
    setIsModalOpen(true)
  }

  const openEditModal = (contact: Contact) => {
    setActiveContact(contact)
    setFormValues({
      name: contact.name,
      type: contact.type,
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      address: contact.address ?? ''
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setActiveContact(null)
    setFormValues({ ...CONTACT_FORM_DEFAULT })
  }

  const handleFieldChange =
    (field: keyof ContactFormValues) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setFormValues((prev) => ({
        ...prev,
        [field]: event.target.value
      }))
    }

  const handleSubmit = async () => {
    if (!formValues.name.trim()) {
      showToast({
        title: 'Contact name required',
        description: 'Provide a name for the contact before saving.',
        variant: 'error'
      })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: formValues.name.trim(),
        type: formValues.type,
        email: formValues.email ? formValues.email.trim() : undefined,
        phone: formValues.phone ? formValues.phone.trim() : undefined,
        address: formValues.address ? formValues.address.trim() : undefined
      }

      if (activeContact) {
        const updated = await updateContact(activeContact.uuid, payload)
        showToast({
          title: 'Contact updated',
          description: updated.name,
          variant: 'success'
        })
      } else {
        const created = await createContact(payload)
        showToast({
          title: 'Contact created',
          description: created.name,
          variant: 'success'
        })
      }

      await loadContacts()
      closeModal()
    } catch (error) {
      console.error('Failed to save contact', error)
      showToast({
        title: 'Unable to save contact',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (contact: Contact) => {
    const confirmed = window.confirm(`Are you sure you want to delete ${contact.name}?`)
    if (!confirmed) return

    try {
      await deleteContact(contact.uuid)
      showToast({
        title: 'Contact deleted',
        description: contact.name,
        variant: 'success'
      })
      await loadContacts()
    } catch (error) {
      console.error('Failed to delete contact', error)
      showToast({
        title: 'Unable to delete contact',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error'
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Contacts</h1>
          <p className="text-slate-400">Manage your clients and vendors for projects and finance workflows.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={loadContacts} disabled={loading} className="gap-2">
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canManage && (
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="w-4 h-4" />
              New Contact
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <Input
              label="Search"
              placeholder="Search by name, email, or phone"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Select
              label="Type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'all' | ContactType)}
              options={[
                { label: 'All', value: 'all' },
                ...CONTACT_TYPES
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
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Address</th>
                  {canManage && <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="py-6 text-center text-slate-400 text-sm">
                      Loading contacts...
                    </td>
                  </tr>
                ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="py-6 text-center text-slate-400 text-sm">
                      No contacts found.
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.uuid} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-slate-100">{contact.name}</td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        <Badge variant={contact.type === 'client' ? 'success' : contact.type === 'vendor' ? 'warning' : 'info'}>
                          {contact.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">{contact.email ?? '—'}</td>
                      <td className="py-3 px-4 text-sm text-slate-300">{contact.phone ?? '—'}</td>
                      <td className="py-3 px-4 text-sm text-slate-300">{contact.address ?? '—'}</td>
                      {canManage && (
                        <td className="py-3 px-4 text-right text-sm text-slate-300">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="w-9 h-9" onClick={() => openEditModal(contact)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="w-9 h-9" onClick={() => handleDelete(contact)}>
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
        title={activeContact ? 'Edit Contact' : 'Create Contact'}
      >
        <div className="space-y-4">
          <Input label="Name" value={formValues.name} onChange={handleFieldChange('name')} required />
          <Select
            label="Type"
            value={formValues.type}
            onChange={handleFieldChange('type')}
            options={CONTACT_TYPES}
          />
          <Input label="Email" type="email" value={formValues.email} onChange={handleFieldChange('email')} />
          <Input label="Phone" value={formValues.phone} onChange={handleFieldChange('phone')} />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Address</label>
            <textarea
              className="w-full min-h-[100px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              value={formValues.address}
              onChange={handleFieldChange('address')}
              placeholder="Address details"
            />
          </div>
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
    </div>
  )
}

