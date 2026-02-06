import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Calendar, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  deadline_type: string;
  deadline_date: string;
  university_id: string | null;
  level: string | null;
  is_active: boolean;
  university?: { name: string };
}

interface University {
  id: string;
  name: string;
}

export default function AdminDeadlines() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadline_type: "exam",
    deadline_date: "",
    university_id: "",
    level: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deadlinesRes, universitiesRes] = await Promise.all([
        supabase
          .from("deadlines")
          .select("*, university:universities(name)")
          .order("deadline_date", { ascending: true }),
        supabase.from("universities").select("id, name").eq("is_active", true),
      ]);

      if (deadlinesRes.error) throw deadlinesRes.error;
      if (universitiesRes.error) throw universitiesRes.error;

      setDeadlines(deadlinesRes.data || []);
      setUniversities(universitiesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load deadlines");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        deadline_type: formData.deadline_type,
        deadline_date: formData.deadline_date,
        university_id: formData.university_id || null,
        level: formData.level || null,
        is_active: true,
      };

      if (editingDeadline) {
        const { error } = await supabase
          .from("deadlines")
          .update(payload)
          .eq("id", editingDeadline.id);
        if (error) throw error;
        toast.success("Deadline updated");
      } else {
        const { error } = await supabase.from("deadlines").insert(payload);
        if (error) throw error;
        toast.success("Deadline created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving deadline:", error);
      toast.error("Failed to save deadline");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this deadline?")) return;
    try {
      const { error } = await supabase.from("deadlines").delete().eq("id", id);
      if (error) throw error;
      toast.success("Deadline deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting deadline:", error);
      toast.error("Failed to delete deadline");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      deadline_type: "exam",
      deadline_date: "",
      university_id: "",
      level: "",
    });
    setEditingDeadline(null);
  };

  const openEditDialog = (deadline: Deadline) => {
    setEditingDeadline(deadline);
    setFormData({
      title: deadline.title,
      description: deadline.description || "",
      deadline_type: deadline.deadline_type,
      deadline_date: deadline.deadline_date.split("T")[0],
      university_id: deadline.university_id || "",
      level: deadline.level || "",
    });
    setIsDialogOpen(true);
  };

  const getDaysRemaining = (date: string) => {
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return { text: "Passed", variant: "secondary" as const };
    if (days === 0) return { text: "Today!", variant: "destructive" as const };
    if (days <= 7) return { text: `${days} days`, variant: "destructive" as const };
    if (days <= 30) return { text: `${days} days`, variant: "default" as const };
    return { text: `${days} days`, variant: "secondary" as const };
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      exam: "bg-red-100 text-red-800",
      application: "bg-blue-100 text-blue-800",
      registration: "bg-green-100 text-green-800",
      result: "bg-purple-100 text-purple-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || "bg-gray-100 text-gray-800"}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Deadlines</h1>
            <p className="text-muted-foreground mt-1">Manage exam and application deadlines</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Deadline
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingDeadline ? "Edit Deadline" : "Add Deadline"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., ZIMSEC June Exam Registration"
                    required
                  />
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.deadline_type} onValueChange={(v) => setFormData({ ...formData, deadline_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exam">Exam</SelectItem>
                        <SelectItem value="application">Application</SelectItem>
                        <SelectItem value="registration">Registration</SelectItem>
                        <SelectItem value="result">Result Release</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline_date">Date</Label>
                    <Input
                      id="deadline_date"
                      type="date"
                      value={formData.deadline_date}
                      onChange={(e) => setFormData({ ...formData, deadline_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>University (optional)</Label>
                    <Select value={formData.university_id} onValueChange={(v) => setFormData({ ...formData, university_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select university" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">General</SelectItem>
                        {universities.map((uni) => (
                          <SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Level (optional)</Label>
                    <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Levels</SelectItem>
                        <SelectItem value="O-Level">O-Level</SelectItem>
                        <SelectItem value="A-Level">A-Level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingDeadline ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              All Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : deadlines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No deadlines yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Time Left</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deadlines.map((deadline) => {
                    const remaining = getDaysRemaining(deadline.deadline_date);
                    return (
                      <TableRow key={deadline.id}>
                        <TableCell className="font-medium">{deadline.title}</TableCell>
                        <TableCell>{getTypeBadge(deadline.deadline_type)}</TableCell>
                        <TableCell>{format(new Date(deadline.deadline_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>{deadline.university?.name || "General"}</TableCell>
                        <TableCell>{deadline.level || "All"}</TableCell>
                        <TableCell>
                          <Badge variant={remaining.variant}>{remaining.text}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(deadline)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(deadline.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
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
      </div>
    </AdminLayout>
  );
}
