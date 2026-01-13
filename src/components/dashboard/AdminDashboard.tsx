import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  BookOpen,
  Plus,
  FileText,
  MessageSquare,
  Lightbulb,
  ClipboardList,
  Wrench,
  Bot,
  FileBarChart,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AdminDashboardProps {
  user: User;
}

interface Participant {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingAbsences: 0,
    totalSkills: 0,
    pendingReports: 0,
  });
  const [recentParticipants, setRecentParticipants] = useState<Participant[]>([]);
  const [recentAbsences, setRecentAbsences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const modules = [
    { 
      title: "Teilnehmer", 
      icon: Users, 
      path: "/admin/users", 
      description: "Verwaltung & Profile",
      color: "text-blue-500"
    },
    { 
      title: "Aufgaben", 
      icon: ClipboardList, 
      path: "/admin/tasks", 
      description: "Aufgaben zuweisen",
      color: "text-green-500"
    },
    { 
      title: "Berichte", 
      icon: FileBarChart, 
      path: "/admin/reports", 
      description: "IV-Dokumentation",
      color: "text-purple-500"
    },
    { 
      title: "Skills", 
      icon: Lightbulb, 
      path: "/admin/skills", 
      description: "Kompetenzen verwalten",
      color: "text-yellow-500"
    },
    { 
      title: "Absenzen", 
      icon: Calendar, 
      path: "/admin/absences", 
      description: "Anwesenheit prüfen",
      color: "text-red-500"
    },
    { 
      title: "Dokumente", 
      icon: FileText, 
      path: "/admin/documents", 
      description: "Unterlagen verwalten",
      color: "text-cyan-500"
    },
    { 
      title: "Feedback", 
      icon: MessageSquare, 
      path: "/admin/feedback", 
      description: "Rückmeldungen",
      color: "text-orange-500"
    },
    { 
      title: "AI-Assistent", 
      icon: Bot, 
      path: "/admin/ai", 
      description: "KI-Einstellungen",
      color: "text-indigo-500"
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      // Fetch user roles to identify participants
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "coach"]);

      const adminCoachIds = new Set((rolesData || []).map((r) => r.user_id));

      // Fetch all profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, created_at")
        .order("created_at", { ascending: false });

      const participantsOnly = (profilesData || []).filter(
        (p) => !adminCoachIds.has(p.id)
      );

      // Fetch stats
      const [tasksRes, absencesRes, skillsRes, reportsRes] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("absences").select("*").is("approved", null),
        supabase.from("skills").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "draft"),
      ]);

      const tasksData = tasksRes.data || [];
      const completedCount = tasksData.filter(t => t.status === "completed").length;

      setStats({
        totalParticipants: participantsOnly.length,
        totalTasks: tasksData.length,
        completedTasks: completedCount,
        pendingAbsences: absencesRes.data?.length || 0,
        totalSkills: skillsRes.count || 0,
        pendingReports: reportsRes.count || 0,
      });

      setRecentParticipants(participantsOnly.slice(0, 6));

      // Create a map of user profiles for quick lookup
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.id, profile])
      );

      // Fetch recent absences
      const { data: absencesData } = await supabase
        .from("absences")
        .select("*")
        .is("approved", null)
        .order("created_at", { ascending: false })
        .limit(5);

      // Merge absences with user profiles
      const absencesWithProfiles = (absencesData || []).map(absence => ({
        ...absence,
        profiles: absence.user_id ? profilesMap.get(absence.user_id) : null,
      }));

      setRecentAbsences(absencesWithProfiles);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Erfolgreich abgemeldet");
    navigate("/auth");
  };

  const approveAbsence = async (id: string, approved: boolean) => {
    const { error } = await supabase
      .from("absences")
      .update({ approved })
      .eq("id", id);

    if (error) {
      toast.error("Fehler beim Aktualisieren");
      return;
    }

    setRecentAbsences(recentAbsences.filter(a => a.id !== id));
    setStats(prev => ({ ...prev, pendingAbsences: prev.pendingAbsences - 1 }));
    toast.success(approved ? "Absenz genehmigt" : "Absenz abgelehnt");
  };

  if (loading) {
    return <div className="p-8">Lädt...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              QUIDZ Coach Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">Übersicht & Verwaltung</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Abmelden
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="shadow-card hover:shadow-soft transition-shadow cursor-pointer" onClick={() => navigate("/admin/users")}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Teilnehmer</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {stats.totalParticipants}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-soft transition-shadow cursor-pointer" onClick={() => navigate("/admin/tasks")}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Offene Aufgaben</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                {stats.totalTasks - stats.completedTasks}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-soft transition-shadow cursor-pointer" onClick={() => navigate("/admin/tasks")}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Erledigt</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                {stats.completedTasks}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-soft transition-shadow cursor-pointer" onClick={() => navigate("/admin/absences")}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Ausstehende Absenzen</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                {stats.pendingAbsences}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-soft transition-shadow cursor-pointer" onClick={() => navigate("/admin/skills")}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Skills erfasst</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                {stats.totalSkills}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-soft transition-shadow cursor-pointer" onClick={() => navigate("/admin/reports")}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Entwürfe</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileBarChart className="w-5 h-5 text-purple-500" />
                {stats.pendingReports}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Quick Access Modules */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              Module
            </CardTitle>
            <CardDescription>Schnellzugriff auf alle Verwaltungsbereiche</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {modules.map((module) => (
                <Button
                  key={module.path}
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-start gap-1 hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(module.path)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <module.icon className={`w-5 h-5 ${module.color}`} />
                    <span className="font-medium">{module.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-normal">
                    {module.description}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Participants and Absences Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Participants */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Teilnehmer
                  </CardTitle>
                  <CardDescription>Übersicht aller Teilnehmenden</CardDescription>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate("/admin/users")}>
                  Alle anzeigen
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentParticipants.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Noch keine Teilnehmer vorhanden
                </p>
              ) : (
                <div className="grid gap-3">
                  {recentParticipants.map((participant) => (
                    <div
                      key={participant.id}
                      className="p-3 rounded-lg border bg-gradient-to-r from-card to-muted/20 hover:shadow-soft transition-all cursor-pointer flex items-center gap-3"
                      onClick={() => navigate(`/admin/users/${participant.id}`)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={participant.avatar_url || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-sm">
                          {participant.full_name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {participant.full_name || "Kein Name"}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {participant.email}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" className="shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Absences */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Ausstehende Absenzen
                  </CardTitle>
                  <CardDescription>Zu genehmigende Abwesenheiten</CardDescription>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate("/admin/absences")}>
                  Alle anzeigen
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAbsences.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">Keine ausstehenden Absenzen</p>
                </div>
              ) : (
                recentAbsences.map((absence) => (
                  <div
                    key={absence.id}
                    className="p-4 rounded-lg border bg-gradient-to-r from-card to-muted/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={absence.profiles?.avatar_url || ""} />
                          <AvatarFallback className="text-xs">
                            {absence.profiles?.full_name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{absence.profiles?.full_name || "Unbekannt"}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(absence.date).toLocaleDateString("de-CH")}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveAbsence(absence.id, true)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveAbsence(absence.id, false)}
                        >
                          <AlertCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {absence.reason && (
                      <p className="text-sm text-muted-foreground pl-11">
                        {absence.reason}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;