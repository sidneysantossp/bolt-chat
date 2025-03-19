import { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  Flag,
  Activity,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalGroups: number;
  totalRooms: number;
  reportedMessages: number;
  onlineUsers: number;
}

interface ChartData {
  date: string;
  users?: number;
  reports?: number;
}

export function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalGroups: 0,
    totalRooms: 0,
    reportedMessages: 0,
    onlineUsers: 0
  });
  const [userChartData, setUserChartData] = useState<ChartData[]>([]);
  const [reportChartData, setReportChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact' });

      // Get active users (not suspended or banned)
      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      // Get online users (last seen within 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count: onlineUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .gt('last_seen', fiveMinutesAgo);

      // Get total groups
      const { count: totalGroups } = await supabase
        .from('groups')
        .select('*', { count: 'exact' });

      // Get active rooms
      const { count: totalRooms } = await supabase
        .from('rooms')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      // Get reported messages
      const { count: reportedMessages } = await supabase
        .from('reported_messages')
        .select('*', { count: 'exact' })
        .eq('status', 'pending');

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalGroups: totalGroups || 0,
        totalRooms: totalRooms || 0,
        reportedMessages: reportedMessages || 0,
        onlineUsers: onlineUsers || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to load statistics');
    }
  };

  const fetchChartData = async () => {
    try {
      // Get the date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

      // Fetch user registration data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', dateStr)
        .order('created_at');

      if (userError) throw userError;

      // Fetch reported messages data
      const { data: reportData, error: reportError } = await supabase
        .from('reported_messages')
        .select('created_at')
        .gte('created_at', dateStr)
        .order('created_at');

      if (reportError) throw reportError;

      // Process data for charts
      const usersByDate = new Map<string, number>();
      const reportsByDate = new Map<string, number>();

      // Initialize all dates in the last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        usersByDate.set(dateStr, 0);
        reportsByDate.set(dateStr, 0);
      }

      // Count users by date
      userData?.forEach(user => {
        const date = new Date(user.created_at).toISOString().split('T')[0];
        usersByDate.set(date, (usersByDate.get(date) || 0) + 1);
      });

      // Count reports by date
      reportData?.forEach(report => {
        const date = new Date(report.created_at).toISOString().split('T')[0];
        reportsByDate.set(date, (reportsByDate.get(date) || 0) + 1);
      });

      // Convert to chart data format
      const chartData: ChartData[] = Array.from(usersByDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, users]) => ({
          date,
          users,
          reports: reportsByDate.get(date) || 0
        }));

      setUserChartData(chartData);
      setReportChartData(chartData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total de Usuários',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Usuários Ativos',
      value: stats.activeUsers,
      icon: UserCheck,
      color: 'bg-green-500'
    },
    {
      title: 'Usuários Online',
      value: stats.onlineUsers,
      icon: Activity,
      color: 'bg-purple-500'
    },
    {
      title: 'Total de Grupos',
      value: stats.totalGroups,
      icon: MessageSquare,
      color: 'bg-indigo-500'
    },
    {
      title: 'Salas Ativas',
      value: stats.totalRooms,
      icon: MessageSquare,
      color: 'bg-pink-500'
    },
    {
      title: 'Mensagens Denunciadas',
      value: stats.reportedMessages,
      icon: Flag,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Visão Geral</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-2xl font-semibold mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-full ${card.color} bg-opacity-10`}>
                  <Icon className={`h-6 w-6 ${card.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Usuários Cadastrados (30 dias)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value) => [value, 'Usuários']}
                />
                <Bar dataKey="users" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Mensagens Denunciadas (30 dias)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value) => [value, 'Denúncias']}
                />
                <Bar dataKey="reports" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}