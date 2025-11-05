import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays, isSameMonth, parseISO } from "date-fns";
import { de } from "date-fns/locale";

type ViewMode = "month" | "week" | "day";

interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
}

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  priority: string;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    all_day: false,
    color: "#3b82f6",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchEvents();
    fetchTasks();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });

    if (error) {
      toast({
        title: "Fehler",
        description: "Events konnten nicht geladen werden",
        variant: "destructive",
      });
    } else {
      setEvents(data || []);
    }
  };

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", user.id)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Tasks error:", error);
    } else {
      setTasks(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const eventData = {
      ...formData,
      user_id: user.id,
    };

    if (selectedEvent) {
      const { error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", selectedEvent.id);

      if (error) {
        toast({
          title: "Fehler",
          description: "Event konnte nicht aktualisiert werden",
          variant: "destructive",
        });
      } else {
        toast({ title: "Event aktualisiert" });
        fetchEvents();
        handleCloseDialog();
      }
    } else {
      const { error } = await supabase
        .from("events")
        .insert([eventData]);

      if (error) {
        toast({
          title: "Fehler",
          description: "Event konnte nicht erstellt werden",
          variant: "destructive",
        });
      } else {
        toast({ title: "Event erstellt" });
        fetchEvents();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Fehler",
        description: "Event konnte nicht gelöscht werden",
        variant: "destructive",
      });
    } else {
      toast({ title: "Event gelöscht" });
      fetchEvents();
      handleCloseDialog();
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
    setFormData({
      title: "",
      description: "",
      start_time: "",
      end_time: "",
      all_day: false,
      color: "#3b82f6",
    });
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      start_time: format(parseISO(event.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(parseISO(event.end_time), "yyyy-MM-dd'T'HH:mm"),
      all_day: event.all_day,
      color: event.color,
    });
    setIsDialogOpen(true);
  };

  const navigateDate = (direction: "prev" | "next") => {
    if (viewMode === "month") {
      setCurrentDate(direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === "next" ? addDays(currentDate, 1) : subDays(currentDate, 1));
    }
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = parseISO(event.start_time);
      return isSameDay(eventStart, day);
    });
  };

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = parseISO(task.due_date);
      return isSameDay(taskDate, day);
    });
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { locale: de });
    const calendarEnd = endOfWeek(monthEnd, { locale: de });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-2">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(day => (
          <div key={day} className="text-center font-semibold p-2 text-muted-foreground">
            {day}
          </div>
        ))}
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const dayTasks = getTasksForDay(day);
          return (
            <Card
              key={day.toString()}
              className={`min-h-24 p-2 ${!isSameMonth(day, currentDate) ? "opacity-50" : ""} ${isSameDay(day, new Date()) ? "border-primary" : ""}`}
            >
              <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
              <div className="space-y-1">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    className="text-xs p-1 rounded cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: event.color + "40", borderLeft: `3px solid ${event.color}` }}
                    onClick={() => handleEditEvent(event)}
                  >
                    {event.title}
                  </div>
                ))}
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    className="text-xs p-1 rounded bg-orange-100 dark:bg-orange-900/30 border-l-3 border-orange-500"
                    title={`Aufgabe: ${task.title} (${task.status})`}
                  >
                    📋 {task.title}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: de });
    const weekEnd = endOfWeek(currentDate, { locale: de });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const dayTasks = getTasksForDay(day);
          return (
            <Card key={day.toString()} className="min-h-96 p-2">
              <div className="text-sm font-semibold mb-2">
                {format(day, "EEE d", { locale: de })}
              </div>
              <div className="space-y-2">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    className="text-xs p-2 rounded cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: event.color + "40", borderLeft: `3px solid ${event.color}` }}
                    onClick={() => handleEditEvent(event)}
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-muted-foreground">
                      {format(parseISO(event.start_time), "HH:mm")}
                    </div>
                  </div>
                ))}
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    className="text-xs p-2 rounded bg-orange-100 dark:bg-orange-900/30 border-l-3 border-orange-500"
                  >
                    <div className="font-medium">📋 {task.title}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {task.status === "completed" ? "Erledigt" : task.status === "in_progress" ? "In Arbeit" : "Offen"}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    const dayTasks = getTasksForDay(currentDate);

    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">
          {format(currentDate, "EEEE, d. MMMM yyyy", { locale: de })}
        </h3>
        <div className="space-y-2">
          {dayEvents.length === 0 && dayTasks.length === 0 ? (
            <p className="text-muted-foreground">Keine Events oder Aufgaben für diesen Tag</p>
          ) : (
            <>
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className="p-4 rounded cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: event.color + "40", borderLeft: `4px solid ${event.color}` }}
                  onClick={() => handleEditEvent(event)}
                >
                  <div className="font-semibold">{event.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {event.all_day ? (
                      "Ganztägig"
                    ) : (
                      `${format(parseISO(event.start_time), "HH:mm")} - ${format(parseISO(event.end_time), "HH:mm")}`
                    )}
                  </div>
                  {event.description && (
                    <div className="text-sm mt-2">{event.description}</div>
                  )}
                </div>
              ))}
              {dayTasks.map(task => (
                <div
                  key={task.id}
                  className="p-4 rounded bg-orange-100 dark:bg-orange-900/30 border-l-4 border-orange-500"
                >
                  <div className="font-semibold">📋 {task.title}</div>
                  <div className="text-sm text-muted-foreground">
                    Aufgabe - {task.status === "completed" ? "Erledigt" : task.status === "in_progress" ? "In Arbeit" : "Offen"}
                    {task.priority && ` • Priorität: ${task.priority === "high" ? "Hoch" : task.priority === "medium" ? "Mittel" : "Niedrig"}`}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Kalender</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedEvent(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Neues Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvent ? "Event bearbeiten" : "Neues Event"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="all_day"
                  checked={formData.all_day}
                  onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
                />
                <Label htmlFor="all_day">Ganztägig</Label>
              </div>
              <div>
                <Label htmlFor="start_time">Start</Label>
                <Input
                  id="start_time"
                  type={formData.all_day ? "date" : "datetime-local"}
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_time">Ende</Label>
                <Input
                  id="end_time"
                  type={formData.all_day ? "date" : "datetime-local"}
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="color">Farbe</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
              <div className="flex justify-between">
                <div className="space-x-2">
                  <Button type="submit">
                    {selectedEvent ? "Aktualisieren" : "Erstellen"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Abbrechen
                  </Button>
                </div>
                {selectedEvent && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDelete(selectedEvent.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Heute
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-xl font-semibold">
          {viewMode === "month" && format(currentDate, "MMMM yyyy", { locale: de })}
          {viewMode === "week" && `Woche ${format(currentDate, "w, yyyy", { locale: de })}`}
          {viewMode === "day" && format(currentDate, "d. MMMM yyyy", { locale: de })}
        </h2>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            onClick={() => setViewMode("month")}
          >
            Monat
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            onClick={() => setViewMode("week")}
          >
            Woche
          </Button>
          <Button
            variant={viewMode === "day" ? "default" : "outline"}
            onClick={() => setViewMode("day")}
          >
            Tag
          </Button>
        </div>
      </div>

      {viewMode === "month" && renderMonthView()}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "day" && renderDayView()}
    </div>
  );
}
