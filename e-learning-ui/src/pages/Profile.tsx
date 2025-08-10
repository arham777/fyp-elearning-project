import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi } from '@/api/users';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">View your account info and change your password.</p>
      </div>

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


