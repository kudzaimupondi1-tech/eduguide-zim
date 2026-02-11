import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2, BookOpen, Upload, Download, FileSpreadsheet, ImagePlus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useExcelImportExport, ExcelColumn } from "@/hooks/useExcelImportExport";

interface University {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  level: string;
}

interface Program {
  id: string;
  name: string;
  university_id: string;
  faculty: string | null;
  degree_type: string | null;
  description: string | null;
  entry_requirements: string | null;
  duration_years: number | null;
  is_active: boolean | null;
  universities?: { name: string };
}

interface ProgramSubject {
  subject_id: string;
  is_required: boolean;
  minimum_grade: string | null;
}

const GRADES = ["A", "B", "C", "D", "E", "O", "F"];

const programColumns: ExcelColumn[] = [
  { key: "name", header: "Program Name", required: true },
  { key: "university_name", header: "University Name", required: true },
  { key: "faculty", header: "Faculty" },
  { key: "degree_type", header: "Degree Type" },
  { key: "description", header: "Description" },
  { key: "entry_requirements", header: "Entry Requirements" },
  { key: "duration_years", header: "Duration (Years)" },
  { key: "subject_requirements", header: "Subject Requirements (e.g., Mathematics:B, Physics:C)" },
];

export default function AdminPrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubjectsDialogOpen, setIsSubjectsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [programSubjects, setProgramSubjects] = useState<ProgramSubject[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { exportToExcel, importFromExcel, downloadTemplate, isImporting, isExporting } = useExcelImportExport();

  const [formData, setFormData] = useState({
    name: "",
    university_id: "",
    faculty: "",
    degree_type: "",
    description: "",
    entry_requirements: "",
    duration_years: 4,
    is_active: true,
    entry_type: "normal",
    condition_logic: "AND",
    structured_requirements: [] as Array<{
      qualification_type: string;
      min_passes: number;
      required_subjects: string[];
      min_grade: string;
    }>,
  });

  const fetchData = async () => {
    try {
      const [programsRes, universitiesRes, subjectsRes] = await Promise.all([
        supabase.from("programs").select("*, universities(name)").order("name"),
        supabase.from("universities").select("id, name").eq("is_active", true).order("name"),
        supabase.from("subjects").select("id, name, level").eq("is_active", true).order("name"),
      ]);

      if (programsRes.error) throw programsRes.error;
      if (universitiesRes.error) throw universitiesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      setPrograms(programsRes.data || []);
      setUniversities(universitiesRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingProgram) {
        const { error } = await supabase
          .from("programs")
          .update({
            name: formData.name,
            university_id: formData.university_id,
            faculty: formData.faculty || null,
            degree_type: formData.degree_type || null,
            description: formData.description || null,
            entry_requirements: formData.entry_requirements || null,
            duration_years: formData.duration_years,
            is_active: formData.is_active,
            entry_type: formData.entry_type,
            condition_logic: formData.condition_logic,
            structured_requirements: formData.structured_requirements,
          })
          .eq("id", editingProgram.id);
        if (error) throw error;
        toast({ title: "Success", description: "Program updated successfully" });
      } else {
        const { error } = await supabase.from("programs").insert({
          name: formData.name,
          university_id: formData.university_id,
          faculty: formData.faculty || null,
          degree_type: formData.degree_type || null,
          description: formData.description || null,
          entry_requirements: formData.entry_requirements || null,
          duration_years: formData.duration_years,
          is_active: formData.is_active,
          entry_type: formData.entry_type,
          condition_logic: formData.condition_logic,
          structured_requirements: formData.structured_requirements,
        });
        if (error) throw error;
        toast({ title: "Success", description: "Program added successfully" });
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving program:", error);
      toast({ title: "Error", description: "Failed to save program", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this program?")) return;
    try {
      await supabase.from("program_subjects").delete().eq("program_id", id);
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Program deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting program:", error);
      toast({ title: "Error", description: "Failed to delete program", variant: "destructive" });
    }
  };

  const openEditDialog = (program: Program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      university_id: program.university_id,
      faculty: program.faculty || "",
      degree_type: program.degree_type || "",
      description: program.description || "",
      entry_requirements: program.entry_requirements || "",
      duration_years: program.duration_years || 4,
      is_active: program.is_active ?? true,
      entry_type: (program as any).entry_type || "normal",
      condition_logic: (program as any).condition_logic || "AND",
      structured_requirements: (program as any).structured_requirements || [],
    });
    setIsDialogOpen(true);
  };

  const openSubjectsDialog = async (program: Program) => {
    setSelectedProgram(program);
    try {
      const { data, error } = await supabase
        .from("program_subjects")
        .select("subject_id, is_required, minimum_grade")
        .eq("program_id", program.id);
      if (error) throw error;
      setProgramSubjects(data || []);
    } catch (error) {
      console.error("Error fetching program subjects:", error);
    }
    setIsSubjectsDialogOpen(true);
  };

  const toggleSubject = (subjectId: string) => {
    const exists = programSubjects.find((ps) => ps.subject_id === subjectId);
    if (exists) {
      setProgramSubjects(programSubjects.filter((ps) => ps.subject_id !== subjectId));
    } else {
      setProgramSubjects([...programSubjects, { subject_id: subjectId, is_required: true, minimum_grade: "C" }]);
    }
  };

  const updateSubjectRequirement = (subjectId: string, field: string, value: any) => {
    setProgramSubjects(
      programSubjects.map((ps) => (ps.subject_id === subjectId ? { ...ps, [field]: value } : ps))
    );
  };

  const saveSubjects = async () => {
    if (!selectedProgram) return;
    setIsSubmitting(true);
    try {
      await supabase.from("program_subjects").delete().eq("program_id", selectedProgram.id);
      if (programSubjects.length > 0) {
        const { error } = await supabase.from("program_subjects").insert(
          programSubjects.map((ps) => ({
            program_id: selectedProgram.id,
            subject_id: ps.subject_id,
            is_required: ps.is_required,
            minimum_grade: ps.minimum_grade,
          }))
        );
        if (error) throw error;
      }
      toast({ title: "Success", description: "Subject requirements updated" });
      setIsSubjectsDialogOpen(false);
    } catch (error) {
      console.error("Error saving subjects:", error);
      toast({ title: "Error", description: "Failed to save subject requirements", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingProgram(null);
    setFormData({
      name: "", university_id: "", faculty: "", degree_type: "", description: "",
      entry_requirements: "", duration_years: 4, is_active: true,
      entry_type: "normal", condition_logic: "AND", structured_requirements: [],
    });
  };

  const addRequirementCondition = () => {
    setFormData({
      ...formData,
      structured_requirements: [
        ...formData.structured_requirements,
        { qualification_type: "O-Level", min_passes: 5, required_subjects: [], min_grade: "C" },
      ],
    });
  };

  const removeRequirementCondition = (index: number) => {
    setFormData({
      ...formData,
      structured_requirements: formData.structured_requirements.filter((_, i) => i !== index),
    });
  };

  const updateRequirementCondition = (index: number, field: string, value: any) => {
    const updated = [...formData.structured_requirements];
    (updated[index] as any)[field] = value;
    setFormData({ ...formData, structured_requirements: updated });
  };

  const getRequirementSummary = (): string => {
    if (formData.structured_requirements.length === 0) return formData.entry_requirements || "No requirements set";
    const joiner = formData.condition_logic === "AND" ? " AND " : " OR ";
    return formData.structured_requirements.map((r) => {
      let text = `${r.min_passes} ${r.qualification_type} passes`;
      if (r.min_grade) text += ` (min grade: ${r.min_grade})`;
      if (r.required_subjects.length > 0) text += ` including ${r.required_subjects.join(", ")}`;
      return text;
    }).join(joiner);
  };

  // AI Image Extraction for Programs
  const handleImageExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    toast({ title: "Extracting...", description: "AI is analyzing the document image. This may take a moment." });

    try {
      // Convert image to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("extract-image-info", {
        body: { imageUrl: base64, extractionType: "programs" },
      });

      if (error) throw error;

      const extracted = data?.extractedInfo;
      if (!extracted?.programs?.length) {
        toast({ title: "No Programs Found", description: "Could not extract program data from this image.", variant: "destructive" });
        return;
      }

      // Find or ask for university
      let universityId = "";
      if (extracted.university_name) {
        const matchedUni = universities.find(
          (u) => u.name.toLowerCase().includes(extracted.university_name.toLowerCase()) ||
                 extracted.university_name.toLowerCase().includes(u.name.toLowerCase())
        );
        if (matchedUni) universityId = matchedUni.id;
      }

      if (!universityId && universities.length > 0) {
        // Use first university as default - admin can change
        toast({ title: "Note", description: "Please select the correct university for extracted programs." });
      }

      let addedCount = 0;
      let updatedCount = 0;

      for (const prog of extracted.programs) {
        if (!prog.name) continue;

        const targetUniId = universityId || universities[0]?.id;
        if (!targetUniId) continue;

        // Check for existing program
        const existing = programs.find(
          (p) => p.name.toLowerCase() === prog.name.toLowerCase() && p.university_id === targetUniId
        );

        if (existing) {
          await supabase.from("programs").update({
            faculty: prog.faculty || existing.faculty,
            degree_type: prog.degree_type || existing.degree_type,
            entry_requirements: prog.entry_requirements || existing.entry_requirements,
            duration_years: prog.duration_years || existing.duration_years,
          }).eq("id", existing.id);
          updatedCount++;
        } else {
          await supabase.from("programs").insert({
            name: prog.name,
            university_id: targetUniId,
            faculty: prog.faculty || null,
            degree_type: prog.degree_type || null,
            entry_requirements: prog.entry_requirements || null,
            duration_years: prog.duration_years || 4,
            is_active: true,
          });
          addedCount++;
        }
      }

      toast({
        title: "Extraction Complete",
        description: `Added ${addedCount} new programs, updated ${updatedCount} existing programs from image.`,
      });
      fetchData();
    } catch (error) {
      console.error("Error extracting from image:", error);
      toast({ title: "Error", description: "Failed to extract program data from image", variant: "destructive" });
    } finally {
      setIsExtracting(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleExport = async () => {
    const { data: programSubjectsData } = await supabase
      .from("program_subjects")
      .select("program_id, minimum_grade, subjects(name)");

    const exportData = programs.map((p) => {
      const subjectReqs = programSubjectsData
        ?.filter((ps) => ps.program_id === p.id)
        .map((ps) => `${ps.subjects?.name}:${ps.minimum_grade || 'C'}`)
        .join(", ") || "";
      return {
        name: p.name,
        university_name: p.universities?.name || "",
        faculty: p.faculty || "",
        degree_type: p.degree_type || "",
        description: p.description || "",
        entry_requirements: p.entry_requirements || "",
        duration_years: p.duration_years || 4,
        subject_requirements: subjectReqs,
      };
    });
    exportToExcel(exportData, programColumns, "programs");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await importFromExcel(file, programColumns, async (data) => {
      let addedCount = 0;
      let updatedCount = 0;

      for (const row of data) {
        const university = universities.find(
          (u) => u.name.toLowerCase() === (row.university_name as string)?.toLowerCase()
        );
        if (!university) { console.warn(`University not found: ${row.university_name}`); continue; }

        const existingProgram = programs.find(
          (p) => p.name.toLowerCase() === (row.name as string)?.toLowerCase() && p.university_id === university.id
        );

        let programId: string;
        if (existingProgram) {
          const { error } = await supabase.from("programs").update({
            faculty: (row.faculty as string) || null,
            degree_type: (row.degree_type as string) || null,
            description: (row.description as string) || null,
            entry_requirements: (row.entry_requirements as string) || null,
            duration_years: Number(row.duration_years) || 4,
            is_active: true,
          }).eq("id", existingProgram.id);
          if (error) { console.error("Error updating:", error); continue; }
          programId = existingProgram.id;
          updatedCount++;
          await supabase.from("program_subjects").delete().eq("program_id", programId);
        } else {
          const { data: programData, error } = await supabase.from("programs").insert({
            name: row.name as string,
            university_id: university.id,
            faculty: (row.faculty as string) || null,
            degree_type: (row.degree_type as string) || null,
            description: (row.description as string) || null,
            entry_requirements: (row.entry_requirements as string) || null,
            duration_years: Number(row.duration_years) || 4,
            is_active: true,
          }).select().single();
          if (error) { console.error("Error inserting:", error); continue; }
          programId = programData.id;
          addedCount++;
        }

        const subjectReqsStr = row.subject_requirements as string;
        if (subjectReqsStr) {
          const subjectReqs = subjectReqsStr.split(",").map((s) => s.trim());
          for (const req of subjectReqs) {
            const [subjectName, grade] = req.split(":").map((s) => s.trim());
            const subject = subjects.find((s) => s.name.toLowerCase() === subjectName?.toLowerCase());
            if (subject) {
              await supabase.from("program_subjects").insert({
                program_id: programId, subject_id: subject.id, is_required: true, minimum_grade: grade || "C",
              });
            }
          }
        }
      }

      toast({ title: "Import Complete", description: `Added ${addedCount}, updated ${updatedCount} programs` });
      fetchData();
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const allSubjects = subjects;
  const filteredPrograms = programs.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.universities?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.faculty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Programs</h1>
            <p className="text-muted-foreground mt-1">Manage university programs and their subject requirements</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(programColumns, "programs")}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Template
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              <Upload className="w-4 h-4 mr-2" /> Import Excel
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              disabled={isExtracting}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              {isExtracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
              Extract from Image
            </Button>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageExtract} className="hidden" />
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Program</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProgram ? "Edit Program" : "Add Program"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Program Name *</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="university">University *</Label>
                      <Select value={formData.university_id} onValueChange={(value) => setFormData({ ...formData, university_id: value })}>
                        <SelectTrigger><SelectValue placeholder="Select university" /></SelectTrigger>
                        <SelectContent>
                          {universities.map((uni) => (<SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="faculty">Faculty</Label>
                      <Input id="faculty" value={formData.faculty} onChange={(e) => setFormData({ ...formData, faculty: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="degree_type">Degree Type</Label>
                      <Select value={formData.degree_type} onValueChange={(value) => setFormData({ ...formData, degree_type: value })}>
                        <SelectTrigger><SelectValue placeholder="Select degree type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bachelor">Bachelor</SelectItem>
                          <SelectItem value="Honours">Honours</SelectItem>
                          <SelectItem value="Diploma">Diploma</SelectItem>
                          <SelectItem value="Certificate">Certificate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entry_requirements">Entry Requirements (Text Description)</Label>
                    <Textarea id="entry_requirements" value={formData.entry_requirements} onChange={(e) => setFormData({ ...formData, entry_requirements: e.target.value })} rows={2} />
                  </div>

                  {/* Entry Type */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Entry Type</Label>
                      <Select value={formData.entry_type} onValueChange={(value) => setFormData({ ...formData, entry_type: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal Entry</SelectItem>
                          <SelectItem value="special">Special Entry</SelectItem>
                          <SelectItem value="diploma">Diploma / Mature / Other Entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>How conditions are combined</Label>
                      <Select value={formData.condition_logic} onValueChange={(value) => setFormData({ ...formData, condition_logic: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">ALL conditions must be met (AND)</SelectItem>
                          <SelectItem value="OR">ANY condition may be met (OR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Structured Requirement Conditions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Requirement Conditions</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addRequirementCondition}>
                        <Plus className="w-3 h-3 mr-1" /> Add Condition
                      </Button>
                    </div>
                    {formData.structured_requirements.map((req, idx) => (
                      <div key={idx} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Condition {idx + 1}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeRequirementCondition(idx)} className="text-destructive h-7">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Qualification Type</Label>
                            <Select value={req.qualification_type} onValueChange={(v) => updateRequirementCondition(idx, "qualification_type", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="O-Level">O-Level</SelectItem>
                                <SelectItem value="A-Level">A-Level</SelectItem>
                                <SelectItem value="Diploma">Diploma</SelectItem>
                                <SelectItem value="Certificate">Certificate</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Min Passes Required</Label>
                            <Input type="number" min={1} max={15} value={req.min_passes}
                              onChange={(e) => updateRequirementCondition(idx, "min_passes", parseInt(e.target.value) || 1)}
                              className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Minimum Grade</Label>
                            <Select value={req.min_grade} onValueChange={(v) => updateRequirementCondition(idx, "min_grade", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {GRADES.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Required Subjects (comma-separated, e.g. Mathematics, English)</Label>
                          <Input value={req.required_subjects.join(", ")}
                            onChange={(e) => updateRequirementCondition(idx, "required_subjects", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                            className="h-8 text-xs" placeholder="Mathematics, English" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Preview Summary */}
                  {formData.structured_requirements.length > 0 && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <Label className="text-xs font-semibold text-primary">Preview:</Label>
                      <p className="text-sm text-foreground mt-1">{getRequirementSummary()}</p>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="duration_years">Duration (Years)</Label>
                      <Input id="duration_years" type="number" min="1" max="8" value={formData.duration_years} onChange={(e) => setFormData({ ...formData, duration_years: parseInt(e.target.value) })} />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting || !formData.university_id}>
                      {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingProgram ? "Update" : "Add"} Program
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search programs, universities, faculties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Subjects Dialog */}
        <Dialog open={isSubjectsDialogOpen} onOpenChange={setIsSubjectsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Subject Requirements for {selectedProgram?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select subjects required for this program and set minimum grades (A, B, C, D, E, O, F):
              </p>
              <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                {allSubjects.map((subject) => {
                  const ps = programSubjects.find((p) => p.subject_id === subject.id);
                  return (
                    <div key={subject.id} className={`flex items-center gap-4 p-3 border rounded-lg transition-colors ${ps ? 'bg-primary/5 border-primary/30' : ''}`}>
                      <Checkbox checked={!!ps} onCheckedChange={() => toggleSubject(subject.id)} />
                      <span className="flex-1 font-medium">
                        {subject.name}
                        <Badge variant="outline" className="ml-2 text-xs">{subject.level}</Badge>
                      </span>
                      {ps && (
                        <>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm whitespace-nowrap">Required:</Label>
                            <Switch checked={ps.is_required} onCheckedChange={(checked) => updateSubjectRequirement(subject.id, "is_required", checked)} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm whitespace-nowrap">Min Grade:</Label>
                            <Select value={ps.minimum_grade || "C"} onValueChange={(value) => updateSubjectRequirement(subject.id, "minimum_grade", value)}>
                              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {GRADES.map((grade) => (<SelectItem key={grade} value={grade}>{grade}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsSubjectsDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveSubjects} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Requirements
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filteredPrograms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No programs match your search." : "No programs found. Add one to get started."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Entry Type</TableHead>
                    <TableHead>Entry Requirements</TableHead>
                    <TableHead>Degree</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrograms.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell className="font-medium max-w-[200px]">{program.name}</TableCell>
                      <TableCell>{program.universities?.name || "-"}</TableCell>
                      <TableCell>{program.faculty || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {(program as any).entry_type || "normal"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-sm text-muted-foreground line-clamp-2">{program.entry_requirements || "-"}</p>
                      </TableCell>
                      <TableCell>{program.degree_type && <Badge variant="outline">{program.degree_type}</Badge>}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${program.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                          {program.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openSubjectsDialog(program)} title="Manage subject requirements">
                            <BookOpen className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(program)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(program.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
