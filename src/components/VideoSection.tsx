import { Play, BookOpen, GraduationCap, Target } from "lucide-react";
import { useState, useRef } from "react";

const VideoSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setIsPlaying(true);
    setTimeout(() => {
      videoRef.current?.play();
    }, 100);
  };

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 uppercase tracking-wide">
            <Play className="w-3 h-3 inline mr-1" />
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            See EduGuide in Action
          </h2>
          <p className="text-muted-foreground text-base">
            Watch this quick video to learn how to get personalized academic guidance
          </p>
        </div>

        {/* Video Container */}
        <div className="max-w-4xl mx-auto">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-card border border-border shadow-lg">
            {!isPlaying ? (
              <div className="absolute inset-0 flex items-center justify-center bg-foreground">
                {/* Decorative Elements */}
                <div className="absolute top-8 left-8 w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center animate-float">
                  <BookOpen className="w-7 h-7 text-background/60" />
                </div>
                <div className="absolute bottom-8 right-8 w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center animate-float delay-300">
                  <GraduationCap className="w-6 h-6 text-background/60" />
                </div>
                <div className="absolute top-1/4 right-1/4 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center animate-float delay-500">
                  <Target className="w-5 h-5 text-background/60" />
                </div>

                {/* Play Button */}
                <button onClick={handlePlay} className="relative z-10 group">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                    <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                </button>

                {/* Text Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-foreground/80 to-transparent">
                  <h3 className="text-background text-lg font-bold text-center">
                    Click to watch the tutorial
                  </h3>
                </div>
              </div>
            ) : (
              <video ref={videoRef} className="w-full h-full object-cover" controls autoPlay playsInline>
                <source src="/videos/eduguide-tutorial.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Video Features */}
          <div className="grid sm:grid-cols-3 gap-6 mt-8">
            <div className="text-center p-4">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-1">Add Your Subjects</h4>
              <p className="text-xs text-muted-foreground">Enter your O-Level or A-Level subjects with grades</p>
            </div>
            <div className="text-center p-4">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-1">Get Matched</h4>
              <p className="text-xs text-muted-foreground">Our system matches you with suitable programs</p>
            </div>
            <div className="text-center p-4">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-1">Explore Options</h4>
              <p className="text-xs text-muted-foreground">Discover universities and career paths</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
