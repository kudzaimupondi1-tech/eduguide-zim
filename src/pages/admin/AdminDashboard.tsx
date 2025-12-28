import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, GraduationCap, BookOpen, Briefcase, Users } from "lucide-react";

interface Stats {
  universities: number;
  programs: number;
  subjects: number;
  careers: number;
  students: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    universities: 0,
    programs: 0,
    subjects: 0,
    careers: 0,
    students: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [universities, programs, subjects, careers, profiles] = await Promise.all([
          supabase.from("universities").select("id", { count: "exact", head: true }),
          supabase.from("programs").select("id", { count: "exact", head: true }),
          supabase.from("subjects").select("id", { count: "exact", head: true }),
          supabase.from("careers").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          universities: universities.count || 0,
          programs: programs.count || 0,
          subjects: subjects.count || 0,
          careers: careers.count || 0,
          students: profiles.count || 0,
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
    { title: "Universities", value: stats.universities, icon: Building2, color: "text-primary" },
    { title: "Programs", value: stats.programs, icon: GraduationCap, color: "text-secondary" },
    { title: "Subjects", value: stats.subjects, icon: BookOpen, color: "text-accent" },
    { title: "Careers", value: stats.careers, icon: Briefcase, color: "text-gold" },
    { title: "Students", value: stats.students, icon: Users, color: "text-success" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage universities, programs, subjects, and more.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat) => (
            <Card key={stat.title} className="bg-card border-border">
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
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">
                Use the sidebar to navigate to different management sections:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Add or update university information and logos</li>
                <li>Manage programs and their subject requirements</li>
                <li>Configure subjects for O-Level and A-Level</li>
                <li>Define career paths and requirements</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Database</span>
                  <span className="flex items-center gap-2 text-success">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Storage</span>
                  <span className="flex items-center gap-2 text-success">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Authentication</span>
                  <span className="flex items-center gap-2 text-success">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    Enabled
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
