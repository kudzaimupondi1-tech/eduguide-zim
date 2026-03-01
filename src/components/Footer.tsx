import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold leading-tight">
                  EduGuide
                </span>
                <span className="text-[10px] text-background/60 -mt-0.5">Zimbabwe</span>
              </div>
            </Link>
            <p className="text-background/60 text-sm mb-6 leading-relaxed">
              Empowering Zimbabwean students with trusted, local, and up-to-date academic guidance.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold mb-4 uppercase tracking-wide">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link to="/guidance" className="text-background/60 hover:text-primary transition-colors text-sm">Get Guidance</Link></li>
              <li><Link to="/universities" className="text-background/60 hover:text-primary transition-colors text-sm">Universities</Link></li>
              <li><Link to="/careers" className="text-background/60 hover:text-primary transition-colors text-sm">Careers</Link></li>
              <li><Link to="/premium" className="text-background/60 hover:text-primary transition-colors text-sm">Premium Access</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-bold mb-4 uppercase tracking-wide">Resources</h4>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-background/60 hover:text-primary transition-colors text-sm">About Us</Link></li>
              <li><Link to="/faq" className="text-background/60 hover:text-primary transition-colors text-sm">FAQ</Link></li>
              <li><Link to="/privacy" className="text-background/60 hover:text-primary transition-colors text-sm">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-background/60 hover:text-primary transition-colors text-sm">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold mb-4 uppercase tracking-wide">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-background/60 text-sm">
                <Mail className="w-4 h-4" />
                <span>support@eduguide.co.zw</span>
              </li>
              <li className="flex items-center gap-2 text-background/60 text-sm">
                <Phone className="w-4 h-4" />
                <span>+263 77 123 4567</span>
              </li>
              <li className="flex items-center gap-2 text-background/60 text-sm">
                <MapPin className="w-4 h-4" />
                <span>Harare, Zimbabwe</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-background/40 text-xs">
            © {new Date().getFullYear()} EduGuide Zimbabwe. All rights reserved.
          </p>
          <p className="text-background/40 text-xs">
            Made with ❤️ for Zimbabwean students
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
