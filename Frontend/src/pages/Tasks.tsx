import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, Paperclip, User, FolderKanban } from 'lucide-react';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { ApiError, createTask, listProjects, listTasks, listUsers } from '../lib/api';
import { AuthUser, Project, Task } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

const TASK_FORM_DEFAULT = {
  project_uuid: '',
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assignee_uuid: '',
  due_date: '',
};

type TaskFormValues = typeof TASK_FORM_DEFAULT;

export function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'my'>('my');
  const { showToast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [projectOptions, setProjectOptions] = useState<Project[]>([]);
  const [userOptions, setUserOptions] = useState<AuthUser[]>([]);
  const [formValues, setFormValues] = useState({ ...TASK_FORM_DEFAULT });

  useEffect(() => {
    loadTasks();
  }, [viewMode, user]);

  async function loadTasks() {
    if (!user) return;

    try {
      const response = await listTasks({
        limit: 100,
        ...(viewMode === 'my' ? { assignee_uuid: user.uuid } : {}),
      });
      setTasks(response.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks', error);
      setTasks([]);
      showToast({
        title: 'Failed to load tasks',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    }
  }

  const columns: Array<{ id: Task['status']; label: string; color: string }> = [
    { id: 'todo', label: 'To Do', color: 'from-slate-600 to-slate-700' },
    { id: 'in_progress', label: 'In Progress', color: 'from-amber-600 to-amber-700' },
    { id: 'review', label: 'In Review', color: 'from-blue-600 to-blue-700' },
    { id: 'done', label: 'Done', color: 'from-green-600 to-green-700' },
  ];

  const resetForm = () => setFormValues({ ...TASK_FORM_DEFAULT });

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
      let projects: Project[] = [];
      let users: AuthUser[] = [];

      try {
        const projectsResponse = await listProjects({ limit: 100 });
        projects = projectsResponse.projects || [];
      } catch (error) {
        showToast({
          title: 'Unable to load projects',
          description: error instanceof Error ? error.message : undefined,
          variant: 'error',
        });
      }

      try {
        const usersResponse = await listUsers({ limit: 100 });
        users = usersResponse.users || [];
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          users = user ? [user] : [];
        } else {
          showToast({
            title: 'Unable to load users',
            description: error instanceof Error ? error.message : undefined,
            variant: 'error',
          });
        }
      }

      setProjectOptions(projects);
      setUserOptions(users.length > 0 ? users : user ? [user] : []);
      setFormValues((prev) => ({
        ...prev,
        project_uuid: projects.length > 0 ? projects[0].uuid : '',
        assignee_uuid: prev.assignee_uuid || (users.length > 0 ? users[0].uuid : user?.uuid ?? ''),
      }));
    } catch (error) {
      console.error('Failed to load task references', error);
      showToast({
        title: 'Unable to load references',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleFieldChange =
    (field: keyof TaskFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setFormValues((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleCreateTask = async () => {
    if (!formValues.project_uuid) {
      showToast({
        title: 'Project is required',
        description: 'Select a project before creating the task.',
        variant: 'error',
      });
      return;
    }

    if (!formValues.title.trim()) {
      showToast({
        title: 'Task title required',
        description: 'Please provide a task title.',
        variant: 'error',
      });
      return;
    }

    setCreating(true);
    try {
      const payload = {
        project_uuid: formValues.project_uuid,
        title: formValues.title.trim(),
        description: formValues.description ? formValues.description.trim() : undefined,
        status: formValues.status,
        priority: formValues.priority,
        assignee_uuid: formValues.assignee_uuid || undefined,
        due_date: formValues.due_date || undefined,
        assigned_user_uuids: formValues.assignee_uuid ? [formValues.assignee_uuid] : undefined,
      };

      const task = await createTask(payload);
      showToast({
        title: 'Task created',
        description: task.title,
        variant: 'success',
      });
      closeCreateModal();
      loadTasks();
    } catch (error) {
      console.error('Failed to create task', error);
      showToast({
        title: 'Failed to create task',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-slate-400">Organize and track your work</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('my')}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${
                  viewMode === 'my'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'
                }
              `}
            >
              My Tasks
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${
                  viewMode === 'all'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'
                }
              `}
            >
              All Tasks
            </button>
          </div>
          <Button icon={<Plus className="w-5 h-5" />} onClick={openCreateModal}>
            Add Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasks.filter((t) => t.status === column.id)}
          />
        ))}
      </div>
      <CreateTaskModal
        isOpen={isCreateOpen}
        loading={modalLoading}
        submitting={creating}
        projects={projectOptions}
        users={userOptions}
        values={formValues}
        onClose={closeCreateModal}
        onFieldChange={handleFieldChange}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
}: {
  column: { id: string; label: string; color: string };
  tasks: Task[];
}) {
  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      <div className={`p-3 rounded-t-xl bg-gradient-to-r ${column.color} flex items-center justify-between`}>
        <h3 className="font-semibold text-white">{column.label}</h3>
        <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium">
          {tasks.length}
        </span>
      </div>

      <Card className="flex-1 overflow-y-auto rounded-t-none">
        <CardBody className="space-y-3">
          <AnimatePresence>
            {tasks.map((task) => (
              <TaskCard key={task.uuid} task={task} />
            ))}
          </AnimatePresence>

          {tasks.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              No tasks
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const priorityColors: Record<Task['priority'], 'danger' | 'warning' | 'info' | 'default'> = {
    high: 'danger',
    medium: 'warning',
    low: 'info',
  };
  const assignmentCount = task.assignments?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/30 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-slate-100 text-sm line-clamp-2 flex-1">{task.title}</h4>
        <Badge variant={priorityColors[task.priority]} size="sm">
          {task.priority}
        </Badge>
      </div>

      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-3">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString()}
            </div>
          )}
          {assignmentCount > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {assignmentCount}
            </div>
          )}
          {task.assignee?.name && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.assignee.name}
            </div>
          )}
          {task.project?.name && (
            <div className="flex items-center gap-1">
              <FolderKanban className="w-3 h-3" />
              {task.project.name}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

type CreateTaskModalProps = {
  isOpen: boolean;
  loading: boolean;
  submitting: boolean;
  projects: Project[];
  users: AuthUser[];
  values: TaskFormValues;
  onClose: () => void;
  onFieldChange: (field: keyof TaskFormValues) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: () => void;
};

function CreateTaskModal({
  isOpen,
  loading,
  submitting,
  projects,
  users,
  values,
  onClose,
  onFieldChange,
  onSubmit,
}: CreateTaskModalProps) {
  const projectOptions = useMemo(
    () => [
      { value: '', label: 'Select project' },
      ...projects.map((project) => ({ value: project.uuid, label: project.name })),
    ],
    [projects],
  );

  const assigneeOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...users.map((user) => ({ value: user.uuid, label: `${user.name} (${user.role.replace('_', ' ')})` })),
    ],
    [users],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Task" size="lg">
      {loading ? (
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading task references...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Project"
              value={values.project_uuid}
              onChange={onFieldChange('project_uuid')}
              options={projectOptions}
            />
            <Select
              label="Assignee"
              value={values.assignee_uuid}
              onChange={onFieldChange('assignee_uuid')}
              options={assigneeOptions}
            />
            <Select
              label="Priority"
              value={values.priority}
              onChange={onFieldChange('priority')}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
            <Select
              label="Status"
              value={values.status}
              onChange={onFieldChange('status')}
              options={[
                { value: 'todo', label: 'To Do' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'review', label: 'In Review' },
                { value: 'done', label: 'Done' },
              ]}
            />
            <Input
              label="Title"
              value={values.title}
              onChange={onFieldChange('title')}
              placeholder="Task title"
              required
            />
            <Input
              label="Due Date"
              type="date"
              value={values.due_date}
              onChange={onFieldChange('due_date')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              className="w-full min-h-[120px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              placeholder="Task description"
              value={values.description}
              onChange={onFieldChange('description')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={submitting || loading}>
              {submitting ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
