import { DivideIcon as LucideIcon, LogOut, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface Section {
  id: string;
  label: string;
  icon: typeof LucideIcon;
}

interface AdminSidebarProps {
  sections: Section[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

export function AdminSidebar({ sections, activeSection, onSectionChange }: AdminSidebarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-800">Admin Dashboard</h2>
      </div>
      
      <nav className="flex-1 p-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                'w-full flex items-center space-x-3 px-4 py-3 mb-2 rounded-lg transition-colors',
                activeSection === section.id
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{section.label}</span>
            </button>
          );
        })}

        {/* Botão de acesso ao chat */}
        <button
          onClick={() => navigate('/chat')}
          className="w-full flex items-center space-x-3 px-4 py-3 mb-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-50 mt-4 border-t pt-4"
        >
          <MessageCircle className="h-5 w-5 text-blue-500" />
          <span className="font-medium">Acessar Chat</span>
        </button>
      </nav>

      <button
        onClick={handleLogout}
        className="p-4 flex items-center space-x-3 text-red-600 hover:bg-red-50 transition-colors border-t"
      >
        <LogOut className="h-5 w-5" />
        <span className="font-medium">Sair</span>
      </button>
    </aside>
  );
}