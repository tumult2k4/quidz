import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, Search, Download, Eye, Edit } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

interface Report {
  id: string;
  user_id: string;
  coach_id: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  updated_at: string;
  program_type: string;
  profiles?: { full_name: string; email: string };
  coach?: { full_name: string };
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

const AdminReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all reports with profile info
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("*")
        .order("updated_at", { ascending: false });

      if (reportsError) throw reportsError;

      // Fetch profiles for user names
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (profilesError) throw profilesError;

      // Map profile info to reports
      const reportsWithProfiles = (reportsData || []).map((report) => ({
        ...report,
        profiles: profilesData?.find((p) => p.id === report.user_id),
        coach: profilesData?.find((p) => p.id === report.coach_id),
      }));

      setReports(reportsWithProfiles);
      setParticipants(profilesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Fehler beim Laden der Berichte");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateReport = (userId?: string) => {
    if (userId) {
      navigate(`/admin/reports/new?userId=${userId}`);
    } else {
      navigate("/admin/reports/new");
    }
  };

  const handleEditReport = (reportId: string) => {
    navigate(`/admin/reports/${reportId}`);
  };

  const getStatusBadge = (status: string) => {
    if (status === "final") {
      return <Badge className="bg-green-100 text-green-800">Abgeschlossen</Badge>;
    }
    return <Badge variant="secondary">Entwurf</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Berichte
          </h1>
          <p className="text-muted-foreground mt-1">
            IV-taugliche Dokumentation für Teilnehmende
          </p>
        </div>
        <Button onClick={() => handleCreateReport()}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Bericht
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Teilnehmer suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="draft">Entwurf</SelectItem>
                <SelectItem value="final">Abgeschlossen</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Berichte ({filteredReports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Keine Berichte gefunden</h3>
              <p className="text-muted-foreground mb-4">
                Erstellen Sie den ersten Bericht für einen Teilnehmer.
              </p>
              <Button onClick={() => handleCreateReport()}>
                <Plus className="h-4 w-4 mr-2" />
                Neuer Bericht
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teilnehmer</TableHead>
                  <TableHead>Zeitraum</TableHead>
                  <TableHead>Programm</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktualisiert</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.profiles?.full_name || "Unbekannt"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(report.period_start), "dd.MM.yy", { locale: de })} –{" "}
                      {format(new Date(report.period_end), "dd.MM.yy", { locale: de })}
                    </TableCell>
                    <TableCell className="capitalize">
                      {report.program_type?.replace(/_/g, " ") || "-"}
                    </TableCell>
                    <TableCell>{report.coach?.full_name || "-"}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      {format(new Date(report.updated_at), "dd.MM.yyyy HH:mm", { locale: de })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditReport(report.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Create from Participants */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellzugriff: Neuen Bericht erstellen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.slice(0, 6).map((participant) => (
              <Button
                key={participant.id}
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => handleCreateReport(participant.id)}
              >
                <Plus className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">{participant.full_name || participant.email}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;
