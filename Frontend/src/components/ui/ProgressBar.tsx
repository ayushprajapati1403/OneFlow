import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'cyan' | 'green' | 'amber' | 'red';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({ value, max = 100, color = 'cyan', showLabel = true, size = 'md' }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const colors = {
    cyan: 'from-cyan-500 to-blue-500',
    green: 'from-green-500 to-emerald-500',
    amber: 'from-amber-500 to-orange-500',
    red: 'from-red-500 to-pink-500',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3',
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-400">Progress</span>
          <span className="text-sm font-semibold text-slate-300">{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-800/50 rounded-full overflow-hidden ${sizes[size]}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${colors[color]} rounded-full shadow-lg`}
          style={{
            boxShadow: `0 0 20px rgba(6, 182, 212, 0.4)`,
          }}
        />
      </div>
    </div>
  );
}
