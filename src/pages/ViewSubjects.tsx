import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Subject = Tables<"subjects">;
type StudentSubject = Tables<"student_subjects"> & { subjects?: Subject };

const ViewSubjects = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth");
      else fetchSubjects(session.user.id);
    });
  }, [navigate]);

  const fetchSubjects = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("student_subjects")
        .select("*, subjects(*)")
        .eq("user_id", userId)
        .order("level");
      if (error) throw error;
      setStudentSubjects(data || []);
    } catch (error) {
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const oLevel = studentSubjects.filter(s => s.level === "O-Level");
  const aLevel = studentSubjects.filter(s => s.level === "A-Level");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                <Link to="/dashboard"><ArrowLeft className="w-[18px] h-[18px]" /></Link>
              </Button>
              <div>
                <h1 className="text-sm font-bold text-foreground">My Subjects</h1>
                <p className="text-[11px] text-muted-foreground">Subjects used in your latest recommendation</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {studentSubjects.length === 0 ? (
          <Card className="border border-border shadow-sm">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h2 className="text-lg font-semibold text-foreground mb-2">No subjects yet</h2>
              <p className="text-sm text-muted-foreground mb-6">Add subjects and get recommendations to see them here.</p>
              <Button size="sm" asChild>
                <Link to="/my-subjects">Add Subjects</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {oLevel.length > 0 && (
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" /> O-Level Subjects
                    </CardTitle>
                    <Badge variant="outline" className="text-xs font-normal">{oLevel.length} subjects</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {oLevel.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">{s.grade || "–"}</div>
                          <h4 className="font-medium text-sm text-foreground">{s.subjects?.name || "Unknown"}</h4>
                        </div>
                        <Badge variant="outline" className="text-xs">O-Level</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {aLevel.length > 0 && (
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary" /> A-Level Subjects
                    </CardTitle>
                    <Badge variant="outline" className="text-xs font-normal">{aLevel.length} subjects</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {aLevel.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">{s.grade || "–"}</div>
                          <h4 className="font-medium text-sm text-foreground">{s.subjects?.name || "Unknown"}</h4>
                        </div>
                        <Badge variant="outline" className="text-xs">A-Level</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="mt-6">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ViewSubjects;
