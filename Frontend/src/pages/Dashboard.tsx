import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderKanban, Clock, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { KPICard } from '../components/ui/KPICard';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { getAnalyticsDashboard, listProjects, listTasks, listTimesheets, listInvoices } from '../lib/api';
import { AnalyticsKpi, Project, Task } from '../lib/types';
import { useNavigate } from '../hooks/useNavigate';
import { useToast } from '../hooks/useToast';

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

const buildTrend = (current: number, change: number) => {
  const previous = current - change;
  let percent = 0;
  if (previous === 0) {
    if (change === 0) {
      percent = 0;
    } else {
      percent = 100 * Math.sign(change);
    }
  } else {
    percent = (change / previous) * 100;
  }

  return {
    value: Number(Math.abs(percent).toFixed(1)),
    isPositive: percent >= 0,
  };
};

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({
    activeProjects: 0,
    tasksCompleted: 0,
    hoursLogged: 0,
    revenue: 0,
  });
  const [kpi, setKpi] = useState<AnalyticsKpi | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const activeTrend = useMemo(() => (kpi ? buildTrend(kpi.activeProjects, kpi.activeProjectsChange) : undefined), [kpi]);
  const tasksTrend = useMemo(() => (kpi ? buildTrend(kpi.tasksCompleted, kpi.tasksCompletedChange) : undefined), [kpi]);
  const hoursTrend = useMemo(() => (kpi ? buildTrend(kpi.hoursLogged, kpi.hoursLoggedChange) : undefined), [kpi]);
  const revenueTrend = useMemo(() => (kpi ? buildTrend(kpi.revenue, kpi.revenueChange) : undefined), [kpi]);

  async function loadDashboardData() {
    if (!user) return;

    try {
      const [
        recentProjectsRes,
        myTasksRes,
        activeProjectsRes,
        completedTasksRes,
        timesheetsRes,
        invoicesRes,
        analyticsRes
      ] = await Promise.all([
        listProjects({ limit: 6, status: ['active', 'planned'] }),
        listTasks({ limit: 10, assignee_uuid: user.uuid, status: ['todo', 'in_progress', 'review'] }),
        listProjects({ limit: 1, status: 'active' }),
        listTasks({ limit: 1, status: 'done' }),
        listTimesheets({ user_uuid: user.uuid, limit: 100 }),
        listInvoices({ status: 'paid', limit: 100 }),
        getAnalyticsDashboard()
      ]);

      setProjects(recentProjectsRes.projects || []);
      setTasks(myTasksRes.tasks || []);
      const totalHours = (timesheetsRes.timesheets || []).reduce((sum, entry) => sum + Number(entry.hours ?? 0), 0);
      const totalRevenue = (invoicesRes.invoices || []).reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0);

      setKpi(analyticsRes.kpi ?? null);
    setStats({
        activeProjects: analyticsRes.kpi?.activeProjects ?? activeProjectsRes.pagination?.total ?? 0,
        tasksCompleted: analyticsRes.kpi?.tasksCompleted ?? completedTasksRes.pagination?.total ?? 0,
        hoursLogged: Number((analyticsRes.kpi?.hoursLogged ?? totalHours).toFixed(1)),
        revenue: analyticsRes.kpi?.revenue ?? totalRevenue,
    });
    } catch (error) {
      console.error('Failed to load dashboard data', error);
      showToast({
        title: 'Failed to load dashboard data',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.name}
          </h1>
          <p className="text-slate-400">Here's what's happening with your projects today.</p>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={itemVariants}>
          <KPICard
            title="Active Projects"
            value={stats.activeProjects}
            icon={FolderKanban}
            color="cyan"
            trend={activeTrend}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="Tasks Completed"
            value={stats.tasksCompleted}
            icon={CheckCircle}
            color="green"
            trend={tasksTrend}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="Hours Logged"
            value={numberFormatter.format(stats.hoursLogged)}
            icon={Clock}
            color="amber"
            trend={hoursTrend}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="Revenue (Paid)"
            value={currencyFormatter.format(stats.revenue)}
            icon={DollarSign}
            color="green"
            trend={revenueTrend}
          />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Projects</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('projects')}>
              View All
            </Button>
          </CardHeader>
          <CardBody className="space-y-4">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No projects yet</p>
              </div>
            ) : (
              projects.map((project) => (
                <ProjectCard key={project.uuid} project={project} navigate={navigate} />
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Tasks</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('tasks')}>
              View All
            </Button>
          </CardHeader>
          <CardBody className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No tasks assigned</p>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskItem key={task.uuid} task={task} />
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {user?.role === 'project_manager' && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="primary" onClick={() => navigate('projects')}>
                Create Project
              </Button>
              <Button variant="secondary" onClick={() => navigate('settings')}>
                Create Invoice
              </Button>
              <Button variant="secondary" onClick={() => navigate('settings')}>
                Approve Expenses
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
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

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-cyan-500/30 transition-all cursor-pointer"
      onClick={() => navigate('project-detail', { uuid: project.uuid })}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-100 mb-1">{project.name}</h3>
          <p className="text-sm text-slate-400">{project.client?.name ?? '—'}</p>
        </div>
        <Badge variant={statusColors[project.status]} size="sm">
          {project.status.replace('_', ' ')}
        </Badge>
      </div>
      <ProgressBar value={progress} max={100} showLabel={false} size="sm" />
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>Budget: ₹{(project.budget / 1000).toFixed(0)}K</span>
        <span>Spent: ₹{(spent / 1000).toFixed(0)}K</span>
      </div>
    </motion.div>
  );
}

function TaskItem({ task }: { task: Task }) {
  const priorityColors: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
    urgent: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'default',
  };

  const statusColors: Record<Task['status'], 'info' | 'warning' | 'success' | 'default'> = {
    todo: 'default',
    in_progress: 'info',
    review: 'warning',
    done: 'success',
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-100 mb-1 truncate">{task.title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={priorityColors[task.priority] ?? 'default'} size="sm">
            {task.priority}
          </Badge>
          <Badge variant={statusColors[task.status]} size="sm">
            {task.status.replace('_', ' ')}
          </Badge>
          {task.due_date && (
            <span className="text-xs text-slate-400">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          {task.project?.name && (
            <span className="text-xs text-slate-500">Project: {task.project.name}</span>
          )}
        </div>
      </div>
      {task.status === 'review' && <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />}
    </div>
  );
}

