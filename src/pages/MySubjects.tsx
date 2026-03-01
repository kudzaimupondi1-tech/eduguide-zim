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
  const [studentLevel, setStudentLevel] = useState<"O-Level" | "A-Level" | null>(null);
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
      const existing = studentSubjectsRes.data || [];
      setStudentSubjects(existing);

      // Auto-detect level if subjects already exist
      if (existing.length > 0) {
        const hasALevel = existing.some(s => s.level === "A-Level");
        setStudentLevel(hasALevel ? "A-Level" : "O-Level");
      }
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

  const renderSubjectList = (subjects: StudentSubject[], level: string) => (
    subjects.length === 0 ? (
      <div className="text-center py-10 text-muted-foreground">
        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No {level} subjects added yet</p>
        <p className="text-sm mt-1">Use the form above to add your subjects</p>
      </div>
    ) : (
      <div className="space-y-2">
        {subjects.map((studentSubject) => (
          <div key={studentSubject.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                {studentSubject.grade || "–"}
              </div>
              <div>
                <h4 className="font-medium text-sm text-foreground">{studentSubject.subjects?.name || "Unknown"}</h4>
                {studentSubject.subjects?.code && <p className="text-xs text-muted-foreground">{studentSubject.subjects.code}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={studentSubject.grade || ""} onValueChange={(grade) => handleUpdateGrade(studentSubject.id, grade)}>
                <SelectTrigger className="w-[72px] h-8 text-xs"><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (<SelectItem key={grade} value={grade}>{grade}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveSubject(studentSubject.id)}>
                <Trash2 className="w-3.5 h-3.5" />
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

  // Level selection screen
  if (studentLevel === null) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <header className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center h-14 gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                <Link to="/dashboard"><ArrowLeft className="w-[18px] h-[18px]" /></Link>
              </Button>
              <span className="font-bold text-sm text-foreground">Add Subjects</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Select Your Academic Level</h1>
            <p className="text-sm text-muted-foreground mt-2">Choose your current level to start adding subjects</p>
          </div>

          <div className="space-y-4">
            <Card
              className="border-2 border-border hover:border-primary/50 cursor-pointer transition-all hover:shadow-md"
              onClick={() => { setStudentLevel("O-Level"); setAddingLevel("O-Level"); }}
            >
              <CardContent className="py-8 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">O Level Student</h2>
                <p className="text-sm text-muted-foreground">Enter your O-Level subjects and grades</p>
                <Button className="mt-5 w-full" size="sm">Continue as O Level</Button>
              </CardContent>
            </Card>

            <Card
              className="border-2 border-border hover:border-primary/50 cursor-pointer transition-all hover:shadow-md"
              onClick={() => { setStudentLevel("A-Level"); setAddingLevel("O-Level"); }}
            >
              <CardContent className="py-8 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">A Level Student</h2>
                <p className="text-sm text-muted-foreground">Enter both O-Level and A-Level results</p>
                <Button className="mt-5 w-full" size="sm">Continue as A Level</Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setStudentLevel(null)}>
                <ArrowLeft className="w-[18px] h-[18px]" />
              </Button>
              <div>
                <h1 className="text-sm font-bold text-foreground">
                  {studentLevel === "A-Level" ? "Add O-Level & A-Level Subjects" : "Add O-Level Subjects"}
                </h1>
                <p className="text-[11px] text-muted-foreground">Manage your academic results</p>
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
        {/* Instructions */}
        {studentLevel === "A-Level" && (
          <div className="mb-5 p-3 rounded-xl bg-muted/60 border border-border flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              As an A-Level student, enter <strong>both</strong> your O-Level and A-Level results for accurate programme matching.
            </p>
          </div>
        )}

        {/* Add Subject Form */}
        <Card className="mb-6 border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {studentLevel === "A-Level" ? (
                <Select value={addingLevel} onValueChange={(v) => { setAddingLevel(v as "O-Level" | "A-Level"); setSelectedSubjectId(""); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="O-Level">O-Level</SelectItem>
                    <SelectItem value="A-Level">A-Level</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center px-3 text-sm text-muted-foreground bg-muted/50 rounded-lg border border-border">
                  O-Level
                </div>
              )}

              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  {filteredSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (<SelectItem key={grade} value={grade}>{grade}</SelectItem>))}
                </SelectContent>
              </Select>

              <Button onClick={handleAddSubject} disabled={!selectedSubjectId || saving} size="sm" className="h-9">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subject Lists */}
        {studentLevel === "A-Level" ? (
          <Tabs defaultValue="o-level" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="o-level" className="text-xs">
                O-Level ({oLevelSubjects.length})
              </TabsTrigger>
              <TabsTrigger value="a-level" className="text-xs">
                A-Level ({aLevelSubjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="o-level">
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">O-Level Subjects</CardTitle>
                    <Badge variant="outline" className="text-xs font-normal">{oLevelSubjects.length} added</Badge>
                  </div>
                </CardHeader>
                <CardContent>{renderSubjectList(oLevelSubjects, "O-Level")}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="a-level">
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">A-Level Subjects</CardTitle>
                    <Badge variant="outline" className="text-xs font-normal">{aLevelSubjects.length} added</Badge>
                  </div>
                </CardHeader>
                <CardContent>{renderSubjectList(aLevelSubjects, "A-Level")}</CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">O-Level Subjects</CardTitle>
                <Badge variant="outline" className="text-xs font-normal">{oLevelSubjects.length} added</Badge>
              </div>
            </CardHeader>
            <CardContent>{renderSubjectList(oLevelSubjects, "O-Level")}</CardContent>
          </Card>
        )}

        {/* Bottom Actions */}
        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-1.5" /> Dashboard</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/recommendations">
              Get Recommendations
              <GraduationCap className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default MySubjects;
