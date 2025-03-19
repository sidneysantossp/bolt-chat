import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RoomViewProps {
  room: {
    id: string;
    name: string;
    description: string | null;
    max_users: number;
    current_users: number;
    status: 'active' | 'archived';
  };
  onClose: () => void;
  onSuccess: () => void;
  mode: 'view' | 'edit';
}

interface FormData {
  name: string;
  description: string;
  maxUsers: number;
  status: 'active' | 'archived';
}

export function RoomView({ room, onClose, onSuccess, mode }: RoomViewProps) {
  const [formData, setFormData] = useState<FormData>({
    name: room.name,
    description: room.description || '',
    maxUsers: room.max_users,
    status: room.status
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.maxUsers < room.current_users) {
      newErrors.maxUsers = 'Maximum users cannot be less than current users';
    }

    if (formData.maxUsers < 1) {
      newErrors.maxUsers = 'Maximum users must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('rooms')
        .update({
          name: formData.name,
          description: formData.description || null,
          max_users: formData.maxUsers,
          status: formData.status
        })
        .eq('id', room.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating room:', error);
      setErrors({
        submit: error.message || 'An error occurred while updating the room'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-semibold mb-6">
          {mode === 'view' ? 'Room Details' : 'Edit Room'}
        </h2>

        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{errors.submit}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={mode === 'view'}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={mode === 'view'}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Users
            </label>
            <input
              type="number"
              value={formData.maxUsers}
              onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) }))}
              disabled={mode === 'view'}
              min={1}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50"
            />
            {errors.maxUsers && (
              <p className="mt-1 text-sm text-red-600">{errors.maxUsers}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                status: e.target.value as 'active' | 'archived'
              }))}
              disabled={mode === 'view'}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              {mode === 'view' ? 'Close' : 'Cancel'}
            </button>
            {mode === 'edit' && (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}