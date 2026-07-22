import React, { useState, useRef } from 'react';
import useStore from '../../store/useStore';
import { Settings, Users, ArrowLeft, Upload, Plus, MessageCircle, Repeat2, Heart } from 'lucide-react';
import { generateCharacterIntroPost, generateReactions } from '../../api/llm';

const renderTextWithMentions = (text) => {
  if (!text) return null;
  const parts = text.split(/([@#][\wа-яА-ЯёЁ]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') || part.startsWith('#')) {
      return <span key={i} style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{part}</span>;
    }
    return part;
  });
};

export default function ProfileTab({ world, onOpenThread }) {
  const { userProfile: defaultProfile, apiSettings, setApiSettings, updateWorldData } = useStore();
  const userProfile = world.userProfile || defaultProfile;
  const stats = world.stats || { humor: 1.0, aura: 3.0 };
  const relationships = world.relationships || [];
  const activityLog = world.activityLog || [];
  
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);

  // Edit Profile State
  const [editData, setEditData] = useState({ ...userProfile });
  
  // Characters State
  const [editingCharIdx, setEditingCharIdx] = useState(null);
  const [charData, setCharData] = useState(null);
  
  // Settings State
  const [settingsData, setSettingsData] = useState({ ...apiSettings });

  const fileInputRef = useRef(null);
  const charFileInputRef = useRef(null);

  const handleImageUpload = (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChar = async () => {
    const isNew = editingCharIdx === null || editingCharIdx < 0;
    const savedCharData = { ...charData };
    
    updateWorldData(world.id, w => {
      const rels = [...(w.relationships || [])];
      if (!isNew) {
        rels[editingCharIdx] = charData;
      } else {
        rels.push(charData);
      }
      return { ...w, relationships: rels };
    });
    
    setEditingCharIdx(null);
    setCharData(null);
    
    if (isNew) {
      try {
        const postData = await generateCharacterIntroPost(savedCharData, world);
        if (postData && postData.text) {
          const newPost = {
            id: Date.now().toString(),
            text: postData.text,
            author: { name: savedCharData.name, handle: savedCharData.handle, avatar: savedCharData.avatar },
            timestamp: new Date().toISOString(),
            replies: [],
            likes: 0,
            isLiked: false,
            retweets: 0,
            isRetweeted: false
          };
          updateWorldData(world.id, w => {
            return { ...w, posts: [newPost, ...(w.posts || [])] };
          });

          generateReactions(newPost.text, world, newPost.author).then(reactionsResult => {
            const allReplies = [
              ...(reactionsResult.characterReactions || []).map(r => ({ ...r, isChar: true })),
              ...(reactionsResult.crowdReplies || []).map(r => ({ ...r, isChar: false }))
            ];
            updateWorldData(world.id, w => {
              return {
                ...w,
                posts: w.posts.map(p => p.id === newPost.id ? { ...p, replies: allReplies } : p)
              };
            });
          }).catch(e => console.error("Failed to generate intro post reactions", e));
        }
      } catch (e) {
        console.error("Failed to generate intro post for new character", e);
      }
    }
  };

  return (
    <div className="flex-col pb-20">
      {/* Header Image */}
      <div style={{ height: '120px', backgroundColor: 'var(--accent-color)', backgroundImage: 'linear-gradient(45deg, #3b82f6, #9333ea)' }}></div>
      
      {/* Profile Info */}
      <div className="pb-4" style={{ padding: '0 1.5rem', position: 'relative', marginTop: '-40px' }}>
        <div className="flex justify-between items-end mb-3">
          <div className="avatar" style={{ width: 80, height: 80, border: '4px solid var(--bg-color)', fontSize: '2rem' }}>
            {userProfile.avatar ? <img src={userProfile.avatar} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : userProfile.name.charAt(0)}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowEditProfile(true)} className="btn btn-secondary">Изменить профиль</button>
            <button onClick={() => setShowSettings(true)} className="btn btn-secondary btn-icon" style={{ width: '36px', height: '36px', borderRadius: '50%' }}><Settings size={18}/></button>
          </div>
        </div>
        
        <h2 style={{ fontSize: '1.4rem' }}>{userProfile.name}</h2>
        <div className="text-secondary" style={{ marginBottom: '8px' }}>@{userProfile.handle}</div>
        <p style={{ fontSize: '0.95rem', marginBottom: '12px' }}>{userProfile.bio}</p>
        
        <div className="flex gap-4" style={{ fontSize: '0.9rem' }}>
          <div><span style={{ fontWeight: 'bold' }}>{world.followers || 0}</span> <span className="text-secondary">Подписчиков</span></div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mb-6" style={{ padding: '0 1.5rem' }}>
        <button onClick={() => setShowCharacters(true)} className="btn btn-secondary flex-1 flex justify-center items-center gap-2"><Users size={18}/> Персонажи</button>
        <button onClick={() => setShowLog(true)} className="btn btn-secondary flex-1">Лог активности</button>
      </div>

      {/* Social Media Presence */}
      <div className="mb-6" style={{ padding: '0 1.5rem' }}>
        <h3 className="section-title mb-4">Показатели</h3>
        <div className="flex gap-4">
          <div className="stat-card flex-1">
            <div className="stat-emoji">😂</div>
            <div className="stat-label">Юмор</div>
            <div className="stat-value">{stats.humor.toFixed(1)}%</div>
          </div>
          <div className="stat-card flex-1">
            <div className="stat-emoji">🌟</div>
            <div className="stat-label">Аура</div>
            <div className="stat-value">{stats.aura.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="divider"></div>

      {/* User Posts Feed */}
      <div style={{ padding: '0 1.5rem', marginTop: '1.5rem' }}>
        <h3 className="section-title mb-4">Ваши посты</h3>
      </div>
      <div className="flex-col">
        {(world.posts || []).filter(p => p.author.handle === userProfile.handle || p.isRetweeted).length === 0 ? (
          <div className="empty-state-text" style={{ textAlign: 'center', padding: '1rem' }}>Вы еще ничего не опубликовали.</div>
        ) : (
          (world.posts || []).filter(p => p.author.handle === userProfile.handle || p.isRetweeted).map(post => (
            <div key={post.id} className="post-card">
              <div className="avatar" style={{ width: 48, height: 48, backgroundImage: post.author.avatar ? `url(${post.author.avatar})` : 'none', flexShrink: 0 }}>
                {!post.author.avatar && post.author.name.charAt(0)}
              </div>
              <div className="flex-1 flex-col ml-3">
                <div className="flex items-center gap-1">
                  <span className="post-author-name">{post.author.name}</span>
                  <span className="post-author-handle">@{post.author.handle}</span>
                </div>
                <p className="post-text">{renderTextWithMentions(post.text)}</p>
                
                <div className="post-actions">
                  <button onClick={() => onOpenThread?.(post)} className="post-action-btn">
                    <MessageCircle size={18} /> {post.replies?.length || 0}
                  </button>
                  <div className="post-action-btn" style={{ color: post.isRetweeted ? 'var(--success-color)' : '' }}>
                    <Repeat2 size={18} /> {post.retweets || 0}
                  </div>
                  <div className="post-action-btn" style={{ color: post.isLiked ? 'var(--danger-color)' : '' }}>
                    <Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'} /> {post.likes || 0}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="modal-fullscreen">
          <header className="modal-header">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowEditProfile(false)} className="btn-icon"><ArrowLeft size={24} /></button>
              <h2 className="modal-title">Редактировать профиль</h2>
            </div>
            <button className="btn btn-primary" onClick={() => { updateWorldData(world.id, w => ({...w, userProfile: editData})); setShowEditProfile(false); }}>Сохранить</button>
          </header>
          <div className="p-4 flex-col gap-4">
            <div className="flex-col gap-2 items-center">
              <div className="avatar" style={{ width: 100, height: 100, border: '4px solid var(--surface-color)', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                {editData.avatar ? <img src={editData.avatar} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : editData.name.charAt(0)}
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, (res) => setEditData({...editData, avatar: res}))} />
            </div>
            <div className="flex-col gap-1">
              <label className="input-label">Имя</label>
              <input type="text" className="input-field" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
            </div>
            <div className="flex-col gap-1">
              <label className="input-label">Хэндл (никнейм)</label>
              <input type="text" className="input-field" value={editData.handle} onChange={e => setEditData({...editData, handle: e.target.value})} />
            </div>
            <div className="flex-col gap-1">
              <label className="input-label">О себе (Публично)</label>
              <textarea className="input-field" value={editData.bio} onChange={e => setEditData({...editData, bio: e.target.value})} />
            </div>
            <div className="flex-col gap-1">
              <label className="input-label">Скрытое описание (Для ИИ)</label>
              <textarea className="input-field" value={editData.hiddenDescription} onChange={e => setEditData({...editData, hiddenDescription: e.target.value})} placeholder="Лор персонажа, секреты, характер..." />
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-fullscreen">
          <header className="modal-header">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSettings(false)} className="btn-icon"><ArrowLeft size={24} /></button>
              <h2 className="modal-title">Настройки API</h2>
            </div>
            <button className="btn btn-primary" onClick={() => { setApiSettings(settingsData); setShowSettings(false); }}>Сохранить</button>
          </header>
          <div className="p-4 flex-col gap-4">
            <div className="flex-col gap-1">
              <label className="input-label">API URL</label>
              <input type="text" className="input-field" value={settingsData.url} onChange={e => setSettingsData({...settingsData, url: e.target.value})} />
            </div>
            <div className="flex-col gap-1">
              <label className="input-label">API Key</label>
              <input type="password" className="input-field" value={settingsData.key} onChange={e => setSettingsData({...settingsData, key: e.target.value})} />
            </div>
            <div className="flex-col gap-1">
              <label className="input-label">Модель</label>
              <input type="text" className="input-field" value={settingsData.model} onChange={e => setSettingsData({...settingsData, model: e.target.value})} />
            </div>
            <div className="flex-col gap-1">
              <label className="input-label">Системный Промпт</label>
              <textarea className="input-field" style={{ minHeight: '150px' }} value={settingsData.systemPrompt} onChange={e => setSettingsData({...settingsData, systemPrompt: e.target.value})} />
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {showLog && (
        <div className="modal-fullscreen">
          <header className="modal-header">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowLog(false)} className="btn-icon"><ArrowLeft size={24} /></button>
              <h2 className="modal-title">Лог активности</h2>
            </div>
          </header>
          <div className="p-4 flex-col gap-3 overflow-y-auto flex-1">
            {activityLog.length === 0 ? (
              <div className="empty-state-text" style={{ textAlign: 'center', marginTop: '2rem' }}>Пока нет активности.</div>
            ) : (
              <div className="flex-col gap-1" style={{ fontFamily: 'monospace', paddingBottom: '1rem' }}>
                {activityLog.map((log, idx) => (
                  <div key={idx} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#888' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Characters Modal */}
      {showCharacters && (
        <div className="modal-fullscreen">
          <header className="modal-header">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowCharacters(false)} className="btn-icon"><ArrowLeft size={24} /></button>
              <h2 className="modal-title">Персонажи</h2>
            </div>
            <button className="btn-icon" onClick={() => {
              setCharData({ name: '', handle: '', avatar: null, bio: '', percentage: 0, note: '' });
              setEditingCharIdx(-1);
            }}>
              <Plus size={24} />
            </button>
          </header>
          
          {editingCharIdx !== null ? (
            <div className="p-4 flex-col gap-4 overflow-y-auto flex-1">
              <div className="flex-col gap-2 items-center">
                <div className="avatar" style={{ width: 80, height: 80, cursor: 'pointer' }} onClick={() => charFileInputRef.current?.click()}>
                  {charData.avatar ? <img src={charData.avatar} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : (charData.name ? charData.name.charAt(0) : '?')}
                </div>
                <input type="file" accept="image/*" ref={charFileInputRef} style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, (res) => setCharData({...charData, avatar: res}))} />
              </div>
              <div className="flex-col gap-1">
                <label className="input-label">Имя</label>
                <input type="text" className="input-field" value={charData.name} onChange={e => setCharData({...charData, name: e.target.value})} />
              </div>
              <div className="flex-col gap-1">
                <label className="input-label">Хэндл (без @)</label>
                <input type="text" className="input-field" value={charData.handle} onChange={e => setCharData({...charData, handle: e.target.value})} />
              </div>
              <div className="flex-col gap-1">
                <label className="input-label">Характер / Лор</label>
                <textarea className="input-field" value={charData.bio} onChange={e => setCharData({...charData, bio: e.target.value})} />
              </div>
              <div className="flex gap-2 mt-4">
                {editingCharIdx !== null && editingCharIdx >= 0 && (
                  <button className="btn btn-secondary flex-1" style={{ color: 'var(--danger-color)' }} onClick={() => {
                    if (!window.confirm('Удалить персонажа?')) return;
                    updateWorldData(world.id, w => {
                      const rels = [...(w.relationships || [])];
                      rels.splice(editingCharIdx, 1);
                      return { ...w, relationships: rels };
                    });
                    setEditingCharIdx(null);
                    setCharData(null);
                  }}>Удалить</button>
                )}
                <button className="btn btn-secondary flex-1" onClick={() => setEditingCharIdx(null)}>Отмена</button>
                <button className="btn btn-primary flex-1" onClick={handleSaveChar}>Сохранить</button>
              </div>
            </div>
          ) : (
            <div className="p-4 flex-col gap-3 overflow-y-auto flex-1">
              {relationships.length === 0 ? (
                <div className="empty-state-text" style={{ textAlign: 'center' }}>Пока нет персонажей. Добавьте нового!</div>
              ) : (
                relationships.map((rel, idx) => (
                  <div key={idx} className="card p-3 flex gap-3 items-center cursor-pointer" onClick={() => { setCharData({...rel}); setEditingCharIdx(idx); }}>
                    <div className="avatar" style={{ width: 48, height: 48 }}>
                      {rel.avatar ? <img src={rel.avatar} style={{width: '100%', height: '100%', objectFit: 'cover'}}/> : rel.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="post-author-name">{rel.name}</div>
                      <div className="post-author-handle">@{rel.handle}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
