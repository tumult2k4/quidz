import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush
} from "recharts";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface MoodEntry {
  created_at: string;
  mood_value: number;
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

interface UserMoodChartProps {
  moodData: MoodEntry[];
  users: Array<{ id: string; full_name: string | null; email: string }>;
}

const UserMoodChart = ({ moodData, users }: UserMoodChartProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [zoomDays, setZoomDays] = useState(30);

  const filteredData = selectedUserId === "all" 
    ? moodData 
    : moodData.filter(entry => {
        const userEmail = (entry.profiles as any)?.email;
        const selectedUser = users.find(u => u.id === selectedUserId);
        return userEmail === selectedUser?.email;
      });

  const chartData = filteredData
    .slice(0, zoomDays * 10) // Approximate: 10 entries per day max
    .map(entry => ({
      date: format(new Date(entry.created_at), "dd.MM HH:mm", { locale: de }),
      timestamp: new Date(entry.created_at).getTime(),
      stimmung: entry.mood_value,
      name: (entry.profiles as any)?.full_name || (entry.profiles as any)?.email || "Unbekannt",
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const avgMood = filteredData.length > 0
    ? filteredData.reduce((sum, entry) => sum + entry.mood_value, 0) / filteredData.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle>Individueller Stimmungsverlauf</CardTitle>
            <CardDescription>
              Durchschnitt: {avgMood.toFixed(1)}/10 • {filteredData.length} Einträge
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Teilnehmer wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Teilnehmer</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1 border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomDays(Math.max(7, zoomDays - 7))}
                className="h-9 px-2"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomDays(Math.min(90, zoomDays + 7))}
                className="h-9 px-2"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Anzeige: {zoomDays} Tage
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Keine Stimmungseinträge vorhanden
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis domain={[1, 10]} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{payload[0].payload.name}</p>
                        <p className="text-sm text-muted-foreground">{payload[0].payload.date}</p>
                        <p className="text-lg font-bold text-primary">
                          Stimmung: {payload[0].value}/10
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="stimmung" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Brush 
                dataKey="date" 
                height={30} 
                stroke="hsl(var(--primary))"
                fill="hsl(var(--muted))"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default UserMoodChart;
