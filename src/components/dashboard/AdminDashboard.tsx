import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  BookOpen,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingAbsences: 0,
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentAbsences, setRecentAbsences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch stats
      const [usersRes, tasksRes, absencesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("*"),
        supabase.from("absences").select("*").is("approved", null),
      ]);

      const tasksData = tasksRes.data || [];
      const completedCount = tasksData.filter(t => t.status === "completed").length;

      setStats({
        totalUsers: usersRes.count || 0,
        totalTasks: tasksData.length,
        completedTasks: completedCount,
        pendingAbsences: absencesRes.data?.length || 0,
      });

      // Fetch recent tasks and profiles separately
      const [recentTasksRes, profilesRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("profiles")
          .select("id, full_name, email"),
      ]);

      // Create a map of user profiles for quick lookup
      const profilesMap = new Map(
        (profilesRes.data || []).map(profile => [profile.id, profile])
      );

      // Merge tasks with user profiles
      const tasksWithProfiles = (recentTasksRes.data || []).map(task => ({
        ...task,
        profiles: task.assigned_to ? profilesMap.get(task.assigned_to) : null,
      }));

      setRecentTasks(tasksWithProfiles);

      // Fetch recent absences
      const { data: absencesData } = await supabase
        .from("absences")
        .select("*")
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

    setRecentAbsences(recentAbsences.map(a => 
      a.id === id ? { ...a, approved } : a
    ));
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
              QUIDZ Admin
            </h1>
            <p className="text-sm text-muted-foreground">Verwaltungsbereich</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Abmelden
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Teilnehmende</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                {stats.totalUsers}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Offene Aufgaben</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" />
                {stats.totalTasks - stats.completedTasks}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Erledigte Aufgaben</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-secondary" />
                {stats.completedTasks}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Ausstehende Absenzen</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-destructive" />
                {stats.pendingAbsences}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Tasks */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Aktuelle Aufgaben
                </CardTitle>
                <CardDescription>Zuletzt erstellte Aufgaben</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Neue Aufgabe
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Noch keine Aufgaben vorhanden
              </p>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-lg border bg-gradient-to-r from-card to-muted/20 hover:shadow-soft transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{task.title}</h4>
                    <Badge variant={
                      task.status === "completed" ? "default" :
                      task.status === "in_progress" ? "secondary" : "outline"
                    }>
                      {task.status === "completed" ? "Erledigt" :
                       task.status === "in_progress" ? "In Arbeit" : "Offen"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{task.profiles?.full_name || "Nicht zugewiesen"}</span>
                    {task.due_date && (
                      <>
                        <span>•</span>
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(task.due_date).toLocaleDateString("de-CH")}</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Absences */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Absenzenmeldungen
            </CardTitle>
            <CardDescription>Kürzlich gemeldete Absenzen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAbsences.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Keine Absenzen vorhanden
              </p>
            ) : (
              recentAbsences.map((absence) => (
                <div
                  key={absence.id}
                  className="p-4 rounded-lg border bg-gradient-to-r from-card to-muted/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{absence.profiles?.full_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(absence.date).toLocaleDateString("de-CH")}
                      </p>
                    </div>
                    {absence.approved === null ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveAbsence(absence.id, true)}
                        >
                          Genehmigen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveAbsence(absence.id, false)}
                        >
                          Ablehnen
                        </Button>
                      </div>
                    ) : (
                      <Badge variant={absence.approved ? "default" : "destructive"}>
                        {absence.approved ? "Genehmigt" : "Abgelehnt"}
                      </Badge>
                    )}
                  </div>
                  {absence.reason && (
                    <p className="text-sm text-muted-foreground">
                      Grund: {absence.reason}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
