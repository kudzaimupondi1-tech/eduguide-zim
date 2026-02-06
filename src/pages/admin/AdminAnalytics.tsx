import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, BookOpen, GraduationCap, TrendingUp, Calendar, Activity } from "lucide-react";

interface AnalyticsData {
  totalStudents: number;
  totalSubjectsSelected: number;
  oLevelStudents: number;
  aLevelStudents: number;
  subjectsByCategory: { name: string; count: number }[];
  recentActivity: { date: string; signups: number }[];
  topSubjects: { name: string; count: number }[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--destructive))", "#8884d8"];

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData>({
    totalStudents: 0,
    totalSubjectsSelected: 0,
    oLevelStudents: 0,
    aLevelStudents: 0,
    subjectsByCategory: [],
    recentActivity: [],
    topSubjects: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Total students
      const { count: totalStudents } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Total subjects selected
      const { count: totalSubjectsSelected } = await supabase
        .from("student_subjects")
        .select("*", { count: "exact", head: true });

      // O-Level vs A-Level breakdown
      const { data: levelData } = await supabase
        .from("student_subjects")
        .select("level");

      const oLevelStudents = levelData?.filter(s => s.level === "O-Level").length || 0;
      const aLevelStudents = levelData?.filter(s => s.level === "A-Level").length || 0;

      // Subjects by category
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("category");

      const categoryCount: Record<string, number> = {};
      subjectsData?.forEach(s => {
        const cat = s.category || "Other";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      const subjectsByCategory = Object.entries(categoryCount).map(([name, count]) => ({ name, count }));

      // Top subjects selected by students
      const { data: studentSubjects } = await supabase
        .from("student_subjects")
        .select("subject_id, subjects(name)");

      const subjectCount: Record<string, number> = {};
      studentSubjects?.forEach((ss: any) => {
        const name = ss.subjects?.name || "Unknown";
        subjectCount[name] = (subjectCount[name] || 0) + 1;
      });
      const topSubjects = Object.entries(subjectCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Recent activity (mock data - in production this would come from analytics_logs)
      const recentActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        recentActivity.push({
          date: date.toLocaleDateString("en-US", { weekday: "short" }),
          signups: Math.floor(Math.random() * 20) + 5,
        });
      }

      setData({
        totalStudents: totalStudents || 0,
        totalSubjectsSelected: totalSubjectsSelected || 0,
        oLevelStudents,
        aLevelStudents,
        subjectsByCategory,
        recentActivity,
        topSubjects,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { title: "Total Students", value: data.totalStudents, icon: Users, color: "text-primary" },
    { title: "Subjects Selected", value: data.totalSubjectsSelected, icon: BookOpen, color: "text-secondary" },
    { title: "O-Level Entries", value: data.oLevelStudents, icon: GraduationCap, color: "text-accent" },
    { title: "A-Level Entries", value: data.aLevelStudents, icon: TrendingUp, color: "text-destructive" },
  ];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">System usage statistics and insights</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <CardTitle>Weekly Activity</CardTitle>
              </div>
              <CardDescription>Student signups over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.recentActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="signups"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subject Categories */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-secondary" />
                <CardTitle>Subjects by Category</CardTitle>
              </div>
              <CardDescription>Distribution of available subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.subjectsByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.subjectsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Subjects */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                <CardTitle>Most Selected Subjects</CardTitle>
              </div>
              <CardDescription>Top 10 subjects chosen by students</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.topSubjects} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={150}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
