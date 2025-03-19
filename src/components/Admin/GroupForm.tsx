import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GroupFormProps {
  group?: {
    id: string;
    name: string;
    description: string | null;
    status: 'active' | 'archived';
    parent_id: string | null;
  };
  parentGroups: Array<{
    id: string;
    name: string;
  }>;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
}

interface FormData {
  name: string;
  description: string;
  status: 'active' | 'archived';
  parentId: string | null;
}

export function GroupForm({ group, parentGroups, onClose, onSuccess, mode }: GroupFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: group?.name || '',
    description: group?.description || '',
    status: group?.status || 'active',
    parentId: group?.parent_id || null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (mode === 'create') {
        const { error: createError } = await supabase
          .from('groups')
          .insert([{
            name: formData.name,
            description: formData.description || null,
            status: formData.status,
            parent_id: formData.parentId
          }]);

        if (createError) throw createError;
      } else if (group) {
        const { error: updateError } = await supabase
          .from('groups')
          .update({
            name: formData.name,
            description: formData.description || null,
            status: formData.status,
            parent_id: formData.parentId
          })
          .eq('id', group.id);

        if (updateError) throw updateError;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving group:', error);
      setErrors({
        submit: error.message || 'An error occurred while saving the group'
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
          {mode === 'create' ? 'Create New Group' : 'Edit Group'}
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
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter group name"
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
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={3}
              placeholder="Enter group description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Group
            </label>
            <select
              value={formData.parentId || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                parentId: e.target.value || null
              }))}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">No parent group</option>
              {parentGroups
                .filter(pg => pg.id !== group?.id) // Prevent self-reference
                .map(pg => (
                  <option key={pg.id} value={pg.id}>
                    {pg.name}
                  </option>
                ))
              }
            </select>
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
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Group'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}