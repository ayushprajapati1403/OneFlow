import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter } from 'lucide-react';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { createProject, listContacts, listProjects, listUsers, ProjectsListParams } from '../lib/api';
import { AuthUser, Contact, Project } from '../lib/types';
import { useNavigate } from '../hooks/useNavigate';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../lib/api';

const PROJECT_FORM_DEFAULT = {
  name: '',
  description: '',
  client_uuid: '',
  manager_uuid: '',
  status: 'planned',
  start_date: '',
  end_date: '',
  budget: '',
};

type ProjectFormValues = typeof PROJECT_FORM_DEFAULT;

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [clients, setClients] = useState<Contact[]>([]);
  const [managers, setManagers] = useState<AuthUser[]>([]);
  const [formValues, setFormValues] = useState({ ...PROJECT_FORM_DEFAULT });
  const { user } = useAuth();

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [searchTerm, statusFilter, projects]);

  async function loadProjects(params: ProjectsListParams = {}) {
    setLoading(true);
    setError(null);
    try {
      const response = await listProjects({ limit: 100, ...params });
      setProjects(response.projects || []);
    } catch (error) {
      console.error('Failed to load projects', error);
      setProjects([]);
      setError('Unable to load projects. Please try again later.');
      showToast({
        title: 'Failed to load projects',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  function filterProjects() {
    let filtered = projects;

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.client?.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    setFilteredProjects(filtered);
  }

  const resetForm = () => {
    setFormValues({ ...PROJECT_FORM_DEFAULT });
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateOpen(true);
    loadReferenceData();
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    resetForm();
  };

  const loadReferenceData = async () => {
    setModalLoading(true);
    try {
      let fetchedClients: Contact[] = [];
      try {
        const contactsResponse = await listContacts({ limit: 100, type: 'client' });
        fetchedClients = contactsResponse.contacts || [];
      } catch (error) {
        showToast({
          title: 'Unable to load clients',
          description: error instanceof Error ? error.message : undefined,
          variant: 'error'
        });
      }

      let fetchedManagers: AuthUser[] = [];
      try {
        const usersResponse = await listUsers({ limit: 100 });
        fetchedManagers = usersResponse.users || [];
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          fetchedManagers = user ? [user] : [];
        } else {
          showToast({
            title: 'Unable to load users',
            description: error instanceof Error ? error.message : undefined,
            variant: 'error'
          });
        }
      }

      setClients(fetchedClients);
      setManagers(fetchedManagers.length > 0 ? fetchedManagers : user ? [user] : []);
      setFormValues((prev) => ({
        ...prev,
        client_uuid: fetchedClients[0]?.uuid ?? '',
        manager_uuid: fetchedManagers[0]?.uuid ?? user?.uuid ?? '',
      }));
    } catch (error) {
      console.error('Failed to load project references', error);
      showToast({
        title: 'Unable to load references',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error'
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!formValues.name.trim()) {
      showToast({
        title: 'Project name required',
        description: 'Please provide a project name before creating a project.',
        variant: 'error'
      });
      return;
    }

    const budgetNumber = formValues.budget ? Number(formValues.budget) : undefined;
    if (formValues.budget && Number.isNaN(budgetNumber)) {
      showToast({
        title: 'Invalid budget',
        description: 'Please enter a valid numeric budget value.',
        variant: 'error'
      });
      return;
    }

    setCreateSubmitting(true);
    try {
      const payload = {
        name: formValues.name.trim(),
        description: formValues.description ? formValues.description.trim() : undefined,
        client_uuid: formValues.client_uuid || undefined,
        manager_uuid: formValues.manager_uuid || undefined,
        status: formValues.status,
        start_date: formValues.start_date || undefined,
        end_date: formValues.end_date || undefined,
        budget: budgetNumber
      };

      const project = await createProject(payload);
      showToast({
        title: 'Project created',
        description: project.name,
        variant: 'success'
      });
      closeCreateModal();
      loadProjects();
    } catch (error) {
      console.error('Failed to create project', error);
      showToast({
        title: 'Failed to create project',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error'
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const statusOptions = useMemo(
    () => [
    { value: 'all', label: 'All', count: projects.length },
      { value: 'active', label: 'Active', count: projects.filter((p) => p.status === 'active').length },
    { value: 'planned', label: 'Planned', count: projects.filter((p) => p.status === 'planned').length },
    { value: 'completed', label: 'Completed', count: projects.filter((p) => p.status === 'completed').length },
    { value: 'on_hold', label: 'On Hold', count: projects.filter((p) => p.status === 'on_hold').length },
    ],
    [projects],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
          <p className="text-slate-400">Manage and track all your projects</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => loadProjects()} disabled={loading}>
            Refresh
          </Button>
          <Button icon={<Plus className="w-5 h-5" />} onClick={openCreateModal}>
          Create Project
        </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading projects...</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all
                ${
                  statusFilter === option.value
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:border-slate-600'
                }
              `}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredProjects.map((project) => (
          <ProjectCard key={project.uuid} project={project} navigate={navigate} />
        ))}
      </motion.div>

      {filteredProjects.length === 0 && !loading && (
        <Card>
          <CardBody className="text-center py-12">
            <Filter className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-lg text-slate-400">No projects found</p>
            <p className="text-sm text-slate-500 mt-2">Try adjusting your search or filters</p>
          </CardBody>
        </Card>
      )}

      <CreateProjectModal
        isOpen={isCreateOpen}
        loading={modalLoading}
        submitting={createSubmitting}
        clients={clients}
        managers={managers}
        values={formValues}
        onClose={closeCreateModal}
        onChange={setFormValues}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}

function ProjectCard({ project, navigate }: { project: Project; navigate: any }) {
  const statusColors: Record<Project['status'], 'success' | 'info' | 'warning' | 'default'> = {
    active: 'info',
    planned: 'warning',
    completed: 'success',
    on_hold: 'default',
  };

  const spent = project.budget_spent ?? 0;
  const progress = project.budget > 0 ? (spent / project.budget) * 100 : 0;
  const progressColor = progress > 90 ? 'red' : progress > 70 ? 'amber' : 'cyan';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, rotateY: 2 }}
      transition={{ duration: 0.2 }}
    >
      <Card hover3d glow className="cursor-pointer h-full" onClick={() => navigate('project-detail', { uuid: project.uuid })}>
        <CardBody>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-slate-100 mb-1 truncate">{project.name}</h3>
              <p className="text-sm text-slate-400 truncate">{project.client?.name ?? '—'}</p>
            </div>
            <Badge variant={statusColors[project.status]} size="sm">
              {project.status.replace('_', ' ')}
            </Badge>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Budget Usage</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <ProgressBar value={progress} max={100} showLabel={false} size="sm" color={progressColor} />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/50">
              <div>
                <div className="text-xs text-slate-400 mb-1">Budget</div>
                <div className="text-sm font-semibold text-slate-100">
                  ₹{(project.budget / 100000).toFixed(1)}L
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Spent</div>
                <div className="text-sm font-semibold text-slate-100">
                  ₹{(spent / 100000).toFixed(1)}L
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 pt-2">
              {project.end_date
                ? `Due: ${new Date(project.end_date).toLocaleDateString()}`
                : 'No due date'}
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}

type CreateProjectModalProps = {
  isOpen: boolean;
  loading: boolean;
  submitting: boolean;
  clients: Contact[];
  managers: AuthUser[];
  values: ProjectFormValues;
  onClose: () => void;
  onChange: (values: ProjectFormValues) => void;
  onSubmit: () => void;
};

function CreateProjectModal({
  isOpen,
  loading,
  submitting,
  clients,
  managers,
  values,
  onClose,
  onChange,
  onSubmit,
}: CreateProjectModalProps) {
  const handleFieldChange = (field: keyof ProjectFormValues) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({
      ...values,
      [field]: event.target.value,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Project" size="lg">
      {loading ? (
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading related data...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              placeholder="Project name"
              value={values.name}
              onChange={handleFieldChange('name')}
              required
            />
            <Select
              label="Status"
              value={values.status}
              onChange={handleFieldChange('status')}
              options={[
                { value: 'planned', label: 'Planned' },
                { value: 'active', label: 'Active' },
                { value: 'on_hold', label: 'On Hold' },
                { value: 'completed', label: 'Completed' },
              ]}
            />
            <Select
              label="Client"
              value={values.client_uuid}
              onChange={handleFieldChange('client_uuid')}
              options={[
                { value: '', label: 'Unassigned' },
                ...clients.map((client) => ({ value: client.uuid, label: client.name })),
              ]}
            />
            <Select
              label="Project Manager"
              value={values.manager_uuid}
              onChange={handleFieldChange('manager_uuid')}
              options={[
                { value: '', label: 'Unassigned' },
                ...managers.map((manager) => ({ value: manager.uuid, label: manager.name })),
              ]}
            />
            <Input
              label="Start Date"
              type="date"
              value={values.start_date}
              onChange={handleFieldChange('start_date')}
            />
            <Input
              label="End Date"
              type="date"
              value={values.end_date}
              onChange={handleFieldChange('end_date')}
            />
            <Input
              label="Budget (₹)"
              type="number"
              min="0"
              step="0.01"
              value={values.budget}
              onChange={handleFieldChange('budget')}
              placeholder="100000"
            />
          </div>
          <Input
            label="Description"
            value={values.description}
            onChange={handleFieldChange('description')}
            placeholder="Project description"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
