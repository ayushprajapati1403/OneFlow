import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, User, Users, FolderKanban } from 'lucide-react';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { MultiSelect } from '../components/ui/MultiSelect';
import { ApiError, createTask, createTimesheet, getTask, listProjects, listTasks, listUsers, updateTask } from '../lib/api';
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
  assigned_user_uuids: [] as string[],
};

type TaskFormValues = typeof TASK_FORM_DEFAULT;

type TaskDetailForm = {
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assignee_uuid: string;
  assigned_user_uuids: string[];
};

type TimeLogForm = {
  date: string;
  hours: string;
  description: string;
  billable: boolean;
};

const mapTaskToDetailForm = (task: Task): TaskDetailForm => {
  const assignmentUuids = [
    ...(task.assignments?.map((assignment) => assignment.user.uuid) ?? []),
    ...(task.assignee?.uuid ? [task.assignee.uuid] : []),
  ].filter(Boolean);

  const uniqueAssignments = Array.from(new Set(assignmentUuids));

  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    due_date: task.due_date ?? '',
    assignee_uuid: task.assignee?.uuid ?? '',
    assigned_user_uuids: uniqueAssignments,
  };
};

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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [detailForm, setDetailForm] = useState<TaskDetailForm>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    assignee_uuid: '',
    assigned_user_uuids: [],
  });
  const [logTimeForm, setLogTimeForm] = useState<TimeLogForm>({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    description: '',
    billable: true,
  });
  const dragActiveRef = useRef(false);

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

      const fallbackUsers = users.length > 0 ? users : user ? [user] : [];
      setProjectOptions(projects);
      setUserOptions(fallbackUsers);
      setFormValues((prev) => {
        const defaultAssignee = prev.assignee_uuid || fallbackUsers[0]?.uuid || '';
        const assignedSet = prev.assigned_user_uuids.length > 0 ? prev.assigned_user_uuids : defaultAssignee ? [defaultAssignee] : [];
        return {
          ...prev,
          project_uuid: projects.length > 0 ? projects[0].uuid : '',
          assignee_uuid: defaultAssignee,
          assigned_user_uuids: Array.from(new Set(assignedSet)),
        };
      });
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
      const value = event.target.value;

      if (field === 'assignee_uuid') {
        setFormValues((prev) => {
          const cleaned = prev.assigned_user_uuids.filter((id) => id && id !== prev.assignee_uuid);
          const assigned = value ? Array.from(new Set([...cleaned, value])) : cleaned;
          return {
            ...prev,
            assignee_uuid: value,
            assigned_user_uuids: assigned,
          };
        });
        return;
      }

      setFormValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleAssignedUsersChange = (selected: string[]) => {
    setFormValues((prev) => {
      const nextAssignee = selected.includes(prev.assignee_uuid) ? prev.assignee_uuid : selected[0] ?? '';
      return {
        ...prev,
        assignee_uuid: nextAssignee,
        assigned_user_uuids: selected,
      };
    });
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
      assigned_user_uuids: formValues.assigned_user_uuids.length > 0 ? formValues.assigned_user_uuids : undefined,
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

  const handleTaskClick = (task: Task) => {
    if (dragActiveRef.current) {
      dragActiveRef.current = false;
      return;
    }
    openTaskDetail(task.uuid);
  };

  const handleTaskDragStart = (task: Task, event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', task.uuid);
    event.dataTransfer.effectAllowed = 'move';
    dragActiveRef.current = true;
  };

  const handleTaskDragEnd = () => {
    dragActiveRef.current = false;
  };

  const handleTaskDrop = async (taskUuid: string, nextStatus: Task['status']) => {
    dragActiveRef.current = false;
    const target = tasks.find((item) => item.uuid === taskUuid);
    if (!target || target.status === nextStatus) {
      return;
    }

    const previousTasks = tasks;
    setTasks((prev) => prev.map((item) => (item.uuid === taskUuid ? { ...item, status: nextStatus } : item)));

    try {
      const updated = await updateTask(taskUuid, { status: nextStatus });
      setTasks((prev) => prev.map((item) => (item.uuid === updated.uuid ? updated : item)));
      if (selectedTask?.uuid === updated.uuid) {
        setSelectedTask(updated);
        setDetailForm(mapTaskToDetailForm(updated));
      }
    } catch (error) {
      console.error('Failed to update task status', error);
      setTasks(previousTasks);
      showToast({
        title: 'Unable to move task',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    }
  };

  const openTaskDetail = async (taskUuid: string) => {
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      if (userOptions.length === 0) {
        try {
          const usersResponse = await listUsers({ limit: 100 });
          const fetchedUsers = usersResponse.users || [];
          setUserOptions(fetchedUsers.length > 0 ? fetchedUsers : user ? [user] : []);
        } catch (error) {
          if (error instanceof ApiError && error.status === 403) {
            setUserOptions(user ? [user] : []);
          } else {
            throw error;
          }
        }
      }

      const task = await getTask(taskUuid);
      setSelectedTask(task);
      setDetailForm(mapTaskToDetailForm(task));
      setLogTimeForm({
        date: new Date().toISOString().split('T')[0],
        hours: '',
        description: '',
        billable: true,
      });
    } catch (error) {
      console.error('Failed to load task detail', error);
      showToast({
        title: 'Failed to load task',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailOpen(false);
    setSelectedTask(null);
  };

  const handleDetailFieldChange =
    (field: keyof TaskDetailForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.target.value;

      if (field === 'assignee_uuid') {
        setDetailForm((prev) => {
          const cleaned = prev.assigned_user_uuids.filter((id) => id && id !== prev.assignee_uuid);
          const assigned = value ? Array.from(new Set([...cleaned, value])) : cleaned;
          return {
            ...prev,
            assignee_uuid: value,
            assigned_user_uuids: assigned,
          };
        });
        return;
      }

      setDetailForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleDetailAssignedChange = (selected: string[]) => {
    setDetailForm((prev) => {
      const nextAssignee = selected.includes(prev.assignee_uuid) ? prev.assignee_uuid : selected[0] ?? '';
      return {
        ...prev,
        assignee_uuid: nextAssignee,
        assigned_user_uuids: selected,
      };
    });
  };

  const handleDetailSubmit = async () => {
    if (!selectedTask) return;

    if (!detailForm.title.trim()) {
      showToast({
        title: 'Task title required',
        description: 'Please provide a task title.',
        variant: 'error',
      });
      return;
    }

    setDetailSaving(true);
    try {
      const payload = {
        title: detailForm.title.trim(),
        description: detailForm.description.trim(),
        status: detailForm.status,
        priority: detailForm.priority,
        assignee_uuid: detailForm.assignee_uuid,
        due_date: detailForm.due_date || null,
        assigned_user_uuids: detailForm.assigned_user_uuids,
      };

      const updated = await updateTask(selectedTask.uuid, payload);
      setSelectedTask(updated);
      setDetailForm(mapTaskToDetailForm(updated));
      setTasks((prev) => prev.map((task) => (task.uuid === updated.uuid ? updated : task)));

      showToast({
        title: 'Task updated',
        description: updated.title,
        variant: 'success',
      });
    } catch (error) {
      console.error('Failed to update task', error);
      showToast({
        title: 'Failed to update task',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setDetailSaving(false);
    }
  };

  const handleLogFieldChange = <K extends keyof TimeLogForm>(field: K, value: TimeLogForm[K]) => {
    setLogTimeForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogTimeSubmit = async () => {
    if (!selectedTask) return;

    if (!selectedTask.project?.uuid) {
      showToast({
        title: 'Project required',
        description: 'Assign this task to a project before logging time.',
        variant: 'error',
      });
      return;
    }

    if (!user) {
      showToast({
        title: 'User context missing',
        description: 'Please sign in again to log time.',
        variant: 'error',
      });
      return;
    }

    const hours = Number(logTimeForm.hours);
    if (Number.isNaN(hours) || hours <= 0) {
      showToast({
        title: 'Invalid hours',
        description: 'Enter a positive number of hours.',
        variant: 'error',
      });
      return;
    }

    setLogSubmitting(true);
    try {
      await createTimesheet({
        project_uuid: selectedTask.project.uuid,
        task_uuid: selectedTask.uuid,
        user_uuid: user.uuid,
        date: logTimeForm.date,
        hours,
        description: logTimeForm.description.trim() ? logTimeForm.description.trim() : undefined,
        billable: logTimeForm.billable,
      });

      showToast({
        title: 'Time logged',
        description: `${hours.toFixed(2)} hours recorded.`,
        variant: 'success',
      });

      setLogTimeForm((prev) => ({
        ...prev,
        hours: '',
        description: '',
      }));
    } catch (error) {
      console.error('Failed to log time', error);
      showToast({
        title: 'Failed to log time',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setLogSubmitting(false);
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
            onTaskClick={handleTaskClick}
            onTaskDrop={handleTaskDrop}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
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
      onAssignedUsersChange={handleAssignedUsersChange}
        onSubmit={handleCreateTask}
      />
      <TaskDetailModal
        isOpen={isDetailOpen}
        loading={detailLoading}
        saving={detailSaving}
        logSubmitting={logSubmitting}
        task={selectedTask}
        values={detailForm}
        users={userOptions}
        onClose={closeDetailModal}
        onFieldChange={handleDetailFieldChange}
        onAssignedUsersChange={handleDetailAssignedChange}
        onSubmit={handleDetailSubmit}
        logForm={logTimeForm}
        onLogFieldChange={handleLogFieldChange}
        onLogSubmit={handleLogTimeSubmit}
        canLogTime={Boolean(selectedTask?.project?.uuid && user)}
      />
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onTaskDrop,
  onTaskDragStart,
  onTaskDragEnd,
}: {
  column: { id: string; label: string; color: string };
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskDrop: (taskUuid: string, status: Task['status']) => void;
  onTaskDragStart: (task: Task, event: React.DragEvent<HTMLDivElement>) => void;
  onTaskDragEnd: () => void;
}) {
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const taskUuid = event.dataTransfer.getData('text/plain');
    if (taskUuid) {
      onTaskDrop(taskUuid, column.id as Task['status']);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      <div className={`p-3 rounded-t-xl bg-gradient-to-r ${column.color} flex items-center justify-between`}>
        <h3 className="font-semibold text-white">{column.label}</h3>
        <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium">
          {tasks.length}
        </span>
      </div>

      <Card className="flex-1 overflow-y-auto rounded-t-none">
        <CardBody className="space-y-3" onDragOver={handleDragOver} onDrop={handleDrop}>
          <AnimatePresence>
            {tasks.map((task) => (
              <TaskCard
                key={task.uuid}
                task={task}
                onClick={onTaskClick}
                onDragStart={onTaskDragStart}
                onDragEnd={onTaskDragEnd}
              />
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

type TaskCardProps = {
  task: Task;
  onClick: (task: Task) => void;
  onDragStart: (task: Task, event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
};

function TaskCard({ task, onClick, onDragStart, onDragEnd }: TaskCardProps) {
  const priorityColors: Record<Task['priority'], 'danger' | 'warning' | 'info' | 'default'> = {
    high: 'danger',
    medium: 'warning',
    low: 'info',
  };

  const collaboratorMap = new Map<string, string>();
  task.assignments?.forEach((assignment) => {
    if (assignment.user?.uuid) {
      collaboratorMap.set(assignment.user.uuid, assignment.user.name);
    }
  });
  if (task.assignee?.uuid && task.assignee?.name) {
    collaboratorMap.set(task.assignee.uuid, task.assignee.name);
  }
  const collaborators = Array.from(collaboratorMap.values());

  const handleClick = () => onClick(task);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(task);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(event) => onDragStart(task, event)}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <h4 className="font-medium text-slate-100 text-sm line-clamp-2 flex-1">{task.title}</h4>
        <Badge variant={priorityColors[task.priority]} size="sm">
          {task.priority}
        </Badge>
      </div>

      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-3">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString()}
            </div>
          )}
          {task.project?.name && (
            <div className="flex items-center gap-1">
              <FolderKanban className="w-3 h-3" />
              {task.project.name}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.assignee?.name && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.assignee.name}
            </div>
          )}
          {collaborators.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {collaborators.length}
            </div>
          )}
        </div>
      </div>

      {collaborators.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {collaborators.slice(0, 3).map((name) => (
            <span key={name} className="px-2 py-1 rounded-full bg-slate-900/60 text-[10px] font-medium text-slate-200">
              {name}
            </span>
          ))}
          {collaborators.length > 3 && (
            <span className="text-[10px] text-slate-400 font-medium">
              +{collaborators.length - 3} more
            </span>
          )}
        </div>
      )}
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
  onAssignedUsersChange: (values: string[]) => void;
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
  onAssignedUsersChange,
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

  const assignmentOptions = useMemo(
    () => users.map((user) => ({ value: user.uuid, label: `${user.name} (${user.role.replace('_', ' ')})` })),
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
            <div className="md:col-span-2">
              <MultiSelect
                label="Collaborators"
                value={values.assigned_user_uuids}
                onChange={onAssignedUsersChange}
                options={assignmentOptions}
                helperText="Select everyone who should work on this task."
              />
            </div>
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

type TaskDetailModalProps = {
  isOpen: boolean;
  loading: boolean;
  saving: boolean;
  logSubmitting: boolean;
  task: Task | null;
  values: TaskDetailForm;
  users: AuthUser[];
  onClose: () => void;
  onFieldChange: (field: keyof TaskDetailForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onAssignedUsersChange: (values: string[]) => void;
  onSubmit: () => void;
  logForm: TimeLogForm;
  onLogFieldChange: <K extends keyof TimeLogForm>(field: K, value: TimeLogForm[K]) => void;
  onLogSubmit: () => void;
  canLogTime: boolean;
};

function TaskDetailModal({
  isOpen,
  loading,
  saving,
  logSubmitting,
  task,
  values,
  users,
  onClose,
  onFieldChange,
  onAssignedUsersChange,
  onSubmit,
  logForm,
  onLogFieldChange,
  onLogSubmit,
  canLogTime,
}: TaskDetailModalProps) {
  const collaboratorOptions = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((member) => map.set(member.uuid, `${member.name} (${member.role.replace('_', ' ')})`));
    task?.assignments?.forEach((assignment) => {
      if (assignment.user?.uuid && assignment.user?.name) {
        map.set(assignment.user.uuid, assignment.user.name);
      }
    });
    if (task?.assignee?.uuid && task.assignee?.name) {
      map.set(task.assignee.uuid, task.assignee.name);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [task, users]);

  const assigneeOptions = useMemo(
    () => [{ value: '', label: 'Unassigned' }, ...collaboratorOptions],
    [collaboratorOptions],
  );

  const collaboratorLabelMap = useMemo(() => new Map(collaboratorOptions.map((option) => [option.value, option.label])), [collaboratorOptions]);

  const activeCollaborators = useMemo(
    () =>
      Array.from(
        new Set(
          values.assigned_user_uuids
            .map((uuid) => collaboratorLabelMap.get(uuid))
            .filter((label): label is string => Boolean(label)),
        ),
      ),
    [values.assigned_user_uuids, collaboratorLabelMap],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task Details" size="xl">
      {loading ? (
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading task...</span>
        </div>
      ) : !task ? (
        <div className="p-6 text-center text-slate-400">Select a task to view its details.</div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-500">Project</span>
            <span className="text-base font-semibold text-slate-100">{task.project?.name ?? '—'}</span>
            <span className="text-xs text-slate-500">
              Last updated {task.updated_at ? new Date(task.updated_at).toLocaleString() : '—'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Title"
              value={values.title}
              onChange={onFieldChange('title')}
              placeholder="Task title"
              required
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
              label="Due Date"
              type="date"
              value={values.due_date}
              onChange={onFieldChange('due_date')}
            />
            <Select
              label="Primary Assignee"
              value={values.assignee_uuid}
              onChange={onFieldChange('assignee_uuid')}
              options={assigneeOptions}
            />
            <div className="md:col-span-2">
              <MultiSelect
                label="Collaborators"
                value={values.assigned_user_uuids}
                onChange={onAssignedUsersChange}
                options={collaboratorOptions}
                helperText="Everyone selected here will receive this task."
                emptyText="Invite teammates to assign more collaborators."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              className="w-full min-h-[140px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              placeholder="What needs to be done?"
              value={values.description}
              onChange={onFieldChange('description')}
            />
          </div>

          {activeCollaborators.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wide text-slate-500">Assigned Team</span>
              <div className="flex flex-wrap gap-2">
                {activeCollaborators.map((name) => (
                  <span key={name} className="px-3 py-1 rounded-full bg-slate-900/70 text-xs text-slate-200 border border-slate-700/60">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="border border-slate-800 rounded-xl bg-slate-900/40 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Log Time</h3>
              <p className="text-xs text-slate-500">Capture your effort right from the task detail view.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                value={logForm.date}
                onChange={(event) => onLogFieldChange('date', event.target.value)}
              />
              <Input
                label="Hours"
                type="number"
                min="0.25"
                step="0.25"
                value={logForm.hours}
                onChange={(event) => onLogFieldChange('hours', event.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
              <textarea
                className="w-full min-h-[100px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                placeholder="Optional notes"
                value={logForm.description}
                onChange={(event) => onLogFieldChange('description', event.target.value)}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/50"
                checked={logForm.billable}
                onChange={(event) => onLogFieldChange('billable', event.target.checked)}
              />
              Billable entry
            </label>
            {!canLogTime && (
              <p className="text-xs text-amber-400">
                This task requires an associated project before time can be logged.
              </p>
            )}
            <div className="flex justify-end">
              <Button onClick={onLogSubmit} disabled={!canLogTime || logSubmitting}>
                {logSubmitting ? 'Logging...' : 'Log Time'}
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
