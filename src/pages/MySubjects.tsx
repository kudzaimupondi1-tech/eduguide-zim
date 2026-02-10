import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  GraduationCap, Plus, Trash2, BookOpen, ArrowLeft, Loader2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

type Subject = Tables<"subjects">;
type StudentSubject = Tables<"student_subjects"> & { subjects?: Subject };

const grades = ["A", "B", "C", "D", "E", "O", "F"];

const MySubjects = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentLevel, setStudentLevel] = useState<"O-Level" | "A-Level">("O-Level");
  const [addingLevel, setAddingLevel] = useState<"O-Level" | "A-Level">("O-Level");
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) navigate("/auth");
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth");
      else { setUser(session.user); fetchData(session.user.id); }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchData = async (userId: string) => {
    try {
      const [subjectsRes, studentSubjectsRes] = await Promise.all([
        supabase.from("subjects").select("*").eq("is_active", true).order("name"),
        supabase.from("student_subjects").select("*, subjects(*)").eq("user_id", userId),
      ]);
      setAvailableSubjects(subjectsRes.data || []);
      setStudentSubjects(studentSubjectsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!selectedSubjectId || !user) return;
    if (studentSubjects.some(s => s.subject_id === selectedSubjectId && s.level === addingLevel)) {
      toast.error("Subject already added at this level");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("student_subjects")
        .insert({ user_id: user.id, subject_id: selectedSubjectId, level: addingLevel, grade: selectedGrade || null })
        .select("*, subjects(*)")
        .single();
      if (error) throw error;
      setStudentSubjects([...studentSubjects, data]);
      setSelectedSubjectId("");
      setSelectedGrade("");
      toast.success("Subject added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add subject");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubject = async (id: string) => {
    try {
      const { error } = await supabase.from("student_subjects").delete().eq("id", id);
      if (error) throw error;
      setStudentSubjects(studentSubjects.filter(s => s.id !== id));
      toast.success("Subject removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove subject");
    }
  };

  const handleUpdateGrade = async (id: string, grade: string) => {
    try {
      const { error } = await supabase.from("student_subjects").update({ grade }).eq("id", id);
      if (error) throw error;
      setStudentSubjects(studentSubjects.map(s => s.id === id ? { ...s, grade } : s));
    } catch (error: any) {
      toast.error(error.message || "Failed to update grade");
    }
  };

  const filteredSubjects = availableSubjects.filter(s => s.level === addingLevel);
  const oLevelSubjects = studentSubjects.filter(s => s.level === "O-Level");
  const aLevelSubjects = studentSubjects.filter(s => s.level === "A-Level");

  const renderSubjectList = (subjects: StudentSubject[], level: string, icon: React.ReactNode, color: string) => (
    subjects.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground">
        {icon}
        <p className="mt-3">No {level} subjects added yet</p>
        <p className="text-sm">Add your subjects above to get started</p>
      </div>
    ) : (
      <div className="space-y-3">
        {subjects.map((studentSubject) => (
          <div key={studentSubject.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                {icon}
              </div>
              <div>
                <h4 className="font-medium text-foreground">{studentSubject.subjects?.name || "Unknown Subject"}</h4>
                {studentSubject.subjects?.code && <p className="text-sm text-muted-foreground">{studentSubject.subjects.code}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={studentSubject.grade || ""} onValueChange={(grade) => handleUpdateGrade(studentSubject.id, grade)}>
                <SelectTrigger className="w-20"><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (<SelectItem key={grade} value={grade}>{grade}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => handleRemoveSubject(studentSubject.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
              </Button>
              <div>
                <h1 className="font-display text-lg font-bold text-foreground">My Subjects</h1>
                <p className="text-sm text-muted-foreground">Manage your academic subjects</p>
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Student Level Selection */}
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your Academic Level</CardTitle>
            <CardDescription>Select your current level. A-Level students must enter both O-Level and A-Level results.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                variant={studentLevel === "O-Level" ? "default" : "outline"}
                onClick={() => setStudentLevel("O-Level")}
                className="flex-1"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                O-Level Student
              </Button>
              <Button
                variant={studentLevel === "A-Level" ? "default" : "outline"}
                onClick={() => setStudentLevel("A-Level")}
                className="flex-1"
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                A-Level Student
              </Button>
            </div>
            {studentLevel === "A-Level" && (
              <div className="mt-3 p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  As an A-Level student, you need to enter <strong>both</strong> your O-Level and A-Level results for accurate programme matching, since university entry requirements consider both.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Subject Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add Subject</CardTitle>
            <CardDescription>Select the level and add subjects with grades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={addingLevel} onValueChange={(v) => { setAddingLevel(v as "O-Level" | "A-Level"); setSelectedSubjectId(""); }}>
                <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="O-Level">O-Level</SelectItem>
                  {studentLevel === "A-Level" && <SelectItem value="A-Level">A-Level</SelectItem>}
                </SelectContent>
              </Select>

              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  {filteredSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (<SelectItem key={grade} value={grade}>{grade}</SelectItem>))}
                </SelectContent>
              </Select>

              <Button onClick={handleAddSubject} disabled={!selectedSubjectId || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subject Lists */}
        {studentLevel === "A-Level" ? (
          <Tabs defaultValue="o-level" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="o-level">
                O-Level Results ({oLevelSubjects.length})
              </TabsTrigger>
              <TabsTrigger value="a-level">
                A-Level Results ({aLevelSubjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="o-level">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" /> O-Level Subjects
                      </CardTitle>
                      <CardDescription>Your O-Level results (required for entry requirements)</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary">{oLevelSubjects.length} / 8 recommended</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderSubjectList(oLevelSubjects, "O-Level",
                    <BookOpen className="w-5 h-5 text-primary" />, "bg-primary/10")}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="a-level">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-accent" /> A-Level Subjects
                      </CardTitle>
                      <CardDescription>Your A-Level results for programme matching</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-accent border-accent">{aLevelSubjects.length} / 3 recommended</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderSubjectList(aLevelSubjects, "A-Level",
                    <GraduationCap className="w-5 h-5 text-accent" />, "bg-accent/10")}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          /* O-Level Student - Only show O-Level subjects */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" /> O-Level Subjects
                  </CardTitle>
                  <CardDescription>{oLevelSubjects.length} subjects added</CardDescription>
                </div>
                <Badge variant="outline" className="text-primary border-primary">{oLevelSubjects.length} / 8 recommended</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {renderSubjectList(oLevelSubjects, "O-Level",
                <BookOpen className="w-5 h-5 text-primary" />, "bg-primary/10")}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8">
          <Button variant="outline" asChild>
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Link>
          </Button>
          <Button asChild>
            <Link to="/recommendations">
              View Recommendations
              <GraduationCap className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default MySubjects;
