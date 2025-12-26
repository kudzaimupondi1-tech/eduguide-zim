import { Play, BookOpen, GraduationCap, Target } from "lucide-react";
import { useState } from "react";

const VideoSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block px-4 py-1 rounded-full bg-secondary/20 text-secondary-foreground text-sm font-semibold mb-4">
            <Play className="w-4 h-4 inline mr-1" />
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            See EduGuide in Action
          </h2>
          <p className="text-muted-foreground text-lg">
            Watch this quick video to learn how to get personalized academic guidance
          </p>
        </div>

        {/* Video Container */}
        <div className="max-w-4xl mx-auto">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-card border border-border shadow-xl">
            {!isPlaying ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary to-primary/80">
                {/* Decorative Elements */}
                <div className="absolute top-8 left-8 w-16 h-16 rounded-xl bg-secondary/20 flex items-center justify-center animate-float">
                  <BookOpen className="w-8 h-8 text-primary-foreground/80" />
                </div>
                <div className="absolute bottom-8 right-8 w-14 h-14 rounded-lg bg-accent/20 flex items-center justify-center animate-float delay-300">
                  <GraduationCap className="w-7 h-7 text-primary-foreground/80" />
                </div>
                <div className="absolute top-1/4 right-1/4 w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center animate-float delay-500">
                  <Target className="w-6 h-6 text-primary-foreground/80" />
                </div>

                {/* Play Button */}
                <button
                  onClick={() => setIsPlaying(true)}
                  className="relative z-10 group"
                >
                  <div className="w-24 h-24 rounded-full bg-primary-foreground flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                    <Play className="w-10 h-10 text-primary ml-1" fill="currentColor" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary-foreground/30 animate-ping" />
                </button>

                {/* Text Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-primary/80 to-transparent">
                  <h3 className="text-primary-foreground text-xl font-bold text-center">
                    Click to watch the demo
                  </h3>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                {/* Placeholder for actual video - replace src with your video URL */}
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                  title="EduGuide Demo Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          {/* Video Features */}
          <div className="grid sm:grid-cols-3 gap-6 mt-8">
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-secondary" />
              </div>
              <h4 className="font-semibold text-foreground mb-1">Add Your Subjects</h4>
              <p className="text-sm text-muted-foreground">Enter your O-Level or A-Level subjects with grades</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6 text-accent" />
              </div>
              <h4 className="font-semibold text-foreground mb-1">Get Matched</h4>
              <p className="text-sm text-muted-foreground">Our AI matches you with suitable programs</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-6 h-6 text-secondary" />
              </div>
              <h4 className="font-semibold text-foreground mb-1">Explore Options</h4>
              <p className="text-sm text-muted-foreground">Discover universities and career paths</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
