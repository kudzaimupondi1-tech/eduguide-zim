import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap, Plus, BookOpen, ArrowLeft, Loader2, AlertCircle, CheckCircle2,
  ChevronRight, Phone, CreditCard, Building2, Trash2, Search, Shield, Sparkles, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

type Subject = Tables<"subjects">;
type StudentSubject = Tables<"student_subjects"> & { subjects?: Subject };

const grades = ["A", "B", "C", "D", "E", "O", "F"];

const A_LEVEL_PRICING = [
  { count: 1, label: "1 University Only", price: 0.50, desc: "Best for focused applicants" },
  { count: 2, label: "2 Universities Only", price: 1.50, desc: "Compare two options" },
  { count: 3, label: "3 Universities Only", price: 3.00, desc: "Wider comparison", popular: true },
  { count: 0, label: "All Universities", price: 5.00, desc: "Full nationwide analysis" },
];

type WizardStep = "level" | "add" | "confirm" | "university" | "payment" | "processing";

// Stepper component
const StepIndicator = ({ current, total, labels }: { current: number; total: number; labels: string[] }) => (
  <div className="flex items-center gap-1 w-full max-w-md mx-auto">
    {labels.map((label, i) => (
      <div key={label} className="flex items-center flex-1">
        <div className="flex flex-col items-center flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
            i < current ? "bg-primary text-primary-foreground" :
            i === current ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
            "bg-muted text-muted-foreground border border-border"
          }`}>
            {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </div>
          <span className={`text-[10px] mt-1 text-center leading-tight ${i <= current ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {label}
          </span>
        </div>
        {i < labels.length - 1 && (
          <div className={`h-0.5 flex-1 mx-1 mt-[-14px] rounded-full transition-all duration-300 ${i < current ? "bg-primary" : "bg-border"}`} />
        )}
      </div>
    ))}
  </div>
);

