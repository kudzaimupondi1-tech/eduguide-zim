import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import MySubjects from "./pages/MySubjects";
import Recommendations from "./pages/Recommendations";
import ProfilePage from "./pages/ProfilePage";
import UniversitiesPage from "./pages/UniversitiesPage";
import UniversityDetailPage from "./pages/UniversityDetailPage";
import CareersPage from "./pages/CareersPage";
import CareerGuidancePage from "./pages/CareerGuidancePage";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUniversities from "./pages/admin/AdminUniversities";
import AdminPrograms from "./pages/admin/AdminPrograms";
import AdminSubjects from "./pages/admin/AdminSubjects";
import AdminCareers from "./pages/admin/AdminCareers";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAIConfig from "./pages/admin/AdminAIConfig";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminDeadlines from "./pages/admin/AdminDeadlines";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCombinations from "./pages/admin/AdminCombinations";
import AdminGrading from "./pages/admin/AdminGrading";
import { StudentChatbot } from "./components/StudentChatbot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-subjects" element={<MySubjects />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/universities" element={<UniversitiesPage />} />
          <Route path="/universities/:id" element={<UniversityDetailPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/career-guidance" element={<CareerGuidancePage />} />
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/universities" element={<AdminUniversities />} />
          <Route path="/admin/programs" element={<AdminPrograms />} />
          <Route path="/admin/subjects" element={<AdminSubjects />} />
          <Route path="/admin/careers" element={<AdminCareers />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/ai-config" element={<AdminAIConfig />} />
          <Route path="/admin/announcements" element={<AdminAnnouncements />} />
          <Route path="/admin/deadlines" element={<AdminDeadlines />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/combinations" element={<AdminCombinations />} />
          <Route path="/admin/grading" element={<AdminGrading />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <StudentChatbot />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
