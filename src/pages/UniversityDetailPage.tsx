import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Globe,
  Phone,
  Mail,
  GraduationCap,
  Building2,
  Calendar,
  Award,
  ChevronLeft,
  Loader2,
  BookOpen,
  Users,
  Image as ImageIcon,
} from "lucide-react";

interface University {
  id: string;
  name: string;
  short_name: string | null;
  location: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  type: string | null;
  programs_count: number | null;
  faculties: string[] | null;
  admission_requirements: Record<string, unknown> | null;
  contact_info: Record<string, string> | null;
  accreditation: string | null;
  established_year: number | null;
  is_active: boolean | null;
}

interface UniversityImage {
  id: string;
  image_url: string;
  image_type: string | null;
  title: string | null;
  extracted_info: unknown;
}

interface Program {
  id: string;
  name: string;
  faculty: string | null;
  degree_type: string | null;
  duration_years: number | null;
  description: string | null;
  entry_requirements: string | null;
}

export default function UniversityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [university, setUniversity] = useState<University | null>(null);
  const [images, setImages] = useState<UniversityImage[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchUniversityData();
    }
  }, [id]);

  const fetchUniversityData = async () => {
    try {
      // Fetch university details
      const { data: uniData, error: uniError } = await supabase
        .from("universities")
        .select("*")
        .eq("id", id)
        .single();

      if (uniError) throw uniError;
      
      // Parse JSON fields properly
      const parsedUni: University = {
        ...uniData,
        faculties: uniData.faculties ? (typeof uniData.faculties === 'string' ? JSON.parse(uniData.faculties) : uniData.faculties) : [],
        admission_requirements: uniData.admission_requirements ? (typeof uniData.admission_requirements === 'string' ? JSON.parse(uniData.admission_requirements) : uniData.admission_requirements) : {},
        contact_info: uniData.contact_info ? (typeof uniData.contact_info === 'string' ? JSON.parse(uniData.contact_info) : uniData.contact_info) : {},
      };
      
      setUniversity(parsedUni);

      // Fetch university images
      const { data: imgData, error: imgError } = await supabase
        .from("university_images")
        .select("*")
        .eq("university_id", id)
        .order("created_at", { ascending: false });

      if (!imgError && imgData) {
        setImages(imgData);
      }

      // Fetch programs for this university
      const { data: progData, error: progError } = await supabase
        .from("programs")
        .select("*")
        .eq("university_id", id)
        .eq("is_active", true)
        .order("name");

      if (!progError && progData) {
        setPrograms(progData);
      }
    } catch (error) {
      console.error("Error fetching university:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!university) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center">
          <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">University Not Found</h1>
          <p className="text-muted-foreground mb-4">The university you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/universities">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Universities
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const faculties = Array.isArray(university.faculties) ? university.faculties : [];
  const contactInfo = university.contact_info || {};
  const admissionReqs = university.admission_requirements || {};

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/universities">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Universities
            </Link>
          </Button>

          {/* Hero Section */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent mb-8">
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 md:p-12">
              {/* Logo */}
              <div className="shrink-0">
                {university.logo_url ? (
                  <img
                    src={university.logo_url}
                    alt={university.name}
                    className="w-32 h-32 md:w-40 md:h-40 object-contain rounded-2xl bg-white p-4 shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                    <span className="text-3xl md:text-4xl font-bold text-primary-foreground">
                      {university.short_name || university.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-3">
                  <Badge variant="secondary">{university.type || "Public"}</Badge>
                  {university.accreditation && (
                    <Badge variant="outline" className="gap-1">
                      <Award className="w-3 h-3" />
                      {university.accreditation}
                    </Badge>
                  )}
                </div>
                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3">
                  {university.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start text-muted-foreground">
                  {university.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {university.location}
                    </span>
                  )}
                  {university.established_year && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Est. {university.established_year}
                    </span>
                  )}
                  {programs.length > 0 && (
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-4 h-4" />
                      {programs.length} Programs
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {university.website && (
                  <Button asChild>
                    <a href={university.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4 mr-2" />
                      Visit Website
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="programs">Programs</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Description */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {university.description || "No description available for this university."}
                    </p>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Facts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium">{university.type || "Public"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Programs</p>
                        <p className="font-medium">{programs.length}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Faculties</p>
                        <p className="font-medium">{faculties.length || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Faculties */}
              {faculties.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Faculties & Schools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {faculties.map((faculty, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {String(faculty)}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Admission Requirements */}
              {Object.keys(admissionReqs).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Admission Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3">
                      {Object.entries(admissionReqs).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-sm font-medium text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}
                          </dt>
                          <dd className="text-foreground">
                            {Array.isArray(value) ? value.join(", ") : String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Programs Tab */}
            <TabsContent value="programs">
              {programs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Programs Listed</h3>
                    <p className="text-muted-foreground">
                      Program information for this university has not been added yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {programs.map((program) => (
                    <Card key={program.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg">{program.name}</CardTitle>
                          {program.degree_type && (
                            <Badge variant="outline">{program.degree_type}</Badge>
                          )}
                        </div>
                        {program.faculty && (
                          <p className="text-sm text-muted-foreground">{program.faculty}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {program.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {program.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {program.duration_years && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {program.duration_years} years
                            </span>
                          )}
                        </div>
                        {program.entry_requirements && (
                          <p className="text-xs text-muted-foreground mt-3 border-t pt-3">
                            <strong>Requirements:</strong> {program.entry_requirements}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery">
              {images.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Images Available</h3>
                    <p className="text-muted-foreground">
                      Images for this university have not been uploaded yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((image) => (
                      <div
                        key={image.id}
                        className="relative group cursor-pointer rounded-lg overflow-hidden aspect-square"
                        onClick={() => setSelectedImage(image.image_url)}
                      >
                        <img
                          src={image.image_url}
                          alt={image.title || "University image"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <div className="text-white">
                            {image.title && (
                              <p className="font-medium text-sm">{image.title}</p>
                            )}
                            <Badge variant="secondary" className="text-xs mt-1">
                              {image.image_type || "General"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Extracted Info from Images */}
                  {images.some(img => img.extracted_info && Object.keys(img.extracted_info).length > 0) && (
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Information Extracted from Images
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {images
                            .filter(img => img.extracted_info && Object.keys(img.extracted_info).length > 0)
                            .map((image) => (
                              <div key={image.id} className="border rounded-lg p-4">
                                <h4 className="font-medium mb-2">{image.title || "Extracted Information"}</h4>
                                <pre className="text-sm text-muted-foreground bg-muted p-3 rounded overflow-x-auto">
                                  {JSON.stringify(image.extracted_info, null, 2)}
                                </pre>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Image Modal */}
              {selectedImage && (
                <div
                  className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                  onClick={() => setSelectedImage(null)}
                >
                  <img
                    src={selectedImage}
                    alt="Full size"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              )}
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {university.website && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Website</p>
                        <a
                          href={university.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          {university.website}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {contactInfo.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{contactInfo.phone}</p>
                      </div>
                    </div>
                  )}

                  {contactInfo.email && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <a
                          href={`mailto:${contactInfo.email}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {contactInfo.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {contactInfo.address && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">{contactInfo.address}</p>
                      </div>
                    </div>
                  )}

                  {!university.website && !contactInfo.phone && !contactInfo.email && !contactInfo.address && (
                    <p className="text-muted-foreground">No contact information available.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
