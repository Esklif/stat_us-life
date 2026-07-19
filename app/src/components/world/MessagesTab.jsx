import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowLeft, Send } from 'lucide-react';
import useStore from '../../store/useStore';
import { processDirectMessage } from '../../api/llm';

export default function MessagesTab({ world }) {
  const { userProfile: defaultProfile, updateWorldData } = useStore();
  const userProfile = world.userProfile || defaultProfile;
  const [showContacts, setShowContacts] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  
  const [msgText, setMsgText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  
  const relationships = world.relationships || [];
  const chats = world.chats || {};

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat, chats]);

  const handleSend = async () => {
    if (!msgText.trim() || loading || !activeChat) return;

    const newMsg = { sender: 'user', text: msgText, timestamp: new Date().toISOString() };
    const chatHistory = [...(chats[activeChat.handle] || []), newMsg];

    // Optimistic update
    updateWorldData(world.id, w => ({
      ...w,
      chats: { ...w.chats, [activeChat.handle]: chatHistory }
    }));
    setMsgText('');
    setLoading(true);

    try {
      const response = await processDirectMessage(chatHistory, activeChat, world, userProfile);
      
      const npcMsg = { sender: 'npc', text: response.reply, timestamp: new Date().toISOString() };
      
      updateWorldData(world.id, w => {
        const updatedHistory = [...(w.chats?.[activeChat.handle] || []), npcMsg];
        
        // Update relationship
        const rels = [...(w.relationships || [])];
        const rIdx = rels.findIndex(r => r.handle === activeChat.handle);
        if (rIdx > -1) {
           rels[rIdx].percentage = Math.min(100, Math.max(0, rels[rIdx].percentage + (response.relationshipChange || 0)));
        }

        // Add to activity log if quest generated
        let newQuests = [...(w.quests || [])];
        let activityLog = [...(w.activityLog || [])];
        
        (response.newQuests || []).forEach(nq => {
           if (!newQuests.find(q => q.questName === nq.questName)) {
             newQuests.push({ ...nq, status: 'active' });
             activityLog.push({ timestamp: new Date().toISOString(), message: `Новый квест от ${activeChat.name}: ${nq.questName}` });
           }
        });

        return { 
          ...w, 
          chats: { ...w.chats, [activeChat.handle]: updatedHistory },
          relationships: rels,
          quests: newQuests,
          activityLog
        };
      });

    } catch (e) {
      alert("Ошибка отправки: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-col h-full items-center p-4 pb-20">
      <div className="flex-1 flex-col items-center justify-center text-center mt-10">
        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#fff' }}>У вас пока нет активных диалогов</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Начните новую переписку, нажав кнопку +</p>
      </div>

      <button 
        onClick={() => setShowContacts(true)}
        style={{
          position: 'fixed', bottom: '80px', right: '20px',
          width: '56px', height: '56px', borderRadius: '50%',
          backgroundColor: 'var(--accent-color)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', zIndex: 40
        }}
      >
        <Plus size={24} />
      </button>

      {/* Contacts Modal */}
      {showContacts && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
          <header className="p-4 flex items-center justify-between border-b" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowContacts(false)} className="btn-icon"><ArrowLeft size={24} /></button>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Новое сообщение</h2>
            </div>
          </header>
          <div className="p-4 flex-col gap-4 overflow-y-auto">
             {relationships.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>Нет доступных персонажей. Взаимодействуйте в ленте или создайте их в профиле!</div>
             ) : (
                relationships.map((rel, idx) => (
                  <div key={idx} className="flex gap-3 items-center cursor-pointer" onClick={() => { setActiveChat(rel); setShowContacts(false); }}>
                    <div className="avatar" style={{ width: 48, height: 48, backgroundColor: 'var(--accent-purple)', overflow: 'hidden' }}>
                      {rel.avatar ? <img src={rel.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : rel.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{rel.name}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>@{rel.handle}</div>
                    </div>
                  </div>
                ))
             )}
          </div>
        </div>
      )}

      {/* Chat Window */}
      {activeChat && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 110, display: 'flex', flexDirection: 'column' }}>
          <header className="p-4 flex items-center justify-between border-b" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveChat(null)} className="btn-icon"><ArrowLeft size={24} /></button>
              <div className="flex items-center gap-2">
                <div className="avatar" style={{ width: 32, height: 32, backgroundColor: 'var(--accent-purple)', overflow: 'hidden' }}>
                  {activeChat.avatar ? <img src={activeChat.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : activeChat.name.charAt(0)}
                </div>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{activeChat.name}</h2>
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-4 flex-col gap-3 overflow-y-auto" ref={scrollRef}>
            {(chats[activeChat.handle] || []).length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Начало переписки с {activeChat.name}</div>
            )}
            {(chats[activeChat.handle] || []).map((msg, idx) => (
              <div key={idx} style={{ 
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.sender === 'user' ? 'var(--accent-color)' : 'var(--surface-color)',
                padding: '0.75rem 1rem',
                borderRadius: '16px',
                borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                borderBottomLeftRadius: msg.sender === 'npc' ? '4px' : '16px',
                maxWidth: '80%',
                wordBreak: 'break-word',
                marginBottom: '8px'
              }}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>печатает...</div>
            )}
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Сообщение..." 
              style={{ flex: 1, marginBottom: 0 }} 
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <button className="btn btn-primary" onClick={handleSend} disabled={!msgText.trim() || loading}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
