import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Check, X, Eye, EyeOff, Calendar, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface APIKey {
  id: string;
  name: string;
  key_type: string;
  key_value: string;
  is_active: boolean;
  created_at: string;
  last_used: string | null;
  expires_at: string | null;
}

interface APIKeyFormData {
  name: string;
  key_type: string;
  key_value: string;
  expires_at: string | null;
}

const API_PROVIDERS = [
  { 
    id: 'openai', 
    name: 'OpenAI',
    testEndpoint: 'https://api.openai.com/v1/models',
    headers: (key: string) => ({ 'Authorization': `Bearer ${key}` })
  },
  { 
    id: 'deepseek', 
    name: 'Deepseek',
    testEndpoint: 'https://api.deepseek.com/v1/models',
    headers: (key: string) => ({ 'Authorization': `Bearer ${key}` })
  },
  { 
    id: 'perplexity', 
    name: 'Perplexity',
    testEndpoint: 'https://api.perplexity.ai/v1/models',
    headers: (key: string) => ({ 'Authorization': `Bearer ${key}` })
  },
  { 
    id: 'grok', 
    name: 'Grok',
    testEndpoint: 'https://api.grok.x.ai/v1/models',
    headers: (key: string) => ({ 'Authorization': `Bearer ${key}` })
  }
];

export function APIKeys() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<APIKeyFormData>({
    name: '',
    key_type: 'openai',
    key_value: '',
    expires_at: null
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [testingKey, setTestingKey] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setError('Falha ao carregar chaves API');
    } finally {
      setLoading(false);
    }
  };

  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    if (!formData.key_value.trim()) {
      setError('Chave API é obrigatória');
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .insert([{
          name: formData.name,
          key_type: formData.key_type,
          key_value: formData.key_value,
          expires_at: formData.expires_at
        }]);

      if (error) throw error;

      showSuccessMessage('Chave API adicionada com sucesso!');
      setShowForm(false);
      setFormData({
        name: '',
        key_type: 'openai',
        key_value: '',
        expires_at: null
      });
      fetchKeys();
    } catch (error) {
      console.error('Error adding API key:', error);
      setError('Falha ao adicionar chave API');
    }
  };

  const testApiKey = async () => {
    setTestingKey(true);
    setError(null);
    
    try {
      if (!formData.key_value) {
        throw new Error('Por favor, insira uma chave API para testar');
      }

      const provider = API_PROVIDERS.find(p => p.id === formData.key_type);
      if (!provider) {
        throw new Error('Provedor API não suportado');
      }

      const response = await fetch(provider.testEndpoint, {
        headers: provider.headers(formData.key_value),
      });

      if (!response.ok) {
        throw new Error(`Chave API inválida ou expirada para ${provider.name}`);
      }

      showSuccessMessage(`Conexão com a API ${provider.name} testada com sucesso!`);
    } catch (error) {
      console.error('Error testing API key:', error);
      setError(error instanceof Error ? error.message : 'Erro ao testar chave API');
    } finally {
      setTestingKey(false);
    }
  };

  const toggleKeyStatus = async (key: APIKey) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !key.is_active })
        .eq('id', key.id);

      if (error) throw error;

      showSuccessMessage(`Chave ${key.is_active ? 'desativada' : 'ativada'} com sucesso!`);
      fetchKeys();
    } catch (error) {
      console.error('Error toggling key status:', error);
      setError('Falha ao atualizar status da chave');
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta chave API?')) return;

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showSuccessMessage('Chave API excluída com sucesso!');
      fetchKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      setError('Falha ao excluir chave API');
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKey(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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
          <Key className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Chaves API</h2>
            <p className="text-sm text-gray-500">Gerencie suas chaves de API</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Chave API</span>
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-center text-green-700">
          <Check className="w-5 h-5 mr-2" />
          <p>{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      {/* Add Key Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Ex: OpenAI Production"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provedor
              </label>
              <select
                value={formData.key_type}
                onChange={(e) => setFormData(prev => ({ ...prev, key_type: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {API_PROVIDERS.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chave API
              </label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={formData.key_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, key_value: e.target.value }))}
                  className="flex-1 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Insira sua chave API"
                />
                <button
                  type="button"
                  onClick={testApiKey}
                  disabled={testingKey || !formData.key_value}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {testingKey ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Testando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Testar Conexão</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Expiração (opcional)
              </label>
              <input
                type="date"
                value={formData.expires_at || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Adicionar Chave
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keys List */}
      <div className="grid grid-cols-1 gap-6">
        {keys.map(key => (
          <div
            key={key.id}
            className={cn(
              "bg-white rounded-xl shadow-sm border p-6 transition-colors",
              key.is_active
                ? "border-gray-200"
                : "border-gray-200 bg-gray-50 opacity-75"
            )}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">{key.name}</h3>
                <p className="text-sm text-gray-500">
                  Provedor: {API_PROVIDERS.find(p => p.id === key.key_type)?.name || key.key_type}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleKeyStatus(key)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    key.is_active
                      ? "text-green-600 hover:bg-green-50"
                      : "text-gray-400 hover:bg-gray-100"
                  )}
                  title={key.is_active ? "Desativar" : "Ativar"}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => deleteKey(key.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center space-x-2">
              <div className="flex-1 font-mono text-sm bg-gray-50 p-2 rounded border">
                {showKey[key.id] ? key.key_value : '••••••••••••••••'}
              </div>
              <button
                onClick={() => toggleShowKey(key.id)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showKey[key.id] ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Criada em: {new Date(key.created_at).toLocaleDateString()}</span>
              </div>
              {key.last_used && (
                <div className="flex items-center space-x-1">
                  <RefreshCw className="w-4 h-4" />
                  <span>Último uso: {new Date(key.last_used).toLocaleString()}</span>
                </div>
              )}
              {key.expires_at && (
                <div className="flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>Expira em: {new Date(key.expires_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="mt-2">
              <span className={cn(
                "px-2 py-1 text-xs rounded-full",
                key.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              )}>
                {key.is_active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}