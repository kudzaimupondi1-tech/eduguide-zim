import { useState, useEffect } from "react";
import { Search, Briefcase, TrendingUp, GraduationCap, ArrowRight, Loader2, MapPin, DollarSign, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Career {
  id: string;
  name: string;
  field: string | null;
  description: string | null;
  salary_range: string | null;
  job_outlook: string | null;
  skills_required: string[] | null;
}

const CareersPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCareers();
  }, []);

  const fetchCareers = async () => {
    try {
      const { data, error } = await supabase
        .from("careers")
        .select("*")
        .eq("is_active", true)
        .order("field", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setCareers(data || []);
    } catch (error) {
      console.error("Error fetching careers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique fields for filtering
  const fields = [...new Set(careers.map(c => c.field).filter(Boolean))];

  const filteredCareers = careers.filter((career) => {
    const matchesSearch = 
      career.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (career.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (career.field?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesField = !selectedField || career.field === selectedField;
    
    return matchesSearch && matchesField;
  });

  // Group careers by field
  const groupedCareers = filteredCareers.reduce((acc, career) => {
    const field = career.field || "Other";
    if (!acc[field]) acc[field] = [];
    acc[field].push(career);
    return acc;
  }, {} as Record<string, Career[]>);

  const getDemandColor = (outlook: string | null) => {
    if (!outlook) return "text-muted-foreground";
    const lower = outlook.toLowerCase();
    if (lower.includes("very high") || lower.includes("high demand") || lower.includes("growing rapidly")) {
      return "text-green-600 dark:text-green-400";
    }
    if (lower.includes("growing") || lower.includes("stable")) {
      return "text-blue-600 dark:text-blue-400";
    }
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block px-4 py-1 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
              <Briefcase className="w-4 h-4 inline mr-1" />
              Career Paths
            </span>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Explore Career Opportunities
            </h1>
            <p className="text-muted-foreground text-lg">
              Discover {careers.length}+ rewarding career paths available in Zimbabwe
            </p>
          </div>

          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search careers by name, field, or description..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Field Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedField === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedField(null)}
              >
                All Fields
              </Button>
              {fields.map((field) => (
                <Button
                  key={field}
                  variant={selectedField === field ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedField(selectedField === field ? null : field)}
                >
                  {field}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredCareers.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                No careers found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or filters
              </p>
            </div>
          ) : (
            /* Grouped Careers */
            <div className="space-y-12">
              {Object.entries(groupedCareers).map(([field, fieldCareers]) => (
                <div key={field}>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    {field}
                    <Badge variant="secondary">{fieldCareers.length}</Badge>
                  </h2>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fieldCareers.map((career, index) => (
                      <Card
                        key={career.id}
                        className="group hover:border-primary/30 hover:shadow-lg transition-all duration-300 opacity-0 animate-fadeUp"
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {career.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {career.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {career.description}
                            </p>
                          )}
                          
                          {/* Stats */}
                          <div className="space-y-2">
                            {career.salary_range && (
                              <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="w-4 h-4 text-green-500" />
                                <span className="font-medium">{career.salary_range}</span>
                              </div>
                            )}
                            {career.job_outlook && (
                              <div className="flex items-center gap-2 text-sm">
                                <TrendingUp className={`w-4 h-4 ${getDemandColor(career.job_outlook)}`} />
                                <span className={getDemandColor(career.job_outlook)}>{career.job_outlook}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Skills */}
                          {career.skills_required && career.skills_required.length > 0 && (
                            <div className="pt-3 border-t">
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Key Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {career.skills_required.slice(0, 3).map((skill, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {career.skills_required.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{career.skills_required.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA Section */}
          <div className="text-center mt-16 p-8 rounded-2xl bg-muted">
            <h2 className="font-display text-2xl font-bold text-foreground mb-4">
              Not sure which career is right for you?
            </h2>
            <p className="text-muted-foreground mb-6">
              Let our AI-powered guidance system help you find the perfect career path based on your subjects and grades.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/career-guidance" className="group">
                Get AI Career Recommendations
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CareersPage;
