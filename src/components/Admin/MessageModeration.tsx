import { useState, useEffect } from 'react';
import { CheckCircle, Flag, MessageSquare, X, AlertCircle, Send, Reply, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getViolationReason } from '../../lib/openai';
import { ReportedMessageView } from './ReportedMessageView';
import { cn } from '../../lib/utils';

interface ReportedMessage {
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
    moderation_flagged: boolean;
    moderation_categories: Record<string, boolean>;
    moderation_scores: Record<string, number>;
    sender: {
      username: string;
      status: string;
    };
  };
  reporter: {
    username: string;
  };
}

export function MessageModeration() {
  const [reports, setReports] = useState<ReportedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportedMessage | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'reply'>('view');
  
  // Search and Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 9;

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reported_messages')
        .select(`
          *,
          message:message_id (
            content,
            sender_id,
            created_at,
            moderation_flagged,
            moderation_categories,
            moderation_scores,
            sender:sender_id (
              username,
              status
            )
          ),
          reporter:reported_by (
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError('Falha ao carregar mensagens denunciadas');
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, status: ReportedMessage['status']) => {
    try {
      const { error } = await supabase
        .from('reported_messages')
        .update({ 
          status,
          resolved_at: status === 'pending' ? null : new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;
      
      setReports(reports.map(report => 
        report.id === reportId ? { ...report, status } : report
      ));
    } catch (error) {
      console.error('Error updating report status:', error);
      setError('Falha ao atualizar status da denúncia');
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'reviewed': return 'Revisado';
      case 'resolved': return 'Resolvido';
      case 'dismissed': return 'Descartado';
      default: return status;
    }
  };

  // Filter reports based on search term
  const filteredReports = reports.filter(report => {
    const searchLower = searchTerm.toLowerCase();
    return (
      report.message.sender.username.toLowerCase().includes(searchLower) ||
      report.message.content.toLowerCase().includes(searchLower) ||
      report.id.toLowerCase().includes(searchLower) ||
      report.reporter.username.toLowerCase().includes(searchLower)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800">Moderação de Mensagens</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por usuário ou conteúdo..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <span className="text-sm text-gray-500">
            {reports.filter(r => r.status === 'pending').length} denúncias pendentes
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {currentReports.map((report) => (
          <div
            key={report.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    Mensagem de {report.message.sender.username}
                  </span>
                </div>
                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                  {report.message.content}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                  report.status === 'dismissed' ? 'bg-gray-100 text-gray-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {getStatusText(report.status)}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Flag className="h-4 w-4" />
                <span>Denunciado por {report.reporter.username}</span>
                <span>•</span>
                <span>Motivo: {report.reason}</span>
              </div>
            </div>

            {report.message.moderation_flagged && (
              <div className="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <h4 className="text-sm font-medium text-yellow-800 mb-1">
                  Detecção Automática de Conteúdo
                </h4>
                <p className="text-sm text-yellow-700">
                  {getViolationReason(report.message.moderation_categories)}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Object.entries(report.message.moderation_scores).map(([category, score]) => (
                    <div key={category} className="text-xs">
                      <span className="text-yellow-800">{category}:</span>
                      <span className="ml-1 text-yellow-700">{(score * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex space-x-4">
              {report.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setViewMode('reply');
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Reply className="h-4 w-4" />
                    <span>Responder</span>
                  </button>
                  <button
                    onClick={() => updateReportStatus(report.id, 'resolved')}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Resolver</span>
                  </button>
                  <button
                    onClick={() => updateReportStatus(report.id, 'dismissed')}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span>Descartar</span>
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setSelectedReport(report);
                  setViewMode('view');
                }}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Ver Detalhes</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border enabled:hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={cn(
                  "w-8 h-8 rounded-lg",
                  currentPage === number
                    ? "bg-purple-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {number}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border enabled:hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {selectedReport && (
        <ReportedMessageView
          report={selectedReport}
          mode={viewMode}
          onClose={() => {
            setSelectedReport(null);
            setViewMode('view');
          }}
          onSuccess={() => {
            fetchReports();
            setSelectedReport(null);
            setViewMode('view');
          }}
        />
      )}
    </div>
  );
}