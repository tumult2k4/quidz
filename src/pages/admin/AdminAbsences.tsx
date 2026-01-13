import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, CheckCircle, XCircle, Clock, Search, Filter, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Absence {
  id: string;
  user_id: string;
  date: string;
  reason: string | null;
  comment: string | null;
  approved: boolean | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string };
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

const AdminAbsences = () => {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states - default to pending
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAbsences = async () => {
    const [absencesRes, profilesRes] = await Promise.all([
      supabase
        .from("absences")
        .select("*")
        .order("date", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email"),
    ]);

    if (absencesRes.error) {
      toast.error("Fehler beim Laden der Absenzen");
      console.error("Absences error:", absencesRes.error);
      return;
    }
    if (profilesRes.error) {
      toast.error("Fehler beim Laden der Profile");
      console.error("Profiles error:", profilesRes.error);
      return;
    }

    const profilesMap = new Map(
      (profilesRes.data || []).map(profile => [profile.id, profile])
    );

    const absencesWithProfiles = (absencesRes.data || []).map(absence => ({
      ...absence,
      profiles: absence.user_id ? profilesMap.get(absence.user_id) : null,
    }));

    setAbsences(absencesWithProfiles);
    setProfiles(profilesRes.data || []);
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

  // Filtered absences
  const filteredAbsences = useMemo(() => {
    return absences.filter(absence => {
      // Status filter
      if (statusFilter === "pending" && absence.approved !== null) return false;
      if (statusFilter === "approved" && absence.approved !== true) return false;
      if (statusFilter === "rejected" && absence.approved !== false) return false;

      // User filter
      if (userFilter !== "all" && absence.user_id !== userFilter) return false;

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = absence.profiles?.full_name?.toLowerCase().includes(query);
        const matchesEmail = absence.profiles?.email?.toLowerCase().includes(query);
        const matchesReason = absence.reason?.toLowerCase().includes(query);
        const matchesComment = absence.comment?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesReason && !matchesComment) return false;
      }

      return true;
    });
  }, [absences, statusFilter, userFilter, searchQuery]);

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

      {/* Filter Section */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Absenzen suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="approved">Genehmigt</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[180px]">
                  <Users className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Teilnehmer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Teilnehmer</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            {filteredAbsences.length} von {absences.length} Absenzen
          </div>
        </CardContent>
      </Card>

      {/* Absences Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          {filteredAbsences.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {absences.length === 0 ? "Keine Absenzen vorhanden" : "Keine Absenzen gefunden"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teilnehmer</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Grund</TableHead>
                  <TableHead>Bemerkung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gemeldet</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAbsences.map((absence) => (
                  <TableRow key={absence.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {absence.profiles?.full_name || "Unbekannt"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {absence.profiles?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {new Date(absence.date).toLocaleDateString("de-CH", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {absence.reason ? (
                        <span className="text-sm">{absence.reason}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {absence.comment ? (
                        <span className="text-sm line-clamp-2">{absence.comment}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(absence.approved)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(absence.created_at).toLocaleDateString("de-CH")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {absence.approved !== true && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApproval(absence.id, true)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {absence.approved !== false && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApproval(absence.id, false)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAbsences;
