import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Absence {
  id: string;
  date: string;
  reason: string | null;
  comment: string | null;
  approved: boolean | null;
  created_at: string;
}

const Absences = () => {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    reason: "",
    comment: "",
  });

  const fetchAbsences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("absences")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      toast.error("Fehler beim Laden der Absenzen");
      return;
    }

    setAbsences(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAbsences();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("absences")
      .insert({
        user_id: user.id,
        date: formData.date,
        reason: formData.reason || null,
        comment: formData.comment || null,
      });

    if (error) {
      toast.error("Fehler beim Erstellen der Absenz");
      return;
    }

    toast.success("Absenz erfolgreich gemeldet");
    setIsDialogOpen(false);
    setFormData({ date: "", reason: "", comment: "" });
    fetchAbsences();
  };

  const getStatusBadge = (approved: boolean | null) => {
    if (approved === null) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Ausstehend
        </Badge>
      );
    }
    if (approved) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-secondary">
          <CheckCircle className="w-3 h-3" />
          Genehmigt
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Abgelehnt
      </Badge>
    );
  };

  if (loading) return <div className="p-8">Lädt...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meine Absenzen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Abwesenheiten</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Absenz melden
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Absenz melden</DialogTitle>
              <DialogDescription>
                Melden Sie eine Abwesenheit an Ihren Coach
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Datum *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Grund</Label>
                <Input
                  id="reason"
                  placeholder="z.B. Krankheit, Arzttermin..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment">Bemerkung</Label>
                <Textarea
                  id="comment"
                  placeholder="Zusätzliche Informationen..."
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Absenz melden</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {absences.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              Keine Absenzen vorhanden
            </CardContent>
          </Card>
        ) : (
          absences.map((absence) => (
            <Card key={absence.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        {new Date(absence.date).toLocaleDateString("de-CH", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </CardTitle>
                      {absence.reason && (
                        <p className="text-muted-foreground mb-2">
                          <strong>Grund:</strong> {absence.reason}
                        </p>
                      )}
                      {absence.comment && (
                        <p className="text-muted-foreground mb-2">
                          <strong>Bemerkung:</strong> {absence.comment}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        {getStatusBadge(absence.approved)}
                        <span className="text-sm text-muted-foreground">
                          Gemeldet: {new Date(absence.created_at).toLocaleDateString("de-CH")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Absences;
