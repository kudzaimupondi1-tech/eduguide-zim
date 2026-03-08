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
import { Plus, Pencil, Trash2, Loader2, BookOpen, Upload, Download, FileSpreadsheet, FileText, Search, AlertCircle, XCircle, GraduationCap } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  category: string | null;
}

interface Diploma {
  id: string;
  name: string;
  institution: string | null;
  field: string | null;
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
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubjectsDialogOpen, setIsSubjectsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [programSubjects, setProgramSubjects] = useState<ProgramSubject[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [extractedPrograms, setExtractedPrograms] = useState<any[]>([]);
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);
  const [extractedReqs, setExtractedReqs] = useState<any[]>([]);
  const [isReqAutoDialogOpen, setIsReqAutoDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isReqSubjectsDialogOpen, setIsReqSubjectsDialogOpen] = useState(false);
  const [editingReqIndex, setEditingReqIndex] = useState<number | null>(null);
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);
  const [editingCompulsory, setEditingCompulsory] = useState(false);
  const [tempSelectedSubjects, setTempSelectedSubjects] = useState<string[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [minRequiredFromGroup, setMinRequiredFromGroup] = useState(1);
  const [isDiplomaDialogOpen, setIsDiplomaDialogOpen] = useState(false);
  const [selectedProgramDiplomas, setSelectedProgramDiplomas] = useState<Array<{ diploma_id: string; is_required: boolean; minimum_classification: string | null }>>([]);
  const [diplomaSearchQuery, setDiplomaSearchQuery] = useState("");
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
      min_grade: string;
      min_classification?: string;
      compulsory_subjects?: string[];
      subject_groups?: Array<{
        subjects: string[];
        min_required: number;
      }>;
      required_diplomas?: string[];
    }>,
  });

  const fetchData = async () => {
    try {
      const [programsRes, universitiesRes, subjectsRes, diplomasRes] = await Promise.all([
        supabase.from("programs").select("*, universities(name)").order("name"),
        supabase.from("universities").select("id, name").eq("is_active", true).order("name"),
        supabase.from("subjects").select("id, name, level, category").eq("is_active", true).order("name"),
        supabase.from("diplomas").select("id, name, institution, field, level").eq("is_active", true).order("name"),
      ]);

      if (programsRes.error) throw programsRes.error;
      if (universitiesRes.error) throw universitiesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      setPrograms(programsRes.data || []);
      setUniversities(universitiesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setDiplomas(diplomasRes.data || []);
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
      // Don't call fetchData here for updates - preserve scroll position
      if (editingProgram) {
        // Update locally to avoid scroll reset
        setPrograms(prev => prev.map(p => p.id === editingProgram.id ? { ...p, ...formData, universities: p.universities } : p));
      } else {
        fetchData();
      }
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

  const handleDeleteAll = async () => {
    setIsSubmitting(true);
    try {
      // Delete all program_subjects, program_careers, then programs
      await supabase.from("program_subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("program_careers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("programs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast({ title: "Success", description: "All programs deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting all programs:", error);
      toast({ title: "Error", description: "Failed to delete all programs", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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
        { qualification_type: "O-Level", min_passes: 5, min_grade: "C", subject_groups: [] },
      ],
    });
  };

  const removeRequirementCondition = (index: number) => {
    setFormData({
      ...formData,
      structured_requirements: formData.structured_requirements.filter((_, i) => i !== index),
    });
  };

  const addSubjectGroup = (reqIndex: number) => {
    const updated = [...formData.structured_requirements];
    const groups = (updated[reqIndex] as any).subject_groups || [];
    groups.push({ subjects: [], min_required: 1 });
    (updated[reqIndex] as any).subject_groups = groups;
    setFormData({ ...formData, structured_requirements: updated });
  };

  const removeSubjectGroup = (reqIndex: number, groupIndex: number) => {
    const updated = [...formData.structured_requirements];
    const groups = (updated[reqIndex] as any).subject_groups || [];
    groups.splice(groupIndex, 1);
    (updated[reqIndex] as any).subject_groups = groups;
    setFormData({ ...formData, structured_requirements: updated });
  };

  const updateRequirementCondition = (index: number, field: string, value: any) => {
    const updated = [...formData.structured_requirements];
    (updated[index] as any)[field] = value;
    setFormData({ ...formData, structured_requirements: updated });
  };

  const openReqSubjectsDialog = (reqIndex: number, groupIndex: number | null = null) => {
    setEditingReqIndex(reqIndex);
    setEditingGroupIndex(groupIndex);
    const req = formData.structured_requirements[reqIndex] as any;

    if (groupIndex === null) {
      // Editing compulsory subjects
      setEditingCompulsory(true);
      setTempSelectedSubjects(req?.compulsory_subjects ? [...req.compulsory_subjects] : []);
      setMinRequiredFromGroup(1);
    } else {
      // Editing group
      setEditingCompulsory(false);
      const group = req?.subject_groups?.[groupIndex];
      setTempSelectedSubjects(group?.subjects ? [...group.subjects] : []);
      setMinRequiredFromGroup(group?.min_required || 1);
    }
    setNewSubjectName("");
    setIsReqSubjectsDialogOpen(true);
  };

  const toggleTempSubject = (subjectName: string) => {
    setTempSelectedSubjects((prev) => (prev.includes(subjectName) ? prev.filter((s) => s !== subjectName) : [...prev, subjectName]));
  };

  const addNewSubjectAndSelect = async () => {
    const name = newSubjectName.trim();
    if (!name) return;

    // Check if subject already exists
    if (subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Subject Exists", description: `"${name}" is already in the list.`, variant: "destructive" });
      setNewSubjectName("");
      return;
    }

    setIsSubmitting(true);
    try {
      const level = 'General';
      const { data, error } = await supabase.from("subjects").insert({ name, level, is_active: true }).select().single();
      if (error) throw error;
      // update local subjects list
      setSubjects((prev) => [...prev, data]);
      setTempSelectedSubjects((prev) => [...prev, data.name]);
      setNewSubjectName("");
    } catch (err) {
      console.error("Error adding subject:", err);
      toast({ title: "Error", description: "Failed to add subject", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveReqSubjects = () => {
    if (editingReqIndex === null) return;
    const updated = [...formData.structured_requirements];

    if (editingCompulsory) {
      // Save compulsory subjects
      (updated[editingReqIndex] as any).compulsory_subjects = tempSelectedSubjects;
    } else if (editingGroupIndex !== null) {
      // Save group
      const groups = (updated[editingReqIndex] as any).subject_groups || [];
      groups[editingGroupIndex] = {
        subjects: tempSelectedSubjects,
        min_required: minRequiredFromGroup,
      };
      (updated[editingReqIndex] as any).subject_groups = groups;
    }

    setFormData({ ...formData, structured_requirements: updated });
    setIsReqSubjectsDialogOpen(false);
    setEditingReqIndex(null);
    setEditingGroupIndex(null);
    setEditingCompulsory(false);
    setTempSelectedSubjects([]);
    setNewSubjectName("");
    setMinRequiredFromGroup(1);
  };

  // Diploma management functions
  const openDiplomaDialog = async (program: Program) => {
    setSelectedProgram(program);
    setDiplomaSearchQuery("");
    try {
      const { data, error } = await supabase
        .from("program_diplomas")
        .select("diploma_id, is_required, minimum_classification")
        .eq("program_id", program.id);
      if (error) throw error;
      setSelectedProgramDiplomas(data || []);
    } catch (error) {
      console.error("Error fetching program diplomas:", error);
      setSelectedProgramDiplomas([]);
    }
    setIsDiplomaDialogOpen(true);
  };

  const toggleDiploma = (diplomaId: string) => {
    const exists = selectedProgramDiplomas.find(pd => pd.diploma_id === diplomaId);
    if (exists) {
      setSelectedProgramDiplomas(prev => prev.filter(pd => pd.diploma_id !== diplomaId));
    } else {
      setSelectedProgramDiplomas(prev => [...prev, { diploma_id: diplomaId, is_required: true, minimum_classification: "Pass" }]);
    }
  };

  const updateDiplomaRequirement = (diplomaId: string, field: string, value: any) => {
    setSelectedProgramDiplomas(prev => prev.map(pd => pd.diploma_id === diplomaId ? { ...pd, [field]: value } : pd));
  };

  const saveDiplomas = async () => {
    if (!selectedProgram) return;
    setIsSubmitting(true);
    try {
      await supabase.from("program_diplomas").delete().eq("program_id", selectedProgram.id);
      if (selectedProgramDiplomas.length > 0) {
        const { error } = await supabase.from("program_diplomas").insert(
          selectedProgramDiplomas.map(pd => ({
            program_id: selectedProgram.id,
            diploma_id: pd.diploma_id,
            is_required: pd.is_required,
            minimum_classification: pd.minimum_classification,
          }))
        );
        if (error) throw error;
      }
      toast({ title: "Success", description: "Diploma requirements updated" });
      setIsDiplomaDialogOpen(false);
    } catch (error) {
      console.error("Error saving diplomas:", error);
      toast({ title: "Error", description: "Failed to save diploma requirements", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDiplomas = diplomas.filter(d =>
    d.name.toLowerCase().includes(diplomaSearchQuery.toLowerCase()) ||
    (d.field || "").toLowerCase().includes(diplomaSearchQuery.toLowerCase()) ||
    (d.institution || "").toLowerCase().includes(diplomaSearchQuery.toLowerCase())
  );

  const getRequirementSummary = (): string => {
    if (formData.structured_requirements.length === 0) return formData.entry_requirements || "No requirements set";
    const joiner = formData.condition_logic === "AND" ? " AND " : " OR ";
    return formData.structured_requirements.map((r) => {
      if (r.qualification_type === "Diploma") {
        const reqDiplomas = (r as any).required_diplomas || [];
        const diplomaNames = reqDiplomas.map((id: string) => diplomas.find(d => d.id === id)?.name || id).join(", ");
        let text = `Diploma (min: ${r.min_classification || "Pass"})`;
        if (diplomaNames) text += `: ${diplomaNames}`;
        return text;
      }
      let text = `${r.min_passes} ${r.qualification_type} passes`;
      if (r.min_grade) text += ` (min grade: ${r.min_grade})`;

      const compulsory = (r as any).compulsory_subjects || [];
      if (compulsory.length > 0) {
        text += ` + must have: ${compulsory.join(", ")}`;
      }

      const groups = (r as any).subject_groups || [];
      if (groups.length > 0) {
        const groupTexts = groups.map((g: any) => {
          const subjectList = (g.subjects || []).join(", ");
          return `at least ${g.min_required} of: ${subjectList}`;
        });
        text += ` including (${groupTexts.join(" OR ")})`;
      }
      return text;
    }).join(joiner);
  };

  // AI Image Extraction for Programs
  const handleImageExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Require a university selected before extracting
    if (!formData.university_id) {
      toast({ title: "Select University", description: "Please choose a university before uploading the document.", variant: "destructive" });
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

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
        toast({ title: "No Programs Found", description: "Could not extract program data from this document.", variant: "destructive" });
        return;
      }

      // Attach confidence/university hints and show review dialog
      const programsWithMeta = (extracted.programs || []).map((p: any) => ({
        ...p,
        _confidence: p.confidence || null,
        _extracted_university: extracted.university_name || null,
        _selected_university: formData.university_id || null,
        _selected: true,
      }));

      setExtractedPrograms(programsWithMeta);
      setIsExtractDialogOpen(true);
    } catch (error) {
      console.error("Error extracting from image:", error);
      toast({ title: "Error", description: "Failed to extract program data from image", variant: "destructive" });
    } finally {
      setIsExtracting(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const saveExtractedPrograms = async () => {
    if (!extractedPrograms.length) return;
    setIsSubmitting(true);
    try {
      let added = 0;
      let updated = 0;
      for (const prog of extractedPrograms.filter((p) => p._selected)) {
        // Determine target university: prefer selected id, then match by extracted name, then fallback to form selection
        let targetUniId = prog._selected_university || "";
        if (!targetUniId && prog._extracted_university) {
          const matched = universities.find((u) => u.name.toLowerCase().includes((prog._extracted_university || "").toLowerCase()));
          if (matched) targetUniId = matched.id;
        }
        targetUniId = targetUniId || formData.university_id || universities[0]?.id;
        if (!targetUniId) continue;

        const existing = programs.find((p) => p.name.toLowerCase() === (prog.name || "").toLowerCase() && p.university_id === targetUniId);
        if (existing) {
          const { error } = await supabase.from("programs").update({
            faculty: prog.faculty || existing.faculty,
            degree_type: prog.degree_type || existing.degree_type,
            entry_requirements: prog.entry_requirements || existing.entry_requirements,
            duration_years: prog.duration_years || existing.duration_years,
            is_active: true,
            structured_requirements: prog.structured_requirements || (existing as any).structured_requirements || [],
          }).eq("id", existing.id);
          if (error) throw error;
          updated++;
        } else {
          const { data: programData, error } = await supabase.from("programs").insert({
            name: prog.name,
            university_id: targetUniId,
            faculty: prog.faculty || null,
            degree_type: prog.degree_type || null,
            entry_requirements: prog.entry_requirements || null,
            duration_years: prog.duration_years || 4,
            is_active: true,
            structured_requirements: prog.structured_requirements || [],
          }).select().single();
          if (error) throw error;
          added++;
        }
      }
      toast({ title: "Import Complete", description: `Added ${added}, updated ${updated} programs` });
      setIsExtractDialogOpen(false);
      setExtractedPrograms([]);
      fetchData();
    } catch (error) {
      console.error("Error saving extracted programs:", error);
      toast({ title: "Error", description: "Failed to save extracted programs", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={programs.length === 0 || isSubmitting}>
                  <XCircle className="w-4 h-4 mr-2" /> Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Programs?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {programs.length} programs, their subject requirements, and career links. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
            <div className="flex items-center gap-2">
              <Select value={formData.university_id} onValueChange={(v) => setFormData({ ...formData, university_id: v })}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Select university for import" /></SelectTrigger>
                <SelectContent>
                  {universities.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                disabled={isExtracting || !formData.university_id}
                title={formData.university_id ? "Extract from document for selected university" : "Select a university first"}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                {isExtracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Extract from Document
              </Button>
            </div>
            <input ref={imageInputRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleImageExtract} className="hidden" />
            <Dialog open={isExtractDialogOpen} onOpenChange={setIsExtractDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Review Extracted Programs</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Review the extracted programmes below. Edit fields or uncheck items you don't want to import. Confirm when ready.</p>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {extractedPrograms.map((ep, i) => (
                      <div key={i} className="p-3 border rounded-lg bg-muted/10">
                        <div className="flex items-start gap-3">
                          <input type="checkbox" checked={!!ep._selected} onChange={(e) => setExtractedPrograms(prev => { const copy = [...prev]; copy[i]._selected = e.target.checked; return copy; })} />
                          <div className="flex-1">
                            <div className="grid md:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Program Name</Label>
                                <Input value={ep.name || ""} onChange={(e) => setExtractedPrograms(prev => { const copy = [...prev]; copy[i].name = e.target.value; return copy; })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">University (hint)</Label>
                                <Select value={ep._selected_university || ep._extracted_university || ""} onValueChange={(v) => setExtractedPrograms(prev => { const copy = [...prev]; copy[i]._selected_university = v; return copy; })}>
                                  <SelectTrigger><SelectValue placeholder={ep._extracted_university || "Select university"} /></SelectTrigger>
                                  <SelectContent>
                                    {universities.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid md:grid-cols-3 gap-2 mt-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Faculty</Label>
                                <Input value={ep.faculty || ""} onChange={(e) => setExtractedPrograms(prev => { const copy = [...prev]; copy[i].faculty = e.target.value; return copy; })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Degree Type</Label>
                                <Select value={ep.degree_type || ""} onValueChange={(v) => setExtractedPrograms(prev => { const copy = [...prev]; copy[i].degree_type = v; return copy; })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Bachelor">Bachelor</SelectItem>
                                    <SelectItem value="Honours">Honours</SelectItem>
                                    <SelectItem value="Diploma">Diploma</SelectItem>
                                    <SelectItem value="Certificate">Certificate</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Duration (yrs)</Label>
                                <Input type="number" value={ep.duration_years || 4} onChange={(e) => setExtractedPrograms(prev => { const copy = [...prev]; copy[i].duration_years = parseInt(e.target.value) || 4; return copy; })} />
                              </div>
                            </div>
                            <div className="mt-2">
                              <Label className="text-xs">Entry Requirements (text)</Label>
                              <Textarea value={ep.entry_requirements || ""} onChange={(e) => setExtractedPrograms(prev => { const copy = [...prev]; copy[i].entry_requirements = e.target.value; return copy; })} rows={2} />
                            </div>
                            <div className="mt-2">
                              <Label className="text-xs">Structured Requirements (JSON)</Label>
                              <Textarea value={JSON.stringify(ep.structured_requirements || [], null, 2)} onChange={(e) => {
                                try {
                                  const parsed = JSON.parse(e.target.value);
                                  setExtractedPrograms(prev => { const copy = [...prev]; copy[i].structured_requirements = parsed; return copy; });
                                } catch { /* ignore parse errors while typing */ }
                              }} rows={3} />
                            </div>
                            {ep._confidence && (
                              <div className="text-xs text-muted-foreground mt-2">Confidence: {Math.round(ep._confidence * 100)}%</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setIsExtractDialogOpen(false); setExtractedPrograms([]); }}>Cancel</Button>
                    <Button onClick={saveExtractedPrograms} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Selected"}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isReqAutoDialogOpen} onOpenChange={setIsReqAutoDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Review Auto-filled Conditions</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Review the extracted conditions below. You can replace the current conditions or merge them.</p>
                  <div className="space-y-3">
                    {extractedReqs.map((r, i) => (
                      <div key={i} className="p-3 border rounded-lg bg-muted/10">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">Condition {i + 1}: {r.qualification_type || 'Unknown'}</div>
                        </div>
                        <div className="mt-2 text-sm">
                          <div><strong>Min passes:</strong> {r.min_passes ?? '-'}</div>
                          <div><strong>Min grade:</strong> {r.min_grade ?? '-'}</div>
                          <div className="mt-1"><strong>Compulsory subjects:</strong> {(r.compulsory_subjects || []).join(', ') || '-'}</div>
                          <div className="mt-1"><strong>Subject groups:</strong>
                            <ul className="list-disc pl-5">
                              {(r.subject_groups || []).map((g: any, gi: number) => (
                                <li key={gi}>At least {g.min_required} of: {(g.subjects || []).join(', ')}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setIsReqAutoDialogOpen(false); setExtractedReqs([]); }}>Cancel</Button>
                    <Button onClick={() => {
                      // Replace existing conditions
                      setFormData({ ...formData, structured_requirements: extractedReqs });
                      setIsReqAutoDialogOpen(false);
                      setExtractedReqs([]);
                      toast({ title: 'Applied', description: 'Replaced conditions with extracted results' });
                    }}>Replace Conditions</Button>
                    <Button onClick={() => {
                      // Merge: append extracted to existing
                      setFormData({ ...formData, structured_requirements: [...formData.structured_requirements, ...extractedReqs] });
                      setIsReqAutoDialogOpen(false);
                      setExtractedReqs([]);
                      toast({ title: 'Merged', description: 'Merged extracted conditions into existing' });
                    }}>Merge Conditions</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {/* Required Subjects Picker Dialog */}
            <Dialog open={isReqSubjectsDialogOpen} onOpenChange={setIsReqSubjectsDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCompulsory ? "Edit Compulsory Subjects" : "Edit Subject Group"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!editingCompulsory && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">How many subjects from this group are required?</Label>
                      <Input type="number" min={1} max={20} value={minRequiredFromGroup} onChange={(e) => setMinRequiredFromGroup(parseInt(e.target.value) || 1)} />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{editingCompulsory ? "Select subjects that must ALL be present" : "Select subjects for this group or add a new one."}</p>
                  {tempSelectedSubjects.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Selected Subjects ({tempSelectedSubjects.length}):</Label>
                      <div className="flex flex-wrap gap-2">
                        {tempSelectedSubjects.map((sub) => (
                          <Badge key={sub} variant={editingCompulsory ? "default" : "outline"} className="flex items-center gap-1 pr-1">
                            {sub}
                            <button
                              type="button"
                              onClick={() => toggleTempSubject(sub)}
                              className="ml-1 text-xs hover:text-destructive"
                              aria-label={`Remove ${sub}`}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid gap-2 max-h-[40vh] overflow-y-auto border rounded p-2">
                    {Array.from(new Set(subjects.map(s => s.name))).map((subjectName) => {
                      const subjectData = subjects.find(s => s.name === subjectName);
                      const category = subjectData?.category || subjectData?.level || "";
                      return (
                        <div key={subjectName} className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50 ${tempSelectedSubjects.includes(subjectName) ? 'bg-primary/5' : ''}`}>
                          <Checkbox checked={tempSelectedSubjects.includes(subjectName)} onCheckedChange={() => toggleTempSubject(subjectName)} />
                          <div className="flex-1">{subjectName} {category && <span className="text-xs text-muted-foreground">({category})</span>}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input placeholder="Add new subject (e.g. Further Mathematics)" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} />
                    <Button onClick={addNewSubjectAndSelect} disabled={isSubmitting || !newSubjectName.trim()}>Add & Select</Button>
                    <div />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsReqSubjectsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={saveReqSubjects}>Save {editingCompulsory ? "Compulsory Subjects" : "Group"}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" /> Add Program</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
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
                    <div className="flex gap-2">
                      <Textarea id="entry_requirements" value={formData.entry_requirements} onChange={(e) => setFormData({ ...formData, entry_requirements: e.target.value })} rows={2} />
                      <div className="flex flex-col">
                        <Button type="button" variant="outline" size="sm" onClick={async () => {
                          if (!formData.entry_requirements?.trim()) { toast({ title: "Empty requirements", description: "Please enter entry requirements text first", variant: 'destructive' }); return; }
                          setIsAutoFilling(true);
                          try {
                            const { data, error } = await supabase.functions.invoke("extract-image-info", { body: { text: formData.entry_requirements, extractionType: "requirements" } });
                            if (error) throw error;
                            const structured = data?.structured_requirements || data?.extractedInfo?.structured_requirements || [];
                            if (!structured || structured.length === 0) {
                              toast({ title: "No conditions found", description: "Could not extract structured conditions from the text.", variant: 'destructive' });
                            } else {
                              setExtractedReqs(structured);
                              setIsReqAutoDialogOpen(true);
                            }
                          } catch (err) {
                            console.error("Auto-fill error:", err);
                            toast({ title: "Error", description: "Failed to auto-fill conditions", variant: 'destructive' });
                          } finally {
                            setIsAutoFilling(false);
                          }
                        }} disabled={isAutoFilling}>{isAutoFilling ? 'Working...' : 'Auto-fill Conditions'}</Button>
                      </div>
                    </div>
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
                            <Select value={req.qualification_type} onValueChange={(v) => {
                              updateRequirementCondition(idx, "qualification_type", v);
                              if (v === "Diploma") {
                                updateRequirementCondition(idx, "min_grade", "");
                                if (!req.min_classification) updateRequirementCondition(idx, "min_classification", "Pass");
                              }
                            }}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="O-Level">O-Level</SelectItem>
                                <SelectItem value="A-Level">A-Level</SelectItem>
                                <SelectItem value="Diploma">Diploma</SelectItem>
                                <SelectItem value="Certificate">Certificate</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {req.qualification_type !== "Diploma" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Min Passes Required</Label>
                              <Input type="number" min={1} max={15} value={req.min_passes}
                                onChange={(e) => updateRequirementCondition(idx, "min_passes", parseInt(e.target.value) || 1)}
                                className="h-8 text-xs" />
                            </div>
                          )}
                          {req.qualification_type === "Diploma" ? (
                            <div className="space-y-1">
                              <Label className="text-xs">Minimum Classification</Label>
                              <Select value={req.min_classification || "Pass"} onValueChange={(v) => updateRequirementCondition(idx, "min_classification", v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Distinction">Distinction</SelectItem>
                                  <SelectItem value="Merit">Merit</SelectItem>
                                  <SelectItem value="Credit">Credit</SelectItem>
                                  <SelectItem value="Pass">Pass</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Label className="text-xs">Minimum Grade</Label>
                              <Select value={req.min_grade} onValueChange={(v) => updateRequirementCondition(idx, "min_grade", v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {GRADES.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {req.qualification_type === "Diploma" ? (
                          /* Diploma-specific: select from admin diploma list */
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Required Diplomas</Label>
                            <p className="text-xs text-muted-foreground">Select diplomas from the admin diploma module that qualify for this program.</p>
                            {((req as any).required_diplomas || []).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {((req as any).required_diplomas || []).map((diplomaId: string) => {
                                  const dip = diplomas.find(d => d.id === diplomaId);
                                  return (
                                    <Badge key={diplomaId} variant="default" className="text-xs flex items-center gap-1 pr-1">
                                      {dip?.name || diplomaId}
                                      <button type="button" onClick={() => {
                                        const updated = [...formData.structured_requirements];
                                        const reqDiplomas = ((updated[idx] as any).required_diplomas || []).filter((id: string) => id !== diplomaId);
                                        (updated[idx] as any).required_diplomas = reqDiplomas;
                                        setFormData({ ...formData, structured_requirements: updated });
                                      }} className="ml-1 text-xs hover:text-destructive">×</button>
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                            <div className="grid gap-2 max-h-[200px] overflow-y-auto border rounded p-2">
                              {diplomas.map((dip) => {
                                const isSelected = ((req as any).required_diplomas || []).includes(dip.id);
                                return (
                                  <div key={dip.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}>
                                    <Checkbox checked={isSelected} onCheckedChange={() => {
                                      const updated = [...formData.structured_requirements];
                                      const current = (updated[idx] as any).required_diplomas || [];
                                      if (isSelected) {
                                        (updated[idx] as any).required_diplomas = current.filter((id: string) => id !== dip.id);
                                      } else {
                                        (updated[idx] as any).required_diplomas = [...current, dip.id];
                                      }
                                      setFormData({ ...formData, structured_requirements: updated });
                                    }} />
                                    <div className="flex-1">
                                      <span className="text-sm">{dip.name}</span>
                                      {dip.field && <span className="text-xs text-muted-foreground ml-1">({dip.field})</span>}
                                      {dip.institution && <span className="text-xs text-muted-foreground ml-1">- {dip.institution}</span>}
                                    </div>
                                  </div>
                                );
                              })}
                              {diplomas.length === 0 && (
                                <p className="text-xs text-muted-foreground italic p-2">No diplomas configured. Add them in the Diplomas module first.</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Non-diploma: show compulsory subjects and subject groups */
                          <>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">Compulsory Subjects (must ALL be present)</Label>
                                <Button type="button" size="sm" variant="outline" onClick={() => openReqSubjectsDialog(idx, null)} className="h-7 text-xs">
                                  Edit
                                </Button>
                              </div>
                              {((req as any).compulsory_subjects || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No compulsory subjects set.</p>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {((req as any).compulsory_subjects || []).map((sub: string) => (
                                    <Badge key={sub} variant="default" className="text-xs">{sub}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">Subject Groups (OR Logic)</Label>
                                <Button type="button" size="sm" variant="outline" onClick={() => addSubjectGroup(idx)} className="h-7 text-xs">
                                  <Plus className="w-3 h-3 mr-1" /> Add Group
                                </Button>
                              </div>
                              {((req as any).subject_groups || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No subject groups. Add one to set alternative subject requirements.</p>
                              ) : (
                                <div className="space-y-2">
                                  {((req as any).subject_groups || []).map((group: any, groupIdx: number) => (
                                    <div key={groupIdx} className="p-2 border rounded bg-muted/50 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium">Group {groupIdx + 1}: At least {group.min_required} of {group.subjects?.length || 0} subjects</span>
                                        <Button type="button" size="sm" variant="ghost" onClick={() => removeSubjectGroup(idx, groupIdx)} className="h-6 text-destructive">
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {(group.subjects || []).map((sub: string) => (
                                          <Badge key={sub} variant="outline" className="text-xs">{sub}</Badge>
                                        ))}
                                      </div>
                                      <Button type="button" size="sm" variant="outline" onClick={() => openReqSubjectsDialog(idx, groupIdx)} className="h-7 text-xs w-full">
                                        Edit Group
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
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
                  {filteredPrograms.map((program) => {
                    const hasConditions = ((program as any).structured_requirements || []).length > 0 || !!program.entry_requirements;
                    return (
                      <TableRow
                        key={program.id}
                        className={!hasConditions ? "bg-red-50 hover:bg-red-100/80 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400" : ""}
                        title={!hasConditions ? "Missing entry requirements" : ""}
                      >
                        <TableCell className="font-medium max-w-[200px]">{program.name}</TableCell>
                        <TableCell>{program.universities?.name || "-"}</TableCell>
                        <TableCell>{program.faculty || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {(program as any).entry_type || "normal"}
                          </Badge>
                        </TableCell>
                        <TableCell className={`max-w-[300px] ${!hasConditions ? "text-red-600 dark:text-red-400 font-medium" : ""}`}>
                          {hasConditions ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">{program.entry_requirements || "Structured conditions set"}</p>
                          ) : (
                            <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Missing Requirements</span>
                          )}
                        </TableCell>
                        <TableCell>{program.degree_type && <Badge variant="outline">{program.degree_type}</Badge>}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${program.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                            {program.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(program)} title="Edit program">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {((program as any).entry_type === "diploma" || (program as any).entry_type === "special") && (
                              <Button variant="ghost" size="icon" onClick={() => openDiplomaDialog(program)} title="Manage diploma requirements" className="text-amber-600 hover:text-amber-700">
                                <GraduationCap className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(program.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Diploma Requirements Dialog */}
        <Dialog open={isDiplomaDialogOpen} onOpenChange={setIsDiplomaDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" /> Diploma Requirements for {selectedProgram?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select which diplomas qualify for entry into this program. Set whether each is required or optional and the minimum classification.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search diplomas by name, field, or institution..." value={diplomaSearchQuery} onChange={e => setDiplomaSearchQuery(e.target.value)} className="pl-10" />
              </div>
              {selectedProgramDiplomas.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">Selected Diplomas ({selectedProgramDiplomas.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProgramDiplomas.map(pd => {
                      const d = diplomas.find(dip => dip.id === pd.diploma_id);
                      return d ? <Badge key={pd.diploma_id} variant="secondary" className="text-xs">{d.name}</Badge> : null;
                    })}
                  </div>
                </div>
              )}
              <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                {filteredDiplomas.map(diploma => {
                  const pd = selectedProgramDiplomas.find(p => p.diploma_id === diploma.id);
                  return (
                    <div key={diploma.id} className={`flex items-center gap-4 p-3 border rounded-lg transition-colors ${pd ? 'bg-primary/5 border-primary/30' : ''}`}>
                      <Checkbox checked={!!pd} onCheckedChange={() => toggleDiploma(diploma.id)} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{diploma.name}</span>
                        <div className="flex gap-2 mt-0.5">
                          {diploma.field && <Badge variant="outline" className="text-xs">{diploma.field}</Badge>}
                          {diploma.institution && <span className="text-xs text-muted-foreground">{diploma.institution}</span>}
                        </div>
                      </div>
                      {pd && (
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs whitespace-nowrap">Required:</Label>
                            <Switch checked={pd.is_required} onCheckedChange={(checked) => updateDiplomaRequirement(diploma.id, "is_required", checked)} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs whitespace-nowrap">Min:</Label>
                            <Select value={pd.minimum_classification || "Pass"} onValueChange={(v) => updateDiplomaRequirement(diploma.id, "minimum_classification", v)}>
                              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Distinction">Distinction</SelectItem>
                                <SelectItem value="Merit">Merit</SelectItem>
                                <SelectItem value="Credit">Credit</SelectItem>
                                <SelectItem value="Pass">Pass</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredDiplomas.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No diplomas match your search.</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDiplomaDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveDiplomas} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Diploma Requirements
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
