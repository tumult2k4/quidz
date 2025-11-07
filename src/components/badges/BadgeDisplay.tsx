import { Award, Trophy, Star, Flame, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BadgeData {
  badge_type: string;
  earned_at: string;
}

interface BadgeDisplayProps {
  badges: BadgeData[];
  showTitle?: boolean;
}

const badgeConfig: Record<string, { icon: typeof Award; label: string; color: string }> = {
  first_card: { icon: Star, label: "Erste Karte erstellt", color: "text-yellow-500" },
  cards_10: { icon: Trophy, label: "10 Karten gelernt", color: "text-blue-500" },
  cards_50: { icon: Trophy, label: "50 Karten gelernt", color: "text-purple-500" },
  streak_5: { icon: Flame, label: "5 Tage Streak", color: "text-orange-500" },
  streak_10: { icon: Flame, label: "10 Tage Streak", color: "text-red-500" },
  perfect_session: { icon: Target, label: "Perfekte Session", color: "text-green-500" },
};

export function BadgeDisplay({ badges, showTitle = true }: BadgeDisplayProps) {
  if (badges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Erfolge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Noch keine Erfolge erzielt. Fang an zu lernen!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Erfolge
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {badges.map((badge, index) => {
            const config = badgeConfig[badge.badge_type] || {
              icon: Award,
              label: badge.badge_type,
              color: "text-gray-500",
            };
            const Icon = config.icon;

            return (
              <div
                key={index}
                className="flex flex-col items-center p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Icon className={`h-8 w-8 mb-2 ${config.color}`} />
                <p className="text-xs font-medium text-center">{config.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(badge.earned_at).toLocaleDateString("de-DE")}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
