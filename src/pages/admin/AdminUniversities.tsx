import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Upload, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface University {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  is_active: boolean | null;
}

export default function AdminUniversities() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    website: "",
    logo_url: "",
    is_active: true,
  });

  const fetchUniversities = async () => {
    try {
      const { data, error } = await supabase
        .from("universities")
        .select("*")
        .order("name");

      if (error) throw error;
      setUniversities(data || []);
    } catch (error) {
      console.error("Error fetching universities:", error);
      toast({
        title: "Error",
        description: "Failed to load universities",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("university-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("university-images")
        .getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: publicUrl });
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUniversity) {
        const { error } = await supabase
          .from("universities")
          .update({
            name: formData.name,
            location: formData.location || null,
            description: formData.description || null,
            website: formData.website || null,
            logo_url: formData.logo_url || null,
            is_active: formData.is_active,
          })
          .eq("id", editingUniversity.id);

        if (error) throw error;
        toast({ title: "Success", description: "University updated successfully" });
      } else {
        const { error } = await supabase.from("universities").insert({
          name: formData.name,
          location: formData.location || null,
          description: formData.description || null,
          website: formData.website || null,
          logo_url: formData.logo_url || null,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast({ title: "Success", description: "University added successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchUniversities();
    } catch (error) {
      console.error("Error saving university:", error);
      toast({
        title: "Error",
        description: "Failed to save university",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this university?")) return;

    try {
      const { error } = await supabase.from("universities").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "University deleted successfully" });
      fetchUniversities();
    } catch (error) {
      console.error("Error deleting university:", error);
      toast({
        title: "Error",
        description: "Failed to delete university. It may have associated programs.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (university: University) => {
    setEditingUniversity(university);
    setFormData({
      name: university.name,
      location: university.location || "",
      description: university.description || "",
      website: university.website || "",
      logo_url: university.logo_url || "",
      is_active: university.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingUniversity(null);
    setFormData({
      name: "",
      location: "",
      description: "",
      website: "",
      logo_url: "",
      is_active: true,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Universities</h1>
            <p className="text-muted-foreground mt-1">
              Manage universities and their information
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add University
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingUniversity ? "Edit University" : "Add University"}
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
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    {formData.logo_url && (
                      <img
                        src={formData.logo_url}
                        alt="Logo preview"
                        className="w-16 h-16 object-contain rounded border"
                      />
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Label
                        htmlFor="logo-upload"
                        className="flex items-center gap-2 cursor-pointer px-4 py-2 border rounded-md hover:bg-muted transition-colors"
                      >
                        {uploadingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {uploadingImage ? "Uploading..." : "Upload Logo"}
                      </Label>
                    </div>
                  </div>
                  {formData.logo_url && (
                    <Input
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      placeholder="Or enter URL directly"
                      className="mt-2"
                    />
                  )}
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
                    {editingUniversity ? "Update" : "Add"} University
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
            ) : universities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No universities found. Add one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Logo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {universities.map((university) => (
                    <TableRow key={university.id}>
                      <TableCell>
                        {university.logo_url ? (
                          <img
                            src={university.logo_url}
                            alt={university.name}
                            className="w-10 h-10 object-contain rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                            N/A
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{university.name}</TableCell>
                      <TableCell>{university.location || "-"}</TableCell>
                      <TableCell>
                        {university.website ? (
                          <a
                            href={university.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            Visit <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            university.is_active
                              ? "bg-success/20 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {university.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(university)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(university.id)}
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
