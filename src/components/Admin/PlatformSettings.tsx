import { useState, useEffect } from 'react';
import { Save, AlertCircle, Check, Settings as SettingsIcon, Shield, MessageSquare, Users, PenTool as Tool, BarChart as ChartBar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface Setting {
  id: string;
  key: string;
  value: any;
  description: string;
  updated_at: string;
  version: number;
}

type SettingCategory = 'chat' | 'rooms' | 'moderation' | 'security' | 'system';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export function PlatformSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('chat');
  const [toast, setToast] = useState<Toast | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .order('key');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      showToast('Erro ao carregar configurações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateSettingValue = (key: string, value: any) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key 
        ? { ...setting, value: { ...setting.value, ...value } }
        : setting
    ));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert(
          settings.map(({ id, key, value, description }) => ({
            id,
            key,
            value,
            description
          }))
        );

      if (error) throw error;
      
      showToast('Configurações salvas com sucesso!', 'success');
      setHasChanges(false);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      showToast('Erro ao salvar configurações', 'error');
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'rooms', label: 'Salas', icon: Users },
    { id: 'moderation', label: 'Moderação', icon: Shield },
    { id: 'security', label: 'Segurança', icon: Tool },
    { id: 'system', label: 'Sistema', icon: ChartBar }
  ];

  const translateSettingName = (key: string): string => {
    const translations: Record<string, string> = {
      // Chat
      'message_length': 'Tamanho da Mensagem',
      'rate_limit': 'Limite de Taxa',
      'file_sharing': 'Compartilhamento de Arquivos',
      // Rooms
      'capacity': 'Capacidade',
      'creation': 'Criação',
      // Moderation
      'content_filter': 'Filtro de Conteúdo',
      'user_reports': 'Denúncias de Usuários',
      // Security
      'authentication': 'Autenticação',
      'sessions': 'Sessões',
      // System
      'maintenance': 'Manutenção',
      'analytics': 'Análises',
      // Common fields
      'enabled': 'Habilitado',
      'max': 'Máximo',
      'min': 'Mínimo',
      'messages_per_minute': 'Mensagens por Minuto',
      'max_size_mb': 'Tamanho Máximo (MB)',
      'allowed_types': 'Tipos Permitidos',
      'default_max_users': 'Máximo de Usuários Padrão',
      'absolute_max_users': 'Máximo Absoluto de Usuários',
      'auto_archive_empty_rooms': 'Arquivar Salas Vazias',
      'auto_archive_after_hours': 'Arquivar Após (horas)',
      'allow_user_creation': 'Permitir Criação por Usuários',
      'require_approval': 'Requer Aprovação',
      'max_rooms_per_user': 'Máximo de Salas por Usuário',
      'sensitivity': 'Sensibilidade',
      'auto_delete_flagged': 'Excluir Automaticamente Sinalizados',
      'notify_admins': 'Notificar Administradores',
      'require_reason': 'Requer Motivo',
      'max_reports_per_day': 'Máximo de Denúncias por Dia',
      'auto_suspend_threshold': 'Limite para Suspensão Automática',
      'min_password_length': 'Tamanho Mínimo da Senha',
      'require_special_chars': 'Requer Caracteres Especiais',
      'require_numbers': 'Requer Números',
      'max_login_attempts': 'Máximo de Tentativas de Login',
      'lockout_duration_minutes': 'Duração do Bloqueio (minutos)',
      'max_concurrent_sessions': 'Máximo de Sessões Simultâneas',
      'session_timeout_hours': 'Tempo Limite da Sessão (horas)',
      'remember_me_duration_days': 'Duração "Lembrar-me" (dias)',
      'message': 'Mensagem',
      'allowed_ips': 'IPs Permitidos',
      'track_user_activity': 'Rastrear Atividade do Usuário',
      'track_performance': 'Rastrear Performance',
      'retention_days': 'Dias de Retenção'
    };

    return translations[key] || key.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const renderSettingInput = (setting: Setting, key: string, config: any) => {
    const id = `setting-${key}`;
    
    switch (typeof config) {
      case 'boolean':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config}
              onChange={(e) => updateSettingValue(setting.key, { [key]: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        );
      
      case 'number':
        return (
          <input
            type="number"
            id={id}
            value={config}
            onChange={(e) => updateSettingValue(setting.key, { [key]: parseFloat(e.target.value) })}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        );
      
      case 'string':
        return (
          <input
            type="text"
            id={id}
            value={config}
            onChange={(e) => updateSettingValue(setting.key, { [key]: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        );
      
      default:
        if (Array.isArray(config)) {
          return (
            <input
              type="text"
              id={id}
              value={config.join(', ')}
              onChange={(e) => updateSettingValue(setting.key, { [key]: e.target.value.split(',').map(s => s.trim()) })}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          );
        }
        return null;
    }
  };

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
          <SettingsIcon className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Configurações da Plataforma</h2>
            <p className="text-sm text-gray-500">Gerencie as configurações globais do sistema</p>
          </div>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving || !hasChanges}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-300",
            toast.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          )}
          style={{ animation: 'slideDown 0.3s ease-out' }}
        >
          {toast.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Categories */}
      <div className="flex space-x-4 border-b">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id as SettingCategory)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors",
              activeCategory === category.id
                ? "text-purple-600 border-b-2 border-purple-600"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <category.icon className="w-4 h-4" />
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 gap-6">
        {settings
          .filter(setting => setting.key.startsWith(activeCategory))
          .map(setting => (
            <div
              key={setting.key}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {translateSettingName(setting.key.split('.')[1])}
                  </h3>
                  <p className="text-sm text-gray-500">{setting.description}</p>
                </div>
                <span className="text-xs text-gray-400">
                  v{setting.version}
                </span>
              </div>

              <div className="space-y-4">
                {Object.entries(setting.value).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      {translateSettingName(key)}
                    </label>
                    <div className="w-64">
                      {renderSettingInput(setting, key, value)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-gray-400 pt-2 border-t">
                Última atualização: {new Date(setting.updated_at).toLocaleString()}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}