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

// Mock settings data - replace with real API
interface PlatformSettings {
  general: {
    platform_name: string;
    platform_description: string;
    logo_url: string;
    primary_color: string;
    timezone: string;
    language: string;
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
    primary_color: "#3b82f6",
    timezone: "UTC",
    language: "en"
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
  const [audience, setAudience] = React.useState<'teachers' | 'students'>('students');

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
      return notificationsApi.broadcast(
        audience,
        announceTitle.trim(),
        announceMessage.trim(),
        announceType
      );
    },
    onSuccess: (res) => {
      toast({
        title: 'Announcement sent',
        description: `Sent to ${res.created} ${audience}.`
      });
      setAnnounceTitle('');
      setAnnounceMessage('');
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
        <div>
          <h1 className="text-3xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">Configure your e-learning platform</p>
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

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input
                id="platform-name"
                value={settings.general.platform_name}
                onChange={(e) => handleSettingChange('general', 'platform_name', e.target.value)}
                placeholder="Enter platform name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={settings.general.primary_color}
                  onChange={(e) => handleSettingChange('general', 'primary_color', e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={settings.general.primary_color}
                  onChange={(e) => handleSettingChange('general', 'primary_color', e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform-description">Platform Description</Label>
            <Textarea
              id="platform-description"
              value={settings.general.platform_description}
              onChange={(e) => handleSettingChange('general', 'platform_description', e.target.value)}
              placeholder="Describe your platform"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Platform Logo</Label>
            <div className="flex items-center gap-4">
              {settings.general.logo_url ? (
                <div className="flex items-center gap-4">
                  <img 
                    src={settings.general.logo_url} 
                    alt="Platform logo" 
                    className="h-12 w-12 object-cover rounded border"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleSettingChange('general', 'logo_url', '')}
                  >
                    Remove Logo
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 border-2 border-dashed border-muted-foreground/25 rounded flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Button variant="outline" asChild>
                      <label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Logo
                      </label>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select 
                value={settings.general.timezone} 
                onValueChange={(value) => handleSettingChange('general', 'timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Default Language</Label>
              <Select 
                value={settings.general.language} 
                onValueChange={(value) => handleSettingChange('general', 'language', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Announcements
          </CardTitle>
        </CardHeader>
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
            <p className="text-sm text-muted-foreground">Send a notification to all Teachers or all Students</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="audience">Audience</Label>
              <Select value={audience} onValueChange={(v: 'teachers' | 'students') => setAudience(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teachers">Teachers</SelectItem>
                  <SelectItem value="students">Students</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
