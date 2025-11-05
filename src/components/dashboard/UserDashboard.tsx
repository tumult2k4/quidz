import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  BookOpen, 
  Calendar,
  TrendingUp,
  FileText,
  Briefcase,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import MoodTracker from "@/components/dashboard/MoodTracker";

interface UserDashboardProps {
  user: User;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  category: string | null;
}

interface Document {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  category: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  category: string;
  image_url: string | null;
}

const UserDashboard = ({ user }: UserDashboardProps) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Fetch user tasks
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", user.id)
        .order("due_date", { ascending: true });

      setTasks(tasksData || []);

      // Fetch recent documents (last 5)
      const { data: documentsData } = await supabase
        .from("documents")
        .select("*")
        .or(`assigned_to.eq.${user.id},visibility.eq.public`)
        .order("created_at", { ascending: false })
        .limit(5);

      setDocuments(documentsData || []);

      // Fetch recent projects (last 5)
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setProjects(projectsData || []);

      setLoading(false);
    };

    fetchData();
  }, [user.id]);


  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast.error("Fehler beim Aktualisieren der Aufgabe");
      return;
    }

    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    toast.success("Status aktualisiert");
  };

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-secondary" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-primary" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return <div className="p-8">Lädt...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold shadow-glow">
                {profile?.full_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">Willkommen, {profile?.full_name || "User"}!</h1>
              <p className="text-sm text-muted-foreground">Teilnehmer</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Progress and Mood Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Progress Card */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Dein Fortschritt
                  </CardTitle>
                  <CardDescription>Diese Woche</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{completedTasks}</p>
                  <p className="text-sm text-muted-foreground">von {totalTasks} Aufgaben</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="h-3" />
            </CardContent>
          </Card>

          {/* Mood Tracker */}
          <MoodTracker userId={user.id} />
        </div>

        {/* Tasks */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Meine Aufgaben
            </CardTitle>
            <CardDescription>Aktuelle Aufgaben und To-Dos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Noch keine Aufgaben vorhanden
              </p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-lg border bg-gradient-to-r from-card to-muted/20 hover:shadow-soft transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => {
                          const nextStatus = 
                            task.status === "open" ? "in_progress" :
                            task.status === "in_progress" ? "completed" : "open";
                          updateTaskStatus(task.id, nextStatus);
                        }}
                        className="mt-0.5"
                      >
                        {getStatusIcon(task.status)}
                      </button>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={getPriorityColor(task.priority)}>
                            {task.priority === "high" ? "Hoch" : 
                             task.priority === "medium" ? "Mittel" : "Niedrig"}
                          </Badge>
                          {task.category && (
                            <Badge variant="outline">{task.category}</Badge>
                          )}
                          {task.due_date && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.due_date).toLocaleDateString("de-CH")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Documents and Projects Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Documents */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Neue Dokumente
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/documents")}
                >
                  Alle
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <CardDescription>Zuletzt hinzugefügte Dokumente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Keine Dokumente vorhanden
                </p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-lg border bg-gradient-to-r from-card to-muted/10 hover:shadow-soft transition-all cursor-pointer"
                    onClick={() => navigate("/documents")}
                  >
                    <h4 className="font-semibold mb-1">{doc.title}</h4>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {doc.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {doc.category && (
                        <Badge variant="outline" className="text-xs">
                          {doc.category}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("de-CH")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Projects */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Neue Projekte
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/my-projects")}
                >
                  Alle
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <CardDescription>Ihre neuesten Portfolio-Projekte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Keine Projekte vorhanden
                </p>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-3 rounded-lg border bg-gradient-to-r from-card to-muted/10 hover:shadow-soft transition-all cursor-pointer"
                    onClick={() => navigate("/my-projects")}
                  >
                    <div className="flex gap-3">
                      {project.image_url && (
                        <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-muted">
                          <img
                            src={project.image_url}
                            alt={project.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold mb-1 line-clamp-1">{project.title}</h4>
                        {project.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {project.description}
                          </p>
                        )}
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {new Date(project.created_at).toLocaleDateString("de-CH")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Motivational Quote */}
        <Card className="shadow-card bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-medium italic">
              "Erfolg ist die Summe kleiner Bemühungen, die Tag für Tag wiederholt werden."
            </p>
            <p className="text-sm text-muted-foreground mt-2">– Robert Collier</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserDashboard;
