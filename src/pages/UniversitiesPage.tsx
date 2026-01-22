import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, ExternalLink, GraduationCap, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface University {
  id: string;
  name: string;
  short_name: string | null;
  type: string | null;
  location: string | null;
  description: string | null;
  logo_url: string | null;
  faculties: unknown;
  programs_count: number | null;
  is_active: boolean | null;
}

const UniversitiesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "public" | "private">("all");
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [programCounts, setProgramCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      const { data, error } = await supabase
        .from("universities")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setUniversities(data || []);

      // Fetch program counts for each university
      const { data: programs } = await supabase
        .from("programs")
        .select("university_id")
        .eq("is_active", true);

      if (programs) {
        const counts: Record<string, number> = {};
        programs.forEach((p) => {
          counts[p.university_id] = (counts[p.university_id] || 0) + 1;
        });
        setProgramCounts(counts);
      }
    } catch (error) {
      console.error("Error fetching universities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUniversities = universities.filter((uni) => {
    const matchesSearch = uni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (uni.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = filterType === "all" || (uni.type?.toLowerCase() === filterType);
    return matchesSearch && matchesType;
  });

  const getFaculties = (uni: University): string[] => {
    if (!uni.faculties) return [];
    if (Array.isArray(uni.faculties)) return uni.faculties.map(String);
    return [];
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              <Building2 className="w-4 h-4 inline mr-1" />
              Universities
            </span>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Zimbabwean Universities
            </h1>
            <p className="text-muted-foreground text-lg">
              Explore degree programs from public and private universities across Zimbabwe
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto mb-12">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search universities or locations..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                onClick={() => setFilterType("all")}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterType === "public" ? "default" : "outline"}
                onClick={() => setFilterType("public")}
                size="sm"
              >
                Public
              </Button>
              <Button
                variant={filterType === "private" ? "default" : "outline"}
                onClick={() => setFilterType("private")}
                size="sm"
              >
                Private
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Results Count */}
              <p className="text-muted-foreground mb-6">
                Showing {filteredUniversities.length} {filteredUniversities.length === 1 ? "university" : "universities"}
              </p>

              {/* Universities Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUniversities.map((uni, index) => {
                  const faculties = getFaculties(uni);
                  const programCount = programCounts[uni.id] || uni.programs_count || 0;
                  
                  return (
                    <div
                      key={uni.id}
                      className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 opacity-0 animate-scaleIn"
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        {uni.logo_url ? (
                          <img
                            src={uni.logo_url}
                            alt={uni.name}
                            className="w-14 h-14 rounded-xl object-contain bg-white p-1"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
                            <span className="text-lg font-bold text-primary-foreground">
                              {uni.short_name || uni.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          uni.type === "private" 
                            ? "bg-secondary/20 text-secondary-foreground"
                            : "bg-accent/10 text-accent"
                        }`}>
                          {uni.type || "Public"}
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {uni.name}
                      </h3>

                      <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>{uni.location || "Zimbabwe"}</span>
                      </div>

                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {uni.description || "A leading educational institution in Zimbabwe."}
                      </p>

                      {faculties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {faculties.slice(0, 3).map((faculty) => (
                            <span key={faculty} className="px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                              {faculty}
                            </span>
                          ))}
                          {faculties.length > 3 && (
                            <span className="px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                              +{faculties.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <span className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{programCount}</span> programs
                        </span>
                        <Button variant="ghost" size="sm" className="group/btn" asChild>
                          <Link to={`/universities/${uni.id}`}>
                            View Details
                            <ExternalLink className="w-4 h-4 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredUniversities.length === 0 && (
                <div className="text-center py-16">
                  <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">
                    No universities found
                  </h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UniversitiesPage;
