import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Briefcase, 
  GraduationCap, 
  Loader2, 
  Sparkles,
  TrendingUp,
  MapPin,
  DollarSign,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface StudentSubject {
  id: string;
  subject_id: string;
  grade: string | null;
  level: string;
  subjects: {
    name: string;
    category: string | null;
  };
}

const CareerGuidancePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [suggestedCareers, setSuggestedCareers] = useState<any[]>([]);

  useEffect(() => {
    checkAuthAndFetchSubjects();
  }, []);

  const checkAuthAndFetchSubjects = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("student_subjects")
        .select(`
          id,
          subject_id,
          grade,
          level,
          subjects (
            name,
            category
          )
        `)
        .eq("user_id", session.user.id);

      if (error) throw error;
      setStudentSubjects(data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast.error("Failed to load your subjects");
    } finally {
      setLoading(false);
    }
  };

  const generateGuidance = async () => {
    if (studentSubjects.length === 0) {
      toast.error("Please add your subjects first");
      return;
    }

    setGenerating(true);
    try {
      const subjects = studentSubjects.map(s => ({
        name: s.subjects.name,
        level: s.level,
        category: s.subjects.category
      }));
      const grades = studentSubjects.map(s => s.grade);

      const response = await supabase.functions.invoke("career-guidance", {
        body: { subjects, grades }
      });

      if (response.error) throw response.error;

      setGuidance(response.data.guidance);
      setSuggestedCareers(response.data.careers || []);
      toast.success("Career guidance generated!");
    } catch (error) {
      console.error("Error generating guidance:", error);
      toast.error("Failed to generate career guidance. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            <Button variant="ghost" size="icon" asChild className="mr-4">
              <Link to="/dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold text-foreground">AI Career Guidance</h1>
                <p className="text-xs text-muted-foreground">Personalized recommendations</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Your Subjects Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Your Subject Profile
            </CardTitle>
            <CardDescription>
              Based on {studentSubjects.length} subjects you've added
            </CardDescription>
          </CardHeader>
          <CardContent>
            {studentSubjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  You haven't added any subjects yet. Add your subjects to get personalized career guidance.
                </p>
                <Button asChild>
                  <Link to="/my-subjects">Add Your Subjects</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-6">
                  {studentSubjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                    >
                      {subject.subjects.name} ({subject.level})
                      {subject.grade && ` - ${subject.grade}`}
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={generateGuidance} 
                  disabled={generating}
                  className="w-full sm:w-auto"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Guidance...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Get AI Career Recommendations
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* AI Guidance Result */}
        {guidance && (
          <Card className="mb-8 border-primary/30">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Your Personalized Career Guidance
              </CardTitle>
              <CardDescription>
                AI-generated recommendations based on your subjects and grades
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{guidance}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggested Careers from Database */}
        {suggestedCareers.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">
              Explore Related Careers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedCareers.map((career) => (
                <Card key={career.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{career.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {career.description || "Explore this career path"}
                        </p>
                        {career.field && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <MapPin className="w-3 h-3" />
                            {career.field}
                          </div>
                        )}
                        {career.salary_range && (
                          <div className="flex items-center gap-1 text-xs text-secondary font-medium">
                            <DollarSign className="w-3 h-3" />
                            {career.salary_range}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <Link to="/universities" className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-8 h-8 text-secondary" />
                  <div>
                    <h3 className="font-semibold text-foreground">Explore Universities</h3>
                    <p className="text-sm text-muted-foreground">Find programs that match your goals</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <Link to="/careers" className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-accent" />
                  <div>
                    <h3 className="font-semibold text-foreground">Browse All Careers</h3>
                    <p className="text-sm text-muted-foreground">Discover career opportunities</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CareerGuidancePage;
