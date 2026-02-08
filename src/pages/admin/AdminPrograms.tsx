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
import { Plus, Pencil, Trash2, Loader2, BookOpen, Upload, Download, FileSpreadsheet } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  });

  const fetchData = async () => {
    try {
      const [programsRes, universitiesRes, subjectsRes] = await Promise.all([
        supabase
          .from("programs")
          .select("*, universities(name)")
          .order("name"),
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
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        });

        if (error) throw error;
        toast({ title: "Success", description: "Program added successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving program:", error);
      toast({
        title: "Error",
        description: "Failed to save program",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this program?")) return;

    try {
      // Delete program subjects first
      await supabase.from("program_subjects").delete().eq("program_id", id);
      
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Program deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting program:", error);
      toast({
        title: "Error",
        description: "Failed to delete program",
        variant: "destructive",
      });
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
      setProgramSubjects([
        ...programSubjects,
        { subject_id: subjectId, is_required: true, minimum_grade: "C" },
      ]);
    }
  };

  const updateSubjectRequirement = (subjectId: string, field: string, value: any) => {
    setProgramSubjects(
      programSubjects.map((ps) =>
        ps.subject_id === subjectId ? { ...ps, [field]: value } : ps
      )
    );
  };

  const saveSubjects = async () => {
    if (!selectedProgram) return;
    setIsSubmitting(true);

    try {
      // Delete existing
      await supabase
        .from("program_subjects")
        .delete()
        .eq("program_id", selectedProgram.id);

      // Insert new
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
      toast({
        title: "Error",
        description: "Failed to save subject requirements",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingProgram(null);
    setFormData({
      name: "",
      university_id: "",
      faculty: "",
      degree_type: "",
      description: "",
      entry_requirements: "",
      duration_years: 4,
      is_active: true,
    });
  };

  const handleExport = async () => {
    // Fetch program subjects for export
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
        // Find university by name
        const university = universities.find(
          (u) => u.name.toLowerCase() === (row.university_name as string)?.toLowerCase()
        );
        
        if (!university) {
          console.warn(`University not found: ${row.university_name}`);
          continue;
        }

        // Check if program already exists (same name + same university)
        const existingProgram = programs.find(
          (p) => 
            p.name.toLowerCase() === (row.name as string)?.toLowerCase() &&
            p.university_id === university.id
        );

        let programId: string;

        if (existingProgram) {
          // Update existing program
          const { error: updateError } = await supabase
            .from("programs")
            .update({
              faculty: (row.faculty as string) || null,
              degree_type: (row.degree_type as string) || null,
              description: (row.description as string) || null,
              entry_requirements: (row.entry_requirements as string) || null,
              duration_years: Number(row.duration_years) || 4,
              is_active: true,
            })
            .eq("id", existingProgram.id);

          if (updateError) {
            console.error("Error updating program:", updateError);
            continue;
          }
          
          programId = existingProgram.id;
          updatedCount++;

          // Delete existing subject requirements for this program
          await supabase
            .from("program_subjects")
            .delete()
            .eq("program_id", programId);
        } else {
          // Insert new program
          const { data: programData, error: programError } = await supabase
            .from("programs")
            .insert({
              name: row.name as string,
              university_id: university.id,
              faculty: (row.faculty as string) || null,
              degree_type: (row.degree_type as string) || null,
              description: (row.description as string) || null,
              entry_requirements: (row.entry_requirements as string) || null,
              duration_years: Number(row.duration_years) || 4,
              is_active: true,
            })
            .select()
            .single();

          if (programError) {
            console.error("Error inserting program:", programError);
            continue;
          }
          
          programId = programData.id;
          addedCount++;
        }

        // Parse and insert subject requirements
        const subjectReqsStr = row.subject_requirements as string;
        if (subjectReqsStr) {
          const subjectReqs = subjectReqsStr.split(",").map((s) => s.trim());
          for (const req of subjectReqs) {
            const [subjectName, grade] = req.split(":").map((s) => s.trim());
            const subject = subjects.find(
              (s) => s.name.toLowerCase() === subjectName?.toLowerCase()
            );
            if (subject) {
              await supabase.from("program_subjects").insert({
                program_id: programId,
                subject_id: subject.id,
                is_required: true,
                minimum_grade: grade || "C",
              });
            }
          }
        }
      }

      toast({
        title: "Import Complete",
        description: `Added ${addedCount} new programs, updated ${updatedCount} existing programs`,
      });
      
      fetchData();
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const aLevelSubjects = subjects.filter((s) => s.level === "A-Level");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Programs</h1>
            <p className="text-muted-foreground mt-1">
              Manage university programs and their subject requirements
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(programColumns, "programs")}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Template
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Program
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProgram ? "Edit Program" : "Add Program"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Program Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="university">University *</Label>
                      <Select
                        value={formData.university_id}
                        onValueChange={(value) => setFormData({ ...formData, university_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select university" />
                        </SelectTrigger>
                        <SelectContent>
                          {universities.map((uni) => (
                            <SelectItem key={uni.id} value={uni.id}>
                              {uni.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="faculty">Faculty</Label>
                      <Input
                        id="faculty"
                        value={formData.faculty}
                        onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="degree_type">Degree Type</Label>
                      <Select
                        value={formData.degree_type}
                        onValueChange={(value) => setFormData({ ...formData, degree_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select degree type" />
                        </SelectTrigger>
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
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entry_requirements">Entry Requirements</Label>
                    <Textarea
                      id="entry_requirements"
                      value={formData.entry_requirements}
                      onChange={(e) => setFormData({ ...formData, entry_requirements: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="duration_years">Duration (Years)</Label>
                      <Input
                        id="duration_years"
                        type="number"
                        min="1"
                        max="8"
                        value={formData.duration_years}
                        onChange={(e) => setFormData({ ...formData, duration_years: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
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

        {/* Subjects Dialog */}
        <Dialog open={isSubjectsDialogOpen} onOpenChange={setIsSubjectsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Subject Requirements for {selectedProgram?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select A-Level subjects required for this program and set minimum grades:
              </p>
              <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                {aLevelSubjects.map((subject) => {
                  const ps = programSubjects.find((p) => p.subject_id === subject.id);
                  return (
                    <div
                      key={subject.id}
                      className={`flex items-center gap-4 p-3 border rounded-lg transition-colors ${ps ? 'bg-primary/5 border-primary/30' : ''}`}
                    >
                      <Checkbox
                        checked={!!ps}
                        onCheckedChange={() => toggleSubject(subject.id)}
                      />
                      <span className="flex-1 font-medium">{subject.name}</span>
                      {ps && (
                        <>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm whitespace-nowrap">Required:</Label>
                            <Switch
                              checked={ps.is_required}
                              onCheckedChange={(checked) =>
                                updateSubjectRequirement(subject.id, "is_required", checked)
                              }
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm whitespace-nowrap">Min Grade:</Label>
                            <Select
                              value={ps.minimum_grade || "C"}
                              onValueChange={(value) =>
                                updateSubjectRequirement(subject.id, "minimum_grade", value)
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {GRADES.map((grade) => (
                                  <SelectItem key={grade} value={grade}>
                                    {grade}
                                  </SelectItem>
                                ))}
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
                <Button variant="outline" onClick={() => setIsSubjectsDialogOpen(false)}>
                  Cancel
                </Button>
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
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : programs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No programs found. Add one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Degree</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell className="font-medium">{program.name}</TableCell>
                      <TableCell>{program.universities?.name || "-"}</TableCell>
                      <TableCell>{program.faculty || "-"}</TableCell>
                      <TableCell>
                        {program.degree_type && (
                          <Badge variant="outline">{program.degree_type}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{program.duration_years ? `${program.duration_years} years` : "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            program.is_active
                              ? "bg-success/20 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {program.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openSubjectsDialog(program)}
                            title="Manage subject requirements"
                          >
                            <BookOpen className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(program)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(program.id)}
                            className="text-destructive hover:text-destructive"
                          >
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
