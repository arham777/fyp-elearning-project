import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi } from '@/api/users';
import * as gamificationApi from '@/api/gamification';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { UserBadge, UserStats } from '@/types';
import { 
  Flame, Zap, Crown, GraduationCap, BookOpen, Medal, Target, Rocket, Star, Trophy, Award, Check 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Map badge codes to minimalistic icons
const BADGE_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'streak_7': { icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  'streak_30': { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'streak_100': { icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  'first_course': { icon: GraduationCap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'courses_5': { icon: BookOpen, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  'courses_10': { icon: Medal, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  'perfect_score': { icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'quick_learner': { icon: Rocket, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  'reviewer': { icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'top_3': { icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10' },
};

const DEFAULT_BADGE = { icon: Medal, color: 'text-neutral-400', bg: 'bg-neutral-500/10' };

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefsSubmitting, setPrefsSubmitting] = useState(false);
  const [preferredCategory, setPreferredCategory] = useState<string>(user?.preferred_category || 'Web Development');
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>(
    (user?.skill_level as any) || 'beginner'
  );
  const [learningGoal, setLearningGoal] = useState<'job' | 'skill_upgrade' | 'certification' | ''>(
    ((user?.learning_goal as any) || '')
  );

  // Gamification state
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [isLoadingBadges, setIsLoadingBadges] = useState(true);

  useEffect(() => {
    if (user?.role === 'student') {
      const fetchGamificationData = async () => {
        try {
          const [stats, badges] = await Promise.all([
            gamificationApi.getMyStats(),
            gamificationApi.getMyBadges(),
          ]);
          setUserStats(stats);
          // Sort badges by earned_at descending (latest first)
          const sorted = [...badges].sort(
            (a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime()
          );
          setEarnedBadges(sorted);
        } catch (err) {
          console.error('Failed to fetch gamification data:', err);
        } finally {
          setIsLoadingBadges(false);
        }
      };
      fetchGamificationData();
    } else {
      setIsLoadingBadges(false);
    }
  }, [user?.role]);

  const getBadgeIcon = (code: string) => {
    return BADGE_ICONS[code] || DEFAULT_BADGE;
  };

  if (!user) {
    return null;
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!password || password.length < 6) {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please re-enter your new password.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await usersApi.changePassword(user.id, password);
      setPassword('');
      setConfirmPassword('');
      toast({ title: 'Password updated', description: 'Your password has been changed successfully.' });
    } catch (error: any) {
      toast({
        title: 'Failed to change password',
        description: error.response?.data?.detail || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const latestBadge = earnedBadges[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">View your account info and change your password.</p>
      </div>

      {/* Latest Badge Banner - Only for students with badges */}
      {user.role === 'student' && latestBadge && (
        <Card className="bg-gradient-to-r from-neutral-900 to-neutral-800 border-neutral-700">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              {(() => {
                const { icon: Icon, color, bg } = getBadgeIcon(latestBadge.badge.code);
                return (
                  <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', bg)}>
                    <Icon className={cn('w-7 h-7', color)} />
                  </div>
                );
              })()}
              <div className="flex-1">
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Latest Achievement</p>
                <p className="text-lg font-semibold text-neutral-100">{latestBadge.badge.name}</p>
                <p className="text-sm text-neutral-400">{latestBadge.badge.description}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-500">Earned</p>
                <p className="text-sm text-neutral-300">
                  {new Date(latestBadge.earned_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview - Only for students */}
      {user.role === 'student' && userStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-neutral-900/50 border-neutral-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-100">{userStats.level}</p>
                  <p className="text-xs text-neutral-500">Level</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900/50 border-neutral-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-100">{userStats.current_streak}</p>
                  <p className="text-xs text-neutral-500">Day Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900/50 border-neutral-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-100">{userStats.courses_completed}</p>
                  <p className="text-xs text-neutral-500">Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900/50 border-neutral-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-100">{userStats.badges_count}</p>
                  <p className="text-xs text-neutral-500">Badges</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Earned Badges - Only for students */}
      {user.role === 'student' && (
        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-base font-medium text-neutral-200 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-500" />
              Earned Badges
            </CardTitle>
            <CardDescription className="text-neutral-500">
              {earnedBadges.length > 0 
                ? `You have earned ${earnedBadges.length} badge${earnedBadges.length > 1 ? 's' : ''}`
                : 'Complete courses and assignments to earn badges'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBadges ? (
              <div className="flex gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-20 h-24 rounded-xl bg-neutral-800 animate-pulse" />
                ))}
              </div>
            ) : earnedBadges.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                <p className="text-neutral-400">No badges earned yet</p>
                <p className="text-sm text-neutral-600 mt-1">Keep learning to unlock achievements!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {earnedBadges.map((userBadge) => {
                  const { icon: Icon, color, bg } = getBadgeIcon(userBadge.badge.code);
                  return (
                    <div 
                      key={userBadge.id} 
                      className="relative flex flex-col items-center p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 transition-colors group"
                    >
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-2', bg)}>
                        <Icon className={cn('w-6 h-6', color)} />
                      </div>
                      <p className="text-xs font-medium text-neutral-200 text-center line-clamp-1">
                        {userBadge.badge.name}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        {new Date(userBadge.earned_at).toLocaleDateString()}
                      </p>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>First name</Label>
            <Input value={user.first_name || ''} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Last name</Label>
            <Input value={user.last_name || ''} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={user.username} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} readOnly />
          </div>
        </CardContent>
      </Card>

      {user.role === 'student' && (
        <Card>
          <CardHeader>
            <CardTitle>Learning preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (prefsSubmitting) return;
                try {
                  setPrefsSubmitting(true);
                  const updated = await usersApi.updateLearningPreferences({
                    preferred_category: preferredCategory,
                    skill_level: skillLevel,
                    learning_goal: learningGoal ? (learningGoal as any) : null,
                  });
                  updateUser(updated);
                  toast({ title: 'Preferences updated', description: 'Your learning preferences have been saved.' });
                } catch (error: any) {
                  toast({
                    title: 'Failed to update preferences',
                    description: error?.response?.data?.detail || 'Please try again.',
                    variant: 'destructive',
                  });
                } finally {
                  setPrefsSubmitting(false);
                }
              }}
              className="space-y-4 max-w-md"
            >
              <div className="space-y-2">
                <Label>Preferred course category</Label>
                <Select value={preferredCategory} onValueChange={setPreferredCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Web Development">Web Development</SelectItem>
                    <SelectItem value="AI">AI</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Skill level</Label>
                <Select value={skillLevel} onValueChange={(v) => setSkillLevel(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Learning goal (optional)</Label>
                <Select value={learningGoal} onValueChange={(v) => setLearningGoal(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job">Job</SelectItem>
                    <SelectItem value="skill_upgrade">Skill Upgrade</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={prefsSubmitting}>
                {prefsSubmitting ? 'Saving…' : 'Save preferences'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
