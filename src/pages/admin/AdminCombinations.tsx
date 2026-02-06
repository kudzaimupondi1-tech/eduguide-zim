import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Layers, X } from "lucide-react";

interface SubjectCombination {
  id: string;
  name: string;
  description: string | null;
  level: string;
  subjects: string[];
  career_paths: string[] | null;
  is_active: boolean;
}

export default function AdminCombinations() {
  const [combinations, setCombinations] = useState<SubjectCombination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCombination, setEditingCombination] = useState<SubjectCombination | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level: "A-Level",
    subjects: [] as string[],
    career_paths: [] as string[],
    newSubject: "",
    newCareer: "",
  });

  useEffect(() => {
    fetchCombinations();
  }, []);

  const fetchCombinations = async () => {
    try {
      const { data, error } = await supabase
        .from("subject_combinations")
        .select("*")
        .order("name");

      if (error) throw error;
      const mappedData = (data || []).map((item) => ({
        ...item,
        subjects: (item.subjects as unknown as string[]) || [],
        career_paths: item.career_paths || [],
      }));
      setCombinations(mappedData);
    } catch (error) {
      console.error("Error fetching combinations:", error);
      toast.error("Failed to load subject combinations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        level: formData.level,
        subjects: formData.subjects,
        career_paths: formData.career_paths.length > 0 ? formData.career_paths : null,
        is_active: true,
      };

      if (editingCombination) {
        const { error } = await supabase
          .from("subject_combinations")
          .update(payload)
          .eq("id", editingCombination.id);
        if (error) throw error;
        toast.success("Combination updated");
      } else {
        const { error } = await supabase.from("subject_combinations").insert(payload);
        if (error) throw error;
        toast.success("Combination created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCombinations();
    } catch (error) {
      console.error("Error saving combination:", error);
      toast.error("Failed to save combination");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this combination?")) return;
    try {
      const { error } = await supabase.from("subject_combinations").delete().eq("id", id);
      if (error) throw error;
      toast.success("Combination deleted");
      fetchCombinations();
    } catch (error) {
      console.error("Error deleting combination:", error);
      toast.error("Failed to delete combination");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      level: "A-Level",
      subjects: [],
      career_paths: [],
      newSubject: "",
      newCareer: "",
    });
    setEditingCombination(null);
  };

  const openEditDialog = (combination: SubjectCombination) => {
    setEditingCombination(combination);
    setFormData({
      name: combination.name,
      description: combination.description || "",
      level: combination.level,
      subjects: combination.subjects || [],
      career_paths: combination.career_paths || [],
      newSubject: "",
      newCareer: "",
    });
    setIsDialogOpen(true);
  };

  const addSubject = () => {
    if (formData.newSubject.trim() && !formData.subjects.includes(formData.newSubject.trim())) {
      setFormData({
        ...formData,
        subjects: [...formData.subjects, formData.newSubject.trim()],
        newSubject: "",
      });
    }
  };

  const removeSubject = (subject: string) => {
    setFormData({
      ...formData,
      subjects: formData.subjects.filter((s) => s !== subject),
    });
  };

  const addCareer = () => {
    if (formData.newCareer.trim() && !formData.career_paths.includes(formData.newCareer.trim())) {
      setFormData({
        ...formData,
        career_paths: [...formData.career_paths, formData.newCareer.trim()],
        newCareer: "",
      });
    }
  };

  const removeCareer = (career: string) => {
    setFormData({
      ...formData,
      career_paths: formData.career_paths.filter((c) => c !== career),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Subject Combinations</h1>
            <p className="text-muted-foreground mt-1">Define valid A-Level subject combinations</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Combination
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCombination ? "Edit Combination" : "Add Combination"}
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
                      placeholder="e.g., Sciences"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Input value={formData.level} disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subjects</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.newSubject}
                      onChange={(e) => setFormData({ ...formData, newSubject: e.target.value })}
                      placeholder="Add a subject"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSubject())}
                    />
                    <Button type="button" onClick={addSubject} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.subjects.map((subject) => (
                      <Badge key={subject} variant="secondary" className="flex items-center gap-1">
                        {subject}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => removeSubject(subject)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Career Paths</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.newCareer}
                      onChange={(e) => setFormData({ ...formData, newCareer: e.target.value })}
                      placeholder="Add a career path"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCareer())}
                    />
                    <Button type="button" onClick={addCareer} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.career_paths.map((career) => (
                      <Badge key={career} variant="outline" className="flex items-center gap-1">
                        {career}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => removeCareer(career)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={formData.subjects.length < 2}>
                    {editingCombination ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              All Combinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : combinations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No combinations defined yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Career Paths</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinations.map((combo) => (
                    <TableRow key={combo.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{combo.name}</div>
                          {combo.description && (
                            <div className="text-sm text-muted-foreground">{combo.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {combo.subjects?.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {combo.career_paths?.map((c) => (
                            <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={combo.is_active ? "default" : "secondary"}>
                          {combo.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(combo)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(combo.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
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
