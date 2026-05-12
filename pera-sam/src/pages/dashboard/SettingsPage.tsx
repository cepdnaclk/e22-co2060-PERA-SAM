import { useState, useEffect } from 'react';
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
  Save,
  Loader2,
  Building2,
  Phone,
  MapPin,
  Briefcase,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ProfileImageCropper } from '@/components/ProfileImageCropper';

const SERVICE_CATEGORIES = [
  { id: 'laptop',     label: 'Laptop / PC Fans' },
  { id: 'server',     label: 'Server Equipment' },
  { id: 'pump',       label: 'Pumps & Pipelines' },
  { id: 'vehicle',    label: 'Vehicle Engines' },
  { id: 'hvac',       label: 'HVAC Systems' },
  { id: 'industrial', label: 'Industrial Machinery' },
];

/** Geocode an address string to lat/lng via OSM Nominatim */
const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const q = encodeURIComponent(`${address}, Sri Lanka`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=lk`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* silent */ }
  return null;
};

export const SettingsPage = () => {
  const { user, updateProfile } = useAuth();
  const isCompany = user?.role === 'company';

  // ── Profile form state ─────────────────────────────────────────────────────
  const [profileData, setProfileData] = useState({
    name:           user?.name || '',
    email:          user?.email || '',
    phone:          user?.phone || '',
    address:        user?.address || '',
    // Company-only
    companyName:    user?.companyName || '',
    technicianName: user?.technicianName || '',
    phone2:         user?.contactNumbers?.[1] || '',
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    user?.serviceCategories || []
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // ── Profile image state ────────────────────────────────────────────────────
  const [showCropper, setShowCropper] = useState(false);

  // ── Password change state ──────────────────────────────────────────────────
  const [passwords, setPasswords] = useState({ current: '', newPwd: '', confirm: '' });
  const [showPwd, setShowPwd]     = useState({ current: false, newPwd: false, confirm: false });
  const [isSavingPwd, setIsSavingPwd] = useState(false);

  // ── Notification toggles ───────────────────────────────────────────────────
  const [notif, setNotif] = useState({
    email:            true,
    push:             true,
    analysisComplete: true,
    newMessages:      true,
    appointments:     true,
  });

  // ── Privacy toggles ───────────────────────────────────────────────────────
  const [privacy, setPrivacy] = useState({
    shareReports:  false,
    publicProfile: false,
  });

  // Keep form in sync if auth user loads after initial render
  useEffect(() => {
    if (user) {
      setProfileData({
        name:           user.name || '',
        email:          user.email || '',
        phone:          user.phone || '',
        address:        user.address || '',
        companyName:    user.companyName || '',
        technicianName: user.technicianName || '',
        phone2:         user.contactNumbers?.[1] || '',
      });
      setSelectedCategories(user.serviceCategories || []);
    }
  }, [user]);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const updates: Record<string, any> = {
        name:    profileData.name,
        address: profileData.address,
        phone:   profileData.phone,
      };

      if (isCompany) {
        updates.companyName    = profileData.companyName;
        updates.technicianName = profileData.technicianName;
        updates.serviceCategories = selectedCategories;
        updates.contactNumbers = [profileData.phone, profileData.phone2].filter(Boolean);

        // Re-geocode address so the map pin updates
        if (profileData.address) {
          const coords = await geocodeAddress(profileData.address);
          if (coords) {
            updates.location_lat = coords.lat;
            updates.location_lng = coords.lng;
          }
        }
      }

      await updateProfile(updates as any);
      toast.success('Profile saved successfully!');
    } catch (err) {
      console.error('Profile save error:', err);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Upload profile picture ─────────────────────────────────────────────────
  const handleAvatarUpload = async (croppedBlob: Blob) => {
    if (!user) return;

    try {
      const fileExt = 'webp';
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/webp',
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting query param
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      // Update the profile with avatar URL
      await updateProfile({ avatarUrl } as any);

      toast.success('Profile picture updated!');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error(err.message || 'Failed to upload profile picture.');
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (passwords.newPwd !== passwords.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    if (passwords.newPwd.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setIsSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPwd });
      if (error) throw error;
      setPasswords({ current: '', newPwd: '', confirm: '' });
      toast.success('Password updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setIsSavingPwd(false);
    }
  };

  // ── Helper components ──────────────────────────────────────────────────────
  const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-10">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your {isCompany ? 'company' : 'account'} preferences and profile
        </p>
      </div>

      {/* ── Profile Section ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6"
      >
        <SectionHeader
          icon={isCompany ? Building2 : User}
          title={isCompany ? 'Company Profile' : 'Profile Information'}
          subtitle={isCompany ? 'Update your company and technician details' : 'Update your personal details'}
        />

        {/* ── Profile Picture Section ── */}
        <div className="flex flex-col sm:flex-row items-center gap-5 mb-6 p-4 bg-muted/30 rounded-xl border border-border/50">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-accent/30 bg-sidebar-primary flex items-center justify-center flex-shrink-0 shadow-lg">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                  {isCompany ? (
                    <Building2 className="h-10 w-10 text-accent/60" />
                  ) : (
                    <User className="h-10 w-10 text-accent/60" />
                  )}
                </div>
              )}
            </div>
            {/* Camera overlay */}
            <button
              onClick={() => setShowCropper(true)}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex flex-col items-center sm:items-start gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{user?.name || 'Your Name'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCropper(true)}
              className="gap-2"
            >
              <Camera className="h-3.5 w-3.5" />
              {user?.avatarUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>
            <p className="text-[10px] text-muted-foreground">Recommended: 400×400px • JPG, PNG, WebP</p>
          </div>
        </div>

        {/* Image Cropper Dialog */}
        <ProfileImageCropper
          open={showCropper}
          onOpenChange={setShowCropper}
          onCropComplete={handleAvatarUpload}
          currentImageUrl={user?.avatarUrl}
        />

        <div className="grid gap-5">
          {isCompany ? (
            /* ── Company fields ── */
            <>
              {/* Row 1: Company name & Technician name */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company / Station Name</Label>
                  <div className="relative mt-1.5">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      value={profileData.companyName}
                      onChange={e => setProfileData(p => ({ ...p, companyName: e.target.value }))}
                      className="pl-9"
                      placeholder="Invictus Engineering"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="technicianName">Lead Technician Name</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="technicianName"
                      value={profileData.technicianName}
                      onChange={e => setProfileData(p => ({ ...p, technicianName: e.target.value }))}
                      className="pl-9"
                      placeholder="Dileka Sandaruwan"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email (read-only) & Address */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    readOnly
                    className="mt-1.5 bg-muted/50 cursor-not-allowed text-muted-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed here.</p>
                </div>
                <div>
                  <Label htmlFor="address">Business Address</Label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      value={profileData.address}
                      onChange={e => setProfileData(p => ({ ...p, address: e.target.value }))}
                      className="pl-9"
                      placeholder="No.5, Main Street, Kandy"
                    />
                  </div>
                  <p className="text-[10px] text-accent mt-1 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" /> Saving updates your map pin automatically.
                  </p>
                </div>
              </div>

              {/* Row 3: Primary & Secondary contact */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Primary Contact</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
                      className="pl-9"
                      placeholder="+94 77 123 4567"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone2">Secondary Contact <span className="text-muted-foreground">(optional)</span></Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone2"
                      value={profileData.phone2}
                      onChange={e => setProfileData(p => ({ ...p, phone2: e.target.value }))}
                      className="pl-9"
                      placeholder="+94 77 987 6543"
                    />
                  </div>
                </div>
              </div>

              {/* Service Categories */}
              <div>
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Service Categories
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {SERVICE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`p-3 rounded-lg border text-left text-sm transition-all flex items-center gap-2 ${
                        selectedCategories.includes(cat.id)
                          ? 'border-accent bg-accent/10 text-foreground'
                          : 'border-border text-muted-foreground hover:border-accent/50'
                      }`}
                    >
                      {selectedCategories.includes(cat.id) && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                      )}
                      <span className={selectedCategories.includes(cat.id) ? '' : 'ml-5'}>{cat.label}</span>
                    </button>
                  ))}
                </div>
                {selectedCategories.length === 0 && (
                  <p className="text-xs text-destructive mt-1">Please select at least one service category.</p>
                )}
              </div>
            </>
          ) : (
            /* ── Normal User fields ── */
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))}
                      className="pl-9"
                      placeholder="Bhagya Karunanayake"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    readOnly
                    className="mt-1.5 bg-muted/50 cursor-not-allowed text-muted-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed here.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
                      className="pl-9"
                      placeholder="+94 77 123 4567"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      value={profileData.address}
                      onChange={e => setProfileData(p => ({ ...p, address: e.target.value }))}
                      className="pl-9"
                      placeholder="Faculty of Engineering, Peradeniya"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Save Profile Button */}
        <div className="flex justify-end mt-6 pt-4 border-t border-border/50">
          <Button
            id="save-profile-btn"
            variant="accent"
            size="lg"
            onClick={handleSaveProfile}
            disabled={isSavingProfile || (isCompany && selectedCategories.length === 0)}
          >
            {isSavingProfile ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving{isCompany ? ' & Updating Map...' : '...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* ── Change Password Section ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass-card rounded-xl p-6"
      >
        <SectionHeader
          icon={Lock}
          title="Change Password"
          subtitle="Update your account password"
        />

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { id: 'newPwd',   label: 'New Password',     key: 'newPwd' as const },
            { id: 'confirm',  label: 'Confirm Password',  key: 'confirm' as const },
          ].map(({ id, label, key }) => (
            <div key={id} className="sm:col-span-1">
              <Label htmlFor={id}>{label}</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id={id}
                  type={showPwd[key] ? 'text' : 'password'}
                  value={passwords[key]}
                  onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                  className="pl-9 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPwd(p => ({ ...p, [key]: !p[key] }))}
                >
                  {showPwd[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
          <div className="sm:col-span-1 flex items-end">
            <Button
              id="change-password-btn"
              variant="outline"
              className="w-full"
              onClick={handleChangePassword}
              disabled={isSavingPwd || !passwords.newPwd || !passwords.confirm}
            >
              {isSavingPwd ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</>
              ) : (
                <><Lock className="h-4 w-4 mr-2" />Update Password</>
              )}
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          You'll be logged in after the change. Password must be at least 6 characters.
        </p>
      </motion.div>

      {/* ── Notifications Section ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="glass-card rounded-xl p-6"
      >
        <SectionHeader
          icon={Bell}
          title="Notifications"
          subtitle="Configure how you receive updates"
        />

        <div className="space-y-1">
          {[
            { key: 'email',            label: 'Email Notifications',   desc: 'Receive updates via email' },
            { key: 'push',             label: 'Push Notifications',    desc: 'Get browser push notifications' },
            { key: 'analysisComplete', label: 'Analysis Complete',     desc: 'Notify when analysis finishes' },
            { key: 'newMessages',      label: 'New Messages',          desc: 'Notify on new chat messages' },
            { key: 'appointments',     label: 'Appointments',          desc: 'Reminders for scheduled appointments' },
          ].map(item => (
            <div
              key={item.key}
              className="flex items-center justify-between py-3 border-b border-border/40 last:border-0"
            >
              <div>
                <p className="font-medium text-foreground text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={notif[item.key as keyof typeof notif]}
                onCheckedChange={checked =>
                  setNotif(prev => ({ ...prev, [item.key]: checked }))
                }
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Privacy & Security Section ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="glass-card rounded-xl p-6"
      >
        <SectionHeader
          icon={Shield}
          title="Privacy & Security"
          subtitle="Manage your data and visibility settings"
        />

        <div className="space-y-1">
          {[
            { key: 'shareReports',  label: 'Share Reports',   desc: 'Allow sharing analysis reports with technicians' },
            { key: 'publicProfile', label: 'Public Profile',  desc: isCompany ? 'Make your company visible to all users' : 'Make your profile visible to service providers' },
          ].map(item => (
            <div
              key={item.key}
              className="flex items-center justify-between py-3 border-b border-border/40 last:border-0"
            >
              <div>
                <p className="font-medium text-foreground text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={privacy[item.key as keyof typeof privacy]}
                onCheckedChange={checked =>
                  setPrivacy(prev => ({ ...prev, [item.key]: checked }))
                }
              />
            </div>
          ))}
        </div>

        <div className="mt-5 p-4 bg-muted/50 rounded-lg border border-border/50">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Data Security:</strong> Your audio files are encrypted
            during transmission and storage. We never share your data with third parties without consent.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
