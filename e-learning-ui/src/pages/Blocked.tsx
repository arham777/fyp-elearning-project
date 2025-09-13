import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Clock, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supportApi } from '@/api/support';

const formatUntil = (until: string | null) => {
  if (!until) return null;
  try {
    const d = new Date(until);
    return d.toLocaleString();
  } catch {
    return until;
  }
};

const Blocked: React.FC = () => {
  const [params] = useSearchParams();
  const reason = params.get('reason') || 'Your account has been temporarily disabled by an administrator.';
  const until = params.get('until');
  const { toast } = useToast();
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'admin@edu.pk';

  const untilFormatted = formatUntil(until);

  // Request Review dialog state
  const [open, setOpen] = React.useState(false);
  const emailQP = params.get('email') || '';
  const usernameQP = params.get('username') || '';
  const [form, setForm] = React.useState<{ email: string; username: string; message: string }>({
    email: emailQP,
    username: usernameQP,
    message: ''
  });
  const [submitting, setSubmitting] = React.useState(false);

  const submitSupport = async () => {
    if (!form.email) {
      toast({ title: 'Email required', description: 'Please provide your email so admin can contact you.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await supportApi.createSupportRequest({
        email: form.email,
        username: form.username || undefined,
        message: form.message || undefined,
        reason_seen: reason,
        until_reported: until || undefined,
      });
      toast({ title: 'Request sent', description: 'Your request has been submitted. Admin will review it shortly.' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Failed to send request', description: e?.response?.data?.detail || 'Please try again later.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center">
              <Lock className="h-5 w-5 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Account Blocked</CardTitle>
          </div>
          <div className="text-sm text-muted-foreground">
            Your access to the platform has been restricted.
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-foreground/70" />
              <p className="text-sm leading-relaxed">{reason}</p>
            </div>
            {untilFormatted && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-foreground/70" />
                <span>
                  You will be automatically unblocked on{' '}
                  <Badge variant="secondary" className="font-medium">{untilFormatted}</Badge>
                </span>
              </div>
            )}
          </div>

          <div className="rounded-md border border-border/60 p-4 bg-muted/30 text-sm">
            If you believe this is a mistake or need immediate access, please contact support or your administrator.
          </div>

          <div className="flex items-center gap-3">
            <Button asChild>
              <Link to="/login">Back to login</Link>
            </Button>
            <Button variant="outline" onClick={() => setOpen(true)}>Request review</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request account review</DialogTitle>
            <DialogDescription>
              Fill this form to notify the administrator. You’ll also receive a copy if your email system is configured.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!form.email && (
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
              </div>
            )}
            {!form.username && (
              <div>
                <Label htmlFor="username">Username (optional)</Label>
                <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="your LMS username" />
              </div>
            )}
            <div>
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Add any details that can help admin review the block." />
            </div>
            <div className="text-xs text-muted-foreground">
              Reason shown: {reason}
              {untilFormatted ? (
                <>
                  {' '}• Unblock on: {untilFormatted}
                </>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submitSupport} disabled={submitting}>{submitting ? 'Sending...' : 'Send request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Blocked;
