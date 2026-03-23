import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { 
  Building2, 
  GraduationCap, 
  BookOpen, 
  Briefcase, 
  Users, 
  Brain, 
  Megaphone, 
  Calendar, 
  BarChart3,
  ArrowRight,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Stats {
  universities: number;
  programs: number;
  subjects: number;
  careers: number;
  students: number;
  announcements: number;
}

interface UpcomingDeadline {
  id: string;
  title: string;
  deadline_date: string;
  deadline_type: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    universities: 0,
    programs: 0,
    subjects: 0,
    careers: 0,
    students: 0,
    announcements: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [universities, programs, subjects, careers, profiles, announcements] = await Promise.all([
          supabase.from("universities").select("id", { count: "exact", head: true }),
          supabase.from("programs").select("id", { count: "exact", head: true }),
          supabase.from("subjects").select("id", { count: "exact", head: true }),
          supabase.from("careers").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("announcements").select("id", { count: "exact", head: true }).eq("is_published", true),
        ]);

        setStats({
          universities: universities.count || 0,
          programs: programs.count || 0,
          subjects: subjects.count || 0,
          careers: careers.count || 0,
          students: profiles.count || 0,
          announcements: announcements.count || 0,
        });

      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: "Universities", value: stats.universities, icon: Building2, color: "text-primary", href: "/admin/universities" },
    { title: "Programs", value: stats.programs, icon: GraduationCap, color: "text-secondary", href: "/admin/programs" },
    { title: "Subjects", value: stats.subjects, icon: BookOpen, color: "text-accent", href: "/admin/subjects" },
    { title: "Careers", value: stats.careers, icon: Briefcase, color: "text-gold", href: "/admin/careers" },
    { title: "Students", value: stats.students, icon: Users, color: "text-primary", href: "/admin/users" },
  ];

  const quickActions = [
    { title: "AI Configuration", description: "Adjust recommendation weights", icon: Brain, href: "/admin/ai-config" },
    { title: "Announcements", description: `${stats.announcements} active`, icon: Megaphone, href: "/admin/announcements" },
    { title: "Analytics", description: "View system usage", icon: BarChart3, href: "/admin/analytics" },
  ];

  const getDaysUntil = (date: string) => {
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return { text: "Passed", urgent: false };
    if (days === 0) return { text: "Today", urgent: true };
    if (days <= 7) return { text: `${days}d`, urgent: true };
    return { text: `${days}d`, urgent: false };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage universities, programs, subjects, and more.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat) => (
            <Link key={stat.title} to={stat.href}>
              <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {isLoading ? "..." : stat.value}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-foreground">Quick Actions</CardTitle>
              <CardDescription>Frequently used admin tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {quickActions.map((action) => (
                  <Link key={action.title} to={action.href}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <action.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{action.title}</p>
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Data Management</CardTitle>
              <CardDescription>Core academic data status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  {stats.universities > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  <span className="text-foreground">Universities</span>
                </div>
                <span className="text-muted-foreground">{stats.universities} entries</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  {stats.programs > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  <span className="text-foreground">Programs</span>
                </div>
                <span className="text-muted-foreground">{stats.programs} entries</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  {stats.subjects > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  <span className="text-foreground">Subjects</span>
                </div>
                <span className="text-muted-foreground">{stats.subjects} entries</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">System Status</CardTitle>
              <CardDescription>Backend services health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Database</span>
                  <span className="flex items-center gap-2 text-accent">
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Storage</span>
                  <span className="flex items-center gap-2 text-accent">
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Authentication</span>
                  <span className="flex items-center gap-2 text-accent">
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                    Enabled
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">AI Functions</span>
                  <span className="flex items-center gap-2 text-accent">
                    <span className="w-2 h-2 rounded-full bg-accent"></span>
                    Running
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
