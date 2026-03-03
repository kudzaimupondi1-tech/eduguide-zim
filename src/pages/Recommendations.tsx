import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  GraduationCap, 
  Target, 
  MapPin,
  Clock,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  Filter,
  Search,
  Star,
  ExternalLink,
  Lightbulb,
  TrendingUp,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

type Program = Tables<"programs"> & { 
  universities?: Tables<"universities">;
  program_subjects?: Array<{ 
    subjects?: Tables<"subjects">; 
    is_required?: boolean; 
    minimum_grade?: string | null;
  }>;
};

type StudentSubject = Tables<"student_subjects"> & { 
  subjects?: Tables<"subjects">;
};

type SubjectCombination = {
  id: string;
  name: string;
  description: string | null;
  subjects: string[];
  career_paths: string[] | null;
};

// Grade hierarchy for comparison (lower index = better grade)
// A > B > C > D > E > O > F
const GRADE_ORDER = ["A", "B", "C", "D", "E", "O", "F"];

const getGradeIndex = (grade: string | null): number => {
  if (!grade) return GRADE_ORDER.length;
  // Normalize grade (remove asterisk, uppercase)
  const normalizedGrade = grade.replace("*", "").toUpperCase();
  const idx = GRADE_ORDER.indexOf(normalizedGrade);
  return idx === -1 ? GRADE_ORDER.length : idx;
};

// Check if student's grade meets the minimum requirement
const meetsGradeRequirement = (studentGrade: string | null, minGrade: string | null): boolean => {
  if (!minGrade) return true; // No minimum = any grade accepted
  if (!studentGrade) return false; // No grade = doesn't meet
  return getGradeIndex(studentGrade) <= getGradeIndex(minGrade);
};

