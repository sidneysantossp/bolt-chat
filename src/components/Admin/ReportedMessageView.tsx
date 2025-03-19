import { useState } from 'react';
import { X, Save, AlertCircle, Send, Reply } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReportedMessageViewProps {
  report: {
    id: string;
    message_id: string;
    reported_by: string;
    reason: string;
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
    created_at: string;
    resolved_at: string | null;
    notes: string | null;
    message: {
      content: string;
      sender_id: string;
      created_at: string;
      sender: {
        username: string;
        status: string;
      };
    };
    reporter: {
      username: string;
    };
  };
  onClose: () => void;
  onSuccess: () => void;
  mode: 'view' | 'reply';
}

export function ReportedMessageView({ report, onClose, onSuccess, mode }: ReportedMessageViewProps) {
  const [formData, setFormData] = useState({
    notes: report.notes || '',
    replyToReporter: '',
    replyToReported: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'reply') {
        // Enviar mensagens de resposta
        if (formData.replyToReporter) {
          const { error: reporterMsgError } = await supabase
            .from('messages')
            .insert([{
              sender_id: (await supabase.auth.getUser()).data.user?.id,
              receiver_id: report.reported_by,
              content: formData.replyToReporter,
              is_private: true
            }]);

          if (reporterMsgError) throw reporterMsgError;
        }

        if (formData.replyToReported) {
          const { error: reportedMsgError } = await supabase
            .from('messages')
            .insert([{
              sender_id: (await supabase.auth.getUser()).data.user?.id,
              receiver_id: report.message.sender_id,
              content: formData.replyToReported,
              is_private: true
            }]);

          if (reportedMsgError) throw reportedMsgError;
        }

        // Atualizar status e observações da denúncia
        const { error: updateError } = await supabase
          .from('reported_messages')
          .update({
            status: 'reviewed',
            resolved_at: new Date().toISOString(),
            notes: formData.notes || null
          })
          .eq('id', report.id);

        if (updateError) throw updateError;
      } else {
        // Apenas atualizar observações
        const { error: updateError } = await supabase
          .from('reported_messages')
          .update({
            notes: formData.notes || null
          })
          .eq('id', report.id);

        if (updateError) throw updateError;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar denúncia:', error);
      setError(error.message || 'Ocorreu um erro ao atualizar a denúncia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-semibold mb-6">
          {mode === 'view' ? 'Detalhes da Denúncia' : 'Responder à Denúncia'}
        </h2>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Detalhes da Mensagem */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">
                  {report.message.sender.username}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(report.message.created_at).toLocaleString()}
                </span>
              </div>
            </div>
            <p className="text-gray-700">{report.message.content}</p>
          </div>

          {/* Detalhes da Denúncia */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Denunciado por
              </label>
              <p className="text-gray-900">{report.reporter.username}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo da Denúncia
              </label>
              <p className="text-gray-900">{report.reason}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                rows={3}
                placeholder="Adicione observações sobre esta denúncia..."
              />
            </div>

            {mode === 'reply' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responder ao Denunciante ({report.reporter.username})
                  </label>
                  <textarea
                    value={formData.replyToReporter}
                    onChange={(e) => setFormData(prev => ({ ...prev, replyToReporter: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows={3}
                    placeholder="Escreva uma mensagem para o denunciante..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responder ao Denunciado ({report.message.sender.username})
                  </label>
                  <textarea
                    value={formData.replyToReported}
                    onChange={(e) => setFormData(prev => ({ ...prev, replyToReported: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows={3}
                    placeholder="Escreva uma mensagem para o usuário denunciado..."
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {mode === 'reply' ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Enviando...' : 'Enviar Respostas'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Salvando...' : 'Salvar Observações'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}