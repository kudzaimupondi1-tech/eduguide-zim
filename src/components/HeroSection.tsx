import { ArrowRight, BookOpen, GraduationCap, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-hero-gradient pt-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-secondary blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-secondary/20 blur-3xl" />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-32 left-[15%] animate-float delay-100">
        <div className="w-16 h-16 rounded-2xl bg-secondary/20 backdrop-blur-sm flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-secondary" />
        </div>
      </div>
      <div className="absolute top-40 right-[20%] animate-float delay-300">
        <div className="w-14 h-14 rounded-xl bg-accent/20 backdrop-blur-sm flex items-center justify-center">
          <Target className="w-7 h-7 text-accent" />
        </div>
      </div>
      <div className="absolute bottom-32 left-[25%] animate-float delay-500">
        <div className="w-12 h-12 rounded-lg bg-secondary/20 backdrop-blur-sm flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-secondary" />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-8 animate-fadeUp">
            <GraduationCap className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-primary-foreground">
              Zimbabwe's Academic Guidance Platform
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary-foreground leading-tight mb-6 animate-fadeUp delay-100">
            Your Future Starts{" "}
            <span className="text-gradient">Here</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10 animate-fadeUp delay-200">
            Get personalized academic guidance aligned with ZIMSEC requirements. 
            Discover the right A-Level subjects, universities, and career paths for your success.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeUp delay-300">
            <Button variant="hero" size="xl" asChild>
              <Link to="/auth?mode=signup" className="group">
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="xl" asChild>
              <Link to="/auth">
                Sign In
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 md:gap-12 mt-16 pt-16 border-t border-primary-foreground/10 animate-fadeUp delay-400">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-secondary mb-1">15+</div>
              <div className="text-sm text-primary-foreground/70">Universities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-secondary mb-1">200+</div>
              <div className="text-sm text-primary-foreground/70">Degree Programs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-secondary mb-1">50+</div>
              <div className="text-sm text-primary-foreground/70">Career Paths</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
