import { HTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover3d?: boolean;
  glow?: boolean;
}

export function Card({ children, hover3d = false, glow = false, className = '', ...props }: CardProps) {
  const Component = hover3d ? motion.div : 'div';
  const motionProps = hover3d ? {
    whileHover: {
      scale: 1.02,
      rotateX: 2,
      rotateY: 2,
      transition: { duration: 0.2 }
    },
    style: { transformStyle: 'preserve-3d' as const }
  } : {};

  return (
    <Component
      className={`
        relative backdrop-blur-xl bg-slate-900/40 border border-slate-800/50 rounded-xl
        ${glow ? 'shadow-lg shadow-cyan-500/10' : ''}
        ${className}
      `}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 border-b border-slate-800/50 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg font-semibold text-slate-100 ${className}`} {...props}>
      {children}
    </h3>
  );
}
