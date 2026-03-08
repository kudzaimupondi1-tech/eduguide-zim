import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap, Plus, BookOpen, ArrowLeft, Loader2, AlertCircle, CheckCircle2,
  ChevronRight, Phone, CreditCard, Building2

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
  { count: 1, label: "1 University Only", price: 0.50 },
  { count: 2, label: "2 Universities Only", price: 1.50 },
  { count: 3, label: "3 Universities Only", price: 3.00 },
  { count: 0, label: "All Universities", price: 5.00 },
];

type WizardStep = "level" | "add" | "confirm" | "university" | "payment" | "processing";

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

  // New states for A-Level university selection
  const [universities, setUniversities] = useState<{ id: string, name: string }[]>([]);
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
      toast.success("Subject added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add subject");
    } finally {
      setSaving(false);
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
    // Enforce selection exactly matches limit, unless "All" (limit = 0)
    if (limit > 0 && selectedUniversities.length !== limit) {
      toast.error(`Please select exactly ${limit} universit${limit === 1 ? 'y' : 'ies'}.`);
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
    const maxAttempts = 60; // 2 minutes
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
            console.error("Navigation failed after payment:", navError);
            toast.error("Payment successful but redirect failed. Please contact Admin with this error for a manual redirect or refund.", { duration: 10000 });
            setPaymentLoading(false);
            setStep(level === "o-level" ? "confirm" : "university");
          }
        } else if (data?.status === "failed" || attempts >= maxAttempts) {
          clearInterval(interval);
          setPaymentLoading(false);
          setStep(level === "o-level" ? "confirm" : "university");
          toast.error(data?.status === "failed" ? "Payment was declined" : "Payment timed out. If money was deducted, please show this to Admin for a refund.", { duration: 8000 });
        }
      } catch (err) {
        console.error("Error polling payment status:", err);
        // Continue polling unless we hit max attempts
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setPaymentLoading(false);
          toast.error("Lost connection to payment server. Check your recommendations page or ask Admin for a refund.", { duration: 8000 });
        }
      }
    }, 2000);
  };

  const addedIds = sessionSubjects.map(s => `${s.subject_id}-${s.level}`);
  const oLevelAvailable = availableSubjects.filter(s => s.level === "O-Level").filter(s => !addedIds.includes(`${s.id}-O-Level`));
  const aLevelAvailable = availableSubjects.filter(s => s.level === "A-Level").filter(s => !addedIds.includes(`${s.id}-A-Level`));

  const renderSubjectForm = (level: "O-Level" | "A-Level") => {
    const subjectId = level === "O-Level" ? oLevelSubjectId : aLevelSubjectId;
    const grade = level === "O-Level" ? oLevelGrade : aLevelGrade;
    const setSubjectId = level === "O-Level" ? setOLevelSubjectId : setALevelSubjectId;
    const setGrade = level === "O-Level" ? setOLevelGrade : setALevelGrade;
    const subjectsList = level === "O-Level" ? oLevelAvailable : aLevelAvailable;
    const addedAtLevel = sessionSubjects.filter(s => s.level === level);

    return (
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              {level === "O-Level" ? <BookOpen className="w-4 h-4 text-primary" /> : <GraduationCap className="w-4 h-4 text-primary" />}
              {level} Subjects
            </CardTitle>
            <Badge variant="outline" className="text-xs font-normal">{addedAtLevel.length} added</Badge>
          </div>
          <CardDescription className="text-xs">Select a subject and grade, then press Save</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={`Select ${level} Subject`} /></SelectTrigger>
              <SelectContent>
                {subjectsList.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground text-center">No more subjects available</div>
                ) : subjectsList.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}{subject.category && <span className="text-muted-foreground"> ({subject.category})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Grade" /></SelectTrigger>
              <SelectContent>{grades.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}</SelectContent>
            </Select>
            <Button onClick={() => handleAddSubject(level)} disabled={!subjectId || !grade || saving} size="sm" className="h-9">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Save
            </Button>
          </div>
          {addedAtLevel.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Added:
              </p>
              {addedAtLevel.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <div className="w-7 h-7 rounded-md bg-card border border-border flex items-center justify-center text-xs font-bold">{s.grade || "–"}</div>
                  <span className="text-sm font-medium text-foreground">{s.subjects?.name || "Unknown"}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">{s.level}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // STEP: Level Selection
  if (step === "level") {
    return (
      <PageTransition>
      <div className="min-h-screen bg-secondary/30">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center h-16 gap-3">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" asChild>
                <Link to="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
              </Button>
              <div>
                <span className="font-bold text-foreground">Add Subjects</span>
                <span className="text-xs text-muted-foreground block">Choose your level to begin</span>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-10 max-w-lg">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">What's your academic level?</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">Select your current level so we can guide you to the right recommendations.</p>
          </div>
          <div className="space-y-4">
            <Card className="border-2 border-border hover:border-primary/50 cursor-pointer transition-all duration-200 hover:shadow-lg group overflow-hidden relative" onClick={() => handleSelectLevel("O-Level")}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="py-8 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">O Level Student</h2>
                <p className="text-sm text-muted-foreground mb-3">Enter your O-Level results and get A-Level combination recommendations</p>
                <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold">$1.00 for recommendations</Badge>
                <Button className="mt-5 w-full h-11 rounded-xl font-semibold" size="sm">
                  Continue as O Level <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
            <Card className="border-2 border-border hover:border-primary/50 cursor-pointer transition-all duration-200 hover:shadow-lg group overflow-hidden relative" onClick={() => handleSelectLevel("A-Level")}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="py-8 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">A Level Student</h2>
                <p className="text-sm text-muted-foreground mb-3">Enter both O & A-Level results for university programme recommendations</p>
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

  // STEP: Add Subjects
  if (step === "add") {
    return (
      <PageTransition>
      <div className="min-h-screen bg-secondary/30">
        <header className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setStep("level")}>
                  <ArrowLeft className="w-[18px] h-[18px]" />
                </Button>
                <div>
                  <h1 className="text-sm font-bold text-foreground">
                    {studentLevel === "A-Level" ? "Add O-Level & A-Level Subjects" : "Add O-Level Subjects"}
                  </h1>
                  <p className="text-[11px] text-muted-foreground">
                    {studentLevel === "O-Level" ? "Step 1 of 3" : "Step 1 of 4"} — Add your academic results
                  </p>
                </div>
              </div>
              <Link to="/dashboard">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <GraduationCap className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              </Link>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          {studentLevel === "A-Level" ? (
            <div className="space-y-6">
              <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  As an A-Level student, enter <strong>both</strong> your O-Level and A-Level results below.
                </p>
              </div>
              {renderSubjectForm("O-Level")}
              {renderSubjectForm("A-Level")}
            </div>
          ) : (
            renderSubjectForm("O-Level")
          )}
          <div className="flex justify-between items-center mt-6">
            <Button variant="outline" size="sm" onClick={() => setStep("level")}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button
              size="sm"
              onClick={() => setStep("confirm")}
              disabled={sessionSubjects.length === 0}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold px-6"
            >
              Continue <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </main>
      </div>
      </PageTransition>
    );
  }

  // STEP: Confirmation
  if (step === "confirm") {
    const oLevel = sessionSubjects.filter(s => s.level === "O-Level");
    const aLevel = sessionSubjects.filter(s => s.level === "A-Level");

    return (
      <div className="min-h-screen bg-secondary/30">
        <header className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setStep("add")}>
                  <ArrowLeft className="w-[18px] h-[18px]" />
                </Button>
                <div>
                  <h1 className="text-sm font-bold text-foreground">Confirm Your Subjects</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {studentLevel === "O-Level" ? "Step 2 of 3" : "Step 2 of 4"} — Verify your entries
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-start gap-2.5 mb-6">
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Please review your subjects below. Once confirmed, you'll proceed to {studentLevel === "O-Level" ? "payment" : "select universities"}.
            </p>
          </div>

          <div className="space-y-6">
            {oLevel.length > 0 && (
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> O-Level Subjects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {oLevel.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">{s.grade}</div>
                          <span className="font-medium text-sm text-foreground">{s.subjects?.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">O-Level</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {aLevel.length > 0 && (
              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" /> A-Level Subjects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {aLevel.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">{s.grade}</div>
                          <span className="font-medium text-sm text-foreground">{s.subjects?.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">A-Level</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-between items-center mt-6">
            <Button variant="outline" size="sm" onClick={() => setStep("add")}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Edit Subjects
            </Button>
            {studentLevel === "O-Level" ? (
              // O-Level: go directly to payment ($1)
              <div className="flex flex-col items-end gap-2">
                {!isAdmin && (
                  <div className="flex items-center gap-2">
                    <Input placeholder="EcoCash number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="h-9 w-44 text-sm" />
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={handleOLevelPayAndRecommend}
                  disabled={(!isAdmin && !phoneNumber.trim()) || paymentLoading}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold px-6"
                >
                  {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
                  {isAdmin ? "Get Recommendations (Free)" : "Pay $1.00 & Get Recommendations"}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => setStep("university")}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold px-6"
              >
                Proceed to University Selection <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  }

  // STEP: University Selection + Payment (A-Level only)
  if (step === "university" || step === "processing") {
    return (
      <div className="min-h-screen bg-secondary/30">
        <header className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => !paymentLoading && setStep("confirm")} disabled={paymentLoading}>
                  <ArrowLeft className="w-[18px] h-[18px]" />
                </Button>
                <div>
                  <h1 className="text-sm font-bold text-foreground">University Selection & Payment</h1>
                  <p className="text-[11px] text-muted-foreground">Step 3 of 4 — Select universities & pay</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          {step === "processing" ? (
            <Card className="border border-border shadow-sm">
              <CardContent className="py-16 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <h2 className="text-lg font-bold text-foreground mb-2">Processing Payment</h2>
                <p className="text-sm text-muted-foreground">Please approve the payment on your EcoCash phone...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Info Box */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <h3 className="text-sm font-semibold text-foreground mb-1">How it works</h3>
                <p className="text-xs text-muted-foreground">Choose how many universities you want recommendations from. You'll only see programs from your selected number of universities.</p>
              </div>

              <Card className="border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> How many universities?
                  </CardTitle>
                  <CardDescription className="text-xs">Select the number of universities for recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={selectedPricing} onValueChange={(val) => {
                    setSelectedPricing(val);
                    setSelectedUniversities([]); // Reset selections when pricing changes
                  }} className="space-y-3">
                    {A_LEVEL_PRICING.map((option) => (
                      <div key={option.label} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPricing === option.label ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`} onClick={() => {
                          setSelectedPricing(option.label);
                          setSelectedUniversities([]);
                        }}>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={option.label} id={option.label} />
                          <Label htmlFor={option.label} className="text-sm font-medium cursor-pointer">{option.label}</Label>
                        </div>
                        <span className="font-bold text-foreground">
                          {isAdmin ? <span className="text-green-600">FREE</span> : `USD $${option.price.toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              {selectedPricing && (
                <Card className="border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" /> Select Universities
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {A_LEVEL_PRICING.find(p => p.label === selectedPricing)?.count === 0
                        ? "All universities will be included in your recommendations."
                        : `Please select exactly ${A_LEVEL_PRICING.find(p => p.label === selectedPricing)?.count} from the list below.`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {A_LEVEL_PRICING.find(p => p.label === selectedPricing)?.count === 0 ? (
                      <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg text-center border border-border">
                        All universities automatically selected! You will receive recommendations across all available institutions.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {universities.map(uni => {
                          const limit = A_LEVEL_PRICING.find(p => p.label === selectedPricing)?.count || 0;
                          const isSelected = selectedUniversities.includes(uni.id);
                          const isDisabled = !isSelected && selectedUniversities.length >= limit;

                          return (
                            <div key={uni.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}`} onClick={() => {
                              if (isDisabled) return;
                              setSelectedUniversities(prev =>
                                isSelected ? prev.filter(id => id !== uni.id) : [...prev, uni.id]
                              );
                            }}>
                              <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background'}`}>
                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </div>
                              <span className="text-sm font-medium">{uni.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!isAdmin && selectedPricing && (
                <Card className="border border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> EcoCash Payment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">EcoCash Phone Number</Label>
                      <Input placeholder="e.g. 0771234567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-10" />
                    </div>
                    <div className="p-3 rounded-lg bg-muted/60 border border-border">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-bold text-foreground">USD ${A_LEVEL_PRICING.find(p => p.label === selectedPricing)?.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isAdmin && selectedPricing && (
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <p className="text-xs text-green-700 dark:text-green-300">As an admin, you can test recommendations for free.</p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => setStep("confirm")}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleALevelPayAndRecommend}
                  disabled={!selectedPricing || (!isAdmin && !phoneNumber.trim()) || paymentLoading}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold px-6"
                >
                  {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
                  {isAdmin ? "Get Recommendations" : "Pay & Get Recommendations"}
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
};

export default MySubjects;
