import { useState } from 'react';
import {
  BarChart3,
  Users,
  MessageSquare,
  Settings,
  Flag,
  Layout,
  Key
} from 'lucide-react';
import { AdminSidebar } from "./AdminSidebar";
import { AdminOverview } from "./AdminOverview";
import { UserManagement } from "./UserManagement";
import { GroupManagement } from "./GroupManagement";
import { RoomManagement } from "./RoomManagement";
import { MessageModeration } from "./MessageModeration";
import { PlatformSettings } from "./PlatformSettings";
import { APIKeys } from "./APIKeys";

const sections = [
  { id: "overview", label: "Visão Geral", icon: BarChart3 },
  { id: "users", label: "Usuários", icon: Users },
  { id: "groups", label: "Grupos", icon: Layout },
  { id: "rooms", label: "Salas", icon: MessageSquare },
  { id: "moderation", label: "Moderação", icon: Flag },
  { id: "settings", label: "Configurações", icon: Settings },
  { id: "api_keys", label: "Chaves API", icon: Key }
];

export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("users");

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <AdminOverview />;
      case "users":
        return <UserManagement />;
      case "groups":
        return <GroupManagement />;
      case "rooms":
        return <RoomManagement />;
      case "moderation":
        return <MessageModeration />;
      case "settings":
        return <PlatformSettings />;
      case "api_keys":
        return <APIKeys />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <main className="flex-1 p-8 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}