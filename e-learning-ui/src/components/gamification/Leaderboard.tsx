import { LeaderboardEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Trophy, Flame, Medal } from 'lucide-react';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: number;
  myRank?: number | null;
  weekStart?: string;
}

export function Leaderboard({ 
  entries, 
  currentUserId, 
  myRank,
  weekStart 
}: LeaderboardProps) {
  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Medal className="w-4 h-4 text-amber-400" />
          </div>
        );
      case 2:
        return (
          <div className="w-7 h-7 rounded-full bg-neutral-400/20 flex items-center justify-center">
            <Medal className="w-4 h-4 text-neutral-300" />
          </div>
        );
      case 3:
        return (
          <div className="w-7 h-7 rounded-full bg-orange-700/20 flex items-center justify-center">
            <Medal className="w-4 h-4 text-orange-400" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center">
            <span className="text-xs font-medium text-neutral-400">{rank}</span>
          </div>
        );
    }
  };

  const formatName = (entry: LeaderboardEntry) => {
    if (entry.first_name || entry.last_name) {
      return `${entry.first_name} ${entry.last_name}`.trim();
    }
    return entry.username;
  };

  return (
    <Card className="bg-neutral-900/50 border-neutral-800 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-neutral-200 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Weekly Leaderboard
          </CardTitle>
          {weekStart && (
            <span className="text-[10px] text-neutral-500">
              Week of {new Date(weekStart).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-6">
            <Trophy className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">
              No data yet
            </p>
            <p className="text-xs text-neutral-600 mt-1">
              Start learning to appear here!
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {entries.map((entry) => {
              const isCurrentUser = currentUserId === entry.user_id;

              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-lg transition-colors',
                    isCurrentUser
                      ? 'bg-orange-500/10 ring-1 ring-orange-500/30'
                      : 'bg-neutral-800/40 hover:bg-neutral-800/60'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {getRankDisplay(entry.rank)}

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          'text-sm font-medium',
                          isCurrentUser 
                            ? 'text-orange-400' 
                            : 'text-neutral-200'
                        )}>
                          {formatName(entry)}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] text-orange-500/70">(You)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                        <span>Lv.{entry.level}</span>
                        <span className="text-neutral-700">•</span>
                        <Flame className="w-3 h-3 text-orange-500/60" />
                        <span>{entry.current_streak}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-neutral-100">
                      {entry.weekly_xp}
                      <span className="text-[10px] font-normal text-neutral-500 ml-0.5">XP</span>
                    </div>
                    <div className="text-[10px] text-neutral-600">
                      this week
                    </div>
                  </div>
                </div>
              );
            })}

            {myRank && myRank > entries.length && currentUserId && (
              <div className="mt-3 pt-3 border-t border-neutral-800">
                <p className="text-xs text-neutral-500 text-center">
                  Your rank: <span className="font-semibold text-orange-400">#{myRank}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
