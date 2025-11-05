import { useLocation, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Calendar as CalendarIcon,
  User,
  Users,
  FileText,
  Settings,
  MessageCircle,
  FolderKanban,
  Sparkles,
  Wrench,
  CalendarDays,
  MessagesSquare,
  Bot,
} from "lucide-react";
import logo from "@/assets/logoquidz.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  isAdmin: boolean;
}

export function AppSidebar({ isAdmin }: AppSidebarProps) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const userItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Chat", url: "/chat", icon: MessageCircle },
    { title: "Aufgaben", url: "/tasks", icon: CheckSquare },
    { title: "Dokumente", url: "/documents", icon: BookOpen },
    { title: "Absenzen", url: "/absences", icon: CalendarIcon },
    { title: "Werkzeuge", url: "/tools", icon: Wrench },
    { title: "Kalender", url: "/calendar", icon: CalendarDays },
    { title: "Feedback", url: "/feedback", icon: MessagesSquare },
    { title: "KI Assistent", url: "/ai-assistant", icon: Bot },
    { title: "Portfolio", url: "/portfolio", icon: Sparkles },
    { title: "Meine Projekte", url: "/my-projects", icon: FolderKanban },
    { title: "Profil", url: "/profile", icon: User },
  ];

  const adminItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Chat", url: "/chat", icon: MessageCircle },
    { title: "Aufgaben", url: "/admin/tasks", icon: CheckSquare },
    { title: "Dokumente", url: "/admin/documents", icon: FileText },
    { title: "Absenzen", url: "/admin/absences", icon: CalendarIcon },
    { title: "Teilnehmende", url: "/admin/users", icon: Users },
    { title: "Werkzeuge", url: "/admin/tools", icon: Wrench },
    { title: "Kalender", url: "/calendar", icon: CalendarDays },
    { title: "Feedback", url: "/admin/feedback", icon: MessagesSquare },
    { title: "KI Assistent", url: "/admin/ai", icon: Bot },
    { title: "Portfolio", url: "/portfolio", icon: Sparkles },
    { title: "Meine Projekte", url: "/my-projects", icon: FolderKanban },
    { title: "Einstellungen", url: "/admin/settings", icon: Settings },
  ];

  const items = isAdmin ? adminItems : userItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="QUIDZ Logo" className="w-10 h-10 object-contain" />
            {!collapsed && (
              <div>
                <h2 className="font-bold text-lg">QUIDZ</h2>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? "Admin" : "Teilnehmer"}
                </p>
              </div>
            )}
          </div>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? "Verwaltung" : "Navigation"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink to={item.url} className="flex items-center gap-2">
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
