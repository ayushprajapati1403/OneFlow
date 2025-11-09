import { motion } from 'framer-motion';
import { Play, BarChart3, Clock, DollarSign, Users, ArrowRight } from 'lucide-react';
import { ProceduralBackground } from '../components/ProceduralBackground';
import { Button } from '../components/ui/Button';
import { useNavigate } from '../hooks/useNavigate';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ProceduralBackground />

      <div className="relative z-10">
        <nav className="absolute top-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">OneFlow</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <Button variant="ghost" onClick={() => navigate('signin')}>
                Sign In
              </Button>
            </motion.div>
          </div>
        </nav>

        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6"
              >
                Premium Project Management
              </motion.div>

              <h1 className="text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Plan. Execute.{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Bill.
                </span>
                <br />
                In One Place.
              </h1>

              <p className="text-xl text-slate-300 mb-10 leading-relaxed">
                Projects, tasks, hours, and money—beautifully connected.
                <br />
                The only platform you need to manage everything.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate('signup')}
                  icon={<ArrowRight className="w-5 h-5" />}
                >
                  Get Started
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  icon={<Play className="w-5 h-5" />}
                >
                  Watch Demo
                </Button>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center"
                >
                  <div className="text-3xl font-bold text-cyan-400 mb-1">500+</div>
                  <div className="text-sm text-slate-400">Active Projects</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-center"
                >
                  <div className="text-3xl font-bold text-blue-400 mb-1">12.5k</div>
                  <div className="text-sm text-slate-400">Hours Logged</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-center"
                >
                  <div className="text-3xl font-bold text-green-400 mb-1">$2.4M</div>
                  <div className="text-sm text-slate-400">Revenue YTD</div>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-3xl blur-3xl" />
                <div className="relative backdrop-blur-xl bg-slate-900/40 border border-slate-800/50 rounded-3xl p-8 shadow-2xl">
                  <div className="space-y-4">
                    <FeatureCard
                      icon={<BarChart3 className="w-5 h-5" />}
                      title="Project Tracking"
                      description="Real-time insights into project health and progress"
                      delay={0.3}
                    />
                    <FeatureCard
                      icon={<Clock className="w-5 h-5" />}
                      title="Time Management"
                      description="Accurate timesheet logging with billable tracking"
                      delay={0.4}
                    />
                    <FeatureCard
                      icon={<DollarSign className="w-5 h-5" />}
                      title="Financial Hub"
                      description="Invoices, bills, and expenses in one place"
                      delay={0.5}
                    />
                    <FeatureCard
                      icon={<Users className="w-5 h-5" />}
                      title="Team Collaboration"
                      description="Seamless coordination across your entire team"
                      delay={0.6}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-cyan-500/30 transition-colors"
    >
      <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-400">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-slate-100 mb-1">{title}</h3>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </motion.div>
  );
}
