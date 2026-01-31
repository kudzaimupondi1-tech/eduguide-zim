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
  RefreshCw,
  University,
  ListChecks,
  ArrowRight,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface ProgramMatch {
  id: string;
  name: string;
  description: string | null;
  degree_type: string | null;
  faculty: string | null;
  duration_years: number | null;
  entry_requirements: string | null;
  matchPercentage: number;
  universities: {
    name: string;
    short_name: string | null;
    location: string | null;
  };
}

interface SubjectCombination {
  id: string;
  subjects: string[];
  path: string;
  careers: string[];
  aLevelSubjects: any[];
}

const CareerGuidancePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [suggestedCareers, setSuggestedCareers] = useState<CareerMatch[]>([]);
  const [matchedPrograms, setMatchedPrograms] = useState<ProgramMatch[]>([]);
  const [combinations, setCombinations] = useState<SubjectCombination[]>([]);
  const [studentLevel, setStudentLevel] = useState<'O-Level' | 'A-Level'>('O-Level');
  const [interests, setInterests] = useState<string>('');

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
      
      // Determine student level based on subjects
      const hasALevel = data?.some(s => s.level.toLowerCase().includes('a-level'));
      setStudentLevel(hasALevel ? 'A-Level' : 'O-Level');
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
        body: { subjects, grades, studentLevel, interests }
      });

      if (response.error) throw response.error;

      setGuidance(response.data.guidance);
      setStudentLevel(response.data.studentLevel || studentLevel);
      
      // Enhance careers with match scores
      const careersWithScores = (response.data.careers || []).map((career: CareerMatch, idx: number) => ({
        ...career,
        matchScore: Math.max(95 - idx * 8, 60)
      }));
      setSuggestedCareers(careersWithScores);
      setMatchedPrograms(response.data.programs || []);
      setCombinations(response.data.combinations || []);
      
      toast.success("Guidance generated!");
    } catch (error) {
      console.error("Error generating guidance:", error);
      toast.error("Failed to generate guidance. Please try again.");
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

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-blue-500";
    if (percentage >= 40) return "bg-yellow-500";
    return "bg-muted";
  };

  const getSubjectsByLevel = (level: string) => 
    studentSubjects.filter(s => s.level.toLowerCase().includes(level.toLowerCase()));

  // Group programs by university
  const programsByUniversity = matchedPrograms.reduce((acc, program) => {
    const uniName = program.universities?.name || 'Other';
    if (!acc[uniName]) {
      acc[uniName] = {
        university: program.universities,
        programs: []
      };
    }
    acc[uniName].programs.push(program);
    return acc;
  }, {} as Record<string, { university: any; programs: ProgramMatch[] }>);

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
                <p className="text-xs text-muted-foreground">
                  {studentLevel === 'O-Level' ? 'Get A-Level subject combinations' : 'Find matching universities & programs'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="ml-auto">
              {studentLevel} Student
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Level Indicator Banner */}
        <div className={`mb-6 p-4 rounded-xl ${studentLevel === 'O-Level' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-purple-500/10 border border-purple-500/20'}`}>
          <div className="flex items-center gap-3">
            {studentLevel === 'O-Level' ? (
              <>
                <BookOpen className="w-6 h-6 text-blue-500" />
                <div>
                  <h2 className="font-semibold text-foreground">O-Level Student Mode</h2>
                  <p className="text-sm text-muted-foreground">
                    Based on your O-Level results, we'll recommend the best A-Level subject combinations for your interests and career goals.
                  </p>
                </div>
              </>
            ) : (
              <>
                <GraduationCap className="w-6 h-6 text-purple-500" />
                <div>
                  <h2 className="font-semibold text-foreground">A-Level Student Mode</h2>
                  <p className="text-sm text-muted-foreground">
                    Based on your A-Level results, we'll show you ALL universities and programs you qualify for across Zimbabwe.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

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
                        {studentLevel === 'O-Level' ? 'Get A-Level Combinations' : 'Find Universities'}
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {guidance && (
          <Tabs defaultValue="guidance" className="mb-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="guidance">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Analysis
              </TabsTrigger>
              {studentLevel === 'O-Level' ? (
                <TabsTrigger value="combinations">
                  <ListChecks className="w-4 h-4 mr-2" />
                  A-Level Combinations
                </TabsTrigger>
              ) : (
                <TabsTrigger value="universities">
                  <University className="w-4 h-4 mr-2" />
                  Universities & Programs
                </TabsTrigger>
              )}
              <TabsTrigger value="careers">
                <Briefcase className="w-4 h-4 mr-2" />
                Careers
              </TabsTrigger>
            </TabsList>

            {/* AI Guidance Tab */}
            <TabsContent value="guidance">
              <Card className="border-primary/30 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Your Personalized {studentLevel === 'O-Level' ? 'A-Level Pathway' : 'University Match'} Analysis
                  </CardTitle>
                  <CardDescription>
                    {studentLevel === 'O-Level' 
                      ? 'AI-recommended A-Level subject combinations based on your O-Level performance'
                      : 'Complete university and program matching based on your A-Level results'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>h1]:text-xl [&>h2]:text-lg [&>h3]:text-base [&>ul]:my-3 [&>ol]:my-3">
                    <ReactMarkdown>{guidance}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* A-Level Combinations Tab (for O-Level students) */}
            {studentLevel === 'O-Level' && (
              <TabsContent value="combinations">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-primary" />
                      Recommended A-Level Combinations
                    </h2>
                    <Badge variant="secondary">3 subjects each</Badge>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {combinations.map((combo, idx) => (
                      <Card key={combo.id} className="hover:shadow-lg transition-all">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <Badge className={idx === 0 ? 'bg-yellow-500' : 'bg-muted'}>
                              {idx === 0 && <Star className="w-3 h-3 mr-1" />}
                              {combo.path}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Option {idx + 1}</span>
                          </div>
                          <CardTitle className="text-lg mt-2">
                            {combo.subjects.join(' + ')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">CAREER PATHS</p>
                              <div className="flex flex-wrap gap-1">
                                {combo.careers.map((career, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {career}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="w-full" asChild>
                              <Link to="/universities">
                                View Related Programs <ArrowRight className="w-3 h-3 ml-2" />
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Universities & Programs Tab (for A-Level students) */}
            {studentLevel === 'A-Level' && (
              <TabsContent value="universities">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                      <University className="w-5 h-5 text-primary" />
                      Your University Matches
                    </h2>
                    <Badge variant="secondary">{matchedPrograms.length} programs found</Badge>
                  </div>

                  {Object.entries(programsByUniversity).map(([uniName, data]) => (
                    <Card key={uniName} className="overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                              <University className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{uniName}</CardTitle>
                              {data.university?.location && (
                                <CardDescription className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {data.university.location}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <Badge>{data.programs.length} programs</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid gap-3">
                          {data.programs.map((program) => (
                            <div 
                              key={program.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-foreground">{program.name}</h4>
                                  {program.degree_type && (
                                    <Badge variant="outline" className="text-xs">{program.degree_type}</Badge>
                                  )}
                                </div>
                                {program.faculty && (
                                  <p className="text-xs text-muted-foreground">{program.faculty}</p>
                                )}
                                {program.duration_years && (
                                  <p className="text-xs text-muted-foreground">{program.duration_years} years</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm font-bold text-foreground">{program.matchPercentage}%</p>
                                  <p className="text-xs text-muted-foreground">match</p>
                                </div>
                                <Progress 
                                  value={program.matchPercentage} 
                                  className={`w-16 h-2 ${getMatchColor(program.matchPercentage)}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {matchedPrograms.length === 0 && (
                    <Card className="border-dashed">
                      <CardContent className="pt-6 text-center">
                        <University className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No program matches found yet.</p>
                        <p className="text-sm text-muted-foreground">Click "Find Universities" to get your matches.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            )}

            {/* Careers Tab */}
            <TabsContent value="careers">
              {suggestedCareers.length > 0 ? (
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
                              {career.matchScore}%
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="pt-6 text-center">
                    <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Generate guidance to see career matches.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
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
                  <p className="text-sm text-muted-foreground">Browse all institutions</p>
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
