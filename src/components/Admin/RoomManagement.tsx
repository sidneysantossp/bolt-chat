import { useState, useEffect } from 'react';
import { Settings, Trash2, Eye, Search, AlertCircle, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { RoomView } from './RoomView';

interface Room {
  id: string;
  name: string;
  description: string | null;
  max_users: number;
  current_users: number;
  status: 'active' | 'archived';
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
}

interface DeleteConfirmationProps {
  room: Room;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmation({ room, onConfirm, onCancel }: DeleteConfirmationProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex items-center space-x-3 text-red-600 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Confirm Deletion</h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete the room <span className="font-semibold">{room.name}</span>? 
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
            Delete Room
          </button>
        </div>
      </div>
    </div>
  );
}

export function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const roomsPerPage = 9;

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    try {
      const { error: deleteError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', room.id);

      if (deleteError) throw deleteError;

      setRooms(rooms.filter(r => r.id !== room.id));
      setRoomToDelete(null);
    } catch (error) {
      console.error('Error deleting room:', error);
      setError('Failed to delete room');
    }
  };

  const filteredRooms = rooms.filter(room => {
    const searchLower = searchTerm.toLowerCase();
    return (
      room.name.toLowerCase().includes(searchLower) ||
      (room.description?.toLowerCase() || '').includes(searchLower)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);
  const indexOfLastRoom = currentPage * roomsPerPage;
  const indexOfFirstRoom = indexOfLastRoom - roomsPerPage;
  const currentRooms = filteredRooms.slice(indexOfFirstRoom, indexOfLastRoom);

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
        <h2 className="text-2xl font-semibold text-gray-800">Room Management</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentRooms.map(room => (
          <div
            key={room.id}
            className={cn(
              "bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4",
              room.current_users >= room.max_users && "border-yellow-200 bg-yellow-50"
            )}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
                  <span className={cn(
                    "px-2 py-1 text-xs rounded-full",
                    room.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  )}>
                    {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                  </span>
                </div>
                {room.description && (
                  <p className="text-sm text-gray-500 mt-1">{room.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedRoom(room);
                    setViewMode('view');
                  }}
                  className="text-blue-400 hover:text-blue-600"
                  title="View room details"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedRoom(room);
                    setViewMode('edit');
                  }}
                  className="text-blue-400 hover:text-blue-600"
                  title="Edit room"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setRoomToDelete(room)}
                  className="text-red-400 hover:text-red-600"
                  title="Delete room"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className={cn(
                "px-3 py-1 rounded-full",
                room.current_users >= room.max_users
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-blue-50 text-blue-600"
              )}>
                {room.current_users}/{room.max_users} users
              </div>
              <span className="text-gray-500">
                Created {new Date(room.created_at).toLocaleDateString()}
              </span>
            </div>

            {room.last_message && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600 line-clamp-2">
                  Last message: {room.last_message}
                </p>
                {room.last_message_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(room.last_message_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
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

      {selectedRoom && (
        <RoomView
          room={selectedRoom}
          mode={viewMode}
          onClose={() => {
            setSelectedRoom(null);
            setViewMode('view');
          }}
          onSuccess={() => {
            fetchRooms();
            setSelectedRoom(null);
            setViewMode('view');
          }}
        />
      )}

      {roomToDelete && (
        <DeleteConfirmation
          room={roomToDelete}
          onConfirm={() => handleDeleteRoom(roomToDelete)}
          onCancel={() => setRoomToDelete(null)}
        />
      )}
    </div>
  );
}