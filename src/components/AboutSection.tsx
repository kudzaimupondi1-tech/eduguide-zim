import { GraduationCap, Users, BookOpen, Award, CheckCircle } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "ZIMSEC Aligned",
    description: "Guidance tailored to Zimbabwe's education curriculum and examination requirements.",
  },
  {
    icon: GraduationCap,
    title: "University Matching",
    description: "Find universities and programs that match your subjects and career goals.",
  },
  {
    icon: Users,
    title: "Career Pathways",
    description: "Explore career options based on your academic profile and interests.",
  },
  {
    icon: Award,
    title: "Smart Recommendations",
    description: "AI-powered suggestions for A-Level subjects and degree programs.",
  },
];

const benefits = [
  "Get personalized A-Level subject combinations",
  "Discover matching university programs across Zimbabwe",
  "Explore career paths aligned with your subjects",
  "Access entry requirements for all programs",
  "Make informed decisions about your future",
];

const AboutSection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <span className="inline-block px-4 py-1 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
              About EduGuide
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Your Complete Academic{" "}
              <span className="text-gradient">Guidance System</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              EduGuide Zimbabwe helps O-Level and A-Level students navigate their academic journey. 
              From choosing the right subjects to finding the perfect university program, we provide 
              comprehensive guidance every step of the way.
            </p>

            {/* Benefits List */}
            <div className="space-y-3 mb-8">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Feature Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300 opacity-0 animate-scaleIn"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
