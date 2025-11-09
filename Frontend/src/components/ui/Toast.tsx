import { motion } from 'framer-motion';
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastProps = {
  title: string;
  description?: string;
  variant?: 'success' | 'error' | 'info';
  onDismiss: () => void;
};

const VARIANT_STYLES: Record<
  NonNullable<ToastProps['variant']>,
  { icon: React.ElementType; border: string; background: string; text: string }
> = {
  success: {
    icon: CheckCircle,
    border: 'border-emerald-500/40',
    background: 'bg-emerald-500/10',
    text: 'text-emerald-200',
  },
  error: {
    icon: AlertTriangle,
    border: 'border-red-500/40',
    background: 'bg-red-500/10',
    text: 'text-red-200',
  },
  info: {
    icon: Info,
    border: 'border-cyan-500/40',
    background: 'bg-cyan-500/10',
    text: 'text-cyan-200',
  },
};

export function Toast({ title, description, variant = 'info', onDismiss }: ToastProps) {
  const style = VARIANT_STYLES[variant];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      layout
      className={`border ${style.border} ${style.background} backdrop-blur rounded-xl shadow-lg shadow-black/40 px-4 py-3`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1 rounded-lg border border-white/10 ${style.background.replace('bg-', 'bg-slate-900/40 ')} `}>
          <Icon className={`w-5 h-5 ${style.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100">{title}</p>
          {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

