import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Shield, User } from "lucide-react";
import { toast } from "sonner";

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

  const toggleAdminRole = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (isCurrentlyAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) {
        toast.error("Fehler beim Entfernen der Admin-Rolle");
        return;
      }
      toast.success("Admin-Rolle entfernt");
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });

      if (error) {
        toast.error("Fehler beim Hinzufügen der Admin-Rolle");
        return;
      }
      toast.success("Admin-Rolle hinzugefügt");
    }

    fetchUsers();
  };

  const isAdmin = (user: Profile) => {
    return user.user_roles?.some((r) => r.role === "admin") || false;
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
            const userIsAdmin = isAdmin(user);
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
                          {userIsAdmin ? (
                            <Badge variant="default" className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Teilnehmer
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            Registriert: {new Date(user.created_at).toLocaleDateString("de-CH")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={userIsAdmin ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleAdminRole(user.id, userIsAdmin)}
                    >
                      {userIsAdmin ? "Admin entfernen" : "Zum Admin machen"}
                    </Button>
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
