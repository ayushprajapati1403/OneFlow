import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Clock, Target } from 'lucide-react';
import { KPICard } from '../components/ui/KPICard';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getAnalyticsDashboard } from '../lib/api';
import { AnalyticsDashboardResponse, AnalyticsKpi, AnalyticsProjectTrend, AnalyticsResourcePoint, AnalyticsRevenuePoint } from '../lib/types';
import { useToast } from '../hooks/useToast';

const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
const integerFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

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
    isPositive: percent >= 0
  };
};

export function Analytics() {
  const { showToast } = useToast();
  const [projectData, setProjectData] = useState<AnalyticsProjectTrend[]>([]);
  const [resourceData, setResourceData] = useState<AnalyticsResourcePoint[]>([]);
  const [revenueData, setRevenueData] = useState<AnalyticsRevenuePoint[]>([]);
  const [kpi, setKpi] = useState<AnalyticsKpi | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response: AnalyticsDashboardResponse = await getAnalyticsDashboard();
      setProjectData(response.projectTrends ?? []);
      setResourceData(response.resourceUtilization ?? []);
      setRevenueData(response.revenueVsCost ?? []);
      setKpi(response.kpi ?? null);
    } catch (error) {
      console.error('Failed to load analytics', error);
      showToast({
        title: 'Failed to load analytics',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const activeTrend = useMemo(() => (kpi ? buildTrend(kpi.activeProjects, kpi.activeProjectsChange) : undefined), [kpi]);
  const taskTrend = useMemo(() => (kpi ? buildTrend(kpi.tasksCompleted, kpi.tasksCompletedChange) : undefined), [kpi]);
  const hoursTrend = useMemo(() => (kpi ? buildTrend(kpi.hoursLogged, kpi.hoursLoggedChange) : undefined), [kpi]);
  const revenueTrend = useMemo(() => (kpi ? buildTrend(kpi.revenue, kpi.revenueChange) : undefined), [kpi]);

  const profitabilitySummary = useMemo(() => {
    if (revenueData.length === 0) {
      return { value: 0, trend: undefined as ReturnType<typeof buildTrend> | undefined };
    }
    const latest = revenueData[revenueData.length - 1];
    const previous = revenueData.length > 1 ? revenueData[revenueData.length - 2] : undefined;

    const margin = latest.revenue === 0 ? 0 : ((latest.revenue - latest.cost) / latest.revenue) * 100;
    const previousMargin =
      previous && previous.revenue !== 0 ? ((previous.revenue - previous.cost) / previous.revenue) * 100 : 0;
    const change = margin - previousMargin;
    return { value: margin, trend: buildTrend(margin, change) };
  }, [revenueData]);

  const resourceLegend = useMemo(
    () =>
      resourceData.map((item) => ({
        name: item.name,
        color: item.color,
      })),
    [resourceData],
  );

  const activeProjectsValue = kpi ? integerFormatter.format(kpi.activeProjects) : '—';
  const tasksCompletedValue = kpi ? integerFormatter.format(kpi.tasksCompleted) : '—';
  const hoursLoggedValue = kpi ? numberFormatter.format(kpi.hoursLogged) : '—';
  const revenueValue = kpi ? currencyFormatter.format(kpi.revenue) : '—';
  const profitabilityValue = `${numberFormatter.format(profitabilitySummary.value)}%`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <div className="flex items-center gap-3">
          <p className="text-slate-400 hidden sm:block">Insights into your project performance</p>
          <Button variant="secondary" onClick={loadAnalytics} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading analytics...</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Active Projects"
          value={activeProjectsValue}
          icon={Target}
          color="cyan"
          trend={activeTrend}
        />
        <KPICard
          title="Tasks Completed"
          value={tasksCompletedValue}
          icon={TrendingUp}
          color="green"
          trend={taskTrend}
        />
        <KPICard
          title="Hours Logged"
          value={hoursLoggedValue}
          icon={Clock}
          color="amber"
          trend={hoursTrend}
        />
        <KPICard
          title="Revenue (Paid)"
          value={revenueValue}
          icon={DollarSign}
          color="green"
          trend={revenueTrend}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
          </CardHeader>
          <CardBody>
            {projectData.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">No project activity in the selected period.</div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="completed" fill="#22C55E" radius={[8, 8, 0, 0]} />
                <Bar dataKey="active" fill="#06B6D4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Utilization</CardTitle>
          </CardHeader>
          <CardBody>
            {resourceData.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">No utilization metrics available.</div>
            ) : (
              <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={resourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                      {resourceData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
                  {resourceLegend.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-slate-300">{item.name}</span>
                </div>
              ))}
            </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Cost Analysis</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">
              Profitability:
              <span className="text-slate-100 font-semibold ml-2">{profitabilityValue}</span>
            </p>
            {profitabilitySummary.trend && (
              <span className={`text-sm ${profitabilitySummary.trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {profitabilitySummary.trend.isPositive ? '↑' : '↓'} {profitabilitySummary.trend.value}%
              </span>
            )}
          </div>
          {revenueData.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">No financial records available yet.</div>
          ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#22C55E"
                strokeWidth={3}
                dot={{ fill: '#22C55E', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#EF4444"
                strokeWidth={3}
                dot={{ fill: '#EF4444', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
