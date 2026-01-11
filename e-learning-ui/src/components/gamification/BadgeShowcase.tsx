import { BadgeWithStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Flame, 
  Zap, 
  Crown, 
  GraduationCap, 
  BookOpen, 
  Medal, 
  Target,
  Rocket, 
  Star, 
  Trophy,
  Check
} from 'lucide-react';

// Map badge codes to minimalistic icons
const BADGE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  'streak_7': { icon: Flame, color: 'text-orange-400' },
  'streak_30': { icon: Zap, color: 'text-yellow-400' },
  'streak_100': { icon: Crown, color: 'text-amber-400' },
  'first_course': { icon: GraduationCap, color: 'text-blue-400' },
  'courses_5': { icon: BookOpen, color: 'text-indigo-400' },
  'courses_10': { icon: Medal, color: 'text-purple-400' },
  'perfect_score': { icon: Target, color: 'text-emerald-400' },
  'quick_learner': { icon: Rocket, color: 'text-cyan-400' },
  'reviewer': { icon: Star, color: 'text-yellow-400' },
  'top_3': { icon: Trophy, color: 'text-amber-400' },
};

const DEFAULT_BADGE = { icon: Medal, color: 'text-neutral-400' };

interface BadgeShowcaseProps {
  badges: BadgeWithStatus[];
  title?: string;
  showAll?: boolean;
}

export function BadgeShowcase({ 
  badges, 
  title = 'Your Badges', 
  showAll = false 
}: BadgeShowcaseProps) {
  const displayBadges = showAll ? badges : badges.filter(b => b.earned);
  const earnedCount = badges.filter(b => b.earned).length;

  const getBadgeIcon = (code: string) => {
    return BADGE_ICONS[code] || DEFAULT_BADGE;
  };

  return (
    <Card className="bg-neutral-900/50 border-neutral-800 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-neutral-200">
            {title}
          </CardTitle>
          <span className="text-xs text-neutral-500">
            {earnedCount}/{badges.length}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {displayBadges.length === 0 ? (
          <div className="text-center py-6">
            <Trophy className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">
              No badges earned yet
            </p>
            <p className="text-xs text-neutral-600 mt-1">
              Keep learning to unlock badges!
            </p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid grid-cols-5 gap-2">
              {displayBadges.map((badge) => {
                const { icon: Icon, color } = getBadgeIcon(badge.code);
                
                return (
                  <Tooltip key={badge.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'relative flex flex-col items-center justify-center aspect-square rounded-xl transition-all cursor-pointer group',
                          badge.earned
                            ? 'bg-neutral-800/80 hover:bg-neutral-700/80'
                            : 'bg-neutral-800/30 opacity-30'
                        )}
                      >
                        <Icon 
                          className={cn(
                            'w-6 h-6 transition-transform group-hover:scale-110',
                            badge.earned ? color : 'text-neutral-600'
                          )} 
                        />
                        {badge.earned && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top" 
                      className="bg-neutral-900 border-neutral-800 max-w-[200px]"
                    >
                      <div className="space-y-1.5">
                        <p className="font-medium text-neutral-100">{badge.name}</p>
                        <p className="text-xs text-neutral-400">{badge.description}</p>
                        {badge.earned && badge.earned_at && (
                          <p className="text-[10px] text-green-400">
                            Earned {new Date(badge.earned_at).toLocaleDateString()}
                          </p>
                        )}
                        {badge.xp_reward > 0 && (
                          <p className="text-[10px] text-orange-400">+{badge.xp_reward} XP</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
