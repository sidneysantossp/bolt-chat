import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, DollarSign, Zap, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface UsageData {
  date: string;
  tokens_used: number;
  cost_usd: number;
  endpoint: string;
}

interface UsageStats {
  totalTokens: number;
  totalCost: number;
  dailyAverage: number;
  projectedMonthly: number;
}

export function OpenAIUsage() {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [timeframe]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'moderation.openai')
        .single();

      if (settingsError) throw settingsError;
      setSettings(settingsData.value);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90));

      // Fetch usage data
      const { data: usageData, error: usageError } = await supabase
        .from('openai_usage')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (usageError) throw usageError;
      setUsageData(usageData || []);
    } catch (error) {
      console.error('Error fetching OpenAI usage data:', error);
      setError('Falha ao carregar dados de uso da API');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (): UsageStats => {
    const totalTokens = usageData.reduce((sum, day) => sum + day.tokens_used, 0);
    const totalCost = usageData.reduce((sum, day) => sum + Number(day.cost_usd), 0);
    const days = usageData.length || 1;
    const dailyAverage = totalTokens / days;
    const projectedMonthly = (dailyAverage * 30).toFixed(2);

    return {
      totalTokens,
      totalCost,
      dailyAverage,
      projectedMonthly: Number(projectedMonthly)
    };
  };

  const stats = calculateStats();
  const monthlyBudget = settings?.max_monthly_cost_usd || 0;
  const usagePercentage = (stats.totalCost / monthlyBudget) * 100;
  const isOverBudget = usagePercentage > 100;
  const isNearBudget = usagePercentage > (settings?.alert_threshold_pct || 80);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Zap className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Uso da API OpenAI</h2>
            <p className="text-sm text-gray-500">Monitoramento de consumo e custos</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as '7d' | '30d' | '90d')}
            className="px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Alert if over/near budget */}
      {(isOverBudget || isNearBudget) && (
        <div className={cn(
          "p-4 rounded-lg flex items-center space-x-3",
          isOverBudget 
            ? "bg-red-50 text-red-700 border border-red-100"
            : "bg-yellow-50 text-yellow-700 border border-yellow-100"
        )}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">
              {isOverBudget 
                ? 'Limite mensal excedido!'
                : 'Próximo ao limite mensal!'
              }
            </p>
            <p className="text-sm">
              Uso atual: ${stats.totalCost.toFixed(2)} de ${monthlyBudget.toFixed(2)} ({usagePercentage.toFixed(1)}%)
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de Tokens</p>
              <p className="text-2xl font-semibold mt-1">
                {stats.totalTokens.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Custo Total</p>
              <p className="text-2xl font-semibold mt-1">
                ${stats.totalCost.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Média Diária</p>
              <p className="text-2xl font-semibold mt-1">
                {stats.dailyAverage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Projeção Mensal</p>
              <p className="text-2xl font-semibold mt-1">
                {stats.projectedMonthly.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Settings className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Usage Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Uso por Dia</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'tokens_used') return [value.toLocaleString(), 'Tokens'];
                  if (name === 'cost_usd') return [`$${Number(value).toFixed(2)}`, 'Custo'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="tokens_used" 
                name="Tokens" 
                fill="#8b5cf6" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="right"
                dataKey="cost_usd" 
                name="Custo (USD)" 
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações da API</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Limite Mensal</p>
              <p className="text-sm text-gray-500">Custo máximo permitido por mês</p>
            </div>
            <div className="text-lg font-medium text-gray-900">
              ${settings?.max_monthly_cost_usd.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Limite Diário de Tokens</p>
              <p className="text-sm text-gray-500">Máximo de tokens por dia</p>
            </div>
            <div className="text-lg font-medium text-gray-900">
              {settings?.max_daily_tokens.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Limiar de Alerta</p>
              <p className="text-sm text-gray-500">Porcentagem do limite para alertas</p>
            </div>
            <div className="text-lg font-medium text-gray-900">
              {settings?.alert_threshold_pct}%
            </div>
          </div>

          <div>
            <p className="font-medium text-gray-700 mb-2">Endpoints Habilitados</p>
            <div className="space-y-2">
              {Object.entries(settings?.endpoints || {}).map(([endpoint, enabled]) => (
                <div key={endpoint} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{endpoint}</span>
                  <span className={cn(
                    "px-2 py-1 text-xs rounded-full",
                    enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                  )}>
                    {enabled ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}