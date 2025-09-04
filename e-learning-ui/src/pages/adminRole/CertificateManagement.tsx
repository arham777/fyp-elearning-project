import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { Certificate } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  MoreHorizontal, 
  Award, 
  Trash2, 
  Eye,
  Download,
  AlertTriangle,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


interface CertificateActionDialogProps {
  certificate: Certificate | null;
  action: 'revoke' | 'delete' | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const CertificateActionDialog: React.FC<CertificateActionDialogProps> = ({ 
  certificate, 
  action, 
  isOpen, 
  onClose, 
  onConfirm 
}) => {
  const getDialogContent = () => {
    if (!certificate || !action) return { title: '', description: '' };
    
    switch (action) {
      case 'revoke':
        return {
          title: 'Revoke Certificate',
          description: `Are you sure you want to revoke certificate ${certificate.verification_code} for ${`${certificate.student.first_name || ''} ${certificate.student.last_name || ''}`.trim() || certificate.student.username}? This action will mark the certificate as invalid.`
        };
      case 'delete':
        return {
          title: 'Delete Certificate',
          description: `Are you sure you want to permanently delete certificate ${certificate.verification_code}? This action cannot be undone.`
        };
      default:
        return { title: '', description: '' };
    }
  };

  const { title, description } = getDialogContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>
            {action === 'revoke' ? 'Revoke' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const getStatusBadge = (isRevoked: boolean) => {
  if (isRevoked) {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Revoked</Badge>;
  }
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
};

const CertificateManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [dialogState, setDialogState] = React.useState<{
    certificate: Certificate | null;
    action: 'revoke' | 'delete' | null;
    isOpen: boolean;
  }>({
    certificate: null,
    action: null,
    isOpen: false,
  });

  const { data: certificates = [], isLoading } = useQuery<Certificate[]>({
    queryKey: ['admin', 'certificates'],
    queryFn: adminApi.getAllCertificates,
  });

  const certificateActionMutation = useMutation({
    mutationFn: async ({ certificate, action }: { certificate: Certificate; action: 'revoke' | 'delete' }) => {
      switch (action) {
        case 'revoke':
          return await adminApi.revokeCertificate(certificate.id);
        case 'delete':
          await adminApi.deleteCertificate(certificate.id);
          return { certificate, action };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'certificates'] });
      const actionText = dialogState.action === 'revoke' ? 'revoked' : 'deleted';
      toast({
        title: "Success",
        description: `Certificate ${actionText} successfully.`,
      });
      setDialogState({ certificate: null, action: null, isOpen: false });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to perform action. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCertificateAction = (certificate: Certificate, action: 'revoke' | 'delete') => {
    setDialogState({ certificate, action, isOpen: true });
  };

  const handleConfirmAction = () => {
    if (dialogState.certificate && dialogState.action) {
      certificateActionMutation.mutate({ 
        certificate: dialogState.certificate, 
        action: dialogState.action 
      });
    }
  };

  const filteredCertificates = React.useMemo(() => {
    if (!searchTerm) return certificates;
    return certificates.filter(cert => {
      const studentName = `${cert.student.first_name || ''} ${cert.student.last_name || ''}`.trim() || cert.student.username;
      return studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.verification_code.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [certificates, searchTerm]);

  const stats = React.useMemo(() => {
    return {
      total: certificates.length,
      active: certificates.filter(c => !c.is_revoked).length,
      revoked: certificates.filter(c => c.is_revoked).length,
    };
  }, [certificates]);

  if (isLoading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Certificate Management</h1>
        <p className="text-muted-foreground">Monitor and manage issued certificates</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revoked</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revoked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search certificates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Certificates List */}
      <div className="space-y-4">
        {filteredCertificates.map((certificate) => (
          <Card key={certificate.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Award className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{certificate.verification_code}</h3>
                    {getStatusBadge(certificate.is_revoked || false)}
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {`${certificate.student.first_name?.[0] || ''}${certificate.student.last_name?.[0] || ''}` || certificate.student.username?.slice(0, 2) || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{`${certificate.student.first_name || ''} ${certificate.student.last_name || ''}`.trim() || certificate.student.username}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{certificate.student.email}</span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <strong>Course:</strong> {certificate.course.title}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <strong>Teacher:</strong> {`${certificate.course.teacher.first_name || ''} ${certificate.course.teacher.last_name || ''}`.trim() || certificate.course.teacher.username}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>Issued: {new Date(certificate.issue_date).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      View Certificate
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </DropdownMenuItem>
                    
                    {!certificate.is_revoked && (
                      <DropdownMenuItem 
                        onClick={() => handleCertificateAction(certificate, 'revoke')}
                        className="text-yellow-600 focus:text-yellow-600"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Revoke Certificate
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem 
                      onClick={() => handleCertificateAction(certificate, 'delete')}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Certificate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredCertificates.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No certificates found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? `No certificates match your search "${searchTerm}".`
                  : 'No certificates have been issued yet.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <CertificateActionDialog
        certificate={dialogState.certificate}
        action={dialogState.action}
        isOpen={dialogState.isOpen}
        onClose={() => setDialogState({ certificate: null, action: null, isOpen: false })}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
};

export default CertificateManagement;
