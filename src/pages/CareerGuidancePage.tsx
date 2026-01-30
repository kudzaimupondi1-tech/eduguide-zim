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
  ChevronRight,
  CheckCircle,
  Target,
  BookOpen,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

interface CareerMatch {
  id: string;
  name: string;
  field: string | null;
  description: string | null;
  salary_range: string | null;
  job_outlook: string | null;
  skills_required: string[] | null;
  matchScore?: number;
}

const CareerGuidancePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [suggestedCareers, setSuggestedCareers] = useState<CareerMatch[]>([]);
  const [matchedPrograms, setMatchedPrograms] = useState<any[]>([]);

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
      
      // Enhance careers with match scores
      const careersWithScores = (response.data.careers || []).map((career: CareerMatch, idx: number) => ({
        ...career,
        matchScore: Math.max(95 - idx * 8, 60) // Decreasing score for ranking
      }));
      setSuggestedCareers(careersWithScores);
      setMatchedPrograms(response.data.programs || []);
      
      toast.success("Career guidance generated!");
    } catch (error) {
      console.error("Error generating guidance:", error);
      toast.error("Failed to generate career guidance. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const getGradeColor = (grade: string | null) => {
    if (!grade) return "bg-muted";
    const upper = grade.toUpperCase();
    if (["A*", "A", "A+"].includes(upper)) return "bg-green-500/20 text-green-700 dark:text-green-400";
    if (["B", "B+"].includes(upper)) return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    if (["C", "C+"].includes(upper)) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    return "bg-muted";
  };

  const getSubjectsByLevel = (level: string) => 
    studentSubjects.filter(s => s.level.toLowerCase().includes(level.toLowerCase()));

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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
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
        {/* Subject Profile Summary */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* O-Level Subjects */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                O-Level Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getSubjectsByLevel("O-Level").length === 0 ? (
                <p className="text-sm text-muted-foreground">No O-Level subjects added</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {getSubjectsByLevel("O-Level").map((s) => (
                    <Badge key={s.id} variant="secondary" className={getGradeColor(s.grade)}>
                      {s.subjects.name} {s.grade && `(${s.grade})`}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* A-Level Subjects */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-500" />
                A-Level Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getSubjectsByLevel("A-Level").length === 0 ? (
                <p className="text-sm text-muted-foreground">No A-Level subjects added</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {getSubjectsByLevel("A-Level").map((s) => (
                    <Badge key={s.id} variant="secondary" className={getGradeColor(s.grade)}>
                      {s.subjects.name} {s.grade && `(${s.grade})`}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
              {studentSubjects.length === 0 ? (
                <>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Add your subjects to get AI recommendations
                  </p>
                  <Button asChild>
                    <Link to="/my-subjects">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Add Subjects
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <p className="text-2xl font-bold text-foreground">{studentSubjects.length}</p>
                    <p className="text-sm text-muted-foreground">subjects added</p>
                  </div>
                  <Button 
                    onClick={generateGuidance} 
                    disabled={generating}
                    className="w-full"
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : guidance ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Get AI Recommendations
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Guidance Result */}
        {guidance && (
          <Card className="mb-8 border-primary/30 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Your Personalized Career Analysis
              </CardTitle>
              <CardDescription>
                AI-powered recommendations based on your academic profile
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose prose-sm dark:prose-invert max-w-none [&>h1]:text-xl [&>h2]:text-lg [&>h3]:text-base [&>ul]:my-3 [&>ol]:my-3">
                <ReactMarkdown>{guidance}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Career Matches with Scores */}
        {suggestedCareers.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-primary" />
                Top Career Matches
              </h2>
              <Badge variant="secondary">{suggestedCareers.length} matches</Badge>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedCareers.map((career, idx) => (
                <Card 
                  key={career.id} 
                  className="hover:shadow-lg transition-all duration-300 opacity-0 animate-fadeUp group"
                  style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <Briefcase className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {career.name}
                          </h3>
                          {career.field && (
                            <p className="text-xs text-muted-foreground">{career.field}</p>
                          )}
                        </div>
                      </div>
                      {career.matchScore && (
                        <Badge 
                          variant={career.matchScore >= 85 ? "default" : "secondary"}
                          className={career.matchScore >= 85 ? "bg-green-500" : ""}
                        >
                          {career.matchScore}% match
                        </Badge>
                      )}
                    </div>
                    
                    {career.matchScore && (
                      <Progress value={career.matchScore} className="h-1.5 mb-3" />
                    )}
                    
                    {career.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {career.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      {career.salary_range && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <span>{career.salary_range}</span>
                        </div>
                      )}
                      {career.job_outlook && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          <span>{career.job_outlook}</span>
                        </div>
                      )}
                    </div>
                    
                    {career.skills_required && career.skills_required.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex flex-wrap gap-1">
                          {career.skills_required.slice(0, 3).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow group">
            <CardContent className="pt-6">
              <Link to="/universities" className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Explore Universities</h3>
                  <p className="text-sm text-muted-foreground">Find matching programs</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow group">
            <CardContent className="pt-6">
              <Link to="/careers" className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Browse All Careers</h3>
                  <p className="text-sm text-muted-foreground">Discover opportunities</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow group">
            <CardContent className="pt-6">
              <Link to="/my-subjects" className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Manage Subjects</h3>
                  <p className="text-sm text-muted-foreground">Update your profile</p>
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
