import { useState } from 'react';
import { X, UserCircle, User, UserCheck, Smile, Brain } from 'lucide-react';
import { cn } from '../lib/utils';

interface RoomLoginModalProps {
  room: {
    id: number;
    name: string;
    currentUsers: number;
    maxUsers: number;
  };
  onClose: () => void;
  onJoin: (nickname: string, avatarIndex: number) => void;
}

const avatarOptions = [
  { icon: UserCircle, label: 'Padrão', color: 'text-blue-500' },
  { icon: User, label: 'Simples', color: 'text-purple-500' },
  { icon: UserCheck, label: 'Verificado', color: 'text-green-500' },
  { icon: Smile, label: 'Feliz', color: 'text-yellow-500' },
  { icon: Brain, label: 'Mente', color: 'text-pink-500' }
];

export function RoomLoginModal({ room, onClose, onJoin }: RoomLoginModalProps) {
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) {
      setError('Por favor, digite seu apelido');
      return;
    }

    if (nickname.length < 3) {
      setError('O apelido deve ter pelo menos 3 caracteres');
      return;
    }

    if (nickname.length > 20) {
      setError('O apelido deve ter no máximo 20 caracteres');
      return;
    }

    if (room.currentUsers >= room.maxUsers) {
      setError('Esta sala está cheia');
      return;
    }

    onJoin(nickname.trim(), selectedAvatar);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-6">Entrar em {room.name}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Escolha seu avatar
            </label>
            <div className="grid grid-cols-5 gap-3">
              {avatarOptions.map((avatar, index) => {
                const Icon = avatar.icon;
                return (
                  <button
                    key={avatar.label}
                    type="button"
                    onClick={() => setSelectedAvatar(index)}
                    className={cn(
                      "p-3 rounded-lg flex flex-col items-center gap-2 transition-all duration-200",
                      selectedAvatar === index
                        ? "bg-gray-100 ring-2 ring-blue-500 ring-offset-2"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <Icon className={cn("w-8 h-8", avatar.color)} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
              Apelido
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setError('');
              }}
              placeholder="Digite seu apelido"
              className={cn(
                "w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500",
                error ? "border-red-300" : "border-gray-300"
              )}
              maxLength={20}
              minLength={3}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {room.currentUsers}/{room.maxUsers} usuários na sala
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Entrar na Sala
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}