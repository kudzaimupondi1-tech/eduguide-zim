import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  GraduationCap, 
  User,
  Mail,
  Phone,
  Camera,
  ArrowLeft,
  ArrowsUpFromLine,
  Save,
  Loader2,
  LogOut,
  Share2,
  Users as UsersIcon,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
  });
  const [referralStats, setReferralStats] = useState({ count: 0, unlocked: false });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
        });
        
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("referred_by", userId)
          .not("recommendation_viewed_at", "is", null);
          
        setReferralStats({ count: count || 0, unlocked: data.referral_reward_unlocked || false });

        if (count && count >= 5 && !data.referral_reward_unlocked) {
          await supabase.from("profiles").update({ referral_reward_unlocked: true }).eq("user_id", userId);
          setReferralStats({ count, unlocked: true });
          setProfile(prev => prev ? { ...prev, referral_reward_unlocked: true } : null);
          toast.success("Congratulations! You've unlocked a free premium recommendation view!");
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      toast.success("Profile updated successfully");
      
      // Update local state
      setProfile(prev => prev ? { ...prev, ...formData } : null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const getInitials = () => {
    if (formData.full_name) {
      return formData.full_name
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="font-display text-lg font-bold text-foreground">My Profile</h1>
                <p className="text-sm text-muted-foreground">Manage your account settings</p>
              </div>
            </div>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center md:text-left">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {formData.full_name || "Student"}
                </h2>
                <p className="text-muted-foreground">{user?.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Member since {new Date(user?.created_at || "").toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Program */}
        <Card className="mb-8 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50" />
          <CardHeader>
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              <CardTitle>Referral Program</CardTitle>
            </div>
            <CardDescription>Invite 5 friends and earn a free premium university recommendation view when they check their matches!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="space-y-2">
              <Label>Your Personal Referral Link</Label>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/auth?ref=${user?.id}`} 
                  className="bg-muted/50 font-mono text-xs"
                />
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${user?.id}`);
                    toast.success("Link copied to clipboard!");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Progress</span>
                <span className="font-bold">{referralStats.count} / 5 Qualified Referrals</span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000 ease-in-out" 
                  style={{ width: `${Math.min(100, (referralStats.count / 5) * 100)}%` }}
                />
              </div>
            </div>

            {profile?.referral_reward_unlocked ? (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-xl flex items-start gap-3 border border-green-200 dark:border-green-800">
                <Award className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm">Reward Unlocked!</h4>
                  <p className="text-xs opacity-90 mt-1">
                    {profile?.referral_reward_used 
                      ? "You have already used your free premium recommendation view." 
                      : "You have successfully earned your free premium recommendation view! Head over to Recommendations to use it."}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic flex items-center gap-1.5 bg-muted/30 p-3 rounded-lg border border-border/50">
                <UsersIcon className="w-4 h-4" />
                {Math.max(0, 5 - referralStats.count)} more qualified referrals needed to unlock the reward.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="full_name"
                    placeholder="Enter your full name"
                    className="pl-10"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This is for contact purposes and may differ from your login email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    className="pl-10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>Manage your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="mt-8">
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
