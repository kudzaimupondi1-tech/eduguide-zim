import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  BookOpen,
  GraduationCap,
  CreditCard,
  Target,
  Star,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const steps = [
  {
    id: 1,
    icon: UserPlus,
    title: "Create Your Account",
    subtitle: "Step 1 — Get Started",
    description:
      "Sign up with your email address and create a password. Verify your email to activate your account and access all features.",
    details: [
      "Click 'Sign Up' on the homepage",
      "Enter your full name, email & password",
      "Verify your email address",
      "Log in to your new dashboard",
    ],
    color: "hsl(var(--primary))",
    bgAccent: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    id: 2,
    icon: BookOpen,
    title: "Select Your Level",
    subtitle: "Step 2 — Choose Your Path",
    description:
      "Choose whether you are an O-Level or A-Level student. This determines which subjects and grading system apply to you.",
    details: [
      "Go to 'My Subjects' from the sidebar",
      "Select O-Level or A-Level",
      "Your subject list updates accordingly",
      "You can switch levels anytime",
    ],
    color: "hsl(220 90% 56%)",
    bgAccent: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    id: 3,
    icon: GraduationCap,
    title: "Add Your Subjects & Grades",
    subtitle: "Step 3 — Enter Your Results",
    description:
      "Add the subjects you have taken and enter your grades. The system uses these to calculate your eligibility for university programs.",
    details: [
      "Click 'Add Subject' button",
      "Search and select your subject",
      "Enter your grade (A, B, C…)",
      "Repeat for all your subjects",
    ],
    color: "hsl(142 71% 35%)",
    bgAccent: "bg-green-500/10",
    iconColor: "text-green-600",
  },
  {
    id: 4,
    icon: CreditCard,
    title: "Select Universities & Pay",
    subtitle: "Step 4 — Unlock Results",
    description:
      "Choose the universities you want program matches for and complete payment via EcoCash to unlock your personalized recommendations.",
    details: [
      "Go to 'View Recommendations'",
      "Select universities to check",
      "Pay securely via EcoCash",
      "Recommendations unlock instantly",
    ],
    color: "hsl(280 70% 50%)",
    bgAccent: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    id: 5,
    icon: Target,
    title: "View Your Matched Programs",
    subtitle: "Step 5 — See Your Results",
    description:
      "EduGuide compares your subjects and grades against each program's entry requirements and shows your match percentage.",
    details: [
      "100% match = you fully qualify",
      "50-99% = partial match shown",
      "Programs sorted by best match",
      "Filter by university or faculty",
    ],
    color: "hsl(25 95% 53%)",
    bgAccent: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  {
    id: 6,
    icon: Star,
    title: "Star Your Favourites",
    subtitle: "Step 6 — Save & Compare",
    description:
      "Star up to 10 programs you're interested in. Compare them side by side and come back to review them anytime from your dashboard.",
    details: [
      "Click the star icon on any program",
      "Save up to 10 favourites",
      "Access them from 'Favoured Programs'",
      "Remove or replace anytime",
    ],
    color: "hsl(45 93% 47%)",
    bgAccent: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
  },
];

const TutorialGuide = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const goTo = (index: number) => {
    setAutoPlay(false);
    setActiveStep(index);
  };

  const next = () => goTo((activeStep + 1) % steps.length);
  const prev = () => goTo((activeStep - 1 + steps.length) % steps.length);

  const current = steps[activeStep];
  const Icon = current.icon;
  const progress = ((activeStep + 1) / steps.length) * 100;

  return (
    <section id="how-it-works" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 uppercase tracking-wide">
            <Sparkles className="w-3 h-3" />
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3">
            Get Started in 6 Simple Steps
          </h2>
          <p className="text-muted-foreground text-sm">
            Follow this guide to find the best university programs for your qualifications
          </p>
        </div>

        {/* Progress Bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>
              Step {activeStep + 1} of {steps.length}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Navigation Dots */}
        <div className="flex justify-center gap-2 mb-10">
          {steps.map((step, i) => (
            <button
              key={step.id}
              onClick={() => goTo(i)}
              className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                i === activeStep
                  ? "border-primary bg-primary text-primary-foreground scale-110 shadow-lg"
                  : i < activeStep
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {i < activeStep ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <span className="text-xs font-bold">{step.id}</span>
              )}
            </button>
          ))}
        </div>

        {/* Main Content Card */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden"
            >
              <div className="grid md:grid-cols-2 gap-0">
                {/* Left: Visual */}
                <div className="relative flex items-center justify-center p-10 md:p-14 bg-foreground/[0.03]">
                  {/* Decorative circles */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="absolute top-6 right-6 w-16 h-16 rounded-full bg-primary/5"
                  />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="absolute bottom-10 left-8 w-10 h-10 rounded-full bg-primary/5"
                  />

                  <motion.div
                    initial={{ scale: 0.5, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                    className={`w-32 h-32 md:w-40 md:h-40 rounded-3xl ${current.bgAccent} flex items-center justify-center shadow-inner`}
                  >
                    <Icon className={`w-16 h-16 md:w-20 md:h-20 ${current.iconColor}`} strokeWidth={1.5} />
                  </motion.div>

                  {/* Step number watermark */}
                  <span className="absolute bottom-4 right-6 text-7xl font-black text-foreground/[0.04] select-none">
                    {String(current.id).padStart(2, "0")}
                  </span>
                </div>

                {/* Right: Text */}
                <div className="p-8 md:p-10 flex flex-col justify-center">
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`text-xs font-semibold uppercase tracking-wider ${current.iconColor} mb-2`}
                  >
                    {current.subtitle}
                  </motion.span>

                  <motion.h3
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-2xl md:text-3xl font-bold text-foreground mb-3"
                  >
                    {current.title}
                  </motion.h3>

                  <motion.p
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-muted-foreground text-sm mb-6 leading-relaxed"
                  >
                    {current.description}
                  </motion.p>

                  <ul className="space-y-3">
                    {current.details.map((detail, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.08 }}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <ArrowRight className={`w-4 h-4 mt-0.5 shrink-0 ${current.iconColor}`} />
                        <span className="text-foreground/80">{detail}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={prev}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>

            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {autoPlay ? "⏸ Pause autoplay" : "▶ Resume autoplay"}
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={next}
              className="gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TutorialGuide;
