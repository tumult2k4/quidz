import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface Absence {
  id: string;
  date: string;
  reason: string | null;
  comment: string | null;
  approved: boolean | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string };
}

const AdminAbsences = () => {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAbsences = async () => {
    const { data, error } = await supabase
      .from("absences")
      .select(`
        id,
        date,
        reason,
        comment,
        approved,
        created_at,
        user_id,
        profiles!inner(full_name, email)
      `)
      .order("date", { ascending: false });

    if (error) {
      toast.error("Fehler beim Laden der Absenzen");
      return;
    }

    setAbsences(data as any || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAbsences();
  }, []);

  const handleApproval = async (id: string, approved: boolean) => {
    const { error } = await supabase
      .from("absences")
      .update({ approved })
      .eq("id", id);

    if (error) {
      toast.error("Fehler beim Aktualisieren");
      return;
    }

    toast.success(approved ? "Absenz genehmigt" : "Absenz abgelehnt");
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
      <div>
        <h1 className="text-3xl font-bold">Absenzenverwaltung</h1>
        <p className="text-muted-foreground">Verwalten Sie Abwesenheiten der Teilnehmenden</p>
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
                        {absence.profiles?.full_name || absence.profiles?.email || "Unbekannt"}
                      </CardTitle>
                      <p className="text-muted-foreground mb-2">
                        <strong>Datum:</strong>{" "}
                        {new Date(absence.date).toLocaleDateString("de-CH", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
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
                  {absence.approved === null && (
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApproval(absence.id, true)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Genehmigen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproval(absence.id, false)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Ablehnen
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAbsences;
