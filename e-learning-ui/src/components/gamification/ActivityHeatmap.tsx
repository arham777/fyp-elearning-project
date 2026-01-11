import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeatmapData {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
  days?: number;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Professional color palette (emerald green tones)
const COLOR_LEVELS = [
  'bg-neutral-800',              // Level 0: No activity
  'bg-emerald-900',              // Level 1: Low
  'bg-emerald-700',              // Level 2: Medium-low
  'bg-emerald-500',              // Level 3: Medium
  'bg-emerald-400',              // Level 4: High
];

export function ActivityHeatmap({ data, days = 91 }: ActivityHeatmapProps) {
  // Create a map for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((item) => {
      if (item?.date) {
        map.set(item.date.slice(0, 10), item.count || 0);
      }
    });
    return map;
  }, [data]);

  // Generate all days for the heatmap
  const { weeks, monthLabels, maxCount, totalActivity, activeDays } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Calculate end date (today) and start date
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);
    
    // Adjust start to beginning of week (Sunday)
    const startDayOfWeek = startDate.getDay();
    if (startDayOfWeek !== 0) {
      startDate.setDate(startDate.getDate() - startDayOfWeek);
    }
    
    const allDays: Array<{ date: Date; key: string; count: number; dayOfWeek: number; isToday: boolean; isFuture: boolean }> = [];
    let currentDate = new Date(startDate);
    let max = 0;
    let total = 0;
    let active = 0;
    
    while (currentDate <= endDate || currentDate.getDay() !== 0) {
      const key = currentDate.toISOString().slice(0, 10);
      const todayKey = today.toISOString().slice(0, 10);
      const count = dataMap.get(key) ?? 0;
      const isFuture = currentDate > today;
      
      if (!isFuture) {
        max = Math.max(max, count);
        total += count;
        if (count > 0) active++;
      }
      
      allDays.push({
        date: new Date(currentDate),
        key,
        count: isFuture ? 0 : count,
        dayOfWeek: currentDate.getDay(),
        isToday: key === todayKey,
        isFuture,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Break if we've gone past today and completed the week
      if (currentDate > today && currentDate.getDay() === 0) break;
    }
    
    // Group into weeks (columns)
    const weekGroups: Array<Array<typeof allDays[0]>> = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weekGroups.push(allDays.slice(i, i + 7));
    }
    
    // Generate month labels with positions
    const labels: Array<{ month: string; weekIndex: number }> = [];
    let lastMonth = -1;
    weekGroups.forEach((week, weekIdx) => {
      // Check first day of the week that's in the month
      const firstValidDay = week.find(d => !d.isFuture && d.date.getDate() <= 7);
      if (firstValidDay && firstValidDay.date.getDate() <= 7) {
        const month = firstValidDay.date.getMonth();
        if (month !== lastMonth) {
          labels.push({ month: MONTHS[month], weekIndex: weekIdx });
          lastMonth = month;
        }
      }
    });
    
    return { weeks: weekGroups, monthLabels: labels, maxCount: max, totalActivity: total, activeDays: active };
  }, [dataMap, days]);

  // Get color level for a count
  const getColorLevel = (count: number, isFuture: boolean): string => {
    if (isFuture) return 'bg-transparent';
    if (count === 0) return COLOR_LEVELS[0];
    if (maxCount === 0) return COLOR_LEVELS[0];
    
    const ratio = count / maxCount;
    if (ratio <= 0.25) return COLOR_LEVELS[1];
    if (ratio <= 0.5) return COLOR_LEVELS[2];
    if (ratio <= 0.75) return COLOR_LEVELS[3];
    return COLOR_LEVELS[4];
  };

  // Format date for tooltip
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card className="bg-neutral-900/50 border-neutral-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-base font-medium text-neutral-200">
              Learning Activity
            </CardTitle>
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span>{totalActivity} lessons completed</span>
            <span>{activeDays} active days</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider delayDuration={50}>
          <div className="space-y-1">
            {/* Month labels */}
            <div className="flex pl-8 mb-1 overflow-hidden">
              <div className="flex" style={{ gap: '3px' }}>
                {weeks.map((_, weekIdx) => {
                  const label = monthLabels.find(l => l.weekIndex === weekIdx);
                  return (
                    <div key={weekIdx} className="w-[11px] flex-shrink-0">
                      {label && (
                        <span className="text-[10px] text-neutral-500 whitespace-nowrap">
                          {label.month}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Heatmap grid with day labels */}
            <div className="flex">
              {/* Day labels */}
              <div className="flex flex-col pr-2" style={{ gap: '3px' }}>
                {DAYS_OF_WEEK.map((day, idx) => (
                  <div 
                    key={idx} 
                    className="h-[11px] flex items-center"
                  >
                    {(idx === 1 || idx === 3 || idx === 5) && (
                      <span className="text-[10px] text-neutral-500 w-6 text-right">
                        {day}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Grid */}
              <div className="flex flex-1 overflow-x-auto" style={{ gap: '3px' }}>
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col flex-shrink-0" style={{ gap: '3px' }}>
                    {week.map((day) => (
                      <Tooltip key={day.key}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'w-[11px] h-[11px] rounded-sm transition-all cursor-pointer',
                              getColorLevel(day.count, day.isFuture),
                              day.isToday && 'ring-1 ring-emerald-400',
                              !day.isFuture && 'hover:ring-1 hover:ring-neutral-400'
                            )}
                          />
                        </TooltipTrigger>
                        {!day.isFuture && (
                          <TooltipContent 
                            side="top" 
                            className="bg-neutral-950 border-neutral-800 px-3 py-2 shadow-xl"
                          >
                            <div className="text-xs">
                              <div className="font-semibold text-neutral-100">
                                {day.count === 0 
                                  ? 'No lessons completed' 
                                  : `${day.count} lesson${day.count > 1 ? 's' : ''} completed`
                                }
                              </div>
                              <div className="text-neutral-400 mt-0.5">
                                {formatDate(day.date)}
                              </div>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800 mt-3">
              <span className="text-[10px] text-neutral-600">
                Hover on squares to see details
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-neutral-500">Less</span>
                <div className="flex" style={{ gap: '2px' }}>
                  {COLOR_LEVELS.map((color, idx) => (
                    <div
                      key={idx}
                      className={cn('w-[10px] h-[10px] rounded-sm', color)}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-neutral-500">More</span>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

export default ActivityHeatmap;
