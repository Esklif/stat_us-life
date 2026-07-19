import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Home, Target, MessageSquare, Bell, User, LogOut, Sun } from 'lucide-react';
import HomeTab from '../components/world/HomeTab';
import QuestsTab from '../components/world/QuestsTab';
import MessagesTab from '../components/world/MessagesTab';
import NotificationsTab from '../components/world/NotificationsTab';
import ProfileTab from '../components/world/ProfileTab';

export default function WorldFeed() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { worlds, activeWorldId, setActiveWorldId } = useStore();
  
  const world = worlds.find(w => w.id === id);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (!world) {
      navigate('/');
      return;
    }
    if (activeWorldId !== id) {
      setActiveWorldId(id);
    }
  }, [id, world, navigate, activeWorldId, setActiveWorldId]);

  if (!world) return null;

  return (
    <div className="flex-col min-h-screen" style={{ paddingBottom: '80px', backgroundColor: 'var(--bg-color)' }}>
      {/* Top Header */}
      <header className="p-4 flex items-center justify-between" style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(14,14,14,0.9)', backdropFilter: 'blur(10px)', zIndex: 10, borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2" style={{ fontWeight: 'bold' }}>
          <Sun size={20} color="#fbbf24" /> День {world.day || 1}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="btn-icon" style={{ width: 'auto', height: 'auto', color: 'var(--danger-color)' }}><LogOut size={20} /></button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full relative">
        {activeTab === 'home' && <HomeTab world={world} />}
        {activeTab === 'quests' && <QuestsTab world={world} />}
        {activeTab === 'messages' && <MessagesTab world={world} />}
        {activeTab === 'notifications' && <NotificationsTab world={world} />}
        {activeTab === 'profile' && <ProfileTab world={world} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className={`btn-icon ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <Home size={24} fill={activeTab === 'home' ? 'currentColor' : 'none'} />
        </button>
        <button className={`btn-icon ${activeTab === 'quests' ? 'active' : ''}`} onClick={() => setActiveTab('quests')}>
          <Target size={24} fill={activeTab === 'quests' ? 'currentColor' : 'none'} />
        </button>
        <button className={`btn-icon ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
          <MessageSquare size={24} fill={activeTab === 'messages' ? 'currentColor' : 'none'} />
        </button>
        <button className={`btn-icon ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
          <Bell size={24} fill={activeTab === 'notifications' ? 'currentColor' : 'none'} />
        </button>
        <button className={`btn-icon ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <User size={24} fill={activeTab === 'profile' ? 'currentColor' : 'none'} />
        </button>
      </nav>
    </div>
  );
}
