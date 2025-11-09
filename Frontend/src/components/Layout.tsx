import { ReactNode, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  BarChart3,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { listInvoices, listProjects, listTimesheets } from '../lib/api';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
}

export function Layout({ children, currentPage }: LayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [metrics, setMetrics] = useState({ activeProjects: 0, hoursLogged: 0, revenue: 0 });
  const [metricsLoading, setMetricsLoading] = useState(false);

  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  const userRoleLabel = user?.role ? user.role.replace('_', ' ') : 'Guest';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'timesheets', label: 'Timesheets', icon: Clock },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Finance', icon: DollarSign },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('landing');
  };

  useEffect(() => {
    let cancelled = false;
    const loadMetrics = async () => {
      if (!user) {
        setMetrics({ activeProjects: 0, hoursLogged: 0, revenue: 0 });
        return;
      }
      setMetricsLoading(true);
      try {
        const [activeProjectsRes, timesheetsRes, invoicesRes] = await Promise.all([
          listProjects({ status: 'active', limit: 1 }),
          listTimesheets({ limit: 100, user_uuid: user.uuid }),
          listInvoices({ status: 'paid', limit: 100 }),
        ]);

        if (cancelled) return;

        const hours = (timesheetsRes.timesheets || []).reduce((sum, entry) => sum + Number(entry.hours ?? 0), 0);
        const revenue = (invoicesRes.invoices || []).reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0);

        setMetrics({
          activeProjects: activeProjectsRes.pagination?.total ?? 0,
          hoursLogged: Number(hours.toFixed(1)),
          revenue,
        });
      } catch (error) {
        console.error('Failed to load layout metrics', error);
        if (!cancelled) {
          setMetrics({ activeProjects: 0, hoursLogged: 0, revenue: 0 });
        }
      } finally {
        if (!cancelled) {
          setMetricsLoading(false);
        }
      }
    };

    loadMetrics();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const formattedRevenue = useMemo(() => {
    const amount = metrics.revenue;
    if (!amount) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toLocaleString('en-IN')}`;
  }, [metrics.revenue]);

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />

      <div className="relative z-10 flex h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-64 flex-shrink-0 border-r border-slate-800/50 bg-slate-900/40 backdrop-blur-xl"
            >
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white">OneFlow</span>
                  </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id as any)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 rounded-lg
                          transition-all duration-200 group
                          ${
                            isActive
                              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                          }
                        `}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="p-4 border-t border-slate-800/50">
                  <div className="relative">
                    <button
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                        {userInitial}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-slate-100">
                          {user?.name}
                        </div>
                        <div className="text-xs text-slate-400 capitalize">
                          {userRoleLabel}
                        </div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {profileMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-slate-900 border border-slate-800 rounded-lg shadow-xl"
                        >
                          <button
                            onClick={() => {
                              setProfileMenuOpen(false);
                              navigate('dashboard');
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <User className="w-4 h-4" />
                            My Profile
                          </button>
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 border-b border-slate-800/50 bg-slate-900/40 backdrop-blur-xl flex items-center px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-100 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="ml-auto flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-slate-400">
                    <span className="font-semibold text-slate-100">{metricsLoading ? '—' : metrics.activeProjects}</span> Active Projects
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-slate-400">
                    <span className="font-semibold text-slate-100">{metricsLoading ? '—' : `${metrics.hoursLogged}h`}</span> Logged
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-slate-400">
                    <span className="font-semibold text-slate-100">{metricsLoading ? '—' : formattedRevenue}</span> Revenue
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
