import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, 
  Upload, 
  Bell, 
  Globe, 
  Shield,
  Save,
  Image as ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notificationsApi } from '@/api/notifications';
import { adminApi } from '@/api/admin';

// Mock settings data - replace with real API
interface PlatformSettings {
  general: {
    platform_name: string;
    platform_description: string;
    logo_url: string;
    timezone: string;
    language: string;
    support_email: string;
  };
  notifications: {
    email_notifications: boolean;
    push_notifications: boolean;
    announcement_notifications: boolean;
  };
  features: {
    course_approval_required: boolean;
    teacher_approval_required: boolean;
    certificate_generation: boolean;
    chat_enabled: boolean;
  };
  announcements: {
    current_announcement: string;
    announcement_active: boolean;
    announcement_type: 'info' | 'warning' | 'success';
  };
}

const mockSettings: PlatformSettings = {
  general: {
    platform_name: "EduPlatform",
    platform_description: "A comprehensive e-learning platform for students and teachers",
    logo_url: "",
    timezone: "UTC",
    language: "en",
    support_email: "support@example.com"
  },
  notifications: {
    email_notifications: true,
    push_notifications: false,
    announcement_notifications: true
  },
  features: {
    course_approval_required: true,
    teacher_approval_required: true,
    certificate_generation: true,
    chat_enabled: true
  },
  announcements: {
    current_announcement: "Welcome to our new learning platform! Explore courses and start your learning journey.",
    announcement_active: true,
    announcement_type: "info"
  }
};

const Settings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = React.useState<PlatformSettings>(mockSettings);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Local state for broadcast announcements (does not affect platform settings save)
  const [announceTitle, setAnnounceTitle] = React.useState('');
  const [announceMessage, setAnnounceMessage] = React.useState('');
  const [announceType, setAnnounceType] = React.useState<'info' | 'warning' | 'success'>('info');
  const [audience, setAudience] = React.useState<'teachers' | 'students' | 'individuals'>('students');
  const [recipientEmails, setRecipientEmails] = React.useState<string>('');

  // Mock query - replace with real API
  const { data: currentSettings, isLoading } = useQuery<PlatformSettings>({
    queryKey: ['settings', 'platform'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockSettings;
    }
  });

  React.useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: PlatformSettings) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({
        title: "Settings saved",
        description: "Platform settings have been updated successfully.",
      });
      setHasChanges(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (section: keyof PlatformSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const title = announceTitle.trim();
      const message = announceMessage.trim();
      if (audience === 'individuals') {
        const emails = recipientEmails
          .split(',')
          .map((s) => s.trim())
          .filter((e) => !!e);
        if (emails.length === 0) {
          throw new Error('Please provide at least one email');
        }
        try {
          return await notificationsApi.sendToEmails(emails, title, message, announceType);
        } catch (e) {
          // Fallback: resolve emails to user IDs and send via IDs
          try {
            const allUsers = await adminApi.getAllUsers();
            const emailToId: Record<string, number> = {};
            for (const u of allUsers as any[]) {
              const em = String(u.email || '').toLowerCase();
              if (em) emailToId[em] = u.id;
            }
            const ids = emails
              .map((em) => emailToId[em.toLowerCase()])
              .filter((id) => typeof id === 'number');
            if (ids.length === 0) throw new Error('No matching users for provided emails');
            return await notificationsApi.sendToUsers(ids as number[], title, message, announceType);
          } catch (fallbackError) {
            throw fallbackError;
          }
        }
      }
      return notificationsApi.broadcast(audience, title, message, announceType);
    },
    onSuccess: (res) => {
      toast({
        title: 'Announcement sent',
        description: audience === 'individuals' ? `Sent to ${res.created} user(s).` : `Sent to ${res.created} ${audience}.`
      });
      setAnnounceTitle('');
      setAnnounceMessage('');
      setRecipientEmails('');
    },
    onError: () => {
      toast({
        title: 'Failed to send',
        description: 'Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Mock file upload - replace with real implementation
      const mockUrl = URL.createObjectURL(file);
      handleSettingChange('general', 'logo_url', mockUrl);
      toast({
        title: "Logo uploaded",
        description: "Platform logo has been updated.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Announcements</h1>
        </div>
        
        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={saveSettingsMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saveSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      

      {/* Announcements */}
      <Card>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Announcements</Label>
              <p className="text-sm text-muted-foreground">Show announcements to all users</p>
            </div>
            <Switch
              checked={settings.announcements.announcement_active}
              onCheckedChange={(checked) => handleSettingChange('announcements', 'announcement_active', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-base">Send Announcement</Label>
            <p className="text-sm text-muted-foreground">Send to all Teachers, all Students, or specific users by ID</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="audience">Audience</Label>
              <Select value={audience} onValueChange={(v: 'teachers' | 'students' | 'individuals') => setAudience(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teachers">Teachers</SelectItem>
                  <SelectItem value="students">Students</SelectItem>
                  <SelectItem value="individuals">Individuals</SelectItem>
                </SelectContent>
              </Select>
            </div>
          {audience === 'individuals' && (
            <div className="space-y-2">
              <Label htmlFor="recipient-emails">Recipient Emails (comma-separated)</Label>
              <Input
                id="recipient-emails"
                value={recipientEmails}
                onChange={(e) => setRecipientEmails(e.target.value)}
                placeholder="e.g. alice@example.com, bob@site.com"
              />
              <p className="text-[11px] text-muted-foreground">We'll send to these emails. If direct email send isn't available, we'll map emails to users automatically.</p>
            </div>
          )}

            <div className="space-y-2">
              <Label htmlFor="send-type">Type</Label>
              <Select value={announceType} onValueChange={(v: 'info' | 'warning' | 'success') => setAnnounceType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="announce-title">Title</Label>
            <Input
              id="announce-title"
              value={announceTitle}
              onChange={(e) => setAnnounceTitle(e.target.value)}
              placeholder="Enter announcement title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="announce-message">Message</Label>
            <Textarea
              id="announce-message"
              value={announceMessage}
              onChange={(e) => setAnnounceMessage(e.target.value)}
              placeholder="Enter your announcement message"
              rows={3}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => broadcastMutation.mutate()}
              disabled={broadcastMutation.isPending || !announceTitle.trim() || !announceMessage.trim()}
              className="min-w-36"
            >
              {broadcastMutation.isPending ? 'Sending...' : 'Send Announcement'}
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Save Button at Bottom */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saveSettingsMutation.isPending}
            size="lg"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saveSettingsMutation.isPending ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Settings;
