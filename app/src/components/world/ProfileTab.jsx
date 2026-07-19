import React, { useState, useRef } from 'react';
import useStore from '../../store/useStore';
import { Settings, Users, ArrowLeft, Upload, Plus, MessageCircle, Repeat2, Heart } from 'lucide-react';
import { generateCharacterIntroPost, generateReactions } from '../../api/llm';

export default function ProfileTab({ world }) {
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
          <div className="avatar" style={{ width: 80, height: 80, border: '4px solid var(--bg-color)', fontSize: '2rem', backgroundColor: '#333', overflow: 'hidden' }}>
            {userProfile.avatar ? <img src={userProfile.avatar} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : userProfile.name.charAt(0)}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowEditProfile(true)} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Изменить профиль</button>
            <button onClick={() => setShowSettings(true)} className="btn-secondary" style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Settings size={18}/></button>
          </div>
        </div>
        
        <h2 style={{ fontSize: '1.4rem' }}>{userProfile.name}</h2>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>@{userProfile.handle}</div>
        <p style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '12px' }}>{userProfile.bio}</p>
        
        <div className="flex gap-4" style={{ fontSize: '0.9rem' }}>
          <div><span style={{ fontWeight: 'bold', color: '#fff' }}>{world.followers || 0}</span> <span style={{ color: 'var(--text-secondary)' }}>Подписчиков</span></div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mb-6" style={{ padding: '0 1.5rem' }}>
        <button onClick={() => setShowCharacters(true)} className="btn btn-secondary flex-1 flex justify-center items-center gap-2" style={{ padding: '0.75rem' }}><Users size={18}/> Персонажи</button>
        <button onClick={() => setShowLog(true)} className="btn btn-secondary flex-1" style={{ padding: '0.75rem' }}>Лог активности</button>
      </div>

      {/* Social Media Presence */}
      <div className="mb-6" style={{ padding: '0 1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Показатели</h3>
        <div className="flex-col gap-4">
          <div className="flex-col gap-1">
            <div className="flex justify-between" style={{ fontSize: '0.95rem' }}>
              <div>😂 <span style={{ fontWeight: 'bold' }}>Юмор</span></div>
              <div style={{ fontWeight: 'bold' }}>{stats.humor.toFixed(1)}%</div>
            </div>
            <div className="progress-bar-bg" style={{ height: '8px' }}>
              <div className="progress-bar-fill" style={{ width: `${Math.min(100, stats.humor)}%`, backgroundColor: '#eab308' }}></div>
            </div>
          </div>
          <div className="flex-col gap-1">
            <div className="flex justify-between" style={{ fontSize: '0.95rem' }}>
              <div>🌟 <span style={{ fontWeight: 'bold' }}>Аура</span></div>
              <div style={{ fontWeight: 'bold' }}>{stats.aura.toFixed(1)}%</div>
            </div>
            <div className="progress-bar-bg" style={{ height: '8px' }}>
              <div className="progress-bar-fill" style={{ width: `${Math.min(100, stats.aura)}%`, backgroundColor: '#eab308' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* User Posts Feed */}
      <div style={{ padding: '0 1.5rem', marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Ваши посты</h3>
      </div>
      <div className="flex-col">
        {(world.posts || []).filter(p => p.author.handle === userProfile.handle || p.isRetweeted).length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Вы еще ничего не опубликовали.</div>
        ) : (
          (world.posts || []).filter(p => p.author.handle === userProfile.handle || p.isRetweeted).map(post => (
            <div key={post.id} className="p-4 flex gap-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="avatar" style={{ width: 48, height: 48, backgroundImage: post.author.avatar ? `url(${post.author.avatar})` : 'none', backgroundColor: '#333' }}>
                {!post.author.avatar && post.author.name.charAt(0)}
              </div>
              <div className="flex-1 flex-col ml-2">
                <div className="flex items-center gap-1">
                  <span style={{ fontWeight: 'bold' }}>{post.author.name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>@{post.author.handle}</span>
                </div>
                <p style={{ marginTop: '4px', fontSize: '1rem', color: '#fff' }}>{post.text}</p>
                
                <div className="flex items-center gap-6 mt-3 text-secondary">
                  <div className="flex items-center gap-1" style={{ fontSize: '0.85rem' }}>
                    <MessageCircle size={18} /> {post.replies?.length || 0}
                  </div>
                  <div className="flex items-center gap-1" style={{ fontSize: '0.85rem', color: post.isRetweeted ? 'var(--success-color)' : '' }}>
                    <Repeat2 size={18} /> {post.retweets || 0}
                  </div>
                  <div className="flex items-center gap-1" style={{ fontSize: '0.85rem', color: post.isLiked ? 'var(--danger-color)' : '' }}>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 100, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <header className="p-4 flex items-center justify-between border-b" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowEditProfile(false)} className="btn-icon"><ArrowLeft size={24} /></button>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Редактировать профиль</h2>
            </div>
            <button className="btn btn-primary" onClick={() => { updateWorldData(world.id, w => ({...w, userProfile: editData})); setShowEditProfile(false); }}>Сохранить</button>
          </header>
          <div className="p-4 flex-col gap-4">
            <div className="flex-col gap-2 items-center">
              <div className="avatar" style={{ width: 100, height: 100, border: '4px solid var(--surface-color)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 100, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <header className="p-4 flex items-center justify-between border-b" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSettings(false)} className="btn-icon"><ArrowLeft size={24} /></button>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Настройки API</h2>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
          <header className="p-4 flex items-center justify-between border-b" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowLog(false)} className="btn-icon"><ArrowLeft size={24} /></button>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Лог активности</h2>
            </div>
          </header>
          <div className="p-4 flex-col gap-3 overflow-y-auto flex-1">
            {activityLog.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>Пока нет активности.</div>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
          <header className="p-4 flex items-center justify-between border-b" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowCharacters(false)} className="btn-icon"><ArrowLeft size={24} /></button>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Персонажи</h2>
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
                <div className="avatar" style={{ width: 80, height: 80, overflow: 'hidden', backgroundColor: 'var(--accent-purple)', cursor: 'pointer' }} onClick={() => charFileInputRef.current?.click()}>
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
                  <button className="btn btn-secondary flex-1" style={{ color: 'var(--danger-color)', padding: '0.75rem 0' }} onClick={() => {
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
                <button className="btn btn-secondary flex-1" style={{ padding: '0.75rem 0' }} onClick={() => setEditingCharIdx(null)}>Отмена</button>
                <button className="btn btn-primary flex-1" style={{ padding: '0.75rem 0' }} onClick={handleSaveChar}>Сохранить</button>
              </div>
            </div>
          ) : (
            <div className="p-4 flex-col gap-3 overflow-y-auto flex-1">
              {relationships.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Пока нет персонажей. Добавьте нового!</div>
              ) : (
                relationships.map((rel, idx) => (
                  <div key={idx} className="card p-3 flex gap-3 items-center cursor-pointer" style={{ marginBottom: '0.75rem' }} onClick={() => { setCharData({...rel}); setEditingCharIdx(idx); }}>
                    <div className="avatar" style={{ width: 48, height: 48, backgroundColor: 'var(--accent-purple)', overflow: 'hidden' }}>
                      {rel.avatar ? <img src={rel.avatar} style={{width: '100%', height: '100%', objectFit: 'cover'}}/> : rel.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div style={{ fontWeight: 'bold' }}>{rel.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{rel.handle}</div>
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