const Recommendations = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);
  const [combinations, setCombinations] = useState<SubjectCombination[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUniversityIds, setSelectedUniversityIds] = useState<string[]>([]);
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [activeTab, setActiveTab] = useState<string>("recommendations");
  const [selectedProgramDetail, setSelectedProgramDetail] = useState<(Program & { matchData: ReturnType<typeof calculateMatchScore> }) | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchData = async (userId: string) => {
    try {
      // Fetch student's subjects with grades
      const { data: subjectsData } = await supabase
        .from("student_subjects")
        .select("*, subjects(*)")
        .eq("user_id", userId);
      
      setStudentSubjects(subjectsData || []);

      // Fetch all programs with universities and required subjects
      const { data: programsData } = await supabase
        .from("programs")
        .select(`
          *,
          universities(*),
          program_subjects(*, subjects(*))
        `)
        .eq("is_active", true)
        .order("name");
      
      setPrograms(programsData || []);

      // Fetch universities for filter
      const { data: universitiesData } = await supabase
        .from("universities")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      setUniversities(universitiesData || []);

      // Fetch subject combinations for O-Level recommendations
      const { data: combinationsData } = await supabase
        .from("subject_combinations")
        .select("*")
        .eq("is_active", true)
        .eq("level", "A-Level");
      
      const mappedCombinations = (combinationsData || []).map((c) => ({
        ...c,
        subjects: (c.subjects as unknown as string[]) || [],
      }));
      setCombinations(mappedCombinations);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  // Get student's subject by name
  const getStudentSubjectGrade = (subjectName: string): string | null => {
    const match = studentSubjects.find(
      (ss) => ss.subjects?.name?.toLowerCase() === subjectName.toLowerCase()
    );
    return match?.grade || null;
  };

  // Check if student has a subject by ID and meets grade requirement
  const hasSubjectWithGrade = (subjectId: string, minGrade: string | null): boolean => {
    const studentSubject = studentSubjects.find((ss) => ss.subject_id === subjectId);
    if (!studentSubject) return false;
    return meetsGradeRequirement(studentSubject.grade, minGrade);
  };

  // Calculate match score for A-Level students
  // Enhanced logic: 100% if all met, partial if some met, 0% if mandatory missing
  const calculateMatchScore = (program: Program): { 
    score: number; 
    matched: number; 
    total: number; 
    details: string[];
    qualifies: boolean;
    matchedCount: number;
    needsManualReview: boolean;
  } => {
    // If student has no subjects, can't match
    if (studentSubjects.length === 0) {
      return { score: 0, matched: 0, total: 0, details: [], qualifies: false, matchedCount: 0, needsManualReview: false };
    }

    const entryType = (program as any).entry_type;
    const needsManualReview = entryType === "special" || entryType === "diploma";

    const structured: any[] = (program as any).structured_requirements || [];
    const conditionLogic: string = (program as any).condition_logic || "AND";

    const details: string[] = [];

    // Helper: count valid passes for a qualification level using minGrade
    const countValidPasses = (level: string, minGrade: string | null) => {
      return studentSubjects.filter((ss) => ss.level === level && meetsGradeRequirement(ss.grade, minGrade)).length;
    };

    // If structured requirements are provided, evaluate them precisely
    if (structured.length > 0) {
      let blocksPassed = 0;
      let totalBlocks = structured.length;
      let totalMatched = 0;
      let totalNeeded = 0;

      for (const block of structured) {
        const qLevel = block.qualification_type || "A-Level";
        const minPasses = block.min_passes || 0;
        const minGrade = block.min_grade || null;
        const compulsorySubjects: string[] = block.compulsory_subjects || [];
        const subjectGroups: any[] = block.subject_groups || [];

        // Count general valid passes at this level
        const validPasses = countValidPasses(qLevel, minGrade);
        const blockDetails: string[] = [];

        // Check min passes
        if (minPasses > 0) {
          blockDetails.push(`${validPasses}/${minPasses} valid ${qLevel} passes (min ${minPasses})`);
        }

        // Check compulsory subjects (ALL must be present)
        let compulsorySatisfied = true;
        if (compulsorySubjects.length > 0) {
          for (const subjName of compulsorySubjects) {
            const studentMatch = studentSubjects.find((ss) => (ss.subjects?.name || "").toLowerCase() === subjName.toLowerCase());
            if (studentMatch && meetsGradeRequirement(studentMatch.grade, minGrade)) {
              blockDetails.push(`✓ Compulsory ${subjName}: ${studentMatch.grade || "N/A"}`);
            } else {
              blockDetails.push(`✗ Compulsory ${subjName}: not met or below ${minGrade || "any"}`);
              compulsorySatisfied = false;
            }
          }
        }

        // Check subject groups with OR logic
        let allGroupsSatisfied = true;
        if (subjectGroups.length > 0) {
          for (let gIdx = 0; gIdx < subjectGroups.length; gIdx++) {
            const group = subjectGroups[gIdx];
            const groupSubjects: string[] = group.subjects || [];
            const minRequiredFromGroup = group.min_required || 1;

            let groupMatched = 0;
            const groupDetails: string[] = [];

            for (const subjName of groupSubjects) {
              const studentMatch = studentSubjects.find((ss) => (ss.subjects?.name || "").toLowerCase() === subjName.toLowerCase());
              if (studentMatch && meetsGradeRequirement(studentMatch.grade, minGrade)) {
                groupMatched++;
                groupDetails.push(`✓ ${subjName}: ${studentMatch.grade || "N/A"}`);
              } else {
                groupDetails.push(`✗ ${subjName}: not met or below ${minGrade || "any"}`);
              }
            }

            // Check if group satisfied (needs at least minRequiredFromGroup)
            const groupSatisfied = groupMatched >= minRequiredFromGroup;
            blockDetails.push(`Group ${gIdx + 1}: ${groupMatched}/${minRequiredFromGroup} required (${groupDetails.join(", ")})`);

            if (!groupSatisfied) {
              allGroupsSatisfied = false;
            }
          }
        }

        // Determine if block satisfied
        const passesMinPasses = minPasses > 0 ? validPasses >= minPasses : true;
        const blockSatisfied = passesMinPasses && compulsorySatisfied && allGroupsSatisfied;

        if (blockSatisfied) blocksPassed++;

        totalMatched += Math.min(validPasses, minPasses || validPasses);
        totalNeeded += minPasses || 0;

        details.push(`Block: ${qLevel} — ${blockDetails.join("; ")} — ${blockSatisfied ? "PASSED" : "FAILED"}`);
      }

      // Apply condition logic across blocks
      const qualifies = conditionLogic === "AND" ? blocksPassed === totalBlocks : blocksPassed > 0;

      // Score: proportion of blocks passed and passes met
      const blockScore = totalBlocks > 0 ? Math.round((blocksPassed / totalBlocks) * 100) : 0;
      const passScore = totalNeeded > 0 ? Math.round((totalMatched / totalNeeded) * 100) : blockScore;
      const score = Math.min(100, Math.round((blockScore * 0.7) + (passScore * 0.3)));

      return { score, matched: totalMatched, total: totalNeeded, details, qualifies, matchedCount: totalMatched, needsManualReview };
    }

    // Fallback: legacy per-subject program_subjects logic
    const requiredSubjects = program.program_subjects?.filter(ps => ps.is_required) || [];
    const optionalSubjects = program.program_subjects?.filter(ps => !ps.is_required) || [];

    if (requiredSubjects.length === 0 && optionalSubjects.length === 0) {
      return { score: 100, matched: 0, total: 0, details: ["No specific requirements"], qualifies: true, matchedCount: 0, needsManualReview };
    }

    let requiredMatched = 0;
    let requiredFailed = 0;
    let optionalMatched = 0;
    let studentHasSubjectCount = 0;

    // Check required subjects
    for (const req of requiredSubjects) {
      const subjectName = req.subjects?.name || "Unknown";
      const minGrade = req.minimum_grade;
      const studentSubject = studentSubjects.find((ss) => ss.subject_id === req.subjects?.id);
      
      if (!studentSubject) {
        details.push(`✗ ${subjectName}: Not studied (required)`);
        requiredFailed++;
      } else {
        studentHasSubjectCount++;
        if (meetsGradeRequirement(studentSubject.grade, minGrade)) {
          requiredMatched++;
          details.push(`✓ ${subjectName}: ${studentSubject.grade || "N/A"} (need ${minGrade || "any"})`);
        } else {
          requiredFailed++;
          details.push(`✗ ${subjectName}: ${studentSubject.grade || "N/A"} < ${minGrade} required`);
        }
      }
    }

    // Check optional subjects
    for (const opt of optionalSubjects) {
      const subjectName = opt.subjects?.name || "Unknown";
      const minGrade = opt.minimum_grade;
      const studentSubject = studentSubjects.find((ss) => ss.subject_id === opt.subjects?.id);
      
      if (studentSubject) {
        studentHasSubjectCount++;
        if (meetsGradeRequirement(studentSubject.grade, minGrade)) {
          optionalMatched++;
          details.push(`✓ ${subjectName}: ${studentSubject.grade || "N/A"} (optional, need ${minGrade || "any"})`);
        } else {
          details.push(`— ${subjectName}: ${studentSubject.grade || "N/A"} (optional, below ${minGrade})`);
        }
      }
    }

    const totalRequired = requiredSubjects.length;
    const totalOptional = optionalSubjects.length;
    const qualifies = requiredFailed === 0 && studentHasSubjectCount >= 1;

    let score = 0;
    if (totalRequired > 0) {
      const requiredWeight = 0.8;
      const optionalWeight = 0.2;
      const requiredScore = totalRequired > 0 ? (requiredMatched / totalRequired) : 1;
      const optionalScore = totalOptional > 0 ? (optionalMatched / totalOptional) : 0;
      score = Math.round((requiredScore * requiredWeight + optionalScore * optionalWeight) * 100);
    } else {
      score = totalOptional > 0 ? Math.round((optionalMatched / totalOptional) * 100) : 0;
    }

    score = Math.min(100, score);
    return { score, matched: requiredMatched + optionalMatched, total: totalRequired + totalOptional, details, qualifies, matchedCount: studentHasSubjectCount, needsManualReview };
  };

  // Get O-Level subjects sorted by grade (best first)
  const getSortedOLevelSubjects = (): StudentSubject[] => {
    const oLevelSubjects = studentSubjects.filter((ss) => ss.level === "O-Level");
    return oLevelSubjects.sort((a, b) => {
      const gradeA = getGradeIndex(a.grade);
      const gradeB = getGradeIndex(b.grade);
      return gradeA - gradeB;
    });
  };

  // Calculate combination match score for O-Level students
  const calculateCombinationScore = (combination: SubjectCombination): { 
    score: number; 
    matchedSubjects: string[]; 
    bestGrade: string | null;
    averageGradeIndex: number;
  } => {
    const sortedSubjects = getSortedOLevelSubjects();
    const matchedSubjects: string[] = [];
    let totalGradeIndex = 0;
    let bestGrade: string | null = null;

    for (const combinationSubject of combination.subjects) {
      // Find if student has a related O-Level subject
      const match = sortedSubjects.find((ss) => {
        const studentSubjectName = ss.subjects?.name?.toLowerCase() || "";
        const combSubjectLower = combinationSubject.toLowerCase();
        // Check if names match or are similar
        return studentSubjectName === combSubjectLower || 
               studentSubjectName.includes(combSubjectLower) ||
               combSubjectLower.includes(studentSubjectName);
      });

      if (match) {
        matchedSubjects.push(combinationSubject);
        const gradeIdx = getGradeIndex(match.grade);
        totalGradeIndex += gradeIdx;
        if (!bestGrade || gradeIdx < getGradeIndex(bestGrade)) {
          bestGrade = match.grade;
        }
      }
    }

    const score = combination.subjects.length > 0 
      ? Math.round((matchedSubjects.length / combination.subjects.length) * 100)
      : 0;
    
    const averageGradeIndex = matchedSubjects.length > 0 
      ? totalGradeIndex / matchedSubjects.length 
      : GRADE_ORDER.length;

    return { score, matchedSubjects, bestGrade, averageGradeIndex };
  };

  // Get recommended A-Level combinations for O-Level students
  const getRecommendedCombinations = () => {
    return combinations
      .map((combo) => {
        const scoreData = calculateCombinationScore(combo);
        return { ...combo, ...scoreData };
      })
      .filter((combo) => combo.score > 0) // Only show combinations with at least one match
      .sort((a, b) => {
        // Sort by score first, then by average grade
        if (b.score !== a.score) return b.score - a.score;
        return a.averageGradeIndex - b.averageGradeIndex;
      });
  };

  // Get programs accessible from a combination
  const getProgramsForCombination = (combinationSubjects: string[]): Program[] => {
    return programs.filter((program) => {
      if (!program.program_subjects?.length) return false;
      
      const requiredSubjects = program.program_subjects.filter((ps) => ps.is_required);
      if (requiredSubjects.length === 0) return true;

      // Check if combination covers required subjects
      let matched = 0;
      for (const req of requiredSubjects) {
        const reqName = req.subjects?.name?.toLowerCase() || "";
        if (combinationSubjects.some((cs) => 
          cs.toLowerCase() === reqName || 
          cs.toLowerCase().includes(reqName) ||
          reqName.includes(cs.toLowerCase())
        )) {
          matched++;
        }
      }

      return matched >= requiredSubjects.length * 0.5; // At least 50% match
    });
  };

  const oLevelSubjects = studentSubjects.filter((ss) => ss.level === "O-Level");
  const aLevelSubjects = studentSubjects.filter((ss) => ss.level === "A-Level");
  const isOLevelStudent = oLevelSubjects.length > 0 && aLevelSubjects.length === 0;
  const recommendedCombinations = getRecommendedCombinations();

  const filteredPrograms = programs
    .map(program => ({
      ...program,
      matchData: calculateMatchScore(program)
    }))
    .filter(program => {
      // CRITICAL: Only show programs where student qualifies
      if (!program.matchData.qualifies) return false;
      
      const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.universities?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUniversity = selectedUniversityIds.length === 0 || selectedUniversityIds.includes(program.university_id);
      return matchesSearch && matchesUniversity;
    })
    .sort((a, b) => b.matchData.score - a.matchData.score);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="font-display text-lg font-bold text-foreground">Recommendations</h1>
                <p className="text-sm text-muted-foreground">
                  {isOLevelStudent ? "A-Level combinations & pathways" : "Programs matched to your grades"}
                </p>
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

      <main className="container mx-auto px-4 py-8">
        {studentSubjects.length === 0 ? (
          <Card className="bg-hero-gradient text-primary-foreground">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-10 h-10 text-secondary" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-display text-2xl font-bold mb-2">Add Your Subjects First</h3>
                  <p className="text-primary-foreground/80 mb-4">
                    To get personalized recommendations, please add your O-Level or A-Level subjects with grades.
                  </p>
                  <Button variant="hero" size="lg" asChild>
                    <Link to="/my-subjects">
                      Add Your Subjects
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isOLevelStudent ? (
          // O-Level Student View - Show A-Level Combination Recommendations
          <div className="space-y-8">
            {/* Your Subjects Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Your O-Level Subjects
                </CardTitle>
                <CardDescription>
                  Based on your subjects and grades, here are your best A-Level options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {getSortedOLevelSubjects().map((ss) => (
                    <Badge 
                      key={ss.id} 
                      variant={getGradeIndex(ss.grade) <= 2 ? "default" : "secondary"}
                      className="text-sm"
                    >
                      {ss.subjects?.name}: {ss.grade || "N/A"}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommended Combinations */}
            <div>
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-accent" />
                Recommended A-Level Combinations
              </h2>
              <p className="text-muted-foreground mb-6">
                These combinations are recommended based on your O-Level performance. The best matches are shown first.
              </p>

              {recommendedCombinations.length === 0 ? (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-display text-xl font-bold text-foreground mb-2">
                      No Matching Combinations Found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Add more O-Level subjects with grades to see recommendations
                    </p>
                    <Button variant="outline" asChild>
                      <Link to="/my-subjects">Add More Subjects</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {recommendedCombinations.slice(0, 5).map((combo, idx) => {
                    const accessiblePrograms = getProgramsForCombination(combo.subjects);
                    
                    return (
                      <Card 
                        key={combo.id}
                        className={`${idx === 0 ? 'border-accent bg-accent/5' : ''}`}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {idx === 0 && (
                                  <Badge className="bg-accent text-accent-foreground">
                                    <Star className="w-3 h-3 mr-1" />
                                    Best Match
                                  </Badge>
                                )}
                                {combo.bestGrade && (
                                  <Badge variant="outline">
                                    Best Grade: {combo.bestGrade}
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-lg">{combo.name}</CardTitle>
                              {combo.description && (
                                <CardDescription className="mt-1">{combo.description}</CardDescription>
                              )}
                            </div>
                            <div className="flex flex-col items-center">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${
                                combo.score >= 80 
                                  ? 'bg-accent text-accent-foreground' 
                                  : combo.score >= 50 
                                    ? 'bg-secondary text-secondary-foreground' 
                                    : 'bg-muted text-muted-foreground'
                              }`}>
                                {combo.score}%
                              </div>
                              <span className="text-xs text-muted-foreground mt-1">Match</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Subjects */}
                          <div>
                            <p className="text-sm font-medium mb-2">A-Level Subjects:</p>
                            <div className="flex flex-wrap gap-2">
                              {combo.subjects.map((subject) => (
                                <Badge 
                                  key={subject}
                                  variant={combo.matchedSubjects.includes(subject) ? "default" : "outline"}
                                >
                                  {subject}
                                  {combo.matchedSubjects.includes(subject) && " ✓"}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Career Paths */}
                          {combo.career_paths && combo.career_paths.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" />
                                Career Paths:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {combo.career_paths.map((career) => (
                                  <Badge key={career} variant="secondary" className="text-xs">
                                    {career}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Accessible Programs */}
                          {accessiblePrograms.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                <GraduationCap className="w-4 h-4" />
                                University Programs You Can Access ({accessiblePrograms.length}):
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {accessiblePrograms.slice(0, 5).map((program) => (
                                  <Badge key={program.id} variant="outline" className="text-xs">
                                    {program.name}
                                  </Badge>
                                ))}
                                {accessiblePrograms.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{accessiblePrograms.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          // A-Level Student View - Show Program Recommendations
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList>
                <TabsTrigger value="recommendations">Program Recommendations</TabsTrigger>
                <TabsTrigger value="all">All Programs</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search programs or universities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-full md:w-80">
                <p className="text-xs text-muted-foreground mb-1">Select universities (click to toggle):</p>
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/30 max-h-32 overflow-y-auto">
                  <Badge
                    variant={selectedUniversityIds.length === 0 ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedUniversityIds([])}
                  >
                    All
                  </Badge>
                  {universities.map((uni) => (
                    <Badge
                      key={uni.id}
                      variant={selectedUniversityIds.includes(uni.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        setSelectedUniversityIds((prev) =>
                          prev.includes(uni.id)
                            ? prev.filter((id) => id !== uni.id)
                            : [...prev, uni.id]
                        );
                      }}
                    >
                      {uni.short_name || uni.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="mb-4">
              <p className="text-muted-foreground">
                Found <span className="font-semibold text-foreground">{filteredPrograms.length}</span> programs
                {activeTab === "recommendations" && " matching your grades"}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredPrograms
                .filter((p) => activeTab === "all" || p.matchData.score > 0)
                .map((program) => (
                <Card 
                  key={program.id} 
                  className={`group hover:shadow-lg transition-all ${
                    program.matchData.score >= 80 
                      ? 'border-accent/50 bg-accent/5' 
                      : program.matchData.score >= 50 
                        ? 'border-secondary/30' 
                        : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {program.matchData.needsManualReview && (
                            <Badge variant="outline" className="border-secondary text-secondary">
                              Manual Review Required
                            </Badge>
                          )}
                          {program.matchData.score === 100 && (
                            <Badge className="bg-accent text-accent-foreground">
                              <Star className="w-3 h-3 mr-1" />
                              Perfect Match
                            </Badge>
                          )}
                          {program.matchData.score >= 80 && program.matchData.score < 100 && (
                            <Badge className="bg-accent text-accent-foreground">
                              <Star className="w-3 h-3 mr-1" />
                              Great Match
                            </Badge>
                          )}
                          {program.degree_type && (
                            <Badge variant="outline">{program.degree_type}</Badge>
                          )}
                          {(program as any).entry_type && (program as any).entry_type !== "normal" && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {(program as any).entry_type} entry
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{program.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <GraduationCap className="w-4 h-4" />
                          {program.universities?.name}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${
                          program.matchData.score >= 80 
                            ? 'bg-accent text-accent-foreground' 
                            : program.matchData.score >= 50 
                              ? 'bg-secondary text-secondary-foreground' 
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {program.matchData.score}%
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">Match</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {program.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {program.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      {program.universities?.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {program.universities.location}
                        </div>
                      )}
                      {program.duration_years && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {program.duration_years} years
                        </div>
                      )}
                      {program.faculty && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {program.faculty}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link to={`/universities`}>
                          View University
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => setSelectedProgramDetail(program)}>
                        Learn More
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredPrograms.filter((p) => activeTab === "all" || p.matchData.score > 0).length === 0 && (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">
                    No Programs Found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === "recommendations" 
                      ? "No programs match your current grades. Try viewing all programs or updating your grades."
                      : "Try adjusting your search or filters"}
                  </p>
                  <div className="flex gap-2 justify-center">
                    {activeTab === "recommendations" && (
                      <Button variant="outline" onClick={() => setActiveTab("all")}>
                        View All Programs
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedUniversityIds([]); }}>
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </main>

      {/* Program Detail Dialog */}
      <Dialog open={!!selectedProgramDetail} onOpenChange={(open) => { if (!open) setSelectedProgramDetail(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedProgramDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProgramDetail.name}</DialogTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <GraduationCap className="w-4 h-4" />
                  {selectedProgramDetail.universities?.name}
                </p>
              </DialogHeader>
              <div className="space-y-5">
                {/* Match Score */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${
                    selectedProgramDetail.matchData.score >= 80 
                      ? 'bg-accent text-accent-foreground' 
                      : selectedProgramDetail.matchData.score >= 50 
                        ? 'bg-secondary text-secondary-foreground' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {selectedProgramDetail.matchData.score}%
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Match Score</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProgramDetail.matchData.score >= 80 ? "Great match for your qualifications" : 
                       selectedProgramDetail.matchData.score >= 50 ? "Partial match" : "Low match"}
                    </p>
                  </div>
                </div>

                {/* Program Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedProgramDetail.universities?.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" /> {selectedProgramDetail.universities.location}
                    </div>
                  )}
                  {selectedProgramDetail.duration_years && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" /> {selectedProgramDetail.duration_years} years
                    </div>
                  )}
                  {selectedProgramDetail.faculty && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="w-4 h-4" /> {selectedProgramDetail.faculty}
                    </div>
                  )}
                  {selectedProgramDetail.degree_type && (
                    <Badge variant="outline" className="w-fit">{selectedProgramDetail.degree_type}</Badge>
                  )}
                </div>

                {selectedProgramDetail.description && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedProgramDetail.description}</p>
                  </div>
                )}

                {/* Requirements Met */}
                {selectedProgramDetail.matchData.details.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Requirements Analysis ({selectedProgramDetail.matchData.matched}/{selectedProgramDetail.matchData.total} met)</h4>
                    <div className="space-y-1.5 text-xs">
                      {selectedProgramDetail.matchData.details.map((detail, idx) => (
                        <div key={idx} className={`p-2 rounded ${detail.startsWith("✓") ? "bg-accent/10 text-accent" : detail.startsWith("✗") ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProgramDetail.entry_requirements && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Entry Requirements</h4>
                    <p className="text-sm text-muted-foreground">{selectedProgramDetail.entry_requirements}</p>
                  </div>
                )}

                <Button className="w-full" asChild>
                  <Link to="/universities">
                    View University <ExternalLink className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recommendations;
