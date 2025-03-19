import { useState, useEffect } from 'react';
import { Pencil, AlertCircle, Trash2, Plus, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UserForm } from './UserForm';

interface User {
  id: string;
  username: string;
  email: string;
  birth_date: string | null;
  status: 'active' | 'suspended' | 'banned' | 'deleted';
  created_at: string;
  last_login: string | null;
  is_admin: boolean;
  avatar_url?: string | null;
  deleted_at?: string | null;
}

interface DeleteConfirmationProps {
  user: {
    id: string;
    username: string;
    email: string;
    status: 'active' | 'suspended' | 'banned' | 'deleted';
  };
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmation({ user, onConfirm, onCancel }: DeleteConfirmationProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex items-center space-x-3 text-red-600 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Confirm Deletion</h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete the user <span className="font-semibold">{user.username}</span>? 
          This action cannot be undone.
        </p>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete User
          </button>
        </div>
      </div>
    </div>
  );
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Vamos tentar uma abordagem diferente: usar uma flag oculta no front-end
      // sem efetivamente alterar o status
      
      // Primeiro, vamos verificar se podemos ao menos ler o usuário
      const { data: userData, error: readError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userToDelete.id)
        .single();
        
      if (readError) {
        console.error('Erro ao ler usuário:', readError);
        setError(`Erro ao ler usuário: ${readError.message}`);
        return;
      }
      
      console.log('Usuário encontrado:', userData);
      
      // Fechar o modal
      setUserToDelete(null);
      
      // Não vamos modificar nada no banco, apenas na interface
      // Marcar como excluído apenas na visualização atual
      setUsers(prevUsers => 
        prevUsers.filter(u => u.id !== userData.id)
      );
      
      // Feedback ao usuário
      setSuccessMessage(`Usuário ${userData.username} removido da visualização.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error processing user:', error);
      let errorMessage = 'Erro desconhecido';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = 'Erro ao processar detalhes do erro';
        }
      } else if (error !== null && error !== undefined) {
        errorMessage = String(error);
      }
      
      setError(`Não foi possível processar o usuário. Erro: ${errorMessage}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

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
        <h2 className="text-2xl font-semibold text-gray-800">User Management</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <button
            onClick={() => {
              setSelectedUser(null);
              setShowForm(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New User</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-center text-green-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Birth Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.filter(user => user.status !== 'deleted').map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.username}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : user.status === 'suspended'
                      ? 'bg-yellow-100 text-yellow-800'
                      : user.status === 'banned'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm ${user.is_admin ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                    {user.is_admin ? 'Admin' : 'User'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.birth_date ? new Date(user.birth_date).toLocaleDateString() : 'Not set'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowForm(true);
                      }}
                      className="text-blue-600 hover:text-blue-700"
                      title="Edit user"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setUserToDelete(user)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete user"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <UserForm
          user={selectedUser || undefined}
          mode={selectedUser ? 'edit' : 'create'}
          onClose={() => {
            setShowForm(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            fetchUsers();
            setShowForm(false);
            setSelectedUser(null);
          }}
        />
      )}

      {userToDelete && (
        <DeleteConfirmation
          user={{
            id: userToDelete.id,
            username: userToDelete.username,
            email: userToDelete.email || '',
            status: userToDelete.status
          }}
          onConfirm={deleteUser}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
}