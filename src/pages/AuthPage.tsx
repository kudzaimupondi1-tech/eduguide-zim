import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, GraduationCap, Mail, Lock, User, Users, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isSigningUp = useRef(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student" as "student" | "admin",
    accessCode: "",
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Don't redirect during signup process
      if (isSigningUp.current) return;
      if (session?.user) {
        await redirectBasedOnRole(session.user.id);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (isSigningUp.current) return;
      if (session?.user) {
        await redirectBasedOnRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const redirectBasedOnRole = async (userId: string) => {
    try {
      const { data: hasAdminRole } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (hasAdminRole) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error checking role:", error);
      navigate("/dashboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        toast.success("Welcome back!");
        
        if (data.user) {
          await redirectBasedOnRole(data.user.id);
        }
      } else {
        // Block auth state listener during signup
        isSigningUp.current = true;

        // For admin registration, validate access code requirement
        if (formData.role === "admin") {
          if (!formData.accessCode.trim()) {
            toast.error("Admin Access Code is required for admin registration.");
            isSigningUp.current = false;
            setIsLoading(false);
            return;
          }
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              full_name: formData.name,
              selected_role: formData.role,
            },
          },
        });

        if (error) {
          isSigningUp.current = false;
          if (error.message.includes("already registered")) {
            throw new Error("This email is already registered. Please sign in instead.");
          }
          throw error;
        }
        
        if (data.session && data.user) {
          // Auto-confirmed signup
          if (formData.role === "admin") {
            try {
              const { data: validationResult, error: validationError } = await supabase.functions.invoke("validate-admin-code", {
                body: { access_code: formData.accessCode, user_id: data.user.id },
              });

              if (validationError) throw validationError;
              
              if (!validationResult?.valid) {
                await supabase.auth.signOut();
                isSigningUp.current = false;
                toast.error(validationResult?.error || "Invalid access code. Registration failed.");
                setIsLoading(false);
                return;
              }

              // Valid code - sign out so they must login
              await supabase.auth.signOut();
              isSigningUp.current = false;
              toast.success("Admin account created successfully! Please sign in to continue.");
              setIsLogin(true);
              setFormData({ name: "", email: "", password: "", role: "student", accessCode: "" });
            } catch (codeError: any) {
              console.error("Access code validation error:", codeError);
              await supabase.auth.signOut();
              isSigningUp.current = false;
              toast.error("Invalid access code. Registration failed.");
            }
          } else {
            // Student with auto-confirm - sign out and require login
            await supabase.auth.signOut();
            isSigningUp.current = false;
            toast.success("Account created successfully! Please sign in to continue.");
            setIsLogin(true);
            setFormData({ name: "", email: "", password: "", role: "student", accessCode: "" });
          }
        } else {
          // Email verification required
          isSigningUp.current = false;
          toast.success("Account created! Please check your email to verify, then sign in.");
          setIsLogin(true);
          setFormData({ name: "", email: "", password: "", role: "student", accessCode: "" });
        }
      }
    } catch (error: any) {
      isSigningUp.current = false;
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold text-foreground leading-tight">
                EduGuide
              </span>
              <span className="text-xs text-secondary font-semibold -mt-1">Zimbabwe</span>
            </div>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin 
                ? "Sign in to access your personalized guidance" 
                : "Start your journey to academic success"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      className="pl-10"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">I am a</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Select 
                      value={formData.role} 
                      onValueChange={(value: "student" | "admin") => setFormData({ ...formData, role: value, accessCode: "" })}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" />
                            Student
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Administrator
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.role === "admin" && (
                  <div className="space-y-2">
                    <Label htmlFor="accessCode">Admin Access Code</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="accessCode"
                        type="password"
                        placeholder="Enter admin access code"
                        className="pl-10"
                        value={formData.accessCode}
                        onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      An access code from an existing administrator is required.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <Button 
              type="submit" 
              variant="hero" 
              size="lg" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
            </Button>
          </form>

          {/* Toggle Auth Mode */}
          <p className="mt-6 text-center text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-semibold hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex flex-1 bg-hero-gradient items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-secondary blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-md">
          <div className="w-24 h-24 rounded-2xl bg-secondary/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-8 animate-float">
            <GraduationCap className="w-12 h-12 text-secondary" />
          </div>
          
          <h2 className="font-display text-3xl font-bold text-primary-foreground mb-4">
            Your Future Awaits
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Join thousands of Zimbabwean students who have found their path to success with EduGuide.
          </p>

          <div className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t border-primary-foreground/20">
            <div>
              <div className="text-2xl font-bold text-secondary">5K+</div>
              <div className="text-sm text-primary-foreground/70">Students</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary">15+</div>
              <div className="text-sm text-primary-foreground/70">Universities</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary">200+</div>
              <div className="text-sm text-primary-foreground/70">Programs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
