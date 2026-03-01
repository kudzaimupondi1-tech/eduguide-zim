import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  GraduationCap, 
  BookOpen, 
  Target, 
  User,
  LogOut,
  Bell,
  X,
  Eye,
  Compass,
  Plus
} from "lucide-react";
import { StudentRating } from "@/components/StudentRating";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [subjectCount, setSubjectCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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
        fetchUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    try {
      // Update last_active_at for idle tracking
      supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("user_id", userId).then();

      const [profileRes, subjectCountRes, notificationsRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", userId).single(),
        supabase.from("student_subjects").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("student_notifications").select("*").eq("user_id", userId).eq("is_read", false).order("created_at", { ascending: false }).limit(10),
      ]);
      
      setProfile(profileRes.data);
      setSubjectCount(subjectCountRes.count || 0);
      setNotifications(notificationsRes.data || []);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from("student_notifications").update({ is_read: true }).eq("id", id);
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getUserName = () => {
    if (profile?.full_name) return profile.full_name.split(" ")[0];
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name.split(" ")[0];
    return "Student";
  };

  const profileCompleteness = Math.min(100, (subjectCount > 0 ? 50 : 0) + (profile?.full_name ? 50 : 25));
  const unreadCount = notifications.length;
  const hasSubjects = subjectCount > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-sm font-bold text-foreground leading-none">EduGuide</span>
                <span className="text-[10px] text-muted-foreground block -mt-0.5">Zimbabwe</span>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              {/* Notifications */}
              <div className="relative">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowNotifications(!showNotifications)}>
                  <Bell className="w-[18px] h-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 mt-1 w-80 bg-card border border-border rounded-xl shadow-lg z-50">
                    <div className="p-3 border-b border-border">
                      <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">No new notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="p-3 border-b border-border last:border-0 hover:bg-muted/50">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm text-foreground">{n.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => markNotificationRead(n.id)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                <Link to="/profile"><User className="w-[18px] h-[18px]" /></Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSignOut}>
                <LogOut className="w-[18px] h-[18px]" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Hero Section — Informational Only */}
        <section className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {getGreeting()}, {getUserName()} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            A clear path to your university journey.
          </p>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Profile completion</span>
              <span className="font-medium text-foreground">{profileCompleteness}%</span>
            </div>
            <Progress value={profileCompleteness} className="h-2" />
          </div>
        </section>

        {/* 3 Action Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Card 1: Add Subjects */}
          <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-5 px-5 flex flex-col h-full">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">Add Subjects</h3>
              <p className="text-sm text-muted-foreground flex-1 mb-4">
                Add your academic subjects to receive personalised programme recommendations.
              </p>
              <Button size="sm" asChild className="w-full">
                <Link to="/my-subjects">Start</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: My Subjects */}
          <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-5 px-5 flex flex-col h-full">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-4">
                <Eye className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">My Subjects</h3>
              <p className="text-sm text-muted-foreground flex-1 mb-4">
                View and edit the subjects you have already added.
              </p>
              <Button size="sm" variant="outline" asChild className="w-full">
                <Link to="/my-subjects">View</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card 3: Recommendations */}
          <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-5 px-5 flex flex-col h-full">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-4">
                <Compass className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">Recommendations</h3>
              {hasSubjects ? (
                <p className="text-sm text-muted-foreground flex-1 mb-4">
                  Explore programmes matched to your academic qualifications.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground flex-1 mb-4">
                  Add subjects first to unlock recommendations.
                </p>
              )}
              <Button size="sm" variant="outline" asChild className="w-full" disabled={!hasSubjects}>
                <Link to={hasSubjects ? "/recommendations" : "#"} onClick={(e) => !hasSubjects && e.preventDefault()}>
                  Explore
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Rating */}
        <Card className="border border-border shadow-sm">
          <CardContent className="py-5 px-5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-sm">How do you find EduGuide?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Your feedback helps us improve</p>
            </div>
            <StudentRating />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
