import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardBody } from './Card';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'cyan' | 'green' | 'amber' | 'red' | 'purple';
}

export function KPICard({ title, value, icon: Icon, trend, color = 'cyan' }: KPICardProps) {
  const colorClasses = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 shadow-cyan-500/20',
    green: 'from-green-500/20 to-green-500/5 text-green-400 shadow-green-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 shadow-amber-500/20',
    red: 'from-red-500/20 to-red-500/5 text-red-400 shadow-red-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 shadow-purple-500/20',
  };

  return (
    <Card hover3d glow className="overflow-hidden">
      <CardBody className="relative">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} rounded-full blur-3xl opacity-20`} />

        <div className="relative flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
            <motion.p
              className="text-3xl font-bold text-slate-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {value}
            </motion.p>
            {trend && (
              <div className={`mt-2 text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </div>
            )}
          </div>

          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
