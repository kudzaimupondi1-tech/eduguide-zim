import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap, Plus, BookOpen, ArrowLeft, Loader2, CheckCircle2,
  ChevronRight, Phone, CreditCard, Building2, Trash2, Search, Shield, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

/* ─── Step Indicator ─── */
const StepIndicator = ({ current, labels }: { current: number; total: number; labels: string[] }) => (
  <div className="flex items-center gap-0.5 w-full max-w-sm mx-auto px-2">
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
          <span className={`text-[9px] sm:text-[10px] mt-1 text-center leading-tight ${i <= current ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {label}
          </span>
        </div>
        {i < labels.length - 1 && (
          <div className={`h-0.5 flex-1 mx-0.5 mt-[-14px] rounded-full transition-all duration-300 ${i < current ? "bg-primary" : "bg-border"}`} />
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
    } catch (err) { console.error("Failed to fetch universities", err); }
  };

  const fetchData = async (userId: string) => {
    try {
      const [subjectsRes, adminRes] = await Promise.all([
        supabase.from("subjects").select("*").eq("is_active", true).order("name"),
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      ]);
      setAvailableSubjects(subjectsRes.data || []);
      setIsAdmin(!!adminRes.data);
    } catch (error) { console.error("Error fetching data:", error); }
    finally { setLoading(false); }
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
    if (!subjectId || !grade || !user) { toast.error("Select a subject and grade"); return; }
    if (sessionSubjects.some(s => s.subject_id === subjectId && s.level === level)) { toast.error("Already added"); return; }

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
      toast.success(`${data.subjects?.name || "Subject"} added`);
    } catch (error: any) { toast.error(error.message || "Failed to add"); }
    finally { setSaving(false); }
  };

  const handleRemoveSubject = async (subjectEntry: StudentSubject) => {
    try {
      await supabase.from("student_subjects").delete().eq("id", subjectEntry.id);
      setSessionSubjects(prev => prev.filter(s => s.id !== subjectEntry.id));
      toast.success("Removed");
    } catch { toast.error("Failed to remove"); }
  };

  // ─── Payment handlers (unchanged logic) ───
  const handleOLevelPayAndRecommend = async () => {
    if (!isAdmin && !phoneNumber.trim()) { toast.error("Enter your EcoCash number"); return; }
    setPaymentLoading(true); setStep("processing");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const response = await supabase.functions.invoke("ecocash-charge", {
        body: { phone_number: isAdmin ? "admin" : phoneNumber, amount: 1.0, university_count: 0, student_level: "O-Level" },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (result.admin_bypass || result.status === "completed" || result.status === "COMPLETED") {
        toast.success("Payment successful!"); navigate(`/recommendations?level=o-level`); return;
      }
      if (result.payment_id) { toast.info("Approve the payment on your phone"); pollPaymentStatus(result.payment_id, 0, "o-level"); }
    } catch (error: any) { toast.error(error.message || "Payment failed"); setStep("confirm"); setPaymentLoading(false); }
  };

  const handleALevelPayAndRecommend = async () => {
    const pricing = A_LEVEL_PRICING.find(p => p.label === selectedPricing);
    if (!pricing) { toast.error("Select an option"); return; }
    const limit = pricing.count;
    if (limit > 0 && selectedUniversities.length !== limit) { toast.error(`Select exactly ${limit} universit${limit === 1 ? "y" : "ies"}`); return; }
    if (!isAdmin && !phoneNumber.trim()) { toast.error("Enter your EcoCash number"); return; }
    setPaymentLoading(true); setStep("processing");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const response = await supabase.functions.invoke("ecocash-charge", {
        body: { phone_number: isAdmin ? "admin" : phoneNumber, amount: pricing.price, university_count: pricing.count, student_level: "A-Level" },
      });
      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (result.admin_bypass || result.status === "completed" || result.status === "COMPLETED") {
        toast.success("Payment successful!");
        const uniParam = pricing.count === 0 ? "all" : selectedUniversities.join(",");
        navigate(`/recommendations?universities=${pricing.count}&level=a-level&uni_ids=${uniParam}`); return;
      }
      if (result.payment_id) {
        toast.info("Approve the payment on your phone");
        const uniParam = pricing.count === 0 ? "all" : selectedUniversities.join(",");
        pollPaymentStatus(result.payment_id, pricing.count, "a-level", uniParam);
      }
    } catch (error: any) { toast.error(error.message || "Payment failed"); setStep("university"); setPaymentLoading(false); }
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
          toast.success("Payment confirmed!");
          let path = `/recommendations?level=${level}`;
          if (level === "a-level") path += `&universities=${universityCount}&uni_ids=${uniParam}`;
          navigate(path);
        } else if (data?.status === "failed" || attempts >= maxAttempts) {
          clearInterval(interval); setPaymentLoading(false);
          setStep(level === "o-level" ? "confirm" : "university");
          toast.error(data?.status === "failed" ? "Payment declined" : "Payment timed out. Contact Admin if deducted.", { duration: 8000 });
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(interval); setPaymentLoading(false);
          toast.error("Lost connection. Check recommendations or ask Admin.", { duration: 8000 });
        }
      }
    }, 2000);
  };

  // ─── Derived data ───
  const addedIds = sessionSubjects.map(s => `${s.subject_id}-${s.level}`);
  const oLevelAvailable = availableSubjects.filter(s => s.level === "O-Level" && !addedIds.includes(`${s.id}-O-Level`));
  const aLevelAvailable = availableSubjects.filter(s => s.level === "A-Level" && !addedIds.includes(`${s.id}-A-Level`));
  const oLevelAdded = sessionSubjects.filter(s => s.level === "O-Level");
  const aLevelAdded = sessionSubjects.filter(s => s.level === "A-Level");

  const stepLabels = studentLevel === "O-Level"
    ? ["Subjects", "Confirm", "Payment"]
    : ["Subjects", "Confirm", "Universities", "Payment"];
  const currentStepIndex = step === "add" ? 0 : step === "confirm" ? 1 : step === "university" ? 2 : step === "processing" ? (studentLevel === "O-Level" ? 2 : 3) : 0;

  /* ═══════════════════════════════════════════════
     SHARED: Compact header with stepper
     ═══════════════════════════════════════════════ */
  const renderHeader = (title: string, subtitle: string, onBack: () => void, backDisabled?: boolean) => (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="max-w-2xl mx-auto px-3 sm:px-4">
        <div className="flex items-center h-14 gap-2.5">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={onBack} disabled={backDisabled}>
            <ArrowLeft className="w-[18px] h-[18px]" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">{title}</h1>
            <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
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

  /* ═══════════════════════════════════════════════
     SUBJECT FORM — Clean inline add
     ═══════════════════════════════════════════════ */
  const renderSubjectForm = (level: "O-Level" | "A-Level") => {
    const subjectId = level === "O-Level" ? oLevelSubjectId : aLevelSubjectId;
    const grade = level === "O-Level" ? oLevelGrade : aLevelGrade;
    const setSubjectId = level === "O-Level" ? setOLevelSubjectId : setALevelSubjectId;
    const setGrade = level === "O-Level" ? setOLevelGrade : setALevelGrade;
    const subjectsList = level === "O-Level" ? oLevelAvailable : aLevelAvailable;
    const searchValue = level === "O-Level" ? oLevelSearch : aLevelSearch;
    const setSearchValue = level === "O-Level" ? setOLevelSearch : setALevelSearch;
    const filtered = subjectsList.filter(s => `${s.name} ${s.category || ""}`.toLowerCase().includes(searchValue.toLowerCase()));
    const added = sessionSubjects.filter(s => s.level === level);
    const icon = level === "O-Level" ? <BookOpen className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />;

    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-3 px-4 py-3.5 bg-muted/30 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground">{level} Subjects</h3>
            <p className="text-[11px] text-muted-foreground">{added.length} added</p>
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">{filtered.length} available</Badge>
        </div>

        {/* Add form */}
        <div className="p-3 sm:p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={`Search ${level} subjects...`}
              className="pl-9 h-10 text-sm"
            />
          </div>

          {/* Subject + Grade + Add — responsive row */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="h-10 text-sm bg-background flex-1 min-w-0">
                <SelectValue placeholder="Choose subject" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filtered.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">No subjects found</div>
                ) : filtered.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <span>{s.name}</span>
                    {s.category && <span className="text-muted-foreground ml-1 text-xs">· {s.category}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-10 text-sm bg-background w-20 shrink-0">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleAddSubject(level)}
                disabled={!subjectId || !grade || saving}
                size="sm"
                className="h-10 px-4 shrink-0 rounded-lg"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Add</>}
              </Button>
            </div>
          </div>
        </div>

        {/* Added subjects list */}
        {added.length > 0 && (
          <div className="border-t border-border">
            {added.map((s, idx) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30 ${idx < added.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {s.grade || "–"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.subjects?.name || "Unknown"}</p>
                  <p className="text-[10px] text-muted-foreground">{s.subjects?.category || level}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
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

  /* ═══════════════════════════════════════════════
     LOADING
     ═══════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════
     STEP 0 — Level Selection
     ═══════════════════════════════════════════════ */
  if (step === "level") {
    return (
      <PageTransition>
        <div className="min-h-screen bg-secondary/30">
          {renderHeader("Add Subjects", "Choose your level to begin", () => navigate("/dashboard"))}
          <main className="max-w-md mx-auto px-4 py-8 sm:py-12">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">What's your level?</h2>
              <p className="text-sm text-muted-foreground mt-1.5">Select your current academic level to get started.</p>
            </div>

            <div className="space-y-3">
              {[
                { level: "O-Level" as const, icon: <BookOpen className="w-6 h-6" />, title: "O Level", desc: "Get A-Level combination recommendations" },
                { level: "A-Level" as const, icon: <GraduationCap className="w-6 h-6" />, title: "A Level", desc: "Get university programme recommendations" },
              ].map(({ level, icon, title, desc }) => (
                <button
                  key={level}
                  onClick={() => handleSelectLevel(level)}
                  className="w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 border-border bg-card text-left transition-all duration-200 hover:border-primary/50 hover:shadow-md active:scale-[0.98] group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  /* ═══════════════════════════════════════════════
     STEP 1 — Add Subjects
     ═══════════════════════════════════════════════ */
  if (step === "add") {
    const totalAdded = sessionSubjects.length;
    return (
      <PageTransition>
        <div className="min-h-screen bg-secondary/30 pb-20">
          {renderHeader(
            studentLevel === "A-Level" ? "Add Your Subjects" : "Add O-Level Subjects",
            `Step 1 — Enter your results`,
            () => setStep("level")
          )}
          <main className="max-w-2xl mx-auto px-3 sm:px-4 py-5 space-y-4">
            {/* Quick tip */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Search → Select → Grade → Add</p>
                <p className="text-[11px] text-muted-foreground">
                  {studentLevel === "A-Level" ? "Add both O-Level and A-Level results below." : "Add all your O-Level results below."}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0 tabular-nums">{totalAdded} added</Badge>
            </div>

            {/* O-Level form */}
            {renderSubjectForm("O-Level")}

            {/* A-Level form */}
            {studentLevel === "A-Level" && renderSubjectForm("A-Level")}
          </main>

          {/* Sticky footer */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
            <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground tabular-nums">{totalAdded}</span> subject{totalAdded !== 1 ? "s" : ""}
                {studentLevel === "A-Level" && <span className="hidden sm:inline"> ({oLevelAdded.length} O, {aLevelAdded.length} A)</span>}
              </p>
              <Button
                onClick={() => setStep("confirm")}
                disabled={totalAdded === 0}
                className="h-10 px-5 rounded-xl font-semibold text-sm"
              >
                Review <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  /* ═══════════════════════════════════════════════
     STEP 2 — Confirm
     ═══════════════════════════════════════════════ */
  if (step === "confirm") {
    return (
      <PageTransition>
        <div className="min-h-screen bg-secondary/30 pb-20">
          {renderHeader(
            "Confirm Subjects",
            `Step 2 — Review your entries`,
            () => setStep("add")
          )}
          <main className="max-w-2xl mx-auto px-3 sm:px-4 py-5 space-y-4">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Review your subjects. Once confirmed, you'll proceed to {studentLevel === "O-Level" ? "payment" : "university selection"}.
              </p>
            </div>

            {/* O-Level list */}
            {oLevelAdded.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">O-Level</h3>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{oLevelAdded.length}</Badge>
                </div>
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  {oLevelAdded.map((s, idx) => (
                    <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 ${idx < oLevelAdded.length - 1 ? "border-b border-border" : ""}`}>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">{s.grade}</div>
                      <span className="text-sm font-medium text-foreground truncate">{s.subjects?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* A-Level list */}
            {aLevelAdded.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">A-Level</h3>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{aLevelAdded.length}</Badge>
                </div>
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  {aLevelAdded.map((s, idx) => (
                    <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 ${idx < aLevelAdded.length - 1 ? "border-b border-border" : ""}`}>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">{s.grade}</div>
                      <span className="text-sm font-medium text-foreground truncate">{s.subjects?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* Sticky footer */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
            <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("add")} className="rounded-xl order-2 sm:order-1">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Edit
              </Button>
              {studentLevel === "O-Level" ? (
                <div className="flex flex-col sm:flex-row items-stretch gap-2 order-1 sm:order-2">
                  {!isAdmin && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Input placeholder="EcoCash number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="h-9 text-sm" />
                    </div>
                  )}
                  <Button
                    onClick={handleOLevelPayAndRecommend}
                    disabled={(!isAdmin && !phoneNumber.trim()) || paymentLoading}
                    className="h-10 rounded-xl font-semibold px-5 text-sm"
                  >
                    {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
                    {isAdmin ? "Get Recommendations" : "Pay $1.00 & Continue"}
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setStep("university")} className="h-10 rounded-xl font-semibold px-5 text-sm order-1 sm:order-2">
                  Select Universities <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  /* ═══════════════════════════════════════════════
     STEP 3 — University Selection & Payment
     ═══════════════════════════════════════════════ */
  if (step === "university" || step === "processing") {
    const selectedPricingObj = A_LEVEL_PRICING.find(p => p.label === selectedPricing);
    const limit = selectedPricingObj?.count || 0;
    const filteredUnis = universities.filter(u => u.name.toLowerCase().includes(uniSearch.toLowerCase()));

    return (
      <PageTransition>
        <div className="min-h-screen bg-secondary/30 pb-20">
          {renderHeader("Universities & Payment", "Step 3 — Choose & pay", () => { if (!paymentLoading) setStep("confirm"); }, paymentLoading)}
          <main className="max-w-2xl mx-auto px-3 sm:px-4 py-5">
            {step === "processing" ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">Processing Payment</h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">Approve the payment on your EcoCash phone.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Pricing */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">Choose Your Plan</h3>
                  <p className="text-[11px] text-muted-foreground mb-3">How many universities for recommendations?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {A_LEVEL_PRICING.map(option => {
                      const isSelected = selectedPricing === option.label;
                      return (
                        <div
                          key={option.label}
                          className={`relative rounded-xl border-2 p-3.5 cursor-pointer transition-all duration-200 ${
                            isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30 bg-card"
                          } ${option.popular ? "ring-1 ring-primary/20" : ""}`}
                          onClick={() => { setSelectedPricing(option.label); setSelectedUniversities([]); }}
                        >
                          {option.popular && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                              <Badge className="bg-primary text-primary-foreground text-[9px] px-2 py-0">Popular</Badge>
                            </div>
                          )}
                          <div className="text-center">
                            <p className="text-xl font-bold text-foreground">
                              {isAdmin ? <span className="text-primary text-base">FREE</span> : `$${option.price.toFixed(2)}`}
                            </p>
                            <p className="text-xs font-semibold text-foreground mt-0.5">{option.count === 0 ? "All" : option.count} {option.count === 1 ? "Uni" : "Unis"}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{option.desc}</p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* University picker */}
                {selectedPricing && limit > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-foreground">Select {limit} Universit{limit === 1 ? "y" : "ies"}</h3>
                      <Badge variant={selectedUniversities.length === limit ? "default" : "secondary"} className="text-xs">{selectedUniversities.length}/{limit}</Badge>
                    </div>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Search..." value={uniSearch} onChange={e => setUniSearch(e.target.value)} className="pl-9 h-10 bg-background" />
                    </div>
                    <div className="rounded-xl border border-border overflow-hidden bg-card max-h-64 overflow-y-auto">
                      {filteredUnis.length === 0 ? (
                        <div className="p-5 text-center text-sm text-muted-foreground">No universities found</div>
                      ) : filteredUnis.map((uni, idx) => {
                        const isSel = selectedUniversities.includes(uni.id);
                        const isDis = !isSel && selectedUniversities.length >= limit;
                        return (
                          <div
                            key={uni.id}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                              idx < filteredUnis.length - 1 ? "border-b border-border" : ""
                            } ${isSel ? "bg-primary/5" : "hover:bg-muted/40"} ${isDis ? "opacity-40 cursor-not-allowed" : ""}`}
                            onClick={() => { if (isDis) return; setSelectedUniversities(prev => isSel ? prev.filter(id => id !== uni.id) : [...prev, uni.id]); }}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSel ? "bg-primary border-primary text-primary-foreground" : "border-input bg-background"
                            }`}>{isSel && <Check className="w-3 h-3" />}</div>
                            <p className="text-sm font-medium text-foreground truncate flex-1">{uni.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedPricing && limit === 0 && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                    <Building2 className="w-7 h-7 text-primary mx-auto mb-1.5" />
                    <p className="text-sm font-medium text-foreground">All universities included</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Recommendations across every institution.</p>
                  </div>
                )}

                {/* EcoCash */}
                {selectedPricing && !isAdmin && (
                  <Card className="border-border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">EcoCash Payment</h3>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Phone Number</Label>
                        <Input placeholder="e.g. 0771234567" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="h-10 mt-1 bg-background" />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="text-lg font-bold text-foreground tabular-nums">USD ${selectedPricingObj?.price.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isAdmin && selectedPricing && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15">
                    <Shield className="w-4 h-4 text-primary" />
                    <p className="text-xs text-foreground">Admin mode — free for testing.</p>
                  </div>
                )}
              </div>
            )}
          </main>

          {step !== "processing" && (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
              <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep("confirm")} className="rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                <Button
                  onClick={handleALevelPayAndRecommend}
                  disabled={!selectedPricing || (limit > 0 && selectedUniversities.length !== limit) || (!isAdmin && !phoneNumber.trim()) || paymentLoading}
                  className="h-10 rounded-xl font-semibold px-5 text-sm"
                >
                  {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
                  {isAdmin ? "Get Recommendations" : `Pay $${selectedPricingObj?.price.toFixed(2) || "0.00"}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageTransition>
    );
  }

  return null;
};

export default MySubjects;
