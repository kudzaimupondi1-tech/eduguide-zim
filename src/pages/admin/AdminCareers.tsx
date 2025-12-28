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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Career {
  id: string;
  name: string;
  field: string | null;
  description: string | null;
  skills_required: string[] | null;
  salary_range: string | null;
  job_outlook: string | null;
  is_active: boolean | null;
}

export default function AdminCareers() {
  const [careers, setCareers] = useState<Career[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCareer, setEditingCareer] = useState<Career | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    field: "",
    description: "",
    skills_required: "",
    salary_range: "",
    job_outlook: "",
    is_active: true,
  });

  const fetchCareers = async () => {
    try {
      const { data, error } = await supabase
        .from("careers")
        .select("*")
        .order("name");

      if (error) throw error;
      setCareers(data || []);
    } catch (error) {
      console.error("Error fetching careers:", error);
      toast({
        title: "Error",
        description: "Failed to load careers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCareers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const skillsArray = formData.skills_required
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    try {
      if (editingCareer) {
        const { error } = await supabase
          .from("careers")
          .update({
            name: formData.name,
            field: formData.field || null,
            description: formData.description || null,
            skills_required: skillsArray.length > 0 ? skillsArray : null,
            salary_range: formData.salary_range || null,
            job_outlook: formData.job_outlook || null,
            is_active: formData.is_active,
          })
          .eq("id", editingCareer.id);

        if (error) throw error;
        toast({ title: "Success", description: "Career updated successfully" });
      } else {
        const { error } = await supabase.from("careers").insert({
          name: formData.name,
          field: formData.field || null,
          description: formData.description || null,
          skills_required: skillsArray.length > 0 ? skillsArray : null,
          salary_range: formData.salary_range || null,
          job_outlook: formData.job_outlook || null,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast({ title: "Success", description: "Career added successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCareers();
    } catch (error) {
      console.error("Error saving career:", error);
      toast({
        title: "Error",
        description: "Failed to save career",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this career?")) return;

    try {
      const { error } = await supabase.from("careers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Career deleted successfully" });
      fetchCareers();
    } catch (error) {
      console.error("Error deleting career:", error);
      toast({
        title: "Error",
        description: "Failed to delete career",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (career: Career) => {
    setEditingCareer(career);
    setFormData({
      name: career.name,
      field: career.field || "",
      description: career.description || "",
      skills_required: career.skills_required?.join(", ") || "",
      salary_range: career.salary_range || "",
      job_outlook: career.job_outlook || "",
      is_active: career.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCareer(null);
    setFormData({
      name: "",
      field: "",
      description: "",
      skills_required: "",
      salary_range: "",
      job_outlook: "",
      is_active: true,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Careers</h1>
            <p className="text-muted-foreground mt-1">
              Manage career paths and opportunities
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Career
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCareer ? "Edit Career" : "Add Career"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Career Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="field">Field</Label>
                    <Input
                      id="field"
                      value={formData.field}
                      onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                      placeholder="e.g., Engineering, Medicine"
                    />
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
                  <Label htmlFor="skills_required">Skills Required (comma-separated)</Label>
                  <Input
                    id="skills_required"
                    value={formData.skills_required}
                    onChange={(e) => setFormData({ ...formData, skills_required: e.target.value })}
                    placeholder="e.g., Problem Solving, Communication, Technical Skills"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="salary_range">Salary Range</Label>
                    <Input
                      id="salary_range"
                      value={formData.salary_range}
                      onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                      placeholder="e.g., $50,000 - $80,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job_outlook">Job Outlook</Label>
                    <Input
                      id="job_outlook"
                      value={formData.job_outlook}
                      onChange={(e) => setFormData({ ...formData, job_outlook: e.target.value })}
                      placeholder="e.g., Growing, Stable"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingCareer ? "Update" : "Add"} Career
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : careers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No careers found. Add one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Career</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Salary Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {careers.map((career) => (
                    <TableRow key={career.id}>
                      <TableCell className="font-medium">{career.name}</TableCell>
                      <TableCell>{career.field || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {career.skills_required?.slice(0, 3).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {(career.skills_required?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(career.skills_required?.length || 0) - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{career.salary_range || "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            career.is_active
                              ? "bg-success/20 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {career.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(career)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(career.id)}
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
