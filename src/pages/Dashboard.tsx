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
  Settings,
  Bell,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [subjectCount, setSubjectCount] = useState(0);

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
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .single();
      
      setProfile(profileData);

      // Fetch subject count
      const { count } = await supabase
        .from("student_subjects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      
      setSubjectCount(count || 0);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg font-bold text-foreground leading-tight">
                  EduGuide
                </span>
                <span className="text-xs text-secondary font-semibold -mt-1">Zimbabwe</span>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  2
                </span>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/profile">
                  <User className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            {getGreeting()}, {getUserName()}! 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Here's your personalized academic guidance dashboard
          </p>
        </div>

        {/* Profile Completeness */}
        <Card className="mb-8 border-secondary/30 bg-gradient-to-r from-secondary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-secondary" />
                <span className="font-semibold text-foreground">Profile Completeness</span>
              </div>
              <span className="text-secondary font-bold">{profileCompleteness}%</span>
            </div>
            <Progress value={profileCompleteness} className="h-2 mb-3" />
            <p className="text-sm text-muted-foreground">
              {profileCompleteness < 100 
                ? "Complete your profile to get better recommendations" 
                : "Great job! Your profile is complete"}
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link to="/my-subjects">
            <Card className="group hover:shadow-lg transition-all cursor-pointer border-primary/20 hover:border-primary/40">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">My Subjects</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {subjectCount > 0 ? `${subjectCount} subjects added` : "Add your subjects"}
                </p>
                <div className="flex items-center text-primary text-sm font-medium">
                  {subjectCount > 0 ? "View & Edit" : "Get Started"}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/recommendations">
            <Card className="group hover:shadow-lg transition-all cursor-pointer border-accent/20 hover:border-accent/40">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Recommendations</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Programs matched to you
                </p>
                <div className="flex items-center text-accent text-sm font-medium">
                  View Matches
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/universities">
            <Card className="group hover:shadow-lg transition-all cursor-pointer border-secondary/20 hover:border-secondary/40">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Universities</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Explore institutions
                </p>
                <div className="flex items-center text-secondary text-sm font-medium">
                  Browse All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/career-guidance">
            <Card className="group hover:shadow-lg transition-all cursor-pointer border-destructive/20 hover:border-destructive/40">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">AI Career Guidance</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Get personalized advice
                </p>
                <div className="flex items-center text-destructive text-sm font-medium">
                  Get Recommendations
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Getting Started Section */}
        {subjectCount === 0 && (
          <Card className="bg-hero-gradient text-primary-foreground">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-10 h-10 text-secondary" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-display text-2xl font-bold mb-2">Start Your Journey</h3>
                  <p className="text-primary-foreground/80 mb-4">
                    Add your O-Level or A-Level subjects to get personalized university and career recommendations
                  </p>
                  <Button variant="hero" size="lg" asChild>
                    <Link to="/my-subjects">
                      Add Your Subjects
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity / Tips */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Tips</CardTitle>
              <CardDescription>Make the most of EduGuide</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Add your subjects</h4>
                  <p className="text-sm text-muted-foreground">Include your grades for better recommendations</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Explore programs</h4>
                  <p className="text-sm text-muted-foreground">See which programs match your subjects</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Research careers</h4>
                  <p className="text-sm text-muted-foreground">Learn about career paths and requirements</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Featured Universities</CardTitle>
              <CardDescription>Top institutions in Zimbabwe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {["University of Zimbabwe", "National University of Science & Technology", "Midlands State University"].map((uni, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{uni}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              ))}
              <Button variant="outline" className="w-full mt-2" asChild>
                <Link to="/universities">View All Universities</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
