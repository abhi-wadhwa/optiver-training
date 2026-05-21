'use client';

import MathText from './MathText';
import { Lightbulb, AlertTriangle, Sparkles } from 'lucide-react';

interface CalloutBoxProps {
  variant: 'tip' | 'warning' | 'key-insight';
  body: string;
}

const config = {
  tip: {
    icon: Lightbulb,
    label: 'Tip',
    border: 'border-l-green-500',
    bg: 'bg-green-50/50 dark:bg-green-950/20',
    labelColor: 'text-green-700 dark:text-green-400',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    border: 'border-l-amber-500',
    bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    labelColor: 'text-amber-700 dark:text-amber-400',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  'key-insight': {
    icon: Sparkles,
    label: 'Key Insight',
    border: 'border-l-orange-500',
    bg: 'bg-orange-50/50 dark:bg-orange-950/20',
    labelColor: 'text-orange-700 dark:text-orange-400',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
};

export default function CalloutBox({ variant, body }: CalloutBoxProps) {
  const c = config[variant];
  const Icon = c.icon;

  return (
    <div className={`my-4 rounded-lg border-l-4 ${c.border} ${c.bg} p-4`}>
      <div className={`mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${c.labelColor}`}>
        <Icon className={`size-3.5 ${c.iconColor}`} />
        {c.label}
      </div>
      <div className="text-sm leading-relaxed">
        <MathText text={body} />
      </div>
    </div>
  );
}
