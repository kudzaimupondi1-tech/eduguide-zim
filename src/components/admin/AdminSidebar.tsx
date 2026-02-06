import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Building2,
  Briefcase,
  Users,
  Settings,
  LogOut,
  Brain,
  Megaphone,
  Calendar,
  BarChart3,
  Layers,
  Hash,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const dataMenuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Universities", url: "/admin/universities", icon: Building2 },
  { title: "Programs", url: "/admin/programs", icon: GraduationCap },
  { title: "Subjects", url: "/admin/subjects", icon: BookOpen },
  { title: "Combinations", url: "/admin/combinations", icon: Layers },
  { title: "Grading", url: "/admin/grading", icon: Hash },
  { title: "Careers", url: "/admin/careers", icon: Briefcase },
];

const systemMenuItems = [
  { title: "AI Config", url: "/admin/ai-config", icon: Brain },
  { title: "Announcements", url: "/admin/announcements", icon: Megaphone },
  { title: "Deadlines", url: "/admin/deadlines", icon: Calendar },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const renderMenuItem = (item: { title: string; url: string; icon: any }) => {
    const isActive = location.pathname === item.url;
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild>
          <Link
            to={item.url}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-sidebar-foreground">EduGuide</h1>
            <p className="text-xs text-sidebar-foreground/70">Admin Panel</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Data Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataMenuItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemMenuItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex flex-col gap-2">
          <Link to="/dashboard">
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
              <GraduationCap className="w-4 h-4 mr-2" />
              Student View
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
