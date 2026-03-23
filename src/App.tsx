import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { FallbackLoader } from "@/components/FallbackLoader";

const Index = lazy(() => import("./pages/Index"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MySubjects = lazy(() => import("./pages/MySubjects"));
const ViewSubjects = lazy(() => import("./pages/ViewSubjects"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const UniversitiesPage = lazy(() => import("./pages/UniversitiesPage"));
const UniversityDetailPage = lazy(() => import("./pages/UniversityDetailPage"));
const CareersPage = lazy(() => import("./pages/CareersPage"));
const CareerGuidancePage = lazy(() => import("./pages/CareerGuidancePage"));
const FavoredPrograms = lazy(() => import("./pages/FavoredPrograms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUniversities = lazy(() => import("./pages/admin/AdminUniversities"));
const AdminPrograms = lazy(() => import("./pages/admin/AdminPrograms"));
const AdminSubjects = lazy(() => import("./pages/admin/AdminSubjects"));
const AdminCareers = lazy(() => import("./pages/admin/AdminCareers"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminAIConfig = lazy(() => import("./pages/admin/AdminAIConfig"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));
const AdminDeadlines = lazy(() => import("./pages/admin/AdminDeadlines"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCombinations = lazy(() => import("./pages/admin/AdminCombinations"));
const AdminGrading = lazy(() => import("./pages/admin/AdminGrading"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminQueries = lazy(() => import("./pages/admin/AdminQueries"));
const AdminDiplomas = lazy(() => import("./pages/admin/AdminDiplomas"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<FallbackLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-subjects" element={<MySubjects />} />
            <Route path="/view-subjects" element={<ViewSubjects />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/universities" element={<UniversitiesPage />} />
            <Route path="/universities/:id" element={<UniversityDetailPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/career-guidance" element={<CareerGuidancePage />} />
            <Route path="/favored-programs" element={<FavoredPrograms />} />
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
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/queries" element={<AdminQueries />} />
            <Route path="/admin/diplomas" element={<AdminDiplomas />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
