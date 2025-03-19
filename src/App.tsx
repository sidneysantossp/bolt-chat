import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { AdminLogin } from './components/Auth/AdminLogin';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

interface ActiveRoom {
  id: string;
  name: string;
  userAvatar?: number;
}

function App() {
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);

  const handleRoomJoin = (roomId: number, nickname: string, avatarIndex: number) => {
    setActiveRoom({
      id: roomId.toString(),
      name: `Sala ${roomId} - ${nickname}`,
      userAvatar: avatarIndex
    });
  };

  const ChatLayout = () => {
    const { userRole } = useAuth();
    
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar onRoomJoin={handleRoomJoin} />
          <ChatInterface 
            roomId={activeRoom ? parseInt(activeRoom.id) : undefined} 
            nickname={userRole?.username || 'Anônimo'}
            avatarIndex={activeRoom?.userAvatar}
          />
        </div>
      </div>
    );
  };

  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/chat" 
              element={
                <ProtectedRoute>
                  <ChatLayout />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/chat" replace />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;