const MySubjects = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentLevel, setStudentLevel] = useState<"O-Level" | "A-Level" | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [step, setStep] = useState<WizardStep>("level");

  const [oLevelSubjectId, setOLevelSubjectId] = useState("");
  const [oLevelGrade, setOLevelGrade] = useState("");
  const [aLevelSubjectId, setALevelSubjectId] = useState("");
  const [aLevelGrade, setALevelGrade] = useState("");

  const [sessionSubjects, setSessionSubjects] = useState<StudentSubject[]>([]);

  const [selectedPricing, setSelectedPricing] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uniSearch, setUniSearch] = useState("");
  const [oLevelSearch, setOLevelSearch] = useState("");
  const [aLevelSearch, setALevelSearch] = useState("");

  const [universities, setUniversities] = useState<{ id: string; name: string }[]>([]);
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) navigate("/auth");
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth");
      else { setUser(session.user); fetchData(session.user.id); }
    });
    fetchUniversities();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUniversities = async () => {
    try {
      const { data, error } = await supabase.from("universities").select("id, name").eq("is_active", true).order("name");
      if (!error && data) setUniversities(data);
    } catch (err) {
      console.error("Failed to fetch universities", err);
    }
  };

  const fetchData = async (userId: string) => {
    try {
      const [subjectsRes, adminRes] = await Promise.all([
        supabase.from("subjects").select("*").eq("is_active", true).order("name"),
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      ]);
      setAvailableSubjects(subjectsRes.data || []);
      setIsAdmin(!!adminRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLevel = async (level: "O-Level" | "A-Level") => {
    if (!user) return;
    setStudentLevel(level);
    await supabase.from("student_subjects").delete().eq("user_id", user.id);
    setSessionSubjects([]);
    setStep("add");
  };

  const handleAddSubject = async (level: "O-Level" | "A-Level") => {
    const subjectId = level === "O-Level" ? oLevelSubjectId : aLevelSubjectId;
    const grade = level === "O-Level" ? oLevelGrade : aLevelGrade;

    if (!subjectId || !grade || !user) {
      toast.error("Please select both a subject and a grade");
      return;
    }

    if (sessionSubjects.some(s => s.subject_id === subjectId && s.level === level)) {
      toast.error("Subject already added at this level");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("student_subjects")
        .insert({ user_id: user.id, subject_id: subjectId, level, grade })
        .select("*, subjects(*)")
        .single();
      if (error) throw error;

      setSessionSubjects(prev => [...prev, data]);
      if (level === "O-Level") { setOLevelSubjectId(""); setOLevelGrade(""); }
      else { setALevelSubjectId(""); setALevelGrade(""); }
      toast.success(`${data.subjects?.name || "Subject"} added successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to add subject");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubject = async (subjectEntry: StudentSubject) => {
    try {
      await supabase.from("student_subjects").delete().eq("id", subjectEntry.id);
      setSessionSubjects(prev => prev.filter(s => s.id !== subjectEntry.id));
      toast.success("Subject removed");
    } catch (error: any) {
      toast.error("Failed to remove subject");
    }
  };

  const handleOLevelPayAndRecommend = async () => {
    if (!isAdmin && !phoneNumber.trim()) {
      toast.error("Please enter your EcoCash phone number");
      return;
    }
    setPaymentLoading(true);
    setStep("processing");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const response = await supabase.functions.invoke("ecocash-charge", {
        body: { phone_number: isAdmin ? "admin" : phoneNumber, amount: 1.0, university_count: 0, student_level: "O-Level" },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (result.admin_bypass || result.status === "completed" || result.status === "COMPLETED") {
        toast.success("Payment successful! Generating recommendations...");
        navigate(`/recommendations?level=o-level`);
        return;
      }
      if (result.payment_id) {
        toast.info("Please approve the payment on your phone");
        pollPaymentStatus(result.payment_id, 0, "o-level");
      }
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
      setStep("confirm");
      setPaymentLoading(false);
    }
  };

  const handleALevelPayAndRecommend = async () => {
    const pricing = A_LEVEL_PRICING.find(p => p.label === selectedPricing);
    if (!pricing) { toast.error("Please select an option"); return; }
    const limit = pricing.count;
    if (limit > 0 && selectedUniversities.length !== limit) {
      toast.error(`Please select exactly ${limit} universit${limit === 1 ? "y" : "ies"}.`);
      return;
    }
    if (!isAdmin && !phoneNumber.trim()) {
      toast.error("Please enter your EcoCash phone number");
      return;
    }
    setPaymentLoading(true);
    setStep("processing");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const response = await supabase.functions.invoke("ecocash-charge", {
        body: { phone_number: isAdmin ? "admin" : phoneNumber, amount: pricing.price, university_count: pricing.count, student_level: "A-Level" },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (result.admin_bypass || result.status === "completed" || result.status === "COMPLETED") {
        toast.success("Payment successful! Generating recommendations...");
        const uniParam = pricing.count === 0 ? "all" : selectedUniversities.join(",");
        navigate(`/recommendations?universities=${pricing.count}&level=a-level&uni_ids=${uniParam}`);
        return;
      }
      if (result.payment_id) {
        toast.info("Please approve the payment on your phone");
        const uniParam = pricing.count === 0 ? "all" : selectedUniversities.join(",");
        pollPaymentStatus(result.payment_id, pricing.count, "a-level", uniParam);
      }
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
      setStep("university");
      setPaymentLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId: string, universityCount: number, level: string, uniParam: string = "") => {
    let attempts = 0;
    const maxAttempts = 60;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data, error } = await supabase.from("payments").select("status").eq("id", paymentId).single();
        if (error) throw error;
        if (data?.status === "completed") {
          clearInterval(interval);
          toast.success("Payment confirmed! Generating recommendations...");
          try {
            let path = `/recommendations?level=${level}`;
            if (level === "a-level") path += `&universities=${universityCount}&uni_ids=${uniParam}`;
            navigate(path);
          } catch (navError) {
            toast.error("Payment successful but redirect failed. Please contact Admin.", { duration: 10000 });
            setPaymentLoading(false);
            setStep(level === "o-level" ? "confirm" : "university");
          }
        } else if (data?.status === "failed" || attempts >= maxAttempts) {
          clearInterval(interval);
          setPaymentLoading(false);
          setStep(level === "o-level" ? "confirm" : "university");
          toast.error(data?.status === "failed" ? "Payment was declined" : "Payment timed out. Contact Admin if money was deducted.", { duration: 8000 });
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPaymentLoading(false);
          toast.error("Lost connection. Check recommendations or ask Admin for help.", { duration: 8000 });
        }
      }
    }, 2000);
  };

  const addedIds = sessionSubjects.map(s => `${s.subject_id}-${s.level}`);
  const oLevelAvailable = availableSubjects.filter(s => s.level === "O-Level").filter(s => !addedIds.includes(`${s.id}-O-Level`));
  const aLevelAvailable = availableSubjects.filter(s => s.level === "A-Level").filter(s => !addedIds.includes(`${s.id}-A-Level`));
  const oLevelAdded = sessionSubjects.filter(s => s.level === "O-Level");
  const aLevelAdded = sessionSubjects.filter(s => s.level === "A-Level");

  const stepLabels = studentLevel === "O-Level"
    ? ["Subjects", "Confirm", "Payment"]
    : ["Subjects", "Confirm", "Universities", "Payment"];

  const currentStepIndex = step === "add" ? 0 : step === "confirm" ? 1 : step === "university" ? 2 : step === "processing" ? (studentLevel === "O-Level" ? 2 : 3) : 0;

  // Shared header
  const renderHeader = (title: string, subtitle: string, onBack: () => void, backDisabled?: boolean) => (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-14 gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={onBack} disabled={backDisabled}>
            <ArrowLeft className="w-[18px] h-[18px]" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">{title}</h1>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
          <Link to="/dashboard">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
          </Link>
        </div>
        {step !== "level" && (
          <div className="pb-3">
            <StepIndicator current={currentStepIndex} total={stepLabels.length} labels={stepLabels} />
          </div>
        )}
      </div>
    </header>
  );

  // Subject add form — clean inline design
  const renderSubjectForm = (level: "O-Level" | "A-Level") => {
    const subjectId = level === "O-Level" ? oLevelSubjectId : aLevelSubjectId;
    const grade = level === "O-Level" ? oLevelGrade : aLevelGrade;
    const setSubjectId = level === "O-Level" ? setOLevelSubjectId : setALevelSubjectId;
    const setGrade = level === "O-Level" ? setOLevelGrade : setALevelGrade;
    const subjectsList = level === "O-Level" ? oLevelAvailable : aLevelAvailable;
    const searchValue = level === "O-Level" ? oLevelSearch : aLevelSearch;
    const setSearchValue = level === "O-Level" ? setOLevelSearch : setALevelSearch;
    const filteredSubjects = subjectsList.filter((subject) => {
      const text = `${subject.name} ${subject.category || ""}`.toLowerCase();
      return text.includes(searchValue.toLowerCase());
    });
    const added = sessionSubjects.filter(s => s.level === level);
    const icon = level === "O-Level" ? <BookOpen className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />;

    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{level} Subjects</h3>
              <p className="text-[11px] text-muted-foreground">{added.length} subject{added.length !== 1 ? "s" : ""} added</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px]">{filteredSubjects.length} available</Badge>
        </div>

        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={`Search ${level} subjects...`}
          className="h-10"
        />

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="h-10 text-sm bg-background">
              <SelectValue placeholder="Choose a subject..." />
            </SelectTrigger>
            <SelectContent>
              {filteredSubjects.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground text-center">No subjects match your search</div>
              ) : filteredSubjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  <span>{subject.name}</span>
                  {subject.category && <span className="text-muted-foreground ml-1">· {subject.category}</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger className="h-10 text-sm bg-background">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => handleAddSubject(level)}
            disabled={!subjectId || !grade || saving}
            size="sm"
            className="h-10 px-5 shrink-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Add</>}
          </Button>
        </div>

        {added.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            {added.map((s, idx) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${idx < added.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {s.grade || "–"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.subjects?.name || "Unknown"}</p>
                  <p className="text-[11px] text-muted-foreground">{s.subjects?.category || level}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                  onClick={() => handleRemoveSubject(s)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // ════════════════════ STEP: Level Selection ════════════════════
  if (step === "level") {
    return (
      <PageTransition>
        <div className="min-h-screen bg-secondary/30">
          {renderHeader("Add Subjects", "Choose your level to begin", () => navigate("/dashboard"))}
          <main className="container mx-auto px-4 py-10 max-w-lg">
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">What's your academic level?</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                Select your current level so we can guide you to the right recommendations.
              </p>
            </div>
            <div className="space-y-4">
              {/* O-Level Card */}
              <Card
                className="border-2 border-border hover:border-primary/50 cursor-pointer transition-all duration-200 hover:shadow-lg group overflow-hidden relative"
                onClick={() => handleSelectLevel("O-Level")}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="py-8 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-1">O Level Student</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter your O-Level results and get A-Level combination recommendations
                  </p>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold">$1.00 for recommendations</Badge>
                  <Button className="mt-5 w-full h-11 rounded-xl font-semibold" size="sm">
                    Continue as O Level <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
              {/* A-Level Card */}
              <Card
                className="border-2 border-border hover:border-primary/50 cursor-pointer transition-all duration-200 hover:shadow-lg group overflow-hidden relative"
                onClick={() => handleSelectLevel("A-Level")}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="py-8 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-1">A Level Student</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter both O & A-Level results for university programme recommendations
                  </p>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold">From $0.50 per university</Badge>
                  <Button className="mt-5 w-full h-11 rounded-xl font-semibold" size="sm">
                    Continue as A Level <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  // ════════════════════ STEP: Add Subjects ════════════════════
  if (step === "add") {
    return (
      <PageTransition>
        <div className="min-h-screen bg-secondary/30">
          {renderHeader(
            studentLevel === "A-Level" ? "Add Your Subjects" : "Add O-Level Subjects",
            studentLevel === "O-Level" ? "Step 1 of 3 — Enter your results" : "Step 1 of 4 — Enter your results",
            () => setStep("level")
          )}
          <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Add your results quickly</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Search a subject, pick grade, then click Add.</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{sessionSubjects.length}</span> subject{sessionSubjects.length !== 1 ? "s" : ""} added
                  </div>
                </div>
              </CardContent>
            </Card>

            {studentLevel === "A-Level" && (
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Both levels required</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Enter your O-Level and A-Level results below for accurate university programme matching.
                  </p>
                </div>
              </div>
            )}

            {renderSubjectForm("O-Level")}

            {studentLevel === "A-Level" && (
              <>
                <div className="h-px bg-border" />
                {renderSubjectForm("A-Level")}
              </>
            )}

            <div className="sticky bottom-0 bg-card/95 backdrop-blur-md border-t border-border -mx-4 px-4 py-3 mt-6">
              <div className="flex items-center justify-between max-w-3xl mx-auto">
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{sessionSubjects.length}</span> subject{sessionSubjects.length !== 1 ? "s" : ""} added
                  {studentLevel === "A-Level" && (
                    <span className="text-[11px] ml-2">
                      ({oLevelAdded.length} O-Level, {aLevelAdded.length} A-Level)
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => setStep("confirm")}
                  disabled={sessionSubjects.length === 0}
                  className="h-10 px-6 rounded-xl font-semibold"
                >
                  Review & Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  // ════════════════════ STEP: Confirm ════════════════════
  if (step === "confirm") {
    return (
      <PageTransition>
        <div className="min-h-screen bg-secondary/30">
          {renderHeader(
            "Confirm Your Subjects",
            studentLevel === "O-Level" ? "Step 2 of 3 — Review entries" : "Step 2 of 4 — Review entries",
            () => setStep("add")
          )}
          <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Review your subjects. Once confirmed, you'll proceed to {studentLevel === "O-Level" ? "payment" : "university selection"}.
              </p>
            </div>

            {/* O-Level summary */}
            {oLevelAdded.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">O-Level Subjects</h3>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{oLevelAdded.length}</Badge>
                </div>
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  {oLevelAdded.map((s, idx) => (
                    <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${idx < oLevelAdded.length - 1 ? "border-b border-border" : ""}`}>
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {s.grade}
                      </div>
                      <span className="text-sm font-medium text-foreground">{s.subjects?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* A-Level summary */}
            {aLevelAdded.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">A-Level Subjects</h3>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{aLevelAdded.length}</Badge>
                </div>
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  {aLevelAdded.map((s, idx) => (
                    <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${idx < aLevelAdded.length - 1 ? "border-b border-border" : ""}`}>
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {s.grade}
                      </div>
                      <span className="text-sm font-medium text-foreground">{s.subjects?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action bar */}
            <div className="sticky bottom-0 bg-card/95 backdrop-blur-md border-t border-border -mx-4 px-4 py-3">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                <Button variant="outline" size="sm" onClick={() => setStep("add")} className="rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Edit
                </Button>
                {studentLevel === "O-Level" ? (
                  <div className="flex flex-col items-end gap-2.5">
                    {!isAdmin && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="EcoCash number"
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value)}
                          className="h-9 w-44 text-sm"
                        />
                      </div>
                    )}
                    <Button
                      onClick={handleOLevelPayAndRecommend}
                      disabled={(!isAdmin && !phoneNumber.trim()) || paymentLoading}
                      className="h-10 rounded-xl font-semibold px-6"
                    >
                      {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
                      {isAdmin ? "Get Recommendations (Free)" : "Pay $1.00 & Get Recommendations"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setStep("university")}
                    className="h-10 rounded-xl font-semibold px-6"
                  >
                    Select Universities <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  // ════════════════════ STEP: University Selection + Payment ════════════════════
  if (step === "university" || step === "processing") {
    const selectedPricingObj = A_LEVEL_PRICING.find(p => p.label === selectedPricing);
    const limit = selectedPricingObj?.count || 0;
    const filteredUnis = universities.filter(u => u.name.toLowerCase().includes(uniSearch.toLowerCase()));

    return (
      <PageTransition>
        <div className="min-h-screen bg-secondary/30">
          {renderHeader(
            "University Selection & Payment",
            "Step 3 of 4 — Choose universities & pay",
            () => { if (!paymentLoading) setStep("confirm"); },
            paymentLoading
          )}
          <main className="container mx-auto px-4 py-6 max-w-2xl">
            {step === "processing" ? (
              <div className="py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Processing Payment</h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Please approve the payment on your EcoCash phone. This may take a moment.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pricing cards */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">Choose Your Plan</h3>
                  <p className="text-[11px] text-muted-foreground mb-4">Select how many universities you'd like recommendations from</p>
                  <div className="grid grid-cols-2 gap-3">
                    {A_LEVEL_PRICING.map((option) => {
                      const isSelected = selectedPricing === option.label;
                      return (
                        <div
                          key={option.label}
                          className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/30 bg-card"
                          } ${option.popular ? "ring-1 ring-primary/20" : ""}`}
                          onClick={() => {
                            setSelectedPricing(option.label);
                            setSelectedUniversities([]);
                          }}
                        >
                          {option.popular && (
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                              <Badge className="bg-primary text-primary-foreground text-[9px] px-2 py-0.5">Popular</Badge>
                            </div>
                          )}
                          <div className="text-center">
                            <p className="text-2xl font-bold text-foreground mb-0.5">
                              {isAdmin ? <span className="text-primary text-lg">FREE</span> : `$${option.price.toFixed(2)}`}
                            </p>
                            <p className="text-xs font-semibold text-foreground">{option.count === 0 ? "All" : option.count} {option.count === 1 ? "University" : "Universities"}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{option.desc}</p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* University selection (when specific count chosen) */}
                {selectedPricing && limit > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Select {limit} Universit{limit === 1 ? "y" : "ies"}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          {selectedUniversities.length} of {limit} selected
                        </p>
                      </div>
                      <Badge variant={selectedUniversities.length === limit ? "default" : "secondary"} className="text-xs">
                        {selectedUniversities.length}/{limit}
                      </Badge>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search universities..."
                        value={uniSearch}
                        onChange={(e) => setUniSearch(e.target.value)}
                        className="pl-9 h-10 bg-background"
                      />
                    </div>

                    <div className="rounded-xl border border-border overflow-hidden bg-card max-h-72 overflow-y-auto">
                      {filteredUnis.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">No universities found</div>
                      ) : filteredUnis.map((uni, idx) => {
                        const isSelected = selectedUniversities.includes(uni.id);
                        const isDisabled = !isSelected && selectedUniversities.length >= limit;
                        return (
                          <div
                            key={uni.id}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${
                              idx < filteredUnis.length - 1 ? "border-b border-border" : ""
                            } ${isSelected ? "bg-primary/5" : "hover:bg-muted/40"} ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                            onClick={() => {
                              if (isDisabled) return;
                              setSelectedUniversities(prev =>
                                isSelected ? prev.filter(id => id !== uni.id) : [...prev, uni.id]
                              );
                            }}
                          >
                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input bg-background"
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{uni.name}</p>
                            </div>
                            {isSelected && <Badge variant="outline" className="text-[10px] shrink-0">Selected</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All universities message */}
                {selectedPricing && limit === 0 && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
                    <Building2 className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">All universities included</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      You'll receive recommendations across every available institution.
                    </p>
                  </div>
                )}

                {/* EcoCash payment */}
                {selectedPricing && !isAdmin && (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">EcoCash Payment</h3>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone Number</Label>
                      <Input
                        placeholder="e.g. 0771234567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="h-10 mt-1 bg-background"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                      <span className="text-xs text-muted-foreground">Total Amount</span>
                      <span className="text-lg font-bold text-foreground">USD ${selectedPricingObj?.price.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Admin badge */}
                {isAdmin && selectedPricing && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-primary" />
                    <p className="text-xs text-foreground">Admin mode — recommendations are free for testing.</p>
                  </div>
                )}

                {/* Bottom action bar */}
                <div className="sticky bottom-0 bg-card/95 backdrop-blur-md border-t border-border -mx-4 px-4 py-3">
                  <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <Button variant="outline" size="sm" onClick={() => setStep("confirm")} className="rounded-xl">
                      <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                    </Button>
                    <Button
                      onClick={handleALevelPayAndRecommend}
                      disabled={
                        !selectedPricing ||
                        (limit > 0 && selectedUniversities.length !== limit) ||
                        (!isAdmin && !phoneNumber.trim()) ||
                        paymentLoading
                      }
                      className="h-10 rounded-xl font-semibold px-6"
                    >
                      {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
                      {isAdmin ? "Get Recommendations" : `Pay $${selectedPricingObj?.price.toFixed(2) || "0.00"} & Continue`}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </PageTransition>
    );
  }

  return null;
};

export default MySubjects;
