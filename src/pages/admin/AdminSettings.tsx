import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Shield, Database, Bell, Save, ThumbsUp, ThumbsDown, UserX, Loader2, KeyRound } from "lucide-react";

interface SystemSettings {
  maintenance_mode: boolean;
  allow_registration: boolean;
  require_email_verification: boolean;
  max_subjects_per_student: number;
  notification_email: string;
  backup_frequency: string;
  idle_account_days: number;
  admin_access_code: string;
}

interface RatingStats {
  likes: number;
  dislikes: number;
  total: number;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    allow_registration: true,
    require_email_verification: true,
    max_subjects_per_student: 10,
    notification_email: "",
    backup_frequency: "daily",
    idle_account_days: 10,
    admin_access_code: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const [ratingStats, setRatingStats] = useState<RatingStats>({ likes: 0, dislikes: 0, total: 0 });

  useEffect(() => {
    fetchSettings();
    fetchRatings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from("system_settings").select("*");
      if (error) throw error;

      const settingsMap: Record<string, any> = {};
      data?.forEach((item: any) => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      setSettings({
        maintenance_mode: settingsMap.maintenance_mode?.enabled || false,
        allow_registration: settingsMap.registration?.enabled ?? true,
        require_email_verification: settingsMap.registration?.require_verification ?? true,
        max_subjects_per_student: settingsMap.student_limits?.max_subjects || 10,
        notification_email: settingsMap.notifications?.admin_email || "",
        backup_frequency: settingsMap.backup?.frequency || "daily",
        idle_account_days: settingsMap.idle_account_days?.days || 10,
        admin_access_code: settingsMap.admin_access_code?.code || "",
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase.from("system_ratings").select("rating_type");
      if (error) throw error;
      const likes = data?.filter((r) => r.rating_type === "like").length || 0;
      const dislikes = data?.filter((r) => r.rating_type === "dislike").length || 0;
      setRatingStats({ likes, dislikes, total: likes + dislikes });
    } catch (error) {
      console.error("Error fetching ratings:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = [
        { setting_key: "maintenance_mode", setting_value: { enabled: settings.maintenance_mode }, category: "system" },
        { setting_key: "registration", setting_value: { enabled: settings.allow_registration, require_verification: settings.require_email_verification }, category: "auth" },
        { setting_key: "student_limits", setting_value: { max_subjects: settings.max_subjects_per_student }, category: "limits" },
        { setting_key: "notifications", setting_value: { admin_email: settings.notification_email }, category: "notifications" },
        { setting_key: "backup", setting_value: { frequency: settings.backup_frequency }, category: "system" },
        { setting_key: "idle_account_days", setting_value: { days: settings.idle_account_days }, category: "system" },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase.from("system_settings").upsert(setting, { onConflict: "setting_key" });
        if (error) throw error;
      }

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccessCode = async () => {
    if (!settings.admin_access_code.trim()) {
      toast.error("Please enter an access code");
      return;
    }
    setIsSavingCode(true);
    try {
      const { error } = await supabase.from("system_settings").upsert(
        { setting_key: "admin_access_code", setting_value: { code: settings.admin_access_code }, category: "security" },
        { onConflict: "setting_key" }
      );
      if (error) throw error;
      toast.success("Admin access code saved successfully");
    } catch (error) {
      console.error("Error saving access code:", error);
      toast.error("Failed to save access code");
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleRunCleanup = async () => {
    if (!confirm(`This will remove student accounts idle for ${settings.idle_account_days}+ days. Continue?`)) return;
    setIsRunningCleanup(true);
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-idle-accounts");
      if (error) throw error;
      toast.success(data?.message || "Cleanup completed");
    } catch (error: any) {
      toast.error(error.message || "Failed to run cleanup");
    } finally {
      setIsRunningCleanup(false);
    }
  };

  const likePercentage = ratingStats.total > 0 ? Math.round((ratingStats.likes / ratingStats.total) * 100) : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">System Settings</h1>
            <p className="text-muted-foreground mt-1">Configure system-wide settings and preferences</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> General
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> Security
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <UserX className="w-4 h-4" /> Account Management
            </TabsTrigger>
            <TabsTrigger value="ratings" className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4" /> Ratings
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="w-4 h-4" /> Database
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic system configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div>
                    <Label className="text-destructive font-medium">Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground mt-1">When enabled, only admins can access the system</p>
                  </div>
                  <Switch checked={settings.maintenance_mode} onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked })} />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Subjects per Student</Label>
                  <Input type="number" min={1} max={20} value={settings.max_subjects_per_student} onChange={(e) => setSettings({ ...settings, max_subjects_per_student: parseInt(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">Maximum number of subjects a student can add to their profile</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Authentication and access control</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>Allow New Registrations</Label>
                    <p className="text-sm text-muted-foreground mt-1">Allow new users to create accounts</p>
                  </div>
                  <Switch checked={settings.allow_registration} onCheckedChange={(checked) => setSettings({ ...settings, allow_registration: checked })} />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>Require Email Verification</Label>
                    <p className="text-sm text-muted-foreground mt-1">Users must verify their email before accessing the system</p>
                  </div>
                  <Switch checked={settings.require_email_verification} onCheckedChange={(checked) => setSettings({ ...settings, require_email_verification: checked })} />
                </div>
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <Label className="font-medium">Admin Access Code</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Users registering as admin must provide this code. Leave empty to disable admin self-registration.
                  </p>
                  <Input
                    type="password"
                    value={settings.admin_access_code}
                    onChange={(e) => setSettings({ ...settings, admin_access_code: e.target.value })}
                    placeholder="Enter a secure access code"
                  />
                  <Button onClick={handleSaveAccessCode} disabled={isSavingCode} size="sm" className="mt-2">
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {isSavingCode ? "Saving..." : "Save Access Code"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <CardTitle>Idle Account Removal</CardTitle>
                <CardDescription>Automatically remove student accounts that stay inactive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Days Before Account Removal</Label>
                  <Input type="number" min={1} max={365} value={settings.idle_account_days} onChange={(e) => setSettings({ ...settings, idle_account_days: parseInt(e.target.value) || 10 })} />
                  <p className="text-xs text-muted-foreground">
                    Student accounts idle for more than this many days will be automatically removed.
                    The student will need to register again to use the system.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="destructive" onClick={handleRunCleanup} disabled={isRunningCleanup}>
                    {isRunningCleanup ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserX className="w-4 h-4 mr-2" />}
                    Run Cleanup Now
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Manually trigger removal of idle accounts (admin & counselor accounts are protected)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ratings">
            <Card>
              <CardHeader>
                <CardTitle>Student Ratings</CardTitle>
                <CardDescription>View how students rate the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 bg-accent/10 rounded-lg border border-accent/20 text-center">
                    <ThumbsUp className="w-8 h-8 text-accent mx-auto mb-2" />
                    <div className="text-3xl font-bold text-foreground">{ratingStats.likes}</div>
                    <p className="text-sm text-muted-foreground">Likes</p>
                  </div>
                  <div className="p-6 bg-destructive/10 rounded-lg border border-destructive/20 text-center">
                    <ThumbsDown className="w-8 h-8 text-destructive mx-auto mb-2" />
                    <div className="text-3xl font-bold text-foreground">{ratingStats.dislikes}</div>
                    <p className="text-sm text-muted-foreground">Dislikes</p>
                  </div>
                  <div className="p-6 bg-primary/10 rounded-lg border border-primary/20 text-center">
                    <div className="text-3xl font-bold text-foreground">{likePercentage}%</div>
                    <p className="text-sm text-muted-foreground">Satisfaction Rate</p>
                    <Badge variant={likePercentage >= 70 ? "default" : "destructive"} className="mt-2">
                      {ratingStats.total} total ratings
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure system notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Admin Notification Email</Label>
                  <Input type="email" value={settings.notification_email} onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })} placeholder="admin@eduguide.co.zw" />
                  <p className="text-xs text-muted-foreground">Email address for system notifications and alerts</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle>Database Settings</CardTitle>
                <CardDescription>Backup and data management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Database Status</Label>
                      <p className="text-sm text-muted-foreground mt-1">Connected and operational</p>
                    </div>
                    <span className="flex items-center gap-2 text-accent">
                      <span className="w-2 h-2 rounded-full bg-accent"></span> Online
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-primary">
                    💡 Tip: Database backups are managed automatically by Lovable Cloud. Contact support for manual backup requests.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
