import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';

interface StreakBadgeProps {
  streak: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StreakBadge({ streak, className, size = 'md' }: StreakBadgeProps) {
  const isActive = streak > 0;
  
  const sizeClasses = {
    sm: { container: 'gap-1', icon: 'w-4 h-4', text: 'text-sm' },
    md: { container: 'gap-1.5', icon: 'w-5 h-5', text: 'text-base' },
    lg: { container: 'gap-2', icon: 'w-6 h-6', text: 'text-lg' },
  };

  const config = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex items-center font-medium',
        config.container,
        isActive 
          ? 'text-orange-500' 
          : 'text-neutral-500',
        className
      )}
    >
      <Flame 
        className={cn(
          config.icon,
          isActive && 'text-orange-500'
        )} 
      />
      <span className={config.text}>{streak}</span>
    </div>
  );
}
