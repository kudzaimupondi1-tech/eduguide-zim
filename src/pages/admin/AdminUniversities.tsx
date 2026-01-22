import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Upload, Loader2, ExternalLink, Image, Sparkles, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface University {
  id: string;
  name: string;
  short_name: string | null;
  location: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  type: string | null;
  faculties: string[] | null;
  accreditation: string | null;
  established_year: number | null;
  is_active: boolean | null;
}

interface UniversityImage {
  id: string;
  university_id: string;
  image_url: string;
  image_type: string | null;
  title: string | null;
  extracted_info: unknown;
}

export default function AdminUniversities() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImagesDialogOpen, setIsImagesDialogOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [universityImages, setUniversityImages] = useState<UniversityImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [extractingInfo, setExtractingInfo] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    short_name: "",
    location: "",
    description: "",
    website: "",
    logo_url: "",
    type: "public",
    faculties: "",
    accreditation: "",
    established_year: "",
    is_active: true,
  });

  const [imageUpload, setImageUpload] = useState({
    title: "",
    image_type: "general",
  });

  const fetchUniversities = async () => {
    try {
      const { data, error } = await supabase
        .from("universities")
        .select("*")
        .order("name");

      if (error) throw error;
      
      // Parse faculties from JSON
      const parsed = (data || []).map((uni) => ({
        ...uni,
        faculties: uni.faculties ? (Array.isArray(uni.faculties) ? uni.faculties : []) : [],
      }));
      
      setUniversities(parsed as University[]);
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

  const fetchUniversityImages = async (universityId: string) => {
    try {
      const { data, error } = await supabase
        .from("university_images")
        .select("*")
        .eq("university_id", universityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUniversityImages(data || []);
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  useEffect(() => {
    fetchUniversities();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        description: "Logo uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUniversity) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `images/${selectedUniversity.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("university-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("university-images")
        .getPublicUrl(filePath);

      // Insert image record
      const { error: insertError } = await supabase
        .from("university_images")
        .insert({
          university_id: selectedUniversity.id,
          image_url: publicUrl,
          title: imageUpload.title || null,
          image_type: imageUpload.image_type,
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });

      // Reset and refresh
      setImageUpload({ title: "", image_type: "general" });
      fetchUniversityImages(selectedUniversity.id);
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

  const extractInfoFromImage = async (image: UniversityImage) => {
    setExtractingInfo(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-image-info", {
        body: { imageUrl: image.image_url },
      });

      if (error) throw error;

      if (data?.extractedInfo) {
        // Update the image with extracted info
        const { error: updateError } = await supabase
          .from("university_images")
          .update({ extracted_info: data.extractedInfo })
          .eq("id", image.id);

        if (updateError) throw updateError;

        // Optionally update university with extracted data
        if (selectedUniversity && data.extractedInfo) {
          const updates: Record<string, unknown> = {};
          const info = data.extractedInfo;

          if (info.name && !selectedUniversity.name) updates.name = info.name;
          if (info.shortName && !selectedUniversity.short_name) updates.short_name = info.shortName;
          if (info.location && !selectedUniversity.location) updates.location = info.location;
          if (info.description && !selectedUniversity.description) updates.description = info.description;
          if (info.faculties?.length && (!selectedUniversity.faculties || selectedUniversity.faculties.length === 0)) {
            updates.faculties = info.faculties;
          }
          if (info.accreditation && !selectedUniversity.accreditation) updates.accreditation = info.accreditation;
          if (info.establishedYear && !selectedUniversity.established_year) updates.established_year = info.establishedYear;
          if (info.contactInfo?.website && !selectedUniversity.website) updates.website = info.contactInfo.website;

          if (Object.keys(updates).length > 0) {
            await supabase
              .from("universities")
              .update(updates)
              .eq("id", selectedUniversity.id);
            
            fetchUniversities();
          }
        }

        toast({
          title: "Success",
          description: "Information extracted successfully",
        });

        fetchUniversityImages(selectedUniversity!.id);
      }
    } catch (error) {
      console.error("Error extracting info:", error);
      toast({
        title: "Error",
        description: "Failed to extract information from image",
        variant: "destructive",
      });
    } finally {
      setExtractingInfo(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!confirm("Delete this image?")) return;

    try {
      const { error } = await supabase
        .from("university_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;

      toast({ title: "Success", description: "Image deleted" });
      if (selectedUniversity) {
        fetchUniversityImages(selectedUniversity.id);
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const facultiesArray = formData.faculties
        ? formData.faculties.split(",").map((f) => f.trim()).filter(Boolean)
        : [];

      const payload = {
        name: formData.name,
        short_name: formData.short_name || null,
        location: formData.location || null,
        description: formData.description || null,
        website: formData.website || null,
        logo_url: formData.logo_url || null,
        type: formData.type,
        faculties: facultiesArray,
        accreditation: formData.accreditation || null,
        established_year: formData.established_year ? parseInt(formData.established_year) : null,
        is_active: formData.is_active,
      };

      if (editingUniversity) {
        const { error } = await supabase
          .from("universities")
          .update(payload)
          .eq("id", editingUniversity.id);

        if (error) throw error;
        toast({ title: "Success", description: "University updated successfully" });
      } else {
        const { error } = await supabase.from("universities").insert(payload);
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
      short_name: university.short_name || "",
      location: university.location || "",
      description: university.description || "",
      website: university.website || "",
      logo_url: university.logo_url || "",
      type: university.type || "public",
      faculties: university.faculties?.join(", ") || "",
      accreditation: university.accreditation || "",
      established_year: university.established_year?.toString() || "",
      is_active: university.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const openImagesDialog = (university: University) => {
    setSelectedUniversity(university);
    fetchUniversityImages(university.id);
    setIsImagesDialogOpen(true);
  };

  const resetForm = () => {
    setEditingUniversity(null);
    setFormData({
      name: "",
      short_name: "",
      location: "",
      description: "",
      website: "",
      logo_url: "",
      type: "public",
      faculties: "",
      accreditation: "",
      established_year: "",
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
              Manage universities, upload images, and extract information with AI
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
                    <Label htmlFor="short_name">Short Name</Label>
                    <Input
                      id="short_name"
                      value={formData.short_name}
                      onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                      placeholder="e.g., UZ, NUST"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
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

                <div className="grid gap-4 md:grid-cols-2">
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
                    <Label htmlFor="established_year">Established Year</Label>
                    <Input
                      id="established_year"
                      type="number"
                      value={formData.established_year}
                      onChange={(e) => setFormData({ ...formData, established_year: e.target.value })}
                      placeholder="e.g., 1955"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="faculties">Faculties (comma-separated)</Label>
                  <Input
                    id="faculties"
                    value={formData.faculties}
                    onChange={(e) => setFormData({ ...formData, faculties: e.target.value })}
                    placeholder="Arts, Commerce, Engineering, Medicine"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accreditation">Accreditation</Label>
                  <Input
                    id="accreditation"
                    value={formData.accreditation}
                    onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}
                    placeholder="e.g., ZIMCHE Accredited"
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
                        onChange={handleLogoUpload}
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

        {/* Images Dialog */}
        <Dialog open={isImagesDialogOpen} onOpenChange={setIsImagesDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                {selectedUniversity?.name} - Images & AI Extraction
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="upload" className="mt-4">
              <TabsList>
                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                <TabsTrigger value="gallery">Gallery ({universityImages.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Image Title</Label>
                    <Input
                      value={imageUpload.title}
                      onChange={(e) => setImageUpload({ ...imageUpload, title: e.target.value })}
                      placeholder="e.g., Campus View, Admission Poster"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Image Type</Label>
                    <Select
                      value={imageUpload.image_type}
                      onValueChange={(value) => setImageUpload({ ...imageUpload, image_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="campus">Campus</SelectItem>
                        <SelectItem value="brochure">Brochure</SelectItem>
                        <SelectItem value="admission">Admission Info</SelectItem>
                        <SelectItem value="programs">Programs</SelectItem>
                        <SelectItem value="fees">Fees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                    id="image-upload"
                  />
                  <Label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground">
                      {uploadingImage ? "Uploading..." : "Click to upload an image"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Upload university brochures, admission posters, or any informational images
                    </span>
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="gallery" className="space-y-4">
                {universityImages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No images uploaded yet
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {universityImages.map((image) => (
                      <Card key={image.id}>
                        <CardContent className="p-4">
                          <div className="relative aspect-video mb-3 rounded overflow-hidden bg-muted">
                            <img
                              src={image.image_url}
                              alt={image.title || "University image"}
                              className="w-full h-full object-contain"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 w-7 h-7"
                              onClick={() => deleteImage(image.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              {image.title && (
                                <p className="font-medium text-sm">{image.title}</p>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {image.image_type || "general"}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => extractInfoFromImage(image)}
                              disabled={extractingInfo}
                              className="gap-1"
                            >
                              {extractingInfo ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                              Extract Info
                            </Button>
                          </div>

                          {image.extracted_info && typeof image.extracted_info === 'object' && Object.keys(image.extracted_info as object).length > 0 && (
                            <div className="mt-3 p-3 bg-muted rounded text-xs">
                              <p className="font-medium mb-1 text-primary">Extracted Information:</p>
                              <pre className="whitespace-pre-wrap overflow-x-auto max-h-40">
                                {JSON.stringify(image.extracted_info, null, 2)}
                              </pre>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

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
                    <TableHead>Type</TableHead>
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
                          <div className="w-10 h-10 bg-primary rounded flex items-center justify-center text-primary-foreground text-xs font-bold">
                            {university.short_name || university.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{university.name}</p>
                          {university.short_name && (
                            <p className="text-xs text-muted-foreground">{university.short_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{university.location || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={university.type === "private" ? "secondary" : "default"}>
                          {university.type || "public"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            university.is_active
                              ? "bg-green-500/20 text-green-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {university.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openImagesDialog(university)}
                            title="Manage Images"
                          >
                            <Image className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(university)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(university.id)}
                            className="text-destructive hover:text-destructive"
                            title="Delete"
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
