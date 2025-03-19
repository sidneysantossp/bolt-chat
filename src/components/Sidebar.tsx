import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useSocket } from '../contexts/SocketContext';
import { cn } from '../lib/utils';
import { RoomLoginModal } from './RoomLoginModal';
import { 
  Users, MessageSquare, ChevronLeft, Search, 
  AlertCircle, User as UserIcon, FolderTree
} from 'lucide-react';

interface Room {
  id: number;
  name: string;
  currentUsers: number;
  maxUsers: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  status: string;
  lastMessage?: string;
  lastMessageAt?: string;
  subgroups?: Group[];
  rooms?: Room[];
}

interface SidebarProps {
  onRoomJoin: (roomId: number, nickname: string, avatarIndex: number) => void;
}

interface User {
  username: string;
  nickname?: string;
  email?: string;
  birthdate?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
  verified?: boolean;
}

export function Sidebar({ onRoomJoin }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [navigationStack, setNavigationStack] = useState<Group[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { onlineUsers, currentUserNickname, socket } = useSocket(); 
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [userProfileData, setUserProfileData] = useState({
    name: '',
    email: '',
    birthdate: '',
    password: '',
    confirmPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all groups
      const { data, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;

      if (data) {
        setGroups(data);
        // Buscar todas as salas ao iniciar
        fetchAllRooms();
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  // Nova função para buscar todas as salas
  const fetchAllRooms = async () => {
    try {
      // Buscar todas as salas diretamente
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('name');

      if (roomsError) throw roomsError;

      if (roomsData) {
        // Mapear os dados do banco para o formato Room
        const formattedRooms: Room[] = roomsData.map(room => ({
          id: room.id,
          name: room.name || 'Sala sem nome',
          currentUsers: room.current_users || 0,
          maxUsers: room.max_users || 10,
          lastMessage: room.last_message || '',
          lastMessageAt: room.last_message_at || ''
        }));
        setAllRooms(formattedRooms);
      }
    } catch (error) {
      console.error('Error fetching all rooms:', error);
    }
  };

  const fetchSubgroupsAndRooms = async (groupId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch subgroups for this group
      const { data: subgroupsData, error: subgroupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('status', 'active')
        .eq('parent_id', groupId);

      if (subgroupsError) throw subgroupsError;

      // Fetch rooms for this group
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'active')
        .eq('group_id', groupId);

      if (roomsError) throw roomsError;

      // Update the selected group with fetched data
      const updatedGroup = groups.find(g => g.id === groupId) || navigationStack[navigationStack.length - 1];
      if (updatedGroup) {
        updatedGroup.subgroups = subgroupsData?.map(subgroup => ({
          id: subgroup.id.toString(), // Garantir que o id seja uma string
          name: subgroup.name,
          description: subgroup.description,
          memberCount: subgroup.member_count,
          status: subgroup.status,
          lastMessage: subgroup.last_message,
          lastMessageAt: subgroup.last_message_at,
          rooms: []
        })) || [];

        // Format room names to match group name
        updatedGroup.rooms = roomsData?.map((room, index) => ({
          id: room.id,
          name: `${updatedGroup.name} ${index + 1}`,
          currentUsers: room.current_users,
          maxUsers: room.max_users,
          lastMessage: room.last_message,
          lastMessageAt: room.last_message_at
        })) || [];

        setSelectedGroup(updatedGroup);
        setNavigationStack(prev => [...prev, updatedGroup]);
      }
    } catch (error) {
      console.error('Error fetching subgroups and rooms:', error);
      setError('Failed to load subgroups and rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupClick = async (group: Group) => {
    await fetchSubgroupsAndRooms(group.id);
  };

  const handleBackClick = () => {
    if (navigationStack.length > 1) {
      const newStack = navigationStack.slice(0, -1);
      setNavigationStack(newStack);
      setSelectedGroup(newStack[newStack.length - 1]);
    } else {
      setNavigationStack([]);
      setSelectedGroup(null);
    }
  };

  const handleRoomClick = (room: Room) => {
    if (room.currentUsers < room.maxUsers) {
      setSelectedRoom(room);
    }
  };

  const handleJoinRoom = (nickname: string, avatarIndex: number) => {
    if (selectedRoom) {
      onRoomJoin(selectedRoom.id, nickname, avatarIndex);
      setSelectedRoom(null);
    }
  };

  // Renderizando as salas com filtro de busca para mostrar todas as salas quando houver pesquisa
  const renderRoomList = (rooms: Room[]) => {
    // Se tiver uma pesquisa, usar todas as salas disponíveis, verificando se allRooms existe
    const roomsToDisplay = searchQuery && searchQuery.length > 1 && allRooms && allRooms.length > 0
      ? allRooms.filter(room => 
          room.name && room.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : rooms || [];

    return (
      <div className="space-y-2">
        <div className="sticky top-0 p-3 bg-white/80 backdrop-blur-sm border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar salas..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50"
            />
          </div>
        </div>
        <div className="p-3 space-y-2">
          {searchQuery && searchQuery.length > 1 && (
            <p className="text-sm text-gray-600 mb-2">
              Exibindo {roomsToDisplay.length} {roomsToDisplay.length === 1 ? 'sala' : 'salas'} para "{searchQuery}"
            </p>
          )}
          {roomsToDisplay && roomsToDisplay.length > 0 ? (
            roomsToDisplay.map(room => (
              <div
                key={room.id}
                onClick={room.id !== currentRoomId ? () => handleRoomClick(room) : undefined}
                className={cn(
                  "group p-3 rounded-lg border transition-all duration-300",
                  room.id === currentRoomId 
                    ? "bg-gradient-to-br from-green-50 to-green-100/30 border-green-200 pointer-events-none"
                    : room.currentUsers < room.maxUsers
                      ? "bg-gradient-to-br from-white to-blue-50/30 hover:shadow-lg hover:shadow-blue-100/50 cursor-pointer border-blue-100/50 transform hover:-translate-y-1"
                      : "bg-gradient-to-br from-gray-50 to-gray-100/30 opacity-75 cursor-not-allowed border-gray-100 transform hover:-translate-y-1"
                )}
                data-component-name="Sidebar"
              >
                <div className="flex items-center justify-between mb-1" data-component-name="Sidebar">
                  <h3 className={cn(
                    "font-medium transition-colors",
                    room.id === currentRoomId 
                      ? "text-green-700"
                      : "text-gray-800 group-hover:text-blue-600"
                  )}>
                    {room.name}
                    {room.id === currentRoomId && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                        ativa
                      </span>
                    )}
                  </h3>
                  {room.lastMessageAt && (
                    <span className="text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">
                      {new Date(room.lastMessageAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                {room.lastMessage && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-1 group-hover:text-gray-700">
                    {room.lastMessage}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs">
                    <div className={cn(
                      "flex items-center px-2 py-0.5 rounded-full",
                      room.id === currentRoomId
                        ? "text-green-600 bg-green-50"
                        : room.currentUsers < room.maxUsers
                          ? "text-blue-600 bg-blue-50"
                          : "text-orange-600 bg-orange-50"
                    )} data-component-name="Sidebar">
                      <Users className="w-3 h-3 mr-0.5" />
                      {room.id === currentRoomId ? (onlineUsers.length + 1) : 0}/{room.maxUsers}
                    </div>
                  </div>
                  {room.currentUsers >= room.maxUsers && (
                    <div className="flex items-center text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Sala Cheia
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhuma sala encontrada</p>
              <p className="text-sm mt-1">Tente outro termo de busca</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGroupList = (groupList: Group[]) => (
    <div className="space-y-2">
      <div className="sticky top-0 p-3 bg-white/80 backdrop-blur-sm border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar grupos..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50"
          />
        </div>
      </div>
      <div className="p-3 space-y-2">
        {groupList.map(group => (
          <div
            key={group.id}
            onClick={() => handleGroupClick(group)}
            className="group p-3 rounded-lg border border-purple-100/50 bg-gradient-to-br from-white to-purple-50/30 
                     hover:shadow-lg hover:shadow-purple-100/50 cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-gray-800 group-hover:text-purple-600 transition-colors">
                {group.name}
              </h3>
              {group.lastMessageAt && (
                <span className="text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">
                  {new Date(group.lastMessageAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            {group.description && (
              <p className="text-xs text-gray-600 mb-2 line-clamp-1 group-hover:text-gray-700">
                {group.description}
              </p>
            )}
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
                <Users className="w-3 h-3 mr-0.5" />
                {group.memberCount} membros
              </div>
              {(group.subgroups?.length || 0) > 0 && (
                <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full" data-component-name="Sidebar">
                  <FolderTree className="w-3 h-3 mr-0.5" />
                  {group.subgroups?.length} subgrupos
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUsers = () => {
    // Não precisamos mais filtrar por verificação, mostramos todos os usuários
    const filteredUsers = onlineUsers;

    // Filtrar pelo termo de busca
    const searchFilteredUsers = searchQuery
      ? filteredUsers.filter(user => 
          (user.nickname || user.username).toLowerCase().includes(searchQuery.toLowerCase()))
      : filteredUsers;
      
    return (
      <div className="space-y-2">
        <div className="sticky top-0 p-3 bg-white/80 backdrop-blur-sm border-b">
          {/* Card do usuário logado */}
          <div className="bg-purple-50 rounded-lg p-3 mb-3 border border-purple-100">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex flex-col">
                  <span className="font-medium text-purple-800">
                    {currentUserNickname || 'demo'}
                  </span>
                  {currentRoomId ? (
                    <span className="text-xs text-purple-600 font-medium">
                      Sala {currentRoomId}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      Não está em nenhuma sala
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Indicador de usuários online */}
            <div className="mt-2 flex justify-between items-center">
              <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full" data-component-name="Sidebar">
                <Users className="w-3 h-3 mr-0.5" />
                {onlineUsers.length + 1}/25
              </div>
            </div>
            
            {/* Botão Meu Perfil */}
            <button 
              onClick={() => handleOpenUserProfile({ nickname: currentUserNickname || 'demo', username: currentUserNickname || 'demo', status: 'online', lastSeen: 'Agora', verified: true })}
              className="w-full mt-2 py-1.5 px-3 text-center text-sm font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors"
            >
              MEU PERFIL
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuários..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50"
            />
          </div>
        </div>

        <div className="p-3 space-y-3">
          <h3 className="text-sm font-medium text-gray-500">
            Usuários Online: {onlineUsers.filter(u => u.status === 'online').length}
          </h3>
          {searchFilteredUsers.length > 0 ? (
            searchFilteredUsers.map((user, index) => (
              <div key={index} className="flex items-center p-2 rounded-lg hover:bg-gray-100">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-purple-500" />
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {user.nickname || user.username}
                    </span>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      user.status === 'online' ? "bg-green-500" : 
                      user.status === 'away' ? "bg-yellow-500" : "bg-gray-300"
                    )} />
                  </div>
                  <p className="text-xs text-gray-500">{user.lastSeen}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              Nenhum usuário online encontrado
            </div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    // Função para buscar e atualizar o roomId quando o usuário se conecta
    if (socket) {
      // O servidor deve enviar o roomId nas respostas
      socket.on('roomJoined', (data: { roomId: number }) => {
        if (data && data.roomId) {
          setCurrentRoomId(data.roomId);
        }
      });
      
      // Atualizar contagem de usuários nas salas quando mudar a lista de usuários online
      updateRoomUserCounts();
    }
    
    return () => {
      if (socket) {
        socket.off('roomJoined');
      }
    };
  }, [socket]);
  
  // Efeito para atualizar a contagem de usuários nas salas quando a lista de usuários online mudar
  useEffect(() => {
    updateRoomUserCounts();
  }, [onlineUsers]);
  
  // Adicionar listener para o evento personalizado de atualização da lista de usuários
  useEffect(() => {
    const handleUserListUpdate = (event: Event) => {
      console.log('Evento userListUpdated recebido', (event as CustomEvent).detail);
      // Forçar atualização imediata da contagem
      updateRoomUserCounts();
    };
    
    // Adicionar o listener de evento
    window.addEventListener('userListUpdated', handleUserListUpdate);
    
    // Remover o listener quando o componente for desmontado
    return () => {
      window.removeEventListener('userListUpdated', handleUserListUpdate);
    };
  }, [allRooms, onlineUsers, currentRoomId]); // Adicionando dependências para ter acesso aos valores mais recentes
  
  // Função para atualizar a contagem de usuários nas salas
  const updateRoomUserCounts = useCallback(() => {
    if (allRooms && allRooms.length > 0 && onlineUsers) {
      const updatedRooms = allRooms.map(room => {
        // Se for a sala atual, atualizar com a contagem de usuários online + 1 (para incluir o usuário atual)
        if (room.id === currentRoomId) {
          return {
            ...room,
            currentUsers: onlineUsers.length + 1 // +1 para incluir o usuário atual que não está na lista de onlineUsers
          };
        }
        return room;
      });
      
      setAllRooms(updatedRooms);
    }
  }, [allRooms, onlineUsers, currentRoomId]);

  const fetchUserData = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('Erro inesperado ao buscar dados do usuário:', err);
      return null;
    }
  };

  // Salvar alterações do perfil do usuário
  const saveUserProfile = async () => {
    if (!selectedUserProfile) return;
    
    setIsSaving(true);
    
    try {
      // Verificar se as senhas coincidem
      if (userProfileData.password && userProfileData.password !== userProfileData.confirmPassword) {
        alert("As senhas não coincidem!");
        setIsSaving(false);
        return;
      }
      
      // Preparar os dados para atualização
      const updateData: any = {
        nickname: userProfileData.name || selectedUserProfile.nickname,
        email: userProfileData.email || selectedUserProfile.email,
        birthdate: userProfileData.birthdate || selectedUserProfile.birthdate
      };
      
      // Se uma nova senha foi fornecida, atualizar a senha
      if (userProfileData.password && userProfileData.password.trim() !== '') {
        // Na implementação real, a senha deve ser hasheada no backend
        updateData.password = userProfileData.password;
      }
      
      // Atualizar o perfil do usuário no banco de dados
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('username', selectedUserProfile.username);
      
      if (error) {
        console.error('Erro ao atualizar perfil:', error);
        // Exibir mensagem de erro para o usuário
      } else {
        // Atualizar os dados locais
        setSelectedUserProfile({
          ...selectedUserProfile,
          nickname: userProfileData.name,
          email: userProfileData.email,
          birthdate: userProfileData.birthdate
        });
        
        // Fechar modal
        setUserProfileOpen(false);
      }
    } catch (err) {
      console.error('Erro inesperado ao salvar perfil:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Função para abrir o modal de perfil e carregar dados do usuário
  const handleOpenUserProfile = async (user: User) => {
    setSelectedUserProfile(user);
    
    // Tenta buscar dados completos do banco de dados
    try {
      const userData = await fetchUserData(user.username);
      
      if (userData) {
        // Atualiza com dados do banco
        setSelectedUserProfile({
          ...user,
          ...userData,
          status: 'online' // Garantir que o status esteja como online
        });
        
        // Inicializa o formulário
        setUserProfileData({
          name: userData.nickname || user.nickname || '',
          email: userData.email || '',
          birthdate: userData.birthdate || '',
          password: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    }
    
    setUserProfileOpen(true);
  };

  if (loading) {
    return (
      <div className="w-80 h-[calc(100vh-4rem)] mt-16 border-r bg-gradient-to-br from-white to-gray-50/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 h-[calc(100vh-4rem)] mt-16 border-r bg-gradient-to-br from-white to-gray-50/30 p-4">
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 h-[calc(100vh-4rem)] mt-16 border-r bg-gradient-to-br from-white to-gray-50/30 flex flex-col">
      <div className="flex border-b bg-white">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'flex-1 py-4 text-sm font-medium transition-all duration-200',
            activeTab === 'users'
              ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <Users className="w-5 h-5 mx-auto mb-1" />
          Usuários
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={cn(
            'flex-1 py-4 text-sm font-medium transition-all duration-200',
            activeTab === 'groups'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:bg-gray-50'
          )}
          data-component-name="Sidebar"
        >
          <MessageSquare className="w-5 h-5 mx-auto mb-1" />
          Grupos
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'groups' ? (
          <>
            {navigationStack.length > 0 && !searchQuery && (
              <button
                onClick={handleBackClick}
                className="flex items-center space-x-2 p-4 text-blue-600 hover:bg-blue-50/50 w-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Voltar para {navigationStack[navigationStack.length - 2]?.name || 'Grupos'}</span>
              </button>
            )}
            
            {/* Adicionar renderização condicional baseada na pesquisa */}
            {searchQuery && searchQuery.length > 1 ? (
              // Quando há uma pesquisa, mostrar resultados de todas as salas
              renderRoomList([])  // Passamos array vazio pois o renderRoomList já usa allRooms quando há pesquisa
            ) : selectedGroup ? (
              // Quando um grupo está selecionado e não há pesquisa
              <div>
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-y">
                  <h2 className="font-semibold text-gray-800">{selectedGroup.name}</h2>
                  {selectedGroup.description && (
                    <p className="text-sm text-gray-600">{selectedGroup.description}</p>
                  )}
                </div>
                {selectedGroup.rooms?.length ? 
                  renderRoomList(selectedGroup.rooms) : 
                  renderGroupList(selectedGroup.subgroups || [])}
              </div>
            ) : (
              // Quando nenhum grupo está selecionado e não há pesquisa
              renderGroupList(groups)
            )}
          </>
        ) : (
          <div className="user-list-container">
            {renderUsers()}
          </div>
        )}
      </div>

      {/* Botão de Sair */}
      <div className="p-4 border-t">
        <button 
          onClick={() => {
            // Desconectar o socket
            if (socket) {
              socket.disconnect();
            }
            // Redirecionar para a página de login ou recarregar a página
            window.location.href = '/';
          }}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg flex items-center justify-center transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Sair
        </button>
      </div>

      {selectedRoom && (
        <RoomLoginModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onJoin={handleJoinRoom}
        />
      )}

      {userProfileOpen && selectedUserProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Perfil do Usuário</h2>
              <button 
                onClick={() => setUserProfileOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-center mb-4">
              <div className="w-20 h-20 rounded-full bg-purple-200 flex items-center justify-center">
                <UserIcon className="w-10 h-10 text-purple-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-xl font-semibold text-gray-800">{selectedUserProfile.nickname}</h3>
                <span className="text-sm text-gray-500">@{selectedUserProfile.username}</span>
                <div className="flex items-center mt-1">
                  <span className="w-2 h-2 rounded-full mr-2 bg-green-500"></span>
                  <span className="text-sm text-gray-600">Online</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between mb-4">
                <div className="bg-gray-50 p-3 rounded-lg flex-1 mr-2">
                  <h4 className="text-xs text-gray-500 uppercase font-medium">Último acesso</h4>
                  <p className="font-medium text-gray-800 mt-1">{selectedUserProfile.lastSeen}</p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg flex-1">
                  <h4 className="text-xs text-gray-500 uppercase font-medium">Status</h4>
                  <div className="font-medium text-gray-800 mt-1 flex items-center">
                    <span className="w-2 h-2 rounded-full mr-2 bg-green-500"></span>
                    Online
                  </div>
                </div>
              </div>
              
              {selectedUserProfile.verified && (
                <div className="mb-4 flex items-center bg-blue-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Usuário Verificado</h4>
                    <p className="text-xs text-blue-600">Este usuário foi verificado pela plataforma.</p>
                  </div>
                </div>
              )}
              
              {/* Novos campos de edição */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Editar Informações</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="name" className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                    <input 
                      type="text" 
                      id="name" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      defaultValue={selectedUserProfile.nickname}
                      onChange={(e) => setUserProfileData({ ...userProfileData, name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="birthdate" className="block text-xs font-medium text-gray-500 mb-1">Data de Nascimento</label>
                    <input 
                      type="date" 
                      id="birthdate" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      defaultValue={selectedUserProfile.birthdate}
                      onChange={(e) => setUserProfileData({ ...userProfileData, birthdate: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                    <input 
                      type="email" 
                      id="email" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      defaultValue={selectedUserProfile.email}
                      onChange={(e) => setUserProfileData({ ...userProfileData, email: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-xs font-medium text-gray-500 mb-1">Nova Senha</label>
                    <input 
                      type="password" 
                      id="password" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Digite para alterar sua senha"
                      onChange={(e) => setUserProfileData({ ...userProfileData, password: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-500 mb-1">Confirmar Senha</label>
                    <input 
                      type="password" 
                      id="confirmPassword" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Confirme sua nova senha"
                      onChange={(e) => setUserProfileData({ ...userProfileData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex space-x-3">
                <button 
                  onClick={() => setUserProfileOpen(false)}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveUserProfile}
                  disabled={isSaving}
                  className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-purple-400 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}