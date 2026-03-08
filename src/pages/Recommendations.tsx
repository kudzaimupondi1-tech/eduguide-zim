import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  GraduationCap, Target, MapPin, Clock, ChevronRight, ArrowLeft, BookOpen,
  Search, Star, ExternalLink, Lightbulb, TrendingUp, X, Briefcase
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

type Program = Tables<"programs"> & {
  universities?: Tables<"universities">;
  program_subjects?: Array<{ subjects?: Tables<"subjects">; is_required?: boolean; minimum_grade?: string | null; }>;
  program_careers?: Array<{ careers?: Tables<"careers"> }>;
  program_diplomas?: Array<{ diplomas?: Tables<"diplomas">; is_required?: boolean; minimum_classification?: string | null; }>;
};
type StudentSubject = Tables<"student_subjects"> & { subjects?: Tables<"subjects">; };
type StudentDiploma = { id: string; diploma_id: string; classification: string | null; diplomas?: Tables<"diplomas">; };
type SubjectCombination = { id: string; name: string; description: string | null; subjects: string[]; career_paths: string[] | null; };

const GRADE_ORDER = ["A", "B", "C", "D", "E", "O", "F"];
const getGradeIndex = (grade: string | null): number => {
  if (!grade) return GRADE_ORDER.length;
  const idx = GRADE_ORDER.indexOf(grade.replace("*", "").toUpperCase());
  return idx === -1 ? GRADE_ORDER.length : idx;
};
const meetsGradeRequirement = (studentGrade: string | null, minGrade: string | null): boolean => {
  if (!minGrade) return true;
  if (!studentGrade) return false;
  return getGradeIndex(studentGrade) <= getGradeIndex(minGrade);
};

const MAX_STARS = 10;

