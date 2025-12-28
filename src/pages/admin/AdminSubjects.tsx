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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Subject {
  id: string;
  name: string;
  code: string | null;
  level: string;
  category: string | null;
  description: string | null;
  is_active: boolean | null;
}

const CATEGORIES = [
  "Sciences",
  "Arts",
  "Languages",
  "Commercials",
  "Technical",
  "Humanities",
];

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("O-Level");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    level: "O-Level",
    category: "",
    description: "",
    is_active: true,
  });

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("level")
        .order("name");

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast({
        title: "Error",
        description: "Failed to load subjects",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingSubject) {
        const { error } = await supabase
          .from("subjects")
          .update({
            name: formData.name,
            code: formData.code || null,
            level: formData.level,
            category: formData.category || null,
            description: formData.description || null,
            is_active: formData.is_active,
          })
          .eq("id", editingSubject.id);

        if (error) throw error;
        toast({ title: "Success", description: "Subject updated successfully" });
      } else {
        const { error } = await supabase.from("subjects").insert({
          name: formData.name,
          code: formData.code || null,
          level: formData.level,
          category: formData.category || null,
          description: formData.description || null,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast({ title: "Success", description: "Subject added successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSubjects();
    } catch (error) {
      console.error("Error saving subject:", error);
      toast({
        title: "Error",
        description: "Failed to save subject",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    try {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Subject deleted successfully" });
      fetchSubjects();
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast({
        title: "Error",
        description: "Failed to delete subject. It may be in use.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code || "",
      level: subject.level,
      category: subject.category || "",
      description: subject.description || "",
      is_active: subject.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSubject(null);
    setFormData({
      name: "",
      code: "",
      level: activeTab,
      category: "",
      description: "",
      is_active: true,
    });
  };

  const oLevelSubjects = subjects.filter((s) => s.level === "O-Level");
  const aLevelSubjects = subjects.filter((s) => s.level === "A-Level");

  const SubjectsTable = ({ data }: { data: Subject[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((subject) => (
          <TableRow key={subject.id}>
            <TableCell className="font-medium">{subject.name}</TableCell>
            <TableCell>{subject.code || "-"}</TableCell>
            <TableCell>
              {subject.category && (
                <Badge variant="secondary">{subject.category}</Badge>
              )}
            </TableCell>
            <TableCell>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  subject.is_active
                    ? "bg-success/20 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {subject.is_active ? "Active" : "Inactive"}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(subject)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(subject.id)}
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
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Subjects</h1>
            <p className="text-muted-foreground mt-1">
              Manage O-Level and A-Level subjects
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setFormData({ ...formData, level: activeTab })}>
                <Plus className="w-4 h-4" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingSubject ? "Edit Subject" : "Add Subject"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g., 4024"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="level">Level *</Label>
                    <Select
                      value={formData.level}
                      onValueChange={(value) => setFormData({ ...formData, level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="O-Level">O-Level</SelectItem>
                        <SelectItem value="A-Level">A-Level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
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
                    rows={2}
                  />
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
                    {editingSubject ? "Update" : "Add"} Subject
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
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b px-4">
                  <TabsList className="bg-transparent">
                    <TabsTrigger value="O-Level" className="data-[state=active]:bg-primary/10">
                      O-Level ({oLevelSubjects.length})
                    </TabsTrigger>
                    <TabsTrigger value="A-Level" className="data-[state=active]:bg-primary/10">
                      A-Level ({aLevelSubjects.length})
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="O-Level" className="m-0">
                  {oLevelSubjects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No O-Level subjects found.
                    </div>
                  ) : (
                    <SubjectsTable data={oLevelSubjects} />
                  )}
                </TabsContent>
                <TabsContent value="A-Level" className="m-0">
                  {aLevelSubjects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No A-Level subjects found.
                    </div>
                  ) : (
                    <SubjectsTable data={aLevelSubjects} />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
