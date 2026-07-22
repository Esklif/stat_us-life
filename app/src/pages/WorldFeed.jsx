import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Home, Target, MessageSquare, Bell, User, LogOut, Sun } from 'lucide-react';
import HomeTab from '../components/world/HomeTab';
import QuestsTab from '../components/world/QuestsTab';
import MessagesTab from '../components/world/MessagesTab';
import NotificationsTab from '../components/world/NotificationsTab';
import ProfileTab from '../components/world/ProfileTab';
import ThreadModal from '../components/world/ThreadModal';

export default function WorldFeed() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { worlds, activeWorldId, setActiveWorldId } = useStore();
  
  const world = worlds.find(w => w.id === id);
  const [activeTab, setActiveTab] = useState('home');
  const [activePost, setActivePost] = useState(null);

  const unreadCount = Math.max(0, (world?.notifications?.length || 0) - (world?.seenNotificationsCount || 0));

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'notifications' && unreadCount > 0) {
      useStore.getState().updateWorldData(world.id, w => ({ ...w, seenNotificationsCount: w.notifications?.length || 0 }));
    }
  };

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
    <div className="flex-col min-h-screen" style={{ paddingBottom: '80px' }}>
      <header className="sticky-header">
        <div className="section-title">
          <Sun size={20} color="#fbbf24" /> {world.name}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="btn-icon">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        {activeTab === 'home' && <HomeTab world={world} onOpenThread={setActivePost} />}
        {activeTab === 'quests' && <QuestsTab world={world} />}
        {activeTab === 'messages' && <MessagesTab world={world} />}
        {activeTab === 'notifications' && <NotificationsTab world={world} />}
        {activeTab === 'profile' && <ProfileTab world={world} onOpenThread={setActivePost} />}
      </main>

      {activePost && (
        <ThreadModal 
          world={world} 
          post={activePost} 
          userProfile={world.userProfile || useStore.getState().userProfile}
          onClose={() => setActivePost(null)}
        />
      )}

      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabChange('home')}>
          <Home size={22} fill={activeTab === 'home' ? 'currentColor' : 'none'} />
          <span className="nav-label">Лента</span>
        </button>
        <button className={`nav-item ${activeTab === 'quests' ? 'active' : ''}`} onClick={() => handleTabChange('quests')}>
          <Target size={22} fill={activeTab === 'quests' ? 'currentColor' : 'none'} />
          <span className="nav-label">Квесты</span>
        </button>
        <button className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => handleTabChange('messages')}>
          <MessageSquare size={22} fill={activeTab === 'messages' ? 'currentColor' : 'none'} />
          <span className="nav-label">Чаты</span>
        </button>
        <button className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => handleTabChange('notifications')}>
          <Bell size={22} fill={activeTab === 'notifications' ? 'currentColor' : 'none'} />
          {unreadCount > 0 && <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          <span className="nav-label">Уведомления</span>
        </button>
        <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => handleTabChange('profile')}>
          <User size={22} fill={activeTab === 'profile' ? 'currentColor' : 'none'} />
          <span className="nav-label">Профиль</span>
        </button>
      </nav>
    </div>
  );
}