const Recommendations = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);
  const [combinations, setCombinations] = useState<SubjectCombination[]>([]);
  const [studentDiplomas, setStudentDiplomas] = useState<StudentDiploma[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [selectedProgramDetail, setSelectedProgramDetail] = useState<any | null>(null);
  const [searchParams] = useSearchParams();
  const universityCountFilter = parseInt(searchParams.get("universities") || "0");
  const levelFilter = searchParams.get("level") || "";
  const uniIdsParam = searchParams.get("uni_ids") || "";
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [starCount, setStarCount] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
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
      // Track recommendation view
      supabase.from("profiles").update({ recommendation_viewed_at: new Date().toISOString() } as any).eq("user_id", userId).then();

      const [subjectsData, programsData, universitiesData, combinationsData, favouritesData, studentDiplomasData] = await Promise.all([
        supabase.from("student_subjects").select("*, subjects(*)").eq("user_id", userId),
        supabase.from("programs").select("*, universities(*), program_subjects(*, subjects(*)), program_careers(*, careers(*)), program_diplomas(*, diplomas(*))").eq("is_active", true).order("name"),
        supabase.from("universities").select("*").eq("is_active", true).order("name"),
        supabase.from("subject_combinations").select("*").eq("is_active", true).eq("level", "A-Level"),
        supabase.from("favourite_programs").select("program_id").eq("user_id", userId),
        supabase.from("student_diplomas").select("id, diploma_id, classification, diplomas(*)").eq("user_id", userId),
      ]);
      setStudentSubjects(subjectsData.data || []);
      setPrograms(programsData.data || []);
      setUniversities(universitiesData.data || []);
      const mapped = (combinationsData.data || []).map(c => ({ ...c, subjects: (c.subjects as unknown as string[]) || [] }));
      setCombinations(mapped);
      const starred = new Set((favouritesData.data || []).map((f: any) => f.program_id));
      setStarredIds(starred);
      setStarCount(starred.size);
      setStudentDiplomas((studentDiplomasData.data || []) as any);
    } catch (error) {
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const toggleStar = async (program: Program, matchScore: number) => {
    if (!user) return;
    const programId = program.id;
    if (starredIds.has(programId)) {
      await supabase.from("favourite_programs").delete().eq("user_id", user.id).eq("program_id", programId);
      setStarredIds(prev => { const n = new Set(prev); n.delete(programId); return n; });
      setStarCount(c => c - 1);
      toast.success("Removed from favourites");
    } else {
      if (starCount >= MAX_STARS) { toast.error(`You can only star up to ${MAX_STARS} programs`); return; }
      await supabase.from("favourite_programs").insert({
        user_id: user.id, program_id: programId,
        program_name: program.name,
        university_name: program.universities?.name || "",
        match_percentage: matchScore,
      } as any);
      setStarredIds(prev => new Set(prev).add(programId));
      setStarCount(c => c + 1);
      toast.success("Added to favourites");
    }
  };

  const calculateMatchScore = (program: Program) => {
    if (studentSubjects.length === 0) return { score: 0, matched: 0, total: 0, details: [] as string[], qualifies: false, hasConditions: false };

    const structured: any[] = (program as any).structured_requirements || [];
    const conditionLogic: string = (program as any).condition_logic || "AND";
    const details: string[] = [];

    // Rule 1: Programs without conditions should NOT appear
    const requiredSubjects = program.program_subjects?.filter(ps => ps.is_required) || [];
    const optionalSubjects = program.program_subjects?.filter(ps => !ps.is_required) || [];
    const hasConditions = structured.length > 0 || requiredSubjects.length > 0 || optionalSubjects.length > 0;

    if (!hasConditions) {
      return { score: 0, matched: 0, total: 0, details: ["No entry conditions set"], qualifies: false, hasConditions: false };
    }

    const countValidPasses = (level: string, minGrade: string | null) => {
      return studentSubjects.filter(ss => ss.level === level && meetsGradeRequirement(ss.grade, minGrade)).length;
    };

    if (structured.length > 0) {
      let blocksPassed = 0;
      let totalBlocks = structured.length;
      let allCompulsoryMet = true;

      for (const block of structured) {
        const qLevel = block.qualification_type || "A-Level";
        const minPasses = block.min_passes || 0;
        const minGrade = block.min_grade || null;
        const compulsorySubjects: string[] = block.compulsory_subjects || [];
        const subjectGroups: any[] = block.subject_groups || [];

        // Handle diploma/certificate blocks by checking studentDiplomas
        if (qLevel.toLowerCase().includes("diploma") || qLevel.toLowerCase().includes("certificate") || qLevel.toLowerCase().includes("mature")) {
          let diplomaBlockPassed = true;
          const CLASSIFICATION_ORDER = ["Distinction", "Merit", "Credit", "Pass"];
          const meetsClassification = (studentClass: string | null, minClass: string | null): boolean => {
            if (!minClass) return true;
            if (!studentClass) return false;
            return CLASSIFICATION_ORDER.indexOf(studentClass) <= CLASSIFICATION_ORDER.indexOf(minClass);
          };

          // Check if student has ANY diploma that matches this block's requirements
          if (studentDiplomas.length === 0) {
            diplomaBlockPassed = false;
            details.push(`✗ ${qLevel}: No diploma/certificate submitted`);
          } else {
            // Check compulsory diploma subjects if specified
            if (compulsorySubjects.length > 0) {
              for (const reqName of compulsorySubjects) {
                const match = studentDiplomas.find(sd => 
                  (sd.diplomas?.name || "").toLowerCase().includes(reqName.toLowerCase()) ||
                  reqName.toLowerCase().includes((sd.diplomas?.name || "").toLowerCase())
                );
                if (match && meetsClassification(match.classification, minGrade)) {
                  details.push(`✓ Diploma ${reqName}: ${match.classification || 'Pass'}`);
                } else {
                  diplomaBlockPassed = false;
                  details.push(`✗ Diploma ${reqName}: not met`);
                }
              }
            } else {
              // No specific diploma required, just check student has a diploma with min classification
              const anyMatch = studentDiplomas.some(sd => meetsClassification(sd.classification, minGrade));
              if (anyMatch) {
                details.push(`✓ ${qLevel}: Diploma/certificate submitted`);
              } else {
                diplomaBlockPassed = false;
                details.push(`✗ ${qLevel}: Classification not met`);
              }
            }
          }

          if (!diplomaBlockPassed) allCompulsoryMet = false;
          if (diplomaBlockPassed) blocksPassed++;
          continue;
        }

        // Standard subject-based block evaluation
        const validPasses = countValidPasses(qLevel, minGrade);
        let compulsorySatisfied = true;

        for (const subjName of compulsorySubjects) {
          const studentMatch = studentSubjects.find(ss => (ss.subjects?.name || "").toLowerCase() === subjName.toLowerCase());
          if (!studentMatch || !meetsGradeRequirement(studentMatch.grade, minGrade)) {
            compulsorySatisfied = false;
            details.push(`✗ Compulsory ${subjName}: not met`);
          } else {
            details.push(`✓ Compulsory ${subjName}: ${studentMatch.grade}`);
          }
        }
        if (!compulsorySatisfied) allCompulsoryMet = false;

        let allGroupsSatisfied = true;
        for (const group of subjectGroups) {
          const groupSubjects: string[] = group.subjects || [];
          const minRequired = group.min_required || 1;
          let groupMatched = 0;
          for (const subjName of groupSubjects) {
            const studentMatch = studentSubjects.find(ss => (ss.subjects?.name || "").toLowerCase() === subjName.toLowerCase());
            if (studentMatch && meetsGradeRequirement(studentMatch.grade, minGrade)) groupMatched++;
          }
          if (groupMatched < minRequired) allGroupsSatisfied = false;
        }

        const passesMinPasses = minPasses > 0 ? validPasses >= minPasses : true;
        if (passesMinPasses && compulsorySatisfied && allGroupsSatisfied) blocksPassed++;
      }

      const qualifies = conditionLogic === "AND" ? blocksPassed === totalBlocks : blocksPassed > 0;

      // Rule: 100% if ALL conditions met, 50% if compulsory subjects met but some optional/blocks missed
      let score;
      if (blocksPassed === totalBlocks) score = 100;
      else if (allCompulsoryMet && blocksPassed > 0) score = 50;
      else score = 0; // Does not qualify

      return { score, matched: blocksPassed, total: totalBlocks, details, qualifies: score > 0, hasConditions: true };
    }

    // Legacy logic
    if (requiredSubjects.length === 0 && optionalSubjects.length === 0) {
      return { score: 0, matched: 0, total: 0, details: [], qualifies: false, hasConditions: false };
    }

    let requiredMatched = 0, requiredFailed = 0, optionalMatched = 0;
    for (const req of requiredSubjects) {
      const sub = studentSubjects.find(ss => ss.subject_id === req.subjects?.id);
      if (!sub) { requiredFailed++; details.push(`✗ ${req.subjects?.name}: Not studied`); }
      else if (meetsGradeRequirement(sub.grade, req.minimum_grade)) { requiredMatched++; details.push(`✓ ${req.subjects?.name}: ${sub.grade}`); }
      else { requiredFailed++; details.push(`✗ ${req.subjects?.name}: ${sub.grade} < ${req.minimum_grade}`); }
    }
    for (const opt of optionalSubjects) {
      const sub = studentSubjects.find(ss => ss.subject_id === opt.subjects?.id);
      if (sub && meetsGradeRequirement(sub.grade, opt.minimum_grade)) optionalMatched++;
    }

    const qualifies = requiredFailed === 0;
    const totalItems = requiredSubjects.length + optionalSubjects.length;
    const matchedItems = requiredMatched + optionalMatched;
    let score;
    if (requiredFailed === 0 && optionalSubjects.length > 0 && optionalMatched < optionalSubjects.length) score = 50;
    else if (requiredFailed === 0) score = 100;
    else score = 0; // Does not qualify

    return { score, matched: requiredMatched + optionalMatched, total: requiredSubjects.length + optionalSubjects.length, details, qualifies, hasConditions: true };
  };

  const getSortedOLevelSubjects = () => studentSubjects.filter(ss => ss.level === "O-Level").sort((a, b) => getGradeIndex(a.grade) - getGradeIndex(b.grade));

  const calculateCombinationScore = (combination: SubjectCombination) => {
    const sorted = getSortedOLevelSubjects();
    const matched: string[] = [];
    let totalIdx = 0, bestGrade: string | null = null;

    // A mapping helper to match typical O-level names to A-level names
    const matchesSubject = (oLevelName: string, aLevelName: string) => {
      const o = oLevelName.toLowerCase();
      const a = aLevelName.toLowerCase();
      if (o === a || o.includes(a) || a.includes(o)) return true;
      // Common Zimsec mappings
      if (a.includes("math") && o.includes("math")) return true;
      if (a.includes("physics") && (o.includes("physics") || o.includes("physical science") || o.includes("science"))) return true;
      if (a.includes("chemistry") && (o.includes("chemistry") || o.includes("physical science") || o.includes("science"))) return true;
      if (a.includes("biology") && (o.includes("biology") || o.includes("science"))) return true;
      if (a.includes("business") && (o.includes("business") || o.includes("commerce") || o.includes("accounts"))) return true;
      if (a.includes("accounting") && (o.includes("account") || o.includes("commerce"))) return true;
      if (a.includes("literature") && (o.includes("literature") || o.includes("english"))) return true;
      if (a.includes("history") && o.includes("history")) return true;
      if (a.includes("geography") && o.includes("geography")) return true;
      if (a.includes("agriculture") && o.includes("agriculture")) return true;
      if (a.includes("computer") && (o.includes("computer") || o.includes("ict"))) return true;
      return false;
    };

    for (const cs of combination.subjects) {
      const m = sorted.find(ss => matchesSubject(ss.subjects?.name || "", cs));
      if (m) {
        matched.push(cs);
        const idx = getGradeIndex(m.grade);
        totalIdx += idx;
        if (!bestGrade || idx < getGradeIndex(bestGrade)) bestGrade = m.grade;
      }
    }
    const score = combination.subjects.length > 0 ? Math.round((matched.length / combination.subjects.length) * 100) : 0;
    return { score, matchedSubjects: matched, bestGrade, averageGradeIndex: matched.length > 0 ? totalIdx / matched.length : GRADE_ORDER.length };
  };

  const getRecommendedCombinations = () => {
    return combinations.map(c => ({ ...c, ...calculateCombinationScore(c) }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score !== a.score ? b.score - a.score : a.averageGradeIndex - b.averageGradeIndex);
  };

  const oLevelSubjects = studentSubjects.filter(ss => ss.level === "O-Level");
  const aLevelSubjects = studentSubjects.filter(ss => ss.level === "A-Level");
  const isOLevelStudent = levelFilter === "o-level" || (oLevelSubjects.length > 0 && aLevelSubjects.length === 0);

  const filteredPrograms = programs
    .map(p => ({ ...p, matchData: calculateMatchScore(p) }))
    .filter(p => {
      if (!p.matchData.hasConditions) return false; // Hide programs without any conditions
      return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.universities?.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => b.matchData.score - a.matchData.score);

  // Determine allowed university IDs
  const allowedUniIds = uniIdsParam && uniIdsParam !== "all" ? uniIdsParam.split(",") : [];

  const getFilteredByPayment = () => {
    let baseList = filteredPrograms;

    // Explicit university limit filter
    if (allowedUniIds.length > 0) {
      baseList = baseList.filter(p => allowedUniIds.includes(p.university_id));
    }

    if (universityCountFilter === 0 || universityCountFilter >= universities.length) return baseList;
    const uniScores = new Map<string, number>();
    baseList.forEach(p => {
      uniScores.set(p.university_id, (uniScores.get(p.university_id) || 0) + p.matchData.score);
    });
    const topUnis = Array.from(uniScores.entries()).sort((a, b) => b[1] - a[1]).slice(0, universityCountFilter).map(([id]) => id);
    return baseList.filter(p => topUnis.includes(p.university_id));
  };
  const allDisplayPrograms = getFilteredByPayment();
  const displayPrograms = allDisplayPrograms.filter(p => p.entry_type === 'normal' || !p.entry_type);

  // Classification hierarchy for diploma matching
  const CLASSIFICATION_ORDER = ["Distinction", "Merit", "Credit", "Pass"];
  const meetsClassification = (studentClass: string | null, minClass: string | null): boolean => {
    if (!minClass) return true;
    if (!studentClass) return false;
    return CLASSIFICATION_ORDER.indexOf(studentClass) <= CLASSIFICATION_ORDER.indexOf(minClass);
  };

  // Diploma programs: show if student has a matching diploma OR if they qualify by A-Level subjects
  const diplomaPrograms = programs
    .filter(p => p.entry_type && p.entry_type !== 'normal')
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.universities?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(p => {
      const matchData = calculateMatchScore(p);
      // Check if student's diplomas match any of the program's accepted diplomas
      const programDiplomas = p.program_diplomas || [];
      let diplomaMatch = false;
      let matchedDiplomaName = "";
      for (const pd of programDiplomas) {
        const studentHas = studentDiplomas.find(sd => sd.diploma_id === pd.diplomas?.id);
        if (studentHas && meetsClassification(studentHas.classification, pd.minimum_classification)) {
          diplomaMatch = true;
          matchedDiplomaName = pd.diplomas?.name || "";
          break;
        }
      }
      // Qualify if diploma matches OR A-Level subjects match
      const qualifies = diplomaMatch || matchData.qualifies;
      const score = diplomaMatch ? 100 : matchData.score;
      return { ...p, matchData: { ...matchData, qualifies, score, diplomaMatch, matchedDiplomaName } };
    })
    .filter(p => p.matchData.qualifies)
    .sort((a, b) => b.matchData.score - a.matchData.score);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button variant="ghost" size="icon" className="shrink-0" asChild><Link to="/dashboard"><ArrowLeft className="w-5 h-5" /></Link></Button>
              <div className="min-w-0">
                <h1 className="font-bold text-base sm:text-lg text-foreground truncate">Recommendations</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{isOLevelStudent ? "A-Level combinations" : "Programs matched to your grades"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap"><Star className="w-3 h-3 mr-1" />{starCount}/{MAX_STARS}</Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {studentSubjects.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-bold mb-2">Add Your Subjects First</h3>
            <Button asChild><Link to="/my-subjects">Add Subjects</Link></Button>
          </CardContent></Card>
        ) : isOLevelStudent ? (
          <div className="space-y-8">
            <Card><CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Your O-Level Subjects</CardTitle>
              <CardDescription>Possibly A Level subject combination set by admin, the student qualifies for based on their O Level results.</CardDescription>
            </CardHeader><CardContent>
                <div className="flex flex-wrap gap-2">
                  {getSortedOLevelSubjects().map(ss => (
                    <Badge key={ss.id} variant={getGradeIndex(ss.grade) <= 2 ? "default" : "secondary"}>{ss.subjects?.name}: {ss.grade}</Badge>
                  ))}
                </div>
              </CardContent></Card>

            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Lightbulb className="w-6 h-6 text-yellow-500" /> Recommended A-Level Combinations</h2>
              {getRecommendedCombinations().length === 0 ? (
                <Card><CardContent className="py-12 text-center"><Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" /><h3 className="text-xl font-bold mb-2">No Matching Combinations</h3></CardContent></Card>
              ) : (
                <div className="grid gap-6">
                  {getRecommendedCombinations().slice(0, 5).map((combo, idx) => (
                    <Card key={combo.id} className={idx === 0 ? "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/10" : ""}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {idx === 0 && <Badge className="bg-yellow-500 text-white mb-2"><Star className="w-3 h-3 mr-1" /> Best Match</Badge>}
                            <CardTitle className="text-lg">{combo.name}</CardTitle>
                            {combo.description && <CardDescription>{combo.description}</CardDescription>}
                          </div>
                          <div className="flex flex-col items-center">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${combo.score >= 80 ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{combo.score}%</div>
                            <span className="text-xs text-muted-foreground mt-1">Match</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">A-Level Subjects:</p>
                          <div className="flex flex-wrap gap-2">
                            {combo.subjects.map(s => <Badge key={s} variant={combo.matchedSubjects.includes(s) ? "default" : "outline"}>{s}{combo.matchedSubjects.includes(s) && " ✓"}</Badge>)}
                          </div>
                        </div>
                        {combo.career_paths?.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Career Paths:</p>
                            <div className="flex flex-wrap gap-2">{combo.career_paths.map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}</div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input placeholder="Search programs or universities..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-10" />
            </div>

            <p className="text-muted-foreground mb-4">Found <span className="font-semibold text-foreground">{displayPrograms.length}</span> programs • <span className="text-green-600 font-medium">{displayPrograms.filter(p => p.matchData.score === 100).length} full matches</span></p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {displayPrograms.map(program => (
                <Card key={program.id} className={`group hover:shadow-lg transition-all ${program.matchData.score === 100 ? "border-green-300 bg-green-50/50 dark:bg-green-950/10" : program.matchData.score >= 50 ? "border-yellow-200" : "opacity-75"}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {program.matchData.score === 100 && <Badge className="bg-green-600 text-white"><Star className="w-3 h-3 mr-1" /> 100% Match</Badge>}
                          {program.matchData.score >= 50 && program.matchData.score < 100 && <Badge className="bg-yellow-500 text-white">{program.matchData.score}% Match</Badge>}
                          {program.matchData.score > 0 && program.matchData.score < 50 && <Badge variant="outline" className="text-orange-600 border-orange-300">{program.matchData.score}% Match</Badge>}
                          {program.matchData.score === 0 && <Badge variant="outline" className="text-destructive border-destructive/30">0% Match</Badge>}
                          {program.degree_type && <Badge variant="outline">{program.degree_type}</Badge>}
                        </div>
                        <CardTitle className="text-lg">{program.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1"><GraduationCap className="w-4 h-4" />{program.universities?.name}</CardDescription>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${program.matchData.score === 100 ? "bg-green-100 text-green-700" : program.matchData.score >= 50 ? "bg-yellow-100 text-yellow-700" : program.matchData.score > 0 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>{program.matchData.score}%</div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStar(program, program.matchData.score)}>
                          <Star className={`w-4 h-4 ${starredIds.has(program.id) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {program.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{program.description}</p>}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      {program.universities?.location && <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{program.universities.location}</div>}
                      {program.duration_years && <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{program.duration_years} years</div>}
                    </div>
                    {program.program_careers && program.program_careers.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> Career Paths:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {program.program_careers.slice(0, 4).map((pc, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{pc.careers?.name}</Badge>
                          ))}
                          {program.program_careers.length > 4 && (
                            <Badge variant="outline" className="text-xs">+{program.program_careers.length - 4} more</Badge>
                          )}
                        </div>
                      </div>
                    )}
                    <Button size="sm" className="w-full" onClick={() => setSelectedProgramDetail(program)}>View Details <ChevronRight className="w-4 h-4 ml-2" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {displayPrograms.length === 0 && (
              <Card className="py-12"><CardContent className="text-center">
                <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-bold mb-2">No Programs Found</h3>
                <p className="text-muted-foreground">No programs match your grades or search criteria.</p>
              </CardContent></Card>
            )}

            {diplomaPrograms.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" /> Alternative Pathways
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  These programs accept diploma or alternative qualifications for entry.
                  {studentDiplomas.length > 0 && " Programs matching your diploma are highlighted."}
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {diplomaPrograms.map(program => (
                    <Card key={program.id} className={`group hover:shadow-lg transition-all border-dashed ${(program.matchData as any).diplomaMatch ? "border-green-400 dark:border-green-600 bg-green-50/30 dark:bg-green-950/10" : "border-amber-300 dark:border-amber-700"}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {(program.matchData as any).diplomaMatch && (
                                <Badge className="bg-green-600 text-white"><GraduationCap className="w-3 h-3 mr-1" /> Diploma Match</Badge>
                              )}
                              <Badge className="bg-amber-500 text-white capitalize">{program.entry_type} Entry</Badge>
                              {program.degree_type && <Badge variant="outline">{program.degree_type}</Badge>}
                            </div>
                            <CardTitle className="text-lg">{program.name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1"><GraduationCap className="w-4 h-4" />{program.universities?.name}</CardDescription>
                            {(program.matchData as any).diplomaMatch && (program.matchData as any).matchedDiplomaName && (
                              <p className="text-xs text-green-700 dark:text-green-400 mt-1">✓ Your {(program.matchData as any).matchedDiplomaName} qualifies</p>
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">{program.matchData.score}%</div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStar(program, program.matchData.score)}>
                              <Star className={`w-4 h-4 ${starredIds.has(program.id) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {program.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{program.description}</p>}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                          {program.universities?.location && <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{program.universities.location}</div>}
                          {program.duration_years && <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{program.duration_years} years</div>}
                        </div>
                        {program.program_careers && program.program_careers.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> Career Paths:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {program.program_careers.slice(0, 4).map((pc, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{pc.careers?.name}</Badge>
                              ))}
                              {program.program_careers.length > 4 && (
                                <Badge variant="outline" className="text-xs">+{program.program_careers.length - 4} more</Badge>
                              )}
                            </div>
                          </div>
                        )}
                        <Button size="sm" className="w-full" onClick={() => setSelectedProgramDetail(program)}>View Details <ChevronRight className="w-4 h-4 ml-2" /></Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8"><Button variant="outline" asChild><Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Link></Button></div>
      </main>

      <Dialog open={!!selectedProgramDetail} onOpenChange={open => { if (!open) setSelectedProgramDetail(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto mx-3 sm:mx-auto">
          {selectedProgramDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  {selectedProgramDetail.entry_type && selectedProgramDetail.entry_type !== 'normal' && (
                    <Badge className="bg-amber-500 text-white capitalize">{selectedProgramDetail.entry_type} Entry</Badge>
                  )}
                </div>
                <DialogTitle className="text-xl">{selectedProgramDetail.name}</DialogTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><GraduationCap className="w-4 h-4" />{selectedProgramDetail.universities?.name}</p>
              </DialogHeader>
              <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${selectedProgramDetail.matchData.score === 100 ? "bg-green-100 text-green-700" : selectedProgramDetail.matchData.score >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-muted text-muted-foreground"}`}>{selectedProgramDetail.matchData.score}%</div>
                  <div>
                    <p className="font-semibold text-foreground">{selectedProgramDetail.matchData.score === 100 ? "Full Match" : selectedProgramDetail.matchData.score >= 50 ? "Partial Match" : "Low Match"}</p>
                    <p className="text-sm text-muted-foreground">{selectedProgramDetail.matchData.score === 100 ? "You meet all requirements" : selectedProgramDetail.matchData.score >= 50 ? "You meet compulsory subjects but missed some optional ones" : "Some requirements not met"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedProgramDetail.universities?.location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4" /> {selectedProgramDetail.universities.location}</div>}
                  {selectedProgramDetail.duration_years && <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" /> {selectedProgramDetail.duration_years} years</div>}
                </div>
                {selectedProgramDetail.description && <div><h4 className="text-sm font-semibold mb-1">Description</h4><p className="text-sm text-muted-foreground">{selectedProgramDetail.description}</p></div>}
                {selectedProgramDetail.matchData.details.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Requirements Analysis</h4>
                    <div className="space-y-1.5 text-xs">
                      {selectedProgramDetail.matchData.details.map((d: string, i: number) => (
                        <div key={i} className={`p-2 rounded ${d.startsWith("✓") ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"}`}>{d}</div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedProgramDetail.entry_requirements && <div><h4 className="text-sm font-semibold mb-1">Entry Requirements</h4><p className="text-sm text-muted-foreground">{selectedProgramDetail.entry_requirements}</p></div>}
                {selectedProgramDetail.program_diplomas && selectedProgramDetail.program_diplomas.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><GraduationCap className="w-4 h-4" /> Accepted Diplomas</h4>
                    <div className="space-y-2">
                      {selectedProgramDetail.program_diplomas.map((pd: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{pd.diplomas?.name}</p>
                            {pd.diplomas?.institution && <p className="text-xs text-muted-foreground">{pd.diplomas.institution}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {pd.minimum_classification && <Badge variant="outline" className="text-xs">Min: {pd.minimum_classification}</Badge>}
                            <Badge variant={pd.is_required ? "default" : "secondary"} className="text-xs">{pd.is_required ? "Required" : "Optional"}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedProgramDetail.program_careers && selectedProgramDetail.program_careers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><Briefcase className="w-4 h-4" /> Career Paths</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProgramDetail.program_careers.map((pc: any, i: number) => (
                        <Badge key={i} variant="secondary">{pc.careers?.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => toggleStar(selectedProgramDetail, selectedProgramDetail.matchData.score)}>
                    <Star className={`w-4 h-4 mr-2 ${starredIds.has(selectedProgramDetail.id) ? "text-yellow-500 fill-yellow-500" : ""}`} />
                    {starredIds.has(selectedProgramDetail.id) ? "Unstar" : "Star Program"}
                  </Button>
                  <Button className="flex-1" asChild><Link to="/universities">View University <ExternalLink className="w-4 h-4 ml-2" /></Link></Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
    </PageTransition>
  );
};

export default Recommendations;
