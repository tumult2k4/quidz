import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Save, LogOut, Lock } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        toast.error("Fehler beim Laden des Profils");
        return;
      }

      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        email: data.email || "",
      });
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Fehler beim Speichern");
      setSaving(false);
      return;
    }

    toast.success("Profil erfolgreich aktualisiert");
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    });

    if (error) {
      toast.error("Fehler beim Ändern des Passworts");
      setSaving(false);
      return;
    }

    toast.success("Passwort erfolgreich geändert");
    setPasswordData({ newPassword: "", confirmPassword: "" });
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Erfolgreich abgemeldet");
    navigate("/auth");
  };

  if (loading) return <div className="p-8">Lädt...</div>;
  if (!profile) return <div className="p-8">Profil nicht gefunden</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Mein Profil</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihre persönlichen Informationen</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-2xl">
                {profile.full_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{profile.full_name || "Unbekannt"}</CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Profil bearbeiten</CardTitle>
          <CardDescription>Aktualisieren Sie Ihre persönlichen Daten</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">
                <User className="w-4 h-4 inline mr-2" />
                Vollständiger Name
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Max Mustermann"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="w-4 h-4 inline mr-2" />
                E-Mail
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                E-Mail kann nicht geändert werden
              </p>
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Wird gespeichert..." : "Änderungen speichern"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Passwort ändern</CardTitle>
          <CardDescription>Aktualisieren Sie Ihr Passwort</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">
                <Lock className="w-4 h-4 inline mr-2" />
                Neues Passwort
              </Label>
              <Input
                id="new_password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Mindestens 6 Zeichen"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">
                <Lock className="w-4 h-4 inline mr-2" />
                Passwort bestätigen
              </Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Passwort wiederholen"
                minLength={6}
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              <Lock className="w-4 h-4 mr-2" />
              {saving ? "Wird geändert..." : "Passwort ändern"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card border-destructive/50">
        <CardHeader>
          <CardTitle>Account-Aktionen</CardTitle>
          <CardDescription>Verwalten Sie Ihren Account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Abmelden
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
