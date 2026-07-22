import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowLeft, Send, MessageSquare } from 'lucide-react';
import useStore, { useBackStore } from '../../store/useStore';
import { processDirectMessage } from '../../api/llm';

export default function MessagesTab({ world }) {
  const { userProfile: defaultProfile, updateWorldData } = useStore();
  const userProfile = world.userProfile || defaultProfile;
  const [showContacts, setShowContacts] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  
  const [msgText, setMsgText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (activeChat) {
      const id = 'MessagesModal';
      useBackStore.getState().pushHandler(id, () => setActiveChat(null));
      return () => useBackStore.getState().removeHandler(id);
    }
  }, [activeChat]);
  
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

  const activeDialogs = relationships.filter(r => chats[r.handle] && chats[r.handle].length > 0);

  return (
    <div className="flex-col h-full items-stretch pb-20">
      {activeDialogs.length === 0 ? (
        <div className="empty-state p-4">
          <MessageSquare size={48} className="empty-state-icon" />
          <h3 className="empty-state-title">У вас пока нет активных диалогов</h3>
          <p className="empty-state-text">Начните новую переписку, нажав кнопку +</p>
        </div>
      ) : (
        <div className="flex-col">
          {activeDialogs.map((rel, idx) => {
            const history = chats[rel.handle];
            const lastMsg = history[history.length - 1];
            return (
              <div key={idx} className="event-suggestion" style={{ padding: '1rem', display: 'flex', gap: '12px', alignItems: 'center' }} onClick={() => setActiveChat(rel)}>
                <div className="avatar" style={{ width: 48, height: 48, flexShrink: 0 }}>
                  {rel.avatar ? <img src={rel.avatar} style={{width:'100%',height:'100%',objectFit:'cover', borderRadius:'50%'}} /> : rel.name.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden flex-col justify-center">
                  <div className="post-author-name">{rel.name}</div>
                  <div className="post-text text-secondary" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0, fontSize: '0.9rem' }}>
                    {lastMsg.sender === 'user' ? 'Вы: ' : ''}{lastMsg.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button 
        onClick={() => setShowContacts(true)}
        className="fab fab-primary"
      >
        <Plus size={24} />
      </button>

      {/* Contacts Modal */}
      {showContacts && (
        <div className="modal-fullscreen">
          <header className="modal-header">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowContacts(false)} className="btn-icon"><ArrowLeft size={24} /></button>
              <h2 className="modal-title">Новое сообщение</h2>
            </div>
          </header>
          <div className="p-4 flex-col gap-4 overflow-y-auto">
             {relationships.length === 0 ? (
                <div className="empty-state-text">Нет доступных персонажей. Взаимодействуйте в ленте или создайте их в профиле!</div>
             ) : (
                relationships.map((rel, idx) => (
                  <div key={idx} className="flex gap-3 items-center cursor-pointer" onClick={() => { setActiveChat(rel); setShowContacts(false); }}>
                    <div className="avatar" style={{ width: 48, height: 48 }}>
                      {rel.avatar ? <img src={rel.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : rel.name.charAt(0)}
                    </div>
                    <div>
                      <div className="post-author-name">{rel.name}</div>
                      <div className="post-author-handle">@{rel.handle}</div>
                    </div>
                  </div>
                ))
             )}
          </div>
        </div>
      )}

      {/* Chat Window */}
      {activeChat && (
        <div className="modal-fullscreen">
          <header className="modal-header">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveChat(null)} className="btn-icon"><ArrowLeft size={24} /></button>
              <div className="flex items-center gap-2">
                <div className="avatar" style={{ width: 32, height: 32 }}>
                  {activeChat.avatar ? <img src={activeChat.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : activeChat.name.charAt(0)}
                </div>
                <h2 className="modal-title">{activeChat.name}</h2>
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-4 flex-col gap-3 overflow-y-auto" ref={scrollRef}>
            {(chats[activeChat.handle] || []).length === 0 && (
              <div className="empty-state-text" style={{ textAlign: 'center' }}>Начало переписки с {activeChat.name}</div>
            )}
            {(chats[activeChat.handle] || []).map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.sender === 'user' ? 'user' : 'npc'}`}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="chat-bubble npc" style={{ opacity: 0.6 }}>печатает...</div>
            )}
          </div>

          <div className="flex gap-3 p-4" style={{ borderTop: '1px solid var(--border-color)', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))', alignItems: 'flex-end' }}>
            <textarea 
              className="input-field flex-1" 
              placeholder="Сообщение..." 
              rows={1}
              style={{ marginBottom: 0, resize: 'none', overflow: 'hidden', minHeight: '44px', maxHeight: '150px' }} 
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyPress={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                  e.target.style.height = 'auto';
                }
              }}
              disabled={loading}
            />
            <button className="btn btn-primary" style={{ height: '44px' }} onClick={() => { handleSend(); setMsgText(''); }} disabled={!msgText.trim() || loading}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
