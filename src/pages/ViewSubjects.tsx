import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

type Subject = Tables<"subjects">;
type StudentSubject = Tables<"student_subjects"> & { subjects?: Subject };

const ViewSubjects = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) navigate("/auth");
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth");
      else { setUser(session.user); fetchSubjects(session.user.id); }
    });
    return () => subscription.unsubscribe();
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
      console.error("Error fetching subjects:", error);
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const oLevelSubjects = studentSubjects.filter(s => s.level === "O-Level");
  const aLevelSubjects = studentSubjects.filter(s => s.level === "A-Level");

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
                <p className="text-[11px] text-muted-foreground">Read-only view of your saved subjects</p>
              </div>
            </div>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {studentSubjects.length === 0 ? (
          <Card className="border border-border shadow-sm">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h2 className="text-lg font-semibold text-foreground mb-2">No subjects added yet</h2>
              <p className="text-sm text-muted-foreground mb-6">Add your subjects first to see them here.</p>
              <Button size="sm" asChild>
                <Link to="/my-subjects">Add Subjects</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {oLevelSubjects.length > 0 && (
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      O-Level Subjects
                    </CardTitle>
                    <Badge variant="outline" className="text-xs font-normal">{oLevelSubjects.length} subjects</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {oLevelSubjects.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {s.grade || "–"}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-foreground">{s.subjects?.name || "Unknown"}</h4>
                            <p className="text-xs text-muted-foreground">O-Level</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {aLevelSubjects.length > 0 && (
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      A-Level Subjects
                    </CardTitle>
                    <Badge variant="outline" className="text-xs font-normal">{aLevelSubjects.length} subjects</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {aLevelSubjects.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {s.grade || "–"}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-foreground">{s.subjects?.name || "Unknown"}</h4>
                            <p className="text-xs text-muted-foreground">A-Level</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-1.5" /> Dashboard</Link>
          </Button>
          <Button size="sm" asChild disabled={studentSubjects.length === 0}>
            <Link to={studentSubjects.length > 0 ? "/recommendations" : "#"} onClick={(e) => studentSubjects.length === 0 && e.preventDefault()}>
              Get Recommendations
              <GraduationCap className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ViewSubjects;
