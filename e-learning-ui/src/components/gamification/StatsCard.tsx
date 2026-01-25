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
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
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
            <span className="text-sm text-muted-foreground">Current Streak</span>
          </div>
          <span className="text-lg font-semibold">
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
              <span className="text-sm text-muted-foreground">
                Level {stats.level} · {stats.level_title}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">{stats.total_xp}</span>
              <span className="text-xs text-muted-foreground ml-1">XP</span>
            </div>
          </div>
          <Progress
            value={stats.xp_progress_percentage}
            className="h-1.5"
          />
          <div className="flex justify-end">
            <span className="text-[10px] text-muted-foreground">
              {stats.xp_for_next_level} XP to next level
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Courses</span>
            </div>
            <span className="text-2xl font-semibold">
              {stats.courses_completed}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Badges</span>
            </div>
            <span className="text-2xl font-semibold">
              {stats.badges_count}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Assignments</span>
            </div>
            <span className="text-2xl font-semibold">
              {stats.assignments_completed}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Time</span>
            </div>
            <span className="text-2xl font-semibold">
              {formatTime(stats.total_learning_hours)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
