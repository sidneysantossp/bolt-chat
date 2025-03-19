import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { AlertTriangle, Send, UserCircle, Users, X, AlertCircle, MessageSquareOff } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { cn } from '../lib/utils';

interface Message {
  id: number | string;
  content: string | React.ReactNode;
  sender: string;
  senderNickname?: string;
  avatarIndex?: number;
  timestamp: Date;
  mentions?: string[];
  isLocal?: boolean;
  isSystemWelcome?: boolean;
}

interface ChatInterfaceProps {
  roomId?: number;
  nickname?: string;
  avatarIndex?: number;
}

const avatarIcons = [
  { icon: UserCircle, color: 'text-blue-500' },
  { icon: Users, color: 'text-purple-500' },
  { icon: UserCircle, color: 'text-green-500' },
  { icon: UserCircle, color: 'text-yellow-500' },
  { icon: UserCircle, color: 'text-pink-500' }
];

function ChatInterface({ roomId, nickname, avatarIndex }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionsDropdownRef = useRef<HTMLDivElement>(null);
  
  const isInitializedRef = useRef(false);
  
  const { socket, isConnected, onlineUsers, connectToRoom, disconnectFromRoom } = useSocket();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleMessage = useCallback((message: Message) => {
    console.log('Mensagem recebida:', message);
    
    // Verificar se a mensagem já existe (evitar duplicação)
    setMessages(prev => {
      // Se já temos a mensagem com o mesmo ID, não adicionar novamente
      if (message.id && prev.some(m => m.id === message.id)) {
        console.log('Mensagem já existe, ignorando duplicata:', message.id);
        return prev;
      }
      
      const mentionRegex = /@(\w+)/g;
      const mentions: string[] = [];
      let match;
      
      if (typeof message.content === 'string') {
        while ((match = mentionRegex.exec(message.content)) !== null) {
          mentions.push(match[1]);
        }
      }
      
      // Adicionar a nova mensagem com timestamp corrigido
      const newMessage = { 
        ...message, 
        timestamp: new Date(message.timestamp),
        mentions,
        id: message.id || Date.now() + Math.random().toString(36).substr(2, 9) // Garantir ID único
      };
      
      console.log('Adicionando nova mensagem:', newMessage);
      return [...prev, newMessage];
    });
  }, []);

  const handleUserJoined = useCallback(({ username, nickname: userNickname }: { username: string, nickname?: string }) => {
    const displayName = userNickname || onlineUsers.find(u => u.username === username)?.nickname || username;
    
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        content: `${displayName} entrou na sala`,
        sender: 'System',
        timestamp: new Date()
      }
    ]);
  }, [onlineUsers]);

  const handleUserLeft = useCallback(({ username, nickname: userNickname }: { username: string, nickname?: string }) => {
    const displayName = userNickname || onlineUsers.find(u => u.username === username)?.nickname || username;
    
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        content: `${displayName} saiu da sala`,
        sender: 'System',
        timestamp: new Date()
      }
    ]);
  }, [onlineUsers]);

  useEffect(() => {
    if (!roomId || !nickname) return;
    
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      connectToRoom(roomId, nickname, avatarIndex || 0);
    }

    return () => {
      isInitializedRef.current = false;
      disconnectFromRoom();
    };
  }, [roomId, nickname, avatarIndex, connectToRoom, disconnectFromRoom]);

  useEffect(() => {
    if (!socket) return;

    socket.on('message', handleMessage);
    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);

    return () => {
      socket.off('message', handleMessage);
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
    };
  }, [socket, handleMessage, handleUserJoined, handleUserLeft]);

  // Adicionar mensagem de boas-vindas após 4 segundos
  useEffect(() => {
    if (!roomId || !isConnected || !nickname) return;
    
    const timer = setTimeout(() => {
      const welcomeMessage = {
        id: 'welcome-' + Date.now(),
        content: (
          <div className="welcome-message text-left">
            <div className="font-semibold flex items-center">
              <span>Bate-Papo da Mente</span>
              <span className="text-xs ml-2 text-gray-500">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <p className="mt-1">Que bom que você está aqui curtindo o Bate-Papo da Mente 💖</p>
            <p className="text-sm">Você pode aproveitar à vontade e com privacidade garantida, mas, caso note qualquer comportamento anormal, <a onClick={(e) => {e.preventDefault(); setShowReportModal(true);}} href="#" className="text-blue-600 hover:underline">denuncie aqui</a>.</p>
          </div>
        ),
        sender: 'System',
        timestamp: new Date(),
        isSystemWelcome: true
      };
      
      setMessages(prev => [...prev, welcomeMessage]);
    }, 4000); // 4 segundos
    
    return () => clearTimeout(timer);
  }, [roomId, isConnected, nickname]);

  // Estado para controlar o popup de denúncias
  const [showReportModal, setShowReportModal] = useState(false);

  // Estado para armazenar usuários bloqueados
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  
  // Estado para controlar o modal de bloqueio de usuário
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [userToBlock, setUserToBlock] = useState<{id: string, nickname: string} | null>(null);

  // Função para fechar o modal de denúncias
  const closeReportModal = useCallback(() => {
    setShowReportModal(false);
  }, []);

  // Função para iniciar o processo de bloqueio de usuário
  const handleBlockUser = useCallback((userId: string, userNickname: string) => {
    setUserToBlock({ id: userId, nickname: userNickname });
    setShowBlockModal(true);
    setShowReportModal(false);
    
    // Adicionar usuário à lista de bloqueados
    setBlockedUsers(prev => [...prev, userId]);
    
    // Mensagem de sistema indicando que o usuário foi bloqueado
    const blockMessage: Message = {
      id: 'block-' + Date.now(),
      content: `Você bloqueou ${userNickname}. Não verá mais mensagens deste usuário.`,
      sender: 'System',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, blockMessage]);
  }, []);

  // Função para desbloquear usuário
  const unblockUser = useCallback((userId: string) => {
    setBlockedUsers(prev => prev.filter(id => id !== userId));
    setShowBlockModal(false);
    
    // Mensagem de sistema indicando que o usuário foi desbloqueado
    const unblockMessage: Message = {
      id: 'unblock-' + Date.now(),
      content: `Usuário desbloqueado com sucesso. Você voltará a ver as mensagens dele.`,
      sender: 'System',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, unblockMessage]);
  }, []);

  // Armazenar bloqueados no localStorage
  useEffect(() => {
    if (blockedUsers.length > 0) {
      localStorage.setItem('blockedUsers', JSON.stringify(blockedUsers));
    }
  }, [blockedUsers]);

  // Recuperar bloqueados do localStorage
  useEffect(() => {
    const storedBlockedUsers = localStorage.getItem('blockedUsers');
    if (storedBlockedUsers) {
      setBlockedUsers(JSON.parse(storedBlockedUsers));
    }
  }, []);

  const extractMentions = useCallback((content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }, []);

  const renderMessageContent = useCallback((content: string | React.ReactNode, mentions?: string[]) => {
    if (typeof content !== 'string') return content;
    
    if (!mentions || mentions.length === 0) return content;
    
    let parts: any[] = [];
    let lastIndex = 0;
    
    for (const mention of mentions) {
      const regex = new RegExp(`@${mention}\\b`, 'g');
      let match;
      
      while ((match = regex.exec(content as string)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        
        parts.push(
          <span key={`${mention}-${match.index}`} className="bg-blue-100 text-blue-800 px-1 rounded">
            @{mention}
          </span>
        );
        
        lastIndex = match.index + match[0].length;
      }
    }
    
    if (lastIndex < (content as string).length) {
      parts.push((content as string).substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  }, []);

  const handleUserMention = useCallback((username: string) => {
    const beforeMention = newMessage.substring(0, mentionPosition);
    const afterMention = newMessage.substring(cursorPosition);
    
    setNewMessage(`${beforeMention}@${username} ${afterMention}`);
    setShowMentions(false);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const cursorPos = mentionPosition + username.length + 2; 
        inputRef.current.selectionStart = cursorPos;
        inputRef.current.selectionEnd = cursorPos;
      }
    }, 0);
  }, [newMessage, mentionPosition, cursorPosition]);

  const closeMentionsDropdown = useCallback(() => {
    setShowMentions(false);
    setMentionFilter('');
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    setNewMessage(value);
    
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(atIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionPosition(atIndex);
        setMentionFilter(textAfterAt);
        setShowMentions(true);
        return;
      }
    }
    
    setShowMentions(false);
  }, []);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket || !nickname) return;
    
    console.log('Tentando enviar mensagem:', newMessage);
    console.log('Estado do socket:', {
      id: socket.id,
      connected: socket.connected,
      disconnected: socket.disconnected
    });
    
    // Criar uma mensagem com ID único
    const messageId = Date.now() + Math.random().toString(36).substr(2, 9);
    const messageContent = newMessage;
    
    // Criar o objeto de mensagem que corresponde à interface Message
    const message: Message = {
      id: messageId,
      content: messageContent,
      sender: nickname,
      avatarIndex: avatarIndex || 0,
      timestamp: new Date(),
      mentions: extractMentions(newMessage)
    };
    
    try {
      // Emitir o evento 'message' para o servidor
      socket.emit('message', message);
      console.log('Mensagem enviada ao servidor:', message);
      
      // Limpar o campo de entrada
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    }
  }, [newMessage, socket, nickname, avatarIndex, extractMentions]);

  const sendQuickMessage = useCallback((text: string) => {
    if (!socket || !isConnected || !nickname) {
      console.log('Não é possível enviar mensagem rápida:', { socket: !!socket, isConnected, nickname });
      return;
    }

    const mentions = extractMentions(text);

    const message = {
      id: Date.now(),
      content: text,
      sender: nickname,
      avatarIndex,
      timestamp: new Date(),
      mentions
    };
    
    console.log('Enviando mensagem rápida:', message);
    
    // Envia a mensagem para o servidor
    socket.emit('message', message);
    
    // Limpa o campo de mensagem
    setNewMessage('');
  }, [socket, isConnected, nickname, avatarIndex, extractMentions]);

  const filteredUsers = onlineUsers
    .map(user => ({
      username: user.username,
      displayName: (user.nickname || user.username || '').toString()
    }))
    .filter(user => 
      user.displayName.toLowerCase().includes(mentionFilter.toLowerCase()) &&
      user.displayName !== nickname
    )
    .slice(0, 5);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mentionsDropdownRef.current && 
        !mentionsDropdownRef.current.contains(event.target as Node) &&
        inputRef.current !== event.target
      ) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    } else if (showMentions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'Tab') {
        e.preventDefault();
        handleUserMention(filteredUsers[0].displayName);
      }
    }
  }, [handleSendMessage, showMentions, filteredUsers, handleUserMention]);

  const renderAvatar = (avatarIdx: number = 0) => {
    const AvatarIcon = avatarIcons[avatarIdx] ? avatarIcons[avatarIdx].icon : UserCircle;
    const avatarColor = avatarIcons[avatarIdx] ? avatarIcons[avatarIdx].color : 'text-blue-500';
    
    return (
      <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center">
        <AvatarIcon className={cn("h-8 w-8", avatarColor)} />
      </div>
    );
  };

  // Filtrar mensagens de usuários bloqueados
  const filteredMessages = useMemo(() => {
    // Remover duplicatas verificando por ID
    const uniqueMessages = messages.reduce((acc: Message[], current) => {
      const isDuplicate = acc.some(item => item.id === current.id);
      if (!isDuplicate) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    return uniqueMessages.filter((message: Message) => 
      !blockedUsers.includes(message.sender) || 
      message.sender === nickname || 
      message.sender === 'System'
    );
  }, [messages, blockedUsers, nickname]);

  // Verificar estado do socket e conexão
  useEffect(() => {
    if (socket) {
      console.log('Estado do socket:', {
        id: socket.id,
        connected: socket.connected,
        disconnected: socket.disconnected
      });
    } else {
      console.log('Socket não inicializado');
    }
  }, [socket, isConnected]);

  const renderQuickMessageButtons = () => {
    return (
      <div className="flex space-x-2 mb-2">
        <button
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition"
          onClick={(e) => {
            e.preventDefault();
            console.log('Clique em botão rápido: "Oi, td bem?"');
            sendQuickMessage("Oi, td bem?");
          }}
        >
          Oi, td bem?
        </button>
        <button
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition"
          onClick={(e) => {
            e.preventDefault();
            console.log('Clique em botão rápido: "Quer TC? 😊"');
            sendQuickMessage("Quer TC? 😊");
          }}
        >
          Quer TC? 😊
        </button>
        <button
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition"
          onClick={(e) => {
            e.preventDefault();
            console.log('Clique em botão rápido: "Opa 👋"');
            sendQuickMessage("Opa 👋");
          }}
        >
          Opa 👋
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] mt-16 flex flex-col bg-white overflow-hidden">
      
      <div className="p-4 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {roomId ? `Sala ${roomId}` : 'Selecione uma sala para conversar'}
          </h2>
          <div className="flex items-center">
            <div className={cn(
              "w-2 h-2 rounded-full mr-2",
              isConnected ? "bg-green-500" : "bg-red-500"
            )}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? "Conectado" : "Desconectado"}
            </span>
          </div>
        </div>
      </div>

      {roomId ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Tarja promocional dentro da área de chat */}
            <div className="w-full bg-rose-700 text-white text-center py-2 px-4 flex items-center justify-center space-x-4 rounded-lg shadow-md sticky top-0 z-10">
              <span className="text-sm font-medium">Quer ficar livre de anúncios? Seja VIP por apenas 12x R$ 5,90</span>
              <button className="bg-yellow-400 hover:bg-yellow-500 text-rose-900 text-xs font-bold px-3 py-1 rounded-full transition-colors">
                Quero ser VIP
              </button>
            </div>
            
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AlertTriangle className="w-12 h-12 mb-2 text-gray-400" />
                <p>Nenhuma mensagem ainda. Seja o primeiro a dizer olá!</p>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div 
                  key={message.id}
                  className={cn(
                    message.isSystemWelcome 
                      ? "w-full border-t border-b py-3 my-4 bg-gray-50" 
                      : "flex max-w-[80%] w-fit",
                    !message.isSystemWelcome && message.sender === nickname 
                      ? "ml-auto flex-row-reverse" 
                      : !message.isSystemWelcome 
                        ? "mr-auto" 
                        : ""
                  )}
                >
                  {!message.isSystemWelcome && (
                    <div className={cn("flex items-start", message.sender === nickname ? "ml-2" : "mr-2")}>
                      {message.sender !== 'System' && renderAvatar(message.avatarIndex)}
                    </div>
                  )}
                  
                  <div className={cn(
                    message.isSystemWelcome
                      ? "px-4"
                      : message.sender === 'System'
                        ? "bg-gray-100 py-2 px-4 rounded-lg text-gray-700 text-sm"
                        : "py-2 px-4 rounded-lg",
                    !message.isSystemWelcome && message.sender === nickname 
                      ? "bg-blue-100 text-blue-800" 
                      : !message.isSystemWelcome && message.sender !== 'System'
                        ? "bg-gray-100 text-gray-800"
                        : ""
                  )}>
                    {!message.isSystemWelcome && message.sender !== 'System' && (
                      <div className="flex justify-between items-baseline mb-1">
                        <span className={cn(
                          "font-medium text-sm",
                          message.sender === nickname ? "text-blue-700" : "text-gray-700"
                        )}>
                          {message.sender === nickname ? 'Você' : (message.senderNickname || message.sender)}
                        </span>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          {message.sender !== nickname && message.sender !== 'System' && (
                            <button 
                              onClick={() => handleBlockUser(message.sender, message.senderNickname || message.sender)}
                              className="text-xs text-rose-600 hover:text-rose-700 hover:underline ml-2 flex items-center"
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Denunciar
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className={message.sender === 'System' ? "text-center" : ""}>
                      {renderMessageContent(message.content, message.mentions)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Mensagens de atalho */}
          <div className="p-2 border-t border-b">
            {renderQuickMessageButtons()}
          </div>

          <div className="p-4 relative">
            <div className="flex">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="flex-1 p-3 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!isConnected || !newMessage.trim()}
                className={cn(
                  "p-3 rounded-r-lg",
                  isConnected && newMessage.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {showMentions && (
              <div 
                ref={mentionsDropdownRef}
                className="absolute bottom-full left-4 mb-2 w-60 max-h-60 overflow-y-auto bg-white rounded-lg shadow-lg border"
              >
                <div className="flex justify-between items-center p-2 border-b">
                  <span className="text-sm font-medium text-gray-700">Mencionar usuário</span>
                  <button 
                    onClick={closeMentionsDropdown}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-1">
                  {filteredUsers.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">Nenhum usuário encontrado</div>
                  ) : (
                    filteredUsers.map((user, index) => (
                      <div 
                        key={index}
                        onClick={() => handleUserMention(user.displayName)}
                        className="p-2 text-sm hover:bg-gray-100 cursor-pointer rounded"
                      >
                        @{user.displayName}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <AlertTriangle className="w-16 h-16 mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhuma sala selecionada</h3>
          <p className="text-gray-600">Selecione uma sala na barra lateral para começar a conversar</p>
        </div>
      )}
      
      {/* Modal de Denúncias */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Bloqueios e denúncias</h3>
                <button 
                  onClick={closeReportModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer"
                  onClick={() => setShowReportModal(false)}
                >
                  <div className="flex-shrink-0 bg-rose-50 p-2 rounded-full">
                    <MessageSquareOff className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-rose-600">Bloquear participante</h4>
                    <p className="text-sm text-gray-600">Deixe de ver mensagens de pessoas indesejadas.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer">
                  <div className="flex-shrink-0 bg-rose-50 p-2 rounded-full">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-rose-600">Denunciar crime</h4>
                    <p className="text-sm text-gray-600">Denuncie usuários que estejam cometendo crime de racismo, pornografia infantil, xenofobia, neonazismo, homofobia ou intolerância religiosa.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer">
                  <div className="flex-shrink-0 bg-rose-50 p-2 rounded-full">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-rose-600">Reportar spam</h4>
                    <p className="text-sm text-gray-600">Indique usuários que estão fazendo propagandas de produtos e serviços não solicitados.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 py-3 px-5">
              <button
                onClick={closeReportModal}
                className="w-full py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Bloqueio de Usuário */}
      {showBlockModal && userToBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Usuário bloqueado</h3>
                <button 
                  onClick={() => setShowBlockModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col items-center justify-center mb-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <UserCircle className="w-16 h-16 text-gray-400" />
                </div>
                <h4 className="font-medium text-lg">{userToBlock.nickname}</h4>
              </div>
              
              <p className="text-center mb-6">
                Agora você não verá mais mensagens deste usuário.
                Para desbloqueá-lo, vá até a lista de participantes e clique em <UserCircle className="w-4 h-4 inline mx-1" /> ou no botão abaixo.
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => unblockUser(userToBlock.id)}
                  className="py-2 px-4 w-36 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
                >
                  Desbloquear
                </button>
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="py-2 px-4 w-36 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { ChatInterface };