import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supportApi } from '@/api/support';
import { SupportRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, RefreshCcw, Filter } from 'lucide-react';

const StatusBadge: React.FC<{ status: 'open' | 'closed' }> = ({ status }) => {
  return (
    <Badge variant={status === 'open' ? 'default' : 'secondary'}>{status}</Badge>
  );
};

const Support: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Role guard (basic)
  if (user && user.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4"/> Admin only</CardTitle>
          </CardHeader>
          <CardContent>Only administrators can access Support requests.</CardContent>
        </Card>
      </div>
    );
  }

  const { data: requests = [], isLoading, refetch } = useQuery<SupportRequest[]>({
    queryKey: ['admin', 'support', 'list'],
    queryFn: supportApi.listSupportRequests,
  });

  const closeMutation = useMutation({
    mutationFn: async (id: number) => supportApi.closeSupportRequest(id),
    onSuccess: () => {
      toast({ title: 'Request closed' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'list'] });
    },
    onError: () => toast({ title: 'Failed to close request', variant: 'destructive' })
  });

  const [params] = useSearchParams();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'open' | 'closed'>('all');

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (requests || []).filter(r => {
      const matchesQ = !q || [r.email, r.username || '', r.reason_seen || '', r.message || ''].some(v => (v || '').toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  // If q is a numeric ID, softly highlight that row and scroll it into view once data loads
  React.useEffect(() => {
    const q = params.get('q');
    const id = q && /^\d+$/.test(q) ? Number(q) : null;
    if (!id || !requests?.length) return;
    // Delay to ensure DOM rendered
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-srid="${id}"]`);
      if (el && 'scrollIntoView' in el) {
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [params, requests]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Requests</h1>
          <p className="text-muted-foreground">Review and respond to students' unblock and help requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCcw className="h-4 w-4 mr-2"/>Refresh</Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Requests</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground"/>
                <select className="h-7 text-xs rounded-md border px-2 bg-background" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <Input placeholder="Search email, username, reason, message" className="w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Unblock On</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const rawReason = r.reason_seen || '';
                    const cleanedReason = rawReason.replace(/You will be automatically unblocked.*$/i, '').trim();
                    return (
                      <TableRow key={r.id} data-srid={r.id} className={params.get('q') === String(r.id) ? 'bg-ink/10' : ''}>
                        <TableCell>{r.id}</TableCell>
                        <TableCell className="font-medium">{r.email}</TableCell>
                        <TableCell>{r.username || '-'}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{cleanedReason || '-'}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{(r.message || '').trim() || '-'}</TableCell>
                        <TableCell>{r.until_reported ? new Date(r.until_reported).toLocaleString() : '-'}</TableCell>
                        <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-right">
                          {r.status === 'open' ? (
                            <Button size="sm" onClick={() => closeMutation.mutate(r.id)} disabled={closeMutation.isLoading}>Close</Button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">No requests found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Support;
