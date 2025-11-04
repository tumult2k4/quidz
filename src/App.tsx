import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import LayoutWrapper from "./pages/LayoutWrapper";
import Tasks from "./pages/Tasks";
import Documents from "./pages/Documents";
import Absences from "./pages/Absences";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import MyProjects from "./pages/MyProjects";
import PortfolioGallery from "./pages/PortfolioGallery";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminAbsences from "./pages/admin/AdminAbsences";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTools from "./pages/admin/AdminTools";
import Tools from "./pages/Tools";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={<LayoutWrapper />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/absences" element={<Absences />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/portfolio" element={<PortfolioGallery />} />
            <Route path="/my-projects" element={<MyProjects />} />
            <Route path="/admin/tasks" element={<AdminTasks />} />
            <Route path="/admin/documents" element={<AdminDocuments />} />
            <Route path="/admin/absences" element={<AdminAbsences />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/tools" element={<AdminTools />} />
            <Route path="/tools" element={<Tools />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
