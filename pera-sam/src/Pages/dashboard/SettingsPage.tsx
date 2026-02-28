import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      analysisComplete: true,
      newMessages: true,
      appointments: true,
    },
    privacy: {
      shareReports: false,
      publicProfile: false,
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account preferences and settings
        </p>
      </div>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <User className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>
            <p className="text-sm text-muted-foreground">Update your personal details</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={user?.name} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={user?.email} className="mt-1.5" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" defaultValue={user?.phone || ''} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" defaultValue={user?.address || ''} className="mt-1.5" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <Bell className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
            <p className="text-sm text-muted-foreground">Configure how you receive updates</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { key: 'email', label: 'Email Notifications', description: 'Receive updates via email' },
            { key: 'push', label: 'Push Notifications', description: 'Get browser push notifications' },
            { key: 'analysisComplete', label: 'Analysis Complete', description: 'Notify when analysis finishes' },
            { key: 'newMessages', label: 'New Messages', description: 'Notify on new chat messages' },
            { key: 'appointments', label: 'Appointments', description: 'Reminders for scheduled appointments' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                checked={settings.notifications[item.key as keyof typeof settings.notifications]}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, [item.key]: checked }
                  }))
                }
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Privacy Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Privacy & Security</h2>
            <p className="text-sm text-muted-foreground">Manage your privacy settings</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-foreground">Share Reports</p>
              <p className="text-sm text-muted-foreground">Allow sharing analysis reports with technicians</p>
            </div>
            <Switch
              checked={settings.privacy.shareReports}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  privacy: { ...prev.privacy, shareReports: checked }
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-foreground">Public Profile</p>
              <p className="text-sm text-muted-foreground">Make your profile visible to service providers</p>
            </div>
            <Switch
              checked={settings.privacy.publicProfile}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  privacy: { ...prev.privacy, publicProfile: checked }
                }))
              }
            />
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Data Security:</strong> Your audio files are encrypted 
            during transmission and storage. We never share your data with third parties without your consent.
          </p>
        </div>
      </motion.div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="accent" size="lg" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
