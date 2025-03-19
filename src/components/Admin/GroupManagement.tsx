import { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, AlertCircle, Search, ChevronRight, FolderTree, Archive, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GroupForm } from './GroupForm';
import { SubgroupView } from './SubgroupView';
import { cn } from '../../lib/utils';

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

interface DeleteConfirmationProps {
  group: Group;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmation({ group, onConfirm, onCancel }: DeleteConfirmationProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex items-center space-x-3 text-red-600 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Confirm Deletion</h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete the group <span className="font-semibold">{group.name}</span>? 
          This will also delete all subgroups and rooms within this group. This action cannot be undone.
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
            Delete Group
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupCard({ group, onEdit, onDelete, onView, depth = 0 }: { 
  group: Group; 
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
  onView: (group: Group) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "space-y-4",
      depth > 0 ? "ml-8 pl-4 border-l border-gray-200" : ""
    )}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 transition-all duration-200 hover:shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
              {group.subgroups && group.subgroups.length > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ChevronRight className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    expanded ? "transform rotate-90" : ""
                  )} />
                </button>
              )}
              <span className={cn(
                "px-2 py-1 text-xs rounded-full",
                group.status === 'active' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              )}>
                {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
              </span>
            </div>
            {group.description && (
              <p className="text-sm text-gray-500 mt-1">{group.description}</p>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onView(group)}
              className="text-blue-400 hover:text-blue-600"
              title="View subgroups"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button
              onClick={() => onEdit(group)}
              className="text-gray-400 hover:text-gray-600"
              title="Edit group"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(group)}
              className="text-gray-400 hover:text-red-600"
              title="Delete group"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <FolderTree className="w-4 h-4" />
            <span>{group.subgroups?.length || 0} subgroups</span>
          </div>
          <div className="flex items-center space-x-1">
            <Archive className="w-4 h-4" />
            <span>{group.member_count} members</span>
          </div>
        </div>
      </div>

      {expanded && group.subgroups && group.subgroups.length > 0 && (
        <div className="space-y-4">
          {group.subgroups.map(subgroup => (
            <GroupCard
              key={subgroup.id}
              group={subgroup}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GroupManagement() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showSubgroupView, setShowSubgroupView] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Organize groups into hierarchy
      const groupsMap = new Map<string, Group>();
      const rootGroups: Group[] = [];

      // First pass: create map of all groups
      data?.forEach(group => {
        groupsMap.set(group.id, { ...group, subgroups: [] });
      });

      // Second pass: organize into hierarchy
      data?.forEach(group => {
        const groupWithSubgroups = groupsMap.get(group.id)!;
        if (group.parent_id) {
          const parent = groupsMap.get(group.parent_id);
          if (parent) {
            if (!parent.subgroups) parent.subgroups = [];
            parent.subgroups.push(groupWithSubgroups);
          }
        } else {
          rootGroups.push(groupWithSubgroups);
        }
      });

      setGroups(rootGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    try {
      const { error: deleteError } = await supabase
        .from('groups')
        .delete()
        .eq('id', group.id);

      if (deleteError) throw deleteError;

      await fetchGroups();
      setGroupToDelete(null);
    } catch (error) {
      console.error('Error deleting group:', error);
      setError('Failed to delete group');
    }
  };

  const flattenGroups = (groupList: Group[]): Group[] => {
    return groupList.reduce((flat: Group[], group) => {
      const flattened = [group];
      if (group.subgroups) {
        flattened.push(...flattenGroups(group.subgroups));
      }
      return [...flat, ...flattened];
    }, []);
  };

  const filteredGroups = searchTerm
    ? flattenGroups(groups).filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      )
    : groups;

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
        <h2 className="text-2xl font-semibold text-gray-800">Group Management</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <button
            onClick={() => {
              setSelectedGroup(null);
              setShowForm(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New Group</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {filteredGroups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            onEdit={(group) => {
              setSelectedGroup(group);
              setShowForm(true);
            }}
            onDelete={(group) => setGroupToDelete(group)}
            onView={(group) => {
              setSelectedGroup(group);
              setShowSubgroupView(true);
            }}
          />
        ))}
      </div>

      {showForm && (
        <GroupForm
          group={selectedGroup || undefined}
          parentGroups={flattenGroups(groups)}
          mode={selectedGroup ? 'edit' : 'create'}
          onClose={() => {
            setShowForm(false);
            setSelectedGroup(null);
          }}
          onSuccess={() => {
            fetchGroups();
            setShowForm(false);
            setSelectedGroup(null);
          }}
        />
      )}

      {showSubgroupView && selectedGroup && (
        <SubgroupView
          group={selectedGroup}
          onClose={() => {
            setShowSubgroupView(false);
            setSelectedGroup(null);
          }}
          onSuccess={fetchGroups}
        />
      )}

      {groupToDelete && (
        <DeleteConfirmation
          group={groupToDelete}
          onConfirm={() => handleDeleteGroup(groupToDelete)}
          onCancel={() => setGroupToDelete(null)}
        />
      )}
    </div>
  );
}