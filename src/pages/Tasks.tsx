import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock, Calendar, TrendingUp, Link as LinkIcon, Image as ImageIcon, File } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  category: string | null;
  file_url: string | null;
  image_url: string | null;
  links: string[];
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", user.id)
        .order("due_date", { ascending: true });

      if (error) {
        toast.error("Fehler beim Laden der Aufgaben");
        return;
      }

      setTasks(data || []);
      setLoading(false);
    };

    fetchTasks();
  }, []);

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast.error("Fehler beim Aktualisieren");
      return;
    }

    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    toast.success("Status aktualisiert");
  };

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
      case "high": return "destructive";
      case "medium": return "default";
      default: return "secondary";
    }
  };

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  if (loading) return <div className="p-8">Lädt...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meine Aufgaben</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihre Aufgaben und To-Dos</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Fortschritt
              </CardTitle>
              <CardDescription>Ihre Leistung</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{completedTasks}</p>
              <p className="text-sm text-muted-foreground">von {tasks.length}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {tasks.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              Noch keine Aufgaben vorhanden
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card 
              key={task.id} 
              className="shadow-card hover:shadow-glow transition-all cursor-pointer"
              onClick={() => {
                setSelectedTask(task);
                setIsDialogOpen(true);
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
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
                        <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
                        {task.description && (
                          <p className="text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mb-2">
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
                          {task.image_url && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              Bild
                            </Badge>
                          )}
                          {task.file_url && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <File className="w-3 h-3" />
                              Datei
                            </Badge>
                          )}
                          {task.links && task.links.length > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" />
                              {task.links.length} Link{task.links.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedTask?.title}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={getPriorityColor(selectedTask.priority)}>
                  {selectedTask.priority === "high" ? "Hoch" :
                   selectedTask.priority === "medium" ? "Mittel" : "Niedrig"}
                </Badge>
                {selectedTask.category && (
                  <Badge variant="outline">{selectedTask.category}</Badge>
                )}
                {selectedTask.due_date && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(selectedTask.due_date).toLocaleDateString("de-CH")}
                  </Badge>
                )}
                <Badge variant={
                  selectedTask.status === "completed" ? "default" : 
                  selectedTask.status === "in_progress" ? "secondary" : "outline"
                }>
                  {selectedTask.status === "completed" ? "Erledigt" :
                   selectedTask.status === "in_progress" ? "In Arbeit" : "Offen"}
                </Badge>
              </div>

              {selectedTask.description && (
                <div>
                  <h4 className="font-semibold mb-2">Beschreibung</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}

              {selectedTask.image_url && (
                <div>
                  <h4 className="font-semibold mb-2">Bild</h4>
                  <img 
                    src={selectedTask.image_url} 
                    alt={selectedTask.title} 
                    className="w-full max-w-2xl h-auto rounded border"
                  />
                </div>
              )}

              {selectedTask.links && selectedTask.links.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Links</h4>
                  <div className="space-y-2">
                    {selectedTask.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline p-2 border rounded"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <LinkIcon className="w-4 h-4" />
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.file_url && (
                <div>
                  <h4 className="font-semibold mb-2">Dateianhang</h4>
                  <a
                    href={selectedTask.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline p-3 border rounded"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <File className="w-5 h-5" />
                    Datei öffnen
                  </a>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextStatus =
                      selectedTask.status === "open" ? "in_progress" :
                      selectedTask.status === "in_progress" ? "completed" : "open";
                    updateTaskStatus(selectedTask.id, nextStatus);
                    setIsDialogOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  {getStatusIcon(selectedTask.status)}
                  Status ändern
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
