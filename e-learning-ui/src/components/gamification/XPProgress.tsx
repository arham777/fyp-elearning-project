import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

interface XPProgressProps {
  currentXP: number;
  nextLevelXP: number;
  progressPercentage: number;
  level: number;
  levelTitle: string;
  className?: string;
  compact?: boolean;
}

export function XPProgress({
  currentXP,
  nextLevelXP,
  progressPercentage,
  level,
  levelTitle,
  className,
  compact = false,
}: XPProgressProps) {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="text-xs font-medium text-neutral-500">
          Lv{level}
        </span>
        <Progress 
          value={progressPercentage} 
          className="h-1.5 w-16 bg-neutral-800" 
        />
        <span className="text-xs text-neutral-500">{currentXP} XP</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-yellow-500" />
          </div>
          <div>
            <span className="font-medium text-neutral-200">
              Level {level}
            </span>
            <span className="text-sm text-neutral-500 ml-2">
              {levelTitle}
            </span>
          </div>
        </div>
        <div className="text-sm">
          <span className="font-medium text-neutral-200">{currentXP}</span>
          <span className="text-neutral-600"> / {nextLevelXP} XP</span>
        </div>
      </div>
      <Progress 
        value={progressPercentage} 
        className="h-2 bg-neutral-800" 
      />
    </div>
  );
}
