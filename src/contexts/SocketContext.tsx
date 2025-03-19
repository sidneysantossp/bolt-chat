import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Exportar a interface User para ser usada em outros componentes
export interface User {
  username: string;
  nickname?: string; 
  avatarIndex?: number;
  status?: string;
  lastSeen?: string;
  verified?: boolean;
  accountCreated?: string;
  completedProfile?: boolean;
}

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: User[];
  currentUserNickname: string | null;
  connectToRoom: (roomId: number, nickname: string, avatarIndex?: number) => void;
  disconnectFromRoom: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [currentUserNickname, setCurrentUserNickname] = useState<string | null>(null);
  
  // Usar useRef para o socket para evitar renderizações em cascata
  const socketRef = useRef<Socket | null>(null);
  
  // Função para desconectar o socket de forma segura
  const safeDisconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setOnlineUsers([]);
    }
  }, []);
  
  // Efeito para limpeza quando o componente é desmontado
  useEffect(() => {
    return () => {
      safeDisconnect();
    };
  }, [safeDisconnect]);

  // Usar useCallback para memoizar a função de conexão
  const connectToRoom = useCallback((roomId: number, nickname: string, avatarIndex: number = 0) => {
    // Desconectar qualquer socket existente primeiro
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Armazenar o nickname do usuário atual
    setCurrentUserNickname(nickname);
    
    // Criar uma nova conexão de socket
    const newSocket = io('http://localhost:3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Configurar event listeners
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      // Entrar na sala - enviando o nickname informado pelo usuário e o avatarIndex
      console.log('Entrando na sala:', { roomId, username: nickname, nickname, avatarIndex });
      newSocket.emit('joinRoom', { roomId, username: nickname, nickname, avatarIndex });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected. Reason:', reason);
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      // Reconectar à sala após reconexão
      newSocket.emit('joinRoom', { roomId, username: nickname, nickname, avatarIndex });
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Socket failed to reconnect');
      setIsConnected(false);
    });

    newSocket.on('userJoined', async (data: { username: string, nickname: string, users: Array<{username: string, nickname: string}> }) => {
      console.log(`Usuário ${data.nickname || data.username} entrou na sala`);
      // Buscar usuários registrados no banco de dados
      await updateUserList(data.users);
      
      // Emitir evento personalizado para notificar sobre atualização de usuários
      const event = new CustomEvent('userListUpdated', { detail: { count: data.users.length } });
      window.dispatchEvent(event);
    });

    newSocket.on('userLeft', async (data: { username: string, nickname: string, users: Array<{username: string, nickname: string}> }) => {
      console.log(`Usuário ${data.nickname || data.username} saiu da sala`);
      // Buscar usuários registrados no banco de dados
      await updateUserList(data.users);
      
      // Emitir evento personalizado para notificar sobre atualização de usuários
      const event = new CustomEvent('userListUpdated', { detail: { count: data.users.length } });
      window.dispatchEvent(event);
    });

    newSocket.on('roomHistory', async (data: { users: Array<{username: string, nickname: string}> }) => {
      // Buscar usuários registrados no banco de dados
      await updateUserList(data.users);
      
      // Emitir evento personalizado para notificar sobre atualização de usuários
      const event = new CustomEvent('userListUpdated', { detail: { count: data.users.length } });
      window.dispatchEvent(event);
    });

    // Função para verificar os usuários no banco de dados
    const updateUserList = async (socketUsers: Array<{username: string, nickname: string}>) => {
      try {
        // Filtrar usuários sem dados completos (podem ser fake)
        const validSocketUsers = socketUsers.filter(user => 
          user && user.username && user.username.trim() !== ''
        );
        
        if (validSocketUsers.length === 0) {
          setOnlineUsers([]);
          return;
        }
        
        // Mapear todos os usuários do socket como válidos
        const allUsers = validSocketUsers.map(user => {
          return {
            username: user.username,
            nickname: user.nickname || user.username,
            status: 'online',
            lastSeen: 'Agora',
            verified: true, // Consideramos todos como verificados por enquanto
            accountCreated: new Date().toISOString(),
            completedProfile: true
          };
        });
        
        // Remover o usuário atual da lista
        const filteredUsers = allUsers.filter(user => user.nickname !== currentUserNickname);
        
        console.log('Usuários conectados:', validSocketUsers);
        console.log('Usuário atual:', currentUserNickname);
        console.log('Usuários filtrados:', filteredUsers);
        
        setOnlineUsers(filteredUsers);
      } catch (err) {
        console.error('Erro ao processar usuários:', err);
      }
    };

    // Armazenar o socket na ref para evitar re-renderizações
    socketRef.current = newSocket;
  }, [currentUserNickname]);

  const disconnectFromRoom = useCallback(() => {
    safeDisconnect();
  }, [safeDisconnect]);

  // Memoizar o valor do contexto para evitar recriações desnecessárias
  const contextValue = React.useMemo(() => ({
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    currentUserNickname,
    connectToRoom,
    disconnectFromRoom
  }), [isConnected, onlineUsers, connectToRoom, disconnectFromRoom, currentUserNickname]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
