import { useState } from 'react';
import { X, Plus, Save, AlertCircle, Trash2, Edit2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Group {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  status: 'active' | 'archived';
  created_at: string;
  parent_id: string | null;
  subgroups?: Group[];
}

interface SubgroupViewProps {
  group: Group;
  onClose: () => void;
  onSuccess: () => void;
}

interface SubgroupFormData {
  id?: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
}

export function SubgroupView({ group, onClose, onSuccess }: SubgroupViewProps) {
  const [formData, setFormData] = useState<SubgroupFormData>({
    name: '',
    description: '',
    status: 'active'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSubgroup, setEditingSubgroup] = useState<Group | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSubgroup = (subgroup: Group) => {
    setEditingSubgroup(subgroup);
    setFormData({
      id: subgroup.id,
      name: subgroup.name,
      description: subgroup.description || '',
      status: subgroup.status
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (editingSubgroup) {
        // Update existing subgroup
        const { error: updateError } = await supabase
          .from('groups')
          .update({
            name: formData.name,
            description: formData.description || null,
            status: formData.status
          })
          .eq('id', editingSubgroup.id);

        if (updateError) throw updateError;
      } else {
        // Create new subgroup
        const { error: createError } = await supabase
          .from('groups')
          .insert([{
            name: formData.name,
            description: formData.description || null,
            status: formData.status,
            parent_id: group.id
          }]);

        if (createError) throw createError;
      }

      setFormData({
        name: '',
        description: '',
        status: 'active'
      });
      setShowForm(false);
      setEditingSubgroup(null);
      onSuccess();
    } catch (error: any) {
      console.error('Error saving subgroup:', error);
      setErrors({
        submit: error.message || 'An error occurred while saving the subgroup'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubgroup = async (subgroupId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('groups')
        .delete()
        .eq('id', subgroupId);

      if (deleteError) throw deleteError;
      onSuccess();
    } catch (error) {
      console.error('Error deleting subgroup:', error);
      setErrors({
        submit: 'Failed to delete subgroup'
      });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSubgroup(null);
    setFormData({
      name: '',
      description: '',
      status: 'active'
    });
    setErrors({});
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            {group.name} - Subgroups
          </h2>
          <p className="text-gray-600 mt-1">{group.description}</p>
        </div>

        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{errors.submit}</p>
          </div>
        )}

        {showForm ? (
          <div className="space-y-6">
            {/* Form Header */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                className="text-gray-600 hover:text-gray-800 flex items-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Subgroups</span>
              </button>
              <h3 className="text-lg font-medium text-gray-900">
                {editingSubgroup ? 'Edit Subgroup' : 'Create New Subgroup'}
              </h3>
            </div>

            {/* Subgroup Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter subgroup name"
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
                  placeholder="Enter subgroup description"
                />
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

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
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
                  <span>
                    {loading 
                      ? (editingSubgroup ? 'Updating...' : 'Creating...') 
                      : (editingSubgroup ? 'Update Subgroup' : 'Create Subgroup')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {group.subgroups && group.subgroups.length > 0 ? (
                group.subgroups.map(subgroup => (
                  <div
                    key={subgroup.id}
                    className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{subgroup.name}</h3>
                      {subgroup.description && (
                        <p className="text-sm text-gray-500">{subgroup.description}</p>
                      )}
                      <div className="flex items-center space-x-3 mt-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          subgroup.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {subgroup.status.charAt(0).toUpperCase() + subgroup.status.slice(1)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {subgroup.member_count} members
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditSubgroup(subgroup)}
                        className="text-blue-400 hover:text-blue-600"
                        title="Edit subgroup"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubgroup(subgroup.id)}
                        className="text-red-400 hover:text-red-600"
                        title="Delete subgroup"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No subgroups yet</p>
              )}
            </div>

            <button
              onClick={() => {
                setEditingSubgroup(null);
                setFormData({
                  name: '',
                  description: '',
                  status: 'active'
                });
                setShowForm(true);
              }}
              className="mt-6 flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Subgroup</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}