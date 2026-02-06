import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, GraduationCap, BookOpen } from "lucide-react";

interface Grade {
  grade: string;
  points: number;
  description: string;
}

interface GradingStructure {
  id: string;
  name: string;
  level: string;
  grades: Grade[];
  pass_threshold: string | null;
  is_active: boolean;
}

export default function AdminGrading() {
  const [structures, setStructures] = useState<GradingStructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<GradingStructure | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    level: "O-Level",
    pass_threshold: "",
    grades: [{ grade: "", points: 0, description: "" }] as Grade[],
  });

  useEffect(() => {
    fetchStructures();
  }, []);

  const fetchStructures = async () => {
    try {
      const { data, error } = await supabase
        .from("grading_structures")
        .select("*")
        .order("level", { ascending: true });

      if (error) throw error;
      const mappedData = (data || []).map((item) => ({
        ...item,
        grades: (item.grades as unknown as Grade[]) || [],
      }));
      setStructures(mappedData);
    } catch (error) {
      console.error("Error fetching grading structures:", error);
      toast.error("Failed to load grading structures");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validGrades = formData.grades.filter((g) => g.grade.trim());
      const payload = {
        name: formData.name,
        level: formData.level,
        grades: validGrades as unknown as any,
        pass_threshold: formData.pass_threshold || null,
        is_active: true,
      };

      if (editingStructure) {
        const { error } = await supabase
          .from("grading_structures")
          .update(payload)
          .eq("id", editingStructure.id);
        if (error) throw error;
        toast.success("Grading structure updated");
      } else {
        const { error } = await supabase.from("grading_structures").insert([payload]);
        if (error) throw error;
        toast.success("Grading structure created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchStructures();
    } catch (error) {
      console.error("Error saving grading structure:", error);
      toast.error("Failed to save grading structure");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      level: "O-Level",
      pass_threshold: "",
      grades: [{ grade: "", points: 0, description: "" }],
    });
    setEditingStructure(null);
  };

  const openEditDialog = (structure: GradingStructure) => {
    setEditingStructure(structure);
    setFormData({
      name: structure.name,
      level: structure.level,
      pass_threshold: structure.pass_threshold || "",
      grades: structure.grades || [{ grade: "", points: 0, description: "" }],
    });
    setIsDialogOpen(true);
  };

  const updateGrade = (index: number, field: keyof Grade, value: string | number) => {
    const newGrades = [...formData.grades];
    newGrades[index] = { ...newGrades[index], [field]: value };
    setFormData({ ...formData, grades: newGrades });
  };

  const addGrade = () => {
    setFormData({
      ...formData,
      grades: [...formData.grades, { grade: "", points: formData.grades.length + 1, description: "" }],
    });
  };

  const removeGrade = (index: number) => {
    setFormData({
      ...formData,
      grades: formData.grades.filter((_, i) => i !== index),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Grading Structures</h1>
            <p className="text-muted-foreground mt-1">Configure ZIMSEC grading systems</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Structure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingStructure ? "Edit Grading Structure" : "Add Grading Structure"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., ZIMSEC O-Level"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="level">Level</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    >
                      <option value="O-Level">O-Level</option>
                      <option value="A-Level">A-Level</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pass_threshold">Pass Threshold Grade</Label>
                  <Input
                    id="pass_threshold"
                    value={formData.pass_threshold}
                    onChange={(e) => setFormData({ ...formData, pass_threshold: e.target.value })}
                    placeholder="e.g., E"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Grades</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addGrade}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Grade
                    </Button>
                  </div>
                  
                  {formData.grades.map((grade, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 items-end p-3 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="text-xs">Grade</Label>
                        <Input
                          value={grade.grade}
                          onChange={(e) => updateGrade(index, "grade", e.target.value)}
                          placeholder="A"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Points</Label>
                        <Input
                          type="number"
                          value={grade.points}
                          onChange={(e) => updateGrade(index, "points", parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={grade.description}
                          onChange={(e) => updateGrade(index, "description", e.target.value)}
                          placeholder="Excellent"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGrade(index)}
                        disabled={formData.grades.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingStructure ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {isLoading ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">Loading...</div>
          ) : structures.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">No grading structures defined</div>
          ) : (
            structures.map((structure) => (
              <Card key={structure.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {structure.level === "O-Level" ? (
                        <BookOpen className="w-5 h-5 text-primary" />
                      ) : (
                        <GraduationCap className="w-5 h-5 text-secondary" />
                      )}
                      <CardTitle>{structure.name}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(structure)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    {structure.level} • Pass threshold: {structure.pass_threshold || "Not set"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grade</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {structure.grades?.map((grade, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant={
                              grade.grade === structure.pass_threshold ? "default" :
                              grade.points <= 3 ? "secondary" : "outline"
                            }>
                              {grade.grade}
                            </Badge>
                          </TableCell>
                          <TableCell>{grade.points}</TableCell>
                          <TableCell className="text-muted-foreground">{grade.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
