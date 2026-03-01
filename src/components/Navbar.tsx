import { GraduationCap, Menu, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useAdminCheck } from "@/hooks/useAdminCheck";

const Navbar = () => {
  const { isAdmin } = useAdminCheck();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-foreground leading-tight">
                EduGuide
              </span>
              <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">Zimbabwe</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/#about" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              About
            </Link>
            <Link to="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              How It Works
            </Link>
            {isAdmin && (
              <Link to="/admin" className="text-primary hover:text-primary/80 transition-colors text-sm font-medium flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth?mode=signup">Sign Up</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fadeIn">
            <div className="flex flex-col gap-2">
              <Link
                to="/#about"
                className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors text-sm"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                to="/#how-it-works"
                className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors text-sm"
                onClick={() => setIsMenuOpen(false)}
              >
                How It Works
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-4 py-2 text-primary hover:bg-muted rounded-lg transition-colors flex items-center gap-2 text-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </Link>
              )}
              <div className="flex gap-2 mt-2 px-4">
                <Button variant="outline" className="flex-1" size="sm" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button className="flex-1" size="sm" asChild>
                  <Link to="/auth?mode=signup">Sign Up</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
