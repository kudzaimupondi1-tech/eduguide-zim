import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap, User, LogOut, Bell, X, Star, BookOpen, ChevronRight, Heart, MessageSquare
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { StudentRating } from "@/components/StudentRating";
import { StudentQueryChat } from "@/components/StudentQueryChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: "announcement" | "notification";
  expires_at?: string | null;
}

interface FavouriteProgram {
  id: string;
  program_name: string;
  university_name: string;
  match_percentage: number;
  program_id: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [subjectCount, setSubjectCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [favourites, setFavourites] = useState<FavouriteProgram[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) navigate("/auth");
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth");
      else { setUser(session.user); fetchUserData(session.user.id); }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    try {
      supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("user_id", userId).then();

      const [profileRes, subjectCountRes, announcementsRes, regularNotifsRes, favouritesRes, unreadMsgRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", userId).single(),
        supabase.from("student_subjects").select("*", { count: "exact", head: true }).eq("user_id", userId),
        // Fetch all published announcements (they persist until expired)
        supabase.from("announcements").select("id, title, content, published_at, expires_at").eq("is_published", true),
        // Fetch regular (non-announcement) notifications that are unread
        supabase.from("student_notifications").select("*").eq("user_id", userId).eq("is_read", false).neq("notification_type", "announcement").order("created_at", { ascending: false }).limit(20),
        supabase.from("favourite_programs").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        // Count only unread admin responses
        supabase.from("student_queries").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "responded").eq("is_read_by_student", false),
      ]);
      setProfile(profileRes.data);
      setSubjectCount(subjectCountRes.count || 0);
      setFavourites((favouritesRes.data as any[]) || []);
      setUnreadMessages(unreadMsgRes.count || 0);

      // Combine announcements + regular notifications
      const now = new Date();
      const announcementNotifs: Notification[] = (announcementsRes.data || [])
        .filter(a => !a.expires_at || new Date(a.expires_at) > now)
        .map(a => ({
          id: `ann-${a.id}`,
          title: `📢 ${a.title}`,
          message: a.content,
          is_read: false, // Announcements always show
          created_at: a.published_at || a.id,
          type: "announcement" as const,
          expires_at: a.expires_at,
        }));

      const regularNotifs: Notification[] = (regularNotifsRes.data || []).map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        is_read: n.is_read || false,
        created_at: n.created_at,
        type: "notification" as const,
      }));

      setNotifications([...announcementNotifs, ...regularNotifs]);
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

  const markNotificationRead = async (notif: Notification) => {
    if (notif.type === "announcement") {
      // Just remove from local list visually
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    } else {
      await supabase.from("student_notifications").update({ is_read: true }).eq("id", notif.id);
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }
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

  const handleChatRead = async () => {
    setUnreadMessages(0);
    // Mark all responded queries as read by student
    if (user) {
      await supabase
        .from("student_queries")
        .update({ is_read_by_student: true } as any)
        .eq("user_id", user.id)
        .eq("status", "responded")
        .eq("is_read_by_student", false);
    }
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
    <PageTransition>
    <div className="min-h-screen bg-secondary/30">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-base font-bold text-foreground leading-none">EduGuide</span>
                <span className="text-[11px] text-muted-foreground block">Zimbabwe</span>
              </div>
            </Link>
            <div className="flex items-center gap-1.5">
              {/* Query Chat Icon */}
              <div className="relative">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setShowChat(!showChat)}>
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-green-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unreadMessages}</span>
                  )}
                </Button>
              </div>
              {/* Notifications */}
              <div className="relative">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setShowNotifications(!showNotifications)}>
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold">{unreadCount > 99 ? "99+" : unreadCount}</span>
                  )}
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-lg z-50 overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/30">
                      <h3 className="font-bold text-sm text-foreground">Notifications</h3>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground text-sm">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No new notifications
                        </div>
                      ) : notifications.map((n) => (
                        <div key={n.id} className="p-4 border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                              {n.type === "announcement" && n.expires_at && (
                                <p className="text-[10px] text-muted-foreground/60 mt-1">
                                  Expires: {new Date(n.expires_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 rounded-lg" onClick={() => markNotificationRead(n)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" asChild>
                <Link to="/profile"><User className="w-5 h-5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Welcome */}
        <section className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {getGreeting()}, {getUserName()} 👋
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Your personalised university guidance starts here.</p>
          <div className="mt-5 p-4 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-medium">Profile completion</span>
              <span className="font-bold text-foreground">{profileCompleteness}%</span>
            </div>
            <Progress value={profileCompleteness} className="h-2.5 rounded-full" />
            {profileCompleteness < 100 && (
              <p className="text-[11px] text-muted-foreground mt-2">
                {subjectCount === 0 ? "Add your subjects to complete your profile" : "Complete your profile for better recommendations"}
              </p>
            )}
          </div>
        </section>

        {/* Action Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <Card className="group border border-border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-7 pb-6 px-6 flex flex-col h-full">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">Add Subjects</h3>
              <p className="text-sm text-muted-foreground flex-1 mb-5 leading-relaxed">
                Enter your O-Level or A-Level results to unlock personalised programme recommendations.
              </p>
              <Button asChild className="w-full h-11 font-semibold rounded-xl group-hover:shadow-md transition-shadow">
                <Link to="/my-subjects" className="flex items-center justify-center gap-2">
                  Get Started <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group border border-border shadow-sm hover:shadow-lg hover:border-yellow-400/40 transition-all duration-300 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-7 pb-6 px-6 flex flex-col h-full">
              <div className="w-14 h-14 rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Heart className="w-7 h-7 text-yellow-500" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">Favoured Programs</h3>
              <p className="text-sm text-muted-foreground flex-1 mb-5 leading-relaxed">
                {favourites.length === 0
                  ? "Star up to 10 programs from your recommendations to save them here."
                  : `You have ${favourites.length} saved program${favourites.length > 1 ? "s" : ""}. View and download as PDF.`
                }
              </p>
              {favourites.length > 0 ? (
                <Button variant="outline" asChild className="w-full h-11 font-semibold rounded-xl border-yellow-300 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                  <Link to="/favored-programs" className="flex items-center justify-center gap-2">
                    <Star className="w-4 h-4" /> View Favourites ({favourites.length})
                  </Link>
                </Button>
              ) : (
                <div className="h-11 flex items-center justify-center rounded-xl bg-muted/50 border border-dashed border-border text-sm text-muted-foreground">
                  No favourites yet
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Quick Info */}
        <section className="mb-10">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" /> How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Add Subjects", desc: "Enter your O or A-Level results with grades" },
              { step: "2", title: "Pay & Unlock", desc: "Choose universities and make a small payment" },
              { step: "3", title: "Get Matched", desc: "Receive personalised programme recommendations" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rating */}
        <Card className="border border-border shadow-sm rounded-2xl">
          <CardContent className="py-5 px-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-foreground text-sm">How do you find EduGuide?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Your feedback helps us improve</p>
            </div>
            <StudentRating />
          </CardContent>
        </Card>
      </main>

      {/* Chat Widget */}
      {user && <StudentQueryChat userId={user.id} open={showChat} onClose={() => setShowChat(false)} onRead={handleChatRead} />}
    </div>
  );
    </PageTransition>
  );
};

export default Dashboard;
