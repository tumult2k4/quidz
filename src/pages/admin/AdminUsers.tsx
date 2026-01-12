import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Shield, User, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  user_roles?: { role: string }[];
}

const AdminUsers = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast.error("Fehler beim Laden der User");
      return;
    }

    // Fetch roles separately
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role");

    // Combine data
    const usersWithRoles = (profilesData || []).map(profile => ({
      ...profile,
      user_roles: (rolesData || [])
        .filter(r => r.user_id === profile.id)
        .map(r => ({ role: r.role }))
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const setUserRole = async (userId: string, newRole: "admin" | "coach" | "user") => {
    // First, remove all existing roles (admin, coach) - keep 'user' as base
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .in("role", ["admin", "coach"]);

    if (deleteError) {
      toast.error("Fehler beim Ändern der Rolle");
      return;
    }

    // If not setting to 'user', add the new role
    if (newRole !== "user") {
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });

      if (insertError) {
        toast.error("Fehler beim Hinzufügen der Rolle");
        return;
      }
    }

    const roleLabels = { admin: "Admin", coach: "Coach", user: "Teilnehmer" };
    toast.success(`Rolle auf ${roleLabels[newRole]} geändert`);
    fetchUsers();
  };

  const getUserRole = (user: Profile): "admin" | "coach" | "user" => {
    if (user.user_roles?.some((r) => r.role === "admin")) return "admin";
    if (user.user_roles?.some((r) => r.role === "coach")) return "coach";
    return "user";
  };

  const getRoleBadge = (role: "admin" | "coach" | "user") => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Admin
          </Badge>
        );
      case "coach":
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <GraduationCap className="w-3 h-3" />
            Coach
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <User className="w-3 h-3" />
            Teilnehmer
          </Badge>
        );
    }
  };

  if (loading) return <div className="p-8">Lädt...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teilnehmendenverwaltung</h1>
        <p className="text-muted-foreground">Verwalten Sie Teilnehmende und deren Rollen</p>
      </div>

      <div className="grid gap-4">
        {users.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              Keine User vorhanden
            </CardContent>
          </Card>
        ) : (
          users.map((user) => {
            const userRole = getUserRole(user);
            return (
              <Card key={user.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xl">
                          {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1">
                          {user.full_name || "Unbekannt"}
                        </CardTitle>
                        <CardDescription className="mb-3">{user.email}</CardDescription>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(userRole)}
                          <span className="text-sm text-muted-foreground">
                            Registriert: {new Date(user.created_at).toLocaleDateString("de-CH")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Rolle ändern
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setUserRole(user.id, "admin")}
                          disabled={userRole === "admin"}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setUserRole(user.id, "coach")}
                          disabled={userRole === "coach"}
                        >
                          <GraduationCap className="w-4 h-4 mr-2" />
                          Coach
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setUserRole(user.id, "user")}
                          disabled={userRole === "user"}
                        >
                          <User className="w-4 h-4 mr-2" />
                          Teilnehmer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
