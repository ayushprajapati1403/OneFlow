import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Calendar, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { createTimesheet, listProjects, listTimesheets, listTasks } from '../lib/api';
import { Project, Task, TimesheetEntry } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

const TIMESHEET_FORM_DEFAULT = {
  project_uuid: '',
  task_uuid: '',
  date: new Date().toISOString().slice(0, 10),
  hours: '',
  description: '',
  billable: true,
  cost_rate: '',
};

type TimesheetFormValues = typeof TIMESHEET_FORM_DEFAULT;

export function Timesheets() {
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [stats, setStats] = useState({
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
  });
  const { showToast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [projectOptions, setProjectOptions] = useState<Project[]>([]);
  const [taskOptions, setTaskOptions] = useState<Task[]>([]);
  const [formValues, setFormValues] = useState<TimesheetFormValues>(TIMESHEET_FORM_DEFAULT);

  useEffect(() => {
    loadTimesheets();
  }, [user]);

  useEffect(() => {
    setFormValues((prev) => ({
      ...prev,
      cost_rate: user?.hourly_rate ? String(user.hourly_rate) : prev.cost_rate,
    }));
  }, [user?.hourly_rate]);

  async function loadTimesheets() {
    if (!user) return;

    try {
      const response = await listTimesheets({
        user_uuid: user.uuid,
        limit: 20,
      });

      const entries = response.timesheets || [];
      setTimesheets(entries);
      calculateStats(entries);
    } catch (error) {
      console.error('Failed to load timesheets', error);
      setTimesheets([]);
      calculateStats([]);
      showToast({
        title: 'Failed to load timesheets',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    }
  }

  function calculateStats(data: TimesheetEntry[]) {
    const total = data.reduce((sum, t) => sum + Number(t.hours), 0);
    const billable = data.reduce((sum, t) => sum + (t.billable ? Number(t.hours) : 0), 0);

    setStats({
      totalHours: total,
      billableHours: billable,
      nonBillableHours: total - billable,
    });
  }

  const resetForm = () => {
    setFormValues({
      ...TIMESHEET_FORM_DEFAULT,
      date: new Date().toISOString().slice(0, 10),
      cost_rate: user?.hourly_rate ? String(user.hourly_rate) : '',
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateOpen(true);
    loadReferenceData();
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    resetForm();
    setTaskOptions([]);
  };

  const loadReferenceData = async () => {
    setModalLoading(true);
    try {
      const projectsResponse = await listProjects({ limit: 100 });
      const projects = projectsResponse.projects || [];
      setProjectOptions(projects);

      if (projects.length > 0) {
        const firstProjectUuid = projects[0].uuid;
        setFormValues((prev) => ({
          ...prev,
          project_uuid: firstProjectUuid,
        }));
        await loadTasksForProject(firstProjectUuid);
      }
    } catch (error) {
      console.error('Failed to load timesheet references', error);
      showToast({
        title: 'Unable to load references',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setModalLoading(false);
    }
  };

  const loadTasksForProject = async (projectUuid: string) => {
    if (!projectUuid) {
      setTaskOptions([]);
      return;
    }

    setTasksLoading(true);
    try {
      const response = await listTasks({ project_uuid: projectUuid, limit: 200 });
      setTaskOptions(response.tasks || []);
    } catch (error) {
      console.error('Failed to load project tasks', error);
      showToast({
        title: 'Unable to load tasks',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
      setTaskOptions([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const handleFieldChange =
    (field: keyof TimesheetFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormValues((prev) => {
        if (field === 'billable') {
          return { ...prev, billable: value === 'true' };
        }
        return { ...prev, [field]: value };
      });

      if (field === 'project_uuid') {
        loadTasksForProject(value);
        setFormValues((prev) => ({
          ...prev,
          task_uuid: '',
        }));
      }
    };

  const handleCreateTimesheet = async () => {
    if (!user) return;

    if (!formValues.project_uuid) {
      showToast({
        title: 'Project is required',
        description: 'Please select a project.',
        variant: 'error',
      });
      return;
    }

    const hours = Number(formValues.hours);
    if (Number.isNaN(hours) || hours <= 0) {
      showToast({
        title: 'Invalid hours',
        description: 'Hours must be a positive number.',
        variant: 'error',
      });
      return;
    }

    const costRateInput = formValues.cost_rate ? Number(formValues.cost_rate) : Number(user.hourly_rate ?? 0);
    if (Number.isNaN(costRateInput)) {
      showToast({
        title: 'Invalid cost rate',
        description: 'Cost rate must be a number.',
        variant: 'error',
      });
      return;
    }

    setCreating(true);
    try {
      const payload = {
        project_uuid: formValues.project_uuid,
        task_uuid: formValues.task_uuid || undefined,
        user_uuid: user.uuid,
        date: formValues.date,
        hours,
        description: formValues.description ? formValues.description.trim() : undefined,
        billable: formValues.billable,
        cost_rate: costRateInput,
      };

      const entry = await createTimesheet(payload);
      showToast({
        title: 'Hours logged',
        description: `${Number(entry.hours).toFixed(1)}h on ${entry.project.name}`,
        variant: 'success',
      });
      closeCreateModal();
      loadTimesheets();
    } catch (error) {
      console.error('Failed to create timesheet', error);
      showToast({
        title: 'Failed to log hours',
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
          <h1 className="text-3xl font-bold text-white mb-2">Timesheets</h1>
          <p className="text-slate-400">Log and track your working hours</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={openCreateModal}>
          Log Hours
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5">
                <Calendar className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Hours</p>
                <p className="text-2xl font-bold text-slate-100">{stats.totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Billable Hours</p>
                <p className="text-2xl font-bold text-slate-100">{stats.billableHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5">
                <Calendar className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Non-Billable</p>
                <p className="text-2xl font-bold text-slate-100">{stats.nonBillableHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Task</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Hours</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Note</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map((entry) => (
                  <tr key={entry.uuid} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-sm text-slate-300">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-300 truncate">
                      {entry.task?.title ?? entry.project.name}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-100">{entry.hours}h</td>
                    <td className="py-3 px-4">
                      <Badge variant={entry.billable ? 'success' : 'default'} size="sm">
                        {entry.billable ? 'Billable' : 'Non-Billable'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-400 truncate max-w-xs">
                      {entry.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {timesheets.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No timesheet entries yet</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <CreateTimesheetModal
        isOpen={isCreateOpen}
        loading={modalLoading}
        tasksLoading={tasksLoading}
        submitting={creating}
        projects={projectOptions}
        tasks={taskOptions}
        values={formValues}
        onClose={closeCreateModal}
        onFieldChange={handleFieldChange}
        onSubmit={handleCreateTimesheet}
      />
    </div>
  );
}

type CreateTimesheetModalProps = {
  isOpen: boolean;
  loading: boolean;
  tasksLoading: boolean;
  submitting: boolean;
  projects: Project[];
  tasks: Task[];
  values: TimesheetFormValues;
  onClose: () => void;
  onFieldChange: (field: keyof TimesheetFormValues) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: () => void;
};

function CreateTimesheetModal({
  isOpen,
  loading,
  tasksLoading,
  submitting,
  projects,
  tasks,
  values,
  onClose,
  onFieldChange,
  onSubmit,
}: CreateTimesheetModalProps) {
  const projectOptions = useMemo(
    () => [
      { value: '', label: 'Select project' },
      ...projects.map((project) => ({ value: project.uuid, label: project.name })),
    ],
    [projects],
  );

  const taskOptions = useMemo(
    () => [
      { value: '', label: 'No Task' },
      ...tasks.map((task) => ({ value: task.uuid, label: task.title })),
    ],
    [tasks],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Hours" size="lg">
      {loading ? (
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading projects...</span>
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
              label="Task"
              value={values.task_uuid}
              onChange={onFieldChange('task_uuid')}
              options={taskOptions}
              disabled={tasksLoading || !values.project_uuid}
            />
            <Input
              label="Date"
              type="date"
              value={values.date}
              onChange={onFieldChange('date')}
            />
            <Input
              label="Hours"
              type="number"
              min="0"
              step="0.25"
              value={values.hours}
              onChange={onFieldChange('hours')}
              placeholder="2"
            />
            <Select
              label="Type"
              value={values.billable ? 'true' : 'false'}
              onChange={(event) => onFieldChange('billable')(event)}
              options={[
                { value: 'true', label: 'Billable' },
                { value: 'false', label: 'Non-Billable' },
              ]}
            />
            <Input
              label="Cost Rate (₹/h)"
              type="number"
              min="0"
              step="0.5"
              value={values.cost_rate}
              onChange={onFieldChange('cost_rate')}
              placeholder="750"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              className="w-full min-h-[120px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              placeholder="Notes about this work log"
              value={values.description}
              onChange={onFieldChange('description')}
            />
          </div>
          {tasksLoading && (
            <p className="text-xs text-slate-500">Loading tasks for the selected project...</p>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={submitting || loading}>
              {submitting ? 'Logging...' : 'Log Hours'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
