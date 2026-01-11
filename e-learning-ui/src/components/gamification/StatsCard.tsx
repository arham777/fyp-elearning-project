import { UserStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Zap, BookOpen, Award, CheckCircle, Clock } from 'lucide-react';

interface StatsCardProps {
  stats: UserStats;
}

export function StatsCard({ stats }: StatsCardProps) {
  const formatTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <Card className="bg-neutral-900/50 border-neutral-800 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-neutral-200">
          Your Learning Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Streak */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-sm text-neutral-400">Current Streak</span>
          </div>
          <span className="text-lg font-semibold text-neutral-100">
            {stats.current_streak} {stats.current_streak === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* Level & XP */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="text-sm text-neutral-400">
                Level {stats.level} · {stats.level_title}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-neutral-200">{stats.total_xp}</span>
              <span className="text-xs text-neutral-500 ml-1">XP</span>
            </div>
          </div>
          <Progress 
            value={stats.xp_progress_percentage} 
            className="h-1.5 bg-neutral-800"
          />
          <div className="flex justify-end">
            <span className="text-[10px] text-neutral-500">
              {stats.xp_for_next_level} XP to next level
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-800" />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-neutral-800/50">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-neutral-500" />
              <span className="text-xs text-neutral-500">Courses</span>
            </div>
            <span className="text-2xl font-semibold text-neutral-100">
              {stats.courses_completed}
            </span>
          </div>
          
          <div className="p-3 rounded-lg bg-neutral-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-neutral-500" />
              <span className="text-xs text-neutral-500">Badges</span>
            </div>
            <span className="text-2xl font-semibold text-neutral-100">
              {stats.badges_count}
            </span>
          </div>
          
          <div className="p-3 rounded-lg bg-neutral-800/50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-neutral-500" />
              <span className="text-xs text-neutral-500">Assignments</span>
            </div>
            <span className="text-2xl font-semibold text-neutral-100">
              {stats.assignments_completed}
            </span>
          </div>
          
          <div className="p-3 rounded-lg bg-neutral-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              <span className="text-xs text-neutral-500">Time</span>
            </div>
            <span className="text-2xl font-semibold text-neutral-100">
              {formatTime(stats.total_learning_hours)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
