import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  BookOpen, 
  GraduationCap, 
  Target, 
  TrendingUp, 
  ChevronRight,
  Plus,
  User,
  LogOut,
  Bell,
  Star,
  Calendar,
  Clock,
  Megaphone,
  X
} from "lucide-react";
import { StudentRating } from "@/components/StudentRating";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  deadline_type: string;
  deadline_date: string;
  level: string | null;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  published_at: string;
}

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
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
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

      // Fetch all data in parallel
      const [profileRes, subjectCountRes, deadlinesRes, announcementsRes, notificationsRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", userId).single(),
        supabase.from("student_subjects").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("deadlines").select("*").eq("is_active", true).order("deadline_date", { ascending: true }).limit(5),
        supabase.from("announcements").select("*").eq("is_published", true).order("published_at", { ascending: false }).limit(3),
        supabase.from("student_notifications").select("*").eq("user_id", userId).eq("is_read", false).order("created_at", { ascending: false }).limit(10),
      ]);
      
      setProfile(profileRes.data);
      setSubjectCount(subjectCountRes.count || 0);
      setDeadlines(deadlinesRes.data || []);
      setAnnouncements(announcementsRes.data || []);
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

  const getDaysRemaining = (date: string) => {
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return { text: "Passed", urgent: false };
    if (days === 0) return { text: "Today!", urgent: true };
    if (days <= 7) return { text: `${days} days left`, urgent: true };
    if (days <= 30) return { text: `${days} days left`, urgent: false };
    return { text: format(new Date(date), "MMM d"), urgent: false };
  };

  const profileCompleteness = Math.min(100, (subjectCount > 0 ? 50 : 0) + (profile?.full_name ? 50 : 25));
  const unreadCount = notifications.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/5">
      <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-display text-lg font-bold text-foreground">EduGuide</span>
                <div className="text-xs text-muted-foreground">Zimbabwe</div>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Button variant="ghost" size="icon" onClick={() => setShowNotifications(!showNotifications)} aria-label="Toggle notifications">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50" role="dialog" aria-label="Notifications">
                    <div className="p-3 border-b border-border">
                      <h3 className="font-semibold text-foreground">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">No new notifications</div>
                      ) : (
                        notifications.map((notification) => (
                          <div key={notification.id} className="p-3 border-b border-border last:border-0 hover:bg-muted/50">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm text-foreground">{notification.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markNotificationRead(notification.id)} aria-label="Mark read">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button variant="ghost" size="icon" asChild aria-label="Profile">
                <Link to="/profile">
                  <User className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <section aria-labelledby="welcome" className="mb-6">
          <div className="flex items-start gap-4 flex-col sm:flex-row sm:items-center">
            <div>
              <h1 id="welcome" className="font-display text-2xl sm:text-3xl font-bold text-foreground">{getGreeting()}, {getUserName()} 👋</h1>
              <p className="text-sm text-muted-foreground mt-1">A clear path to your next steps — simple, smart, and tailored to you.</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Profile</div>
                <div className="font-semibold">{profile?.full_name ?? user?.user_metadata?.full_name ?? 'Student'}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/80 to-accent/80 p-4 sm:p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center text-xl font-bold">{getUserName().charAt(0)}</div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">Welcome back, {getUserName()}</h2>
                  <p className="text-sm opacity-90 mt-1">Let's complete a few quick steps to get tailored recommendations.</p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="w-36">
                      <Progress value={profileCompleteness} className="h-3 rounded-full bg-white/20" />
                      <div className="text-xs mt-2">Profile {profileCompleteness}% complete</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="secondary" size="sm" asChild>
                        <Link to="/my-subjects">Add Subjects</Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/recommendations">See Matches</Link>
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                  <div className="text-xs text-white/80">Unread</div>
                  <div className="text-2xl font-bold mt-1">{unreadCount}</div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center font-semibold text-primary">1</div>
                <div>
                  <h3 className="font-semibold text-foreground">Add Subjects</h3>
                  <p className="text-sm text-muted-foreground">Tell us what you study so we can match programs.</p>
                  <div className="mt-3">
                    <Button size="sm" asChild>
                      <Link to="/my-subjects">Start</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center font-semibold text-accent">2</div>
                <div>
                  <h3 className="font-semibold text-foreground">Explore Matches</h3>
                  <p className="text-sm text-muted-foreground">View recommended programs tailored to your subjects.</p>
                  <div className="mt-3">
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/recommendations">View</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center font-semibold text-secondary">3</div>
                <div>
                  <h3 className="font-semibold text-foreground">Apply & Track</h3>
                  <p className="text-sm text-muted-foreground">Track deadlines and submit applications confidently.</p>
                  <div className="mt-3">
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/universities">Browse</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/my-subjects">
                <Card className="group hover:shadow-lg transition-transform transform-gpu hover:-translate-y-1">
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">My Subjects</h4>
                        <p className="text-sm text-muted-foreground">{subjectCount} subjects added</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/recommendations">
                <Card className="group hover:shadow-lg transition-transform transform-gpu hover:-translate-y-1">
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Target className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Recommendations</h4>
                        <p className="text-sm text-muted-foreground">Programs matched to you</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {subjectCount === 0 && (
              <Card>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-secondary/20 flex items-center justify-center">
                      <Plus className="w-10 h-10 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-xl font-bold">Get tailored matches faster</h3>
                      <p className="text-sm text-muted-foreground mt-2">Add your subjects to unlock university and career recommendations.</p>
                      <div className="mt-3">
                        <Button asChild>
                          <Link to="/my-subjects">Add Subjects</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deadlines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines</p>
                ) : (
                  deadlines.slice(0, 4).map((deadline) => {
                    const remaining = getDaysRemaining(deadline.deadline_date);
                    return (
                      <div key={deadline.id} className={`p-3 rounded-lg border ${remaining.urgent ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{deadline.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={remaining.urgent ? "destructive" : "secondary"} className="text-xs">{deadline.deadline_type}</Badge>
                              {deadline.level && (<Badge variant="outline" className="text-xs">{deadline.level}</Badge>)}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`flex items-center gap-1 text-xs ${remaining.urgent ? "text-destructive" : "text-muted-foreground"}`}>
                              <Clock className="w-3 h-3" />{remaining.text}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{format(new Date(deadline.deadline_date), "MMM d")}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Tips</CardTitle>
                <CardDescription>Make the most of EduGuide</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><span className="text-primary font-bold">1</span></div>
                  <div>
                    <h4 className="font-medium text-foreground">Add your subjects</h4>
                    <p className="text-sm text-muted-foreground">Include your grades for better recommendations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><span className="text-primary font-bold">2</span></div>
                  <div>
                    <h4 className="font-medium text-foreground">Explore programs</h4>
                    <p className="text-sm text-muted-foreground">See which programs match your subjects</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><span className="text-primary font-bold">3</span></div>
                  <div>
                    <h4 className="font-medium text-foreground">Research careers</h4>
                    <p className="text-sm text-muted-foreground">Learn about career paths and requirements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>

        <Card className="mt-6">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground mb-1">How do you find EduGuide?</h3>
              <p className="text-sm text-muted-foreground">Your feedback helps us improve</p>
            </div>
            <StudentRating />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
