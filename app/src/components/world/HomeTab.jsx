import React, { useState, useEffect } from 'react';
import useStore from '../../store/useStore';
import { MessageCircle, Repeat2, Heart, Plus, Sparkles } from 'lucide-react';
import { generateEvents, generateReactions, processWorldEffects, generatePostSuggestions, simulateBackgroundActivity } from '../../api/llm';
import WorldOnboarding from './WorldOnboarding';
import ComposeModal from './ComposeModal';

const renderTextWithMentions = (text) => {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <span key={i} style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{part}</span>;
    }
    return part;
  });
};

export default function HomeTab({ world }) {
  const { userProfile: defaultProfile, updateWorldData } = useStore();
  const userProfile = world.userProfile || defaultProfile;
  const [loading, setLoading] = useState(false);
  const [welcomeData, setWelcomeData] = useState(world.welcomeData);
  const [showCompose, setShowCompose] = useState(false);
  const [postText, setPostText] = useState('');
  const [activePost, setActivePost] = useState(null); 
  const [replyText, setReplyText] = useState('');
  
  // Events
  const [showEvents, setShowEvents] = useState(false);
  const [eventsList, setEventsList] = useState([]);
  const [customEvent, setCustomEvent] = useState('');
  const [eventsLoading, setEventsLoading] = useState(false);

  // We rely on WorldOnboarding for first-time setup
  if (!world.isInitialized) {
    return <WorldOnboarding world={world} onComplete={() => {}} />;
  }

  // Pull-to-refresh State
  const [refreshing, setRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  const fetchBackgroundActivity = async () => {
    if (!world.isInitialized) return;
    try {
      const currentWorld = useStore.getState().worlds.find(w => w.id === world.id);
      if (!currentWorld) return;
      const res = await simulateBackgroundActivity(currentWorld);
      if (!res) return;

      useStore.getState().updateWorldData(world.id, w => {
        let updatedPosts = [...(w.posts || [])];
        let updatedNotifications = [...(w.notifications || [])];

        if (res.newPosts && res.newPosts.length > 0) {
          res.newPosts.forEach(cp => {
            updatedPosts.unshift({
               id: Date.now().toString() + Math.random(),
               text: cp.text,
               author: { name: cp.name, handle: cp.handle.replace('@', ''), avatar: null },
               timestamp: new Date().toISOString(),
               replies: [],
               likes: Math.floor(Math.random() * 490) + 10,
               isLiked: false,
               retweets: 0,
               isRetweeted: false
            });
          });
        }

        if (res.newComments && res.newComments.length > 0) {
          res.newComments.forEach(nc => {
            const pIdx = updatedPosts.findIndex(p => p.id === nc.postId || p.id == nc.postId);
            if (pIdx > -1) {
              const replyObj = {
                handle: nc.handle, name: nc.name, reply: nc.reply,
                isChar: true, avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${nc.handle.replace('@','')}`
              };
              updatedPosts[pIdx] = { ...updatedPosts[pIdx], replies: [replyObj, ...(updatedPosts[pIdx].replies || [])] };
              
              if (nc.reply.toLowerCase().includes(`@${userProfile.handle.toLowerCase()}`)) {
                updatedNotifications.unshift({
                   type: 'reply',
                   actorName: nc.name,
                   text: `упомянул вас в комментарии`,
                   subText: nc.reply.substring(0, 40) + '...'
                });
              }
            }
          });
        }

        return { ...w, posts: updatedPosts, notifications: updatedNotifications };
      });
    } catch (e) {
      console.error("Failed background activity", e);
    }
  };

  const handleTouchStart = (e) => {
    if (window.scrollY <= 0) setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (startY === 0) return;
    const y = e.touches[0].clientY;
    if (y > startY && window.scrollY <= 0) {
      setPullDistance(Math.min(y - startY, 80));
    } else {
      setPullDistance(0);
      setStartY(0);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 50 && !refreshing) {
      setRefreshing(true);
      await fetchBackgroundActivity();
      setRefreshing(false);
    }
    setStartY(0);
    setPullDistance(0);
  };

  const handlePost = async (text) => {
    if (!text.trim() || loading) return;

    const baseFollowers = world.followers || 0;
    const gainedFollowers = Math.floor((Math.random() * 5 + 2) * Math.pow(1.5, Math.max(0, (world.level || 1) - 1)));
    const newFollowers = baseFollowers + gainedFollowers;
    const newLikes = Math.floor(newFollowers * (Math.random() * 0.15 + 0.05)) + Math.floor(Math.random() * 5);

    const newPost = {
      id: Date.now().toString(),
      text: text,
      author: userProfile,
      timestamp: new Date().toISOString(),
      replies: [],
      likes: newLikes,
      isLiked: false,
      retweets: 0,
      isRetweeted: false
    };

    const relationships = world.relationships || [];
    let notificationText = `${newLikes} человек лайкнули ваш пост`;
    let actorName = 'Кто-то';
    if (newLikes > 0 && relationships.length > 0) {
       const randomChar = relationships[Math.floor(Math.random() * relationships.length)];
       actorName = randomChar.name;
       notificationText = `${actorName} и еще ${newLikes - 1} человек лайкнули ваш пост`;
    }
    
    const likeNotification = newLikes > 0 ? {
       type: 'like',
       actorName: actorName,
       text: notificationText,
       subText: text.substring(0, 30) + '...'
    } : null;

    updateWorldData(world.id, w => ({
      ...w,
      followers: newFollowers,
      notifications: likeNotification ? [likeNotification, ...(w.notifications || [])] : (w.notifications || []),
      posts: [newPost, ...(w.posts || [])]
    }));
    setShowCompose(false);
    setLoading(true);

    try {
      // 1. Быстро получаем реакции и сразу обновляем пост
      const reactionsResult = await generateReactions(text, world, userProfile);
      
      const allReplies = [
        ...(reactionsResult.characterReactions || []).map(r => ({ ...r, isChar: true })),
        ...(reactionsResult.crowdReplies || []).map(r => ({ ...r, isChar: false, avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${r.handle}` }))
      ];

      const mentionNotifications = [];
      allReplies.forEach(reply => {
         if (reply.reply.toLowerCase().includes(`@${userProfile.handle.toLowerCase()}`)) {
            mentionNotifications.push({
               type: 'reply',
               actorName: reply.name,
               text: `упомянул вас в комментарии`,
               subText: reply.reply.substring(0, 40) + '...'
            });
         }
      });

      // Снимаем лоадинг, чтобы пользователь мог пользоваться приложением
      setLoading(false);

      updateWorldData(world.id, w => {
         const updatedPosts = w.posts.map(p => p.id === newPost.id ? { ...p, replies: allReplies } : p);
         return { ...w, posts: updatedPosts, notifications: [...mentionNotifications, ...(w.notifications || [])] };
      });

      // 2. В фоне просчитываем изменения статов, квестов и отношений
      processWorldEffects(text, world, userProfile).then(result => {
        updateWorldData(world.id, w => {
            // Handle updates
            const updatedSkills = [...(w.skills || [])];
            (result.skillUpdates || []).forEach(su => {
              const sIdx = updatedSkills.findIndex(s => s.name === su.name);
              if (sIdx > -1) updatedSkills[sIdx].progress = Math.min(100, updatedSkills[sIdx].progress + su.progressGained);
            });

            // Handle level up
            let newXp = (w.xp || 0) + (result.xpGained || 0);
            let newLevel = w.level || 1;
            let newSkillPoints = w.skillPoints || 0;
            
            const xpNeeded = Math.floor(100 * Math.pow(1.5, Math.max(0, newLevel - 1)));
            if (newXp >= xpNeeded) {
               newLevel += 1;
               newXp = newXp - xpNeeded;
               newSkillPoints += 3;
            }

            // Handle stats
            const currentStats = w.stats || { humor: 1.0, aura: 3.0 };
            const newStats = {
              humor: currentStats.humor + (result.statsUpdates?.humorGained || 0),
              aura: currentStats.aura + (result.statsUpdates?.auraGained || 0)
            };

            // Handle relationships
            const updatedRelationships = [...(w.relationships || [])];
            (result.characterReactions || []).forEach(cr => {
              if (cr.relationshipChange) {
                const rIdx = updatedRelationships.findIndex(r => r.handle === cr.handle);
                if (rIdx > -1) {
                  updatedRelationships[rIdx].percentage = Math.min(100, Math.max(0, updatedRelationships[rIdx].percentage + cr.relationshipChange));
                  updatedRelationships[rIdx].note = cr.note || updatedRelationships[rIdx].note;
                } else {
                  updatedRelationships.push({
                    name: cr.name,
                    handle: cr.handle,
                    percentage: Math.max(0, cr.relationshipChange),
                    note: cr.note || "Новая связь",
                    avatar: null,
                    bio: "Сгенерированный персонаж"
                  });
                }
              }
            });

            // Add notifications
            const newNotifications = [...(result.notifications || []), ...(w.notifications || [])];

            // Add quests
            let newQuests = [...(w.quests || [])];
            (result.questUpdates || []).forEach(qu => {
              const idx = newQuests.findIndex(q => q.questName === qu.questName);
              if (idx !== -1) newQuests[idx] = { ...newQuests[idx], ...qu };
            });
            (result.newQuests || []).forEach(nq => {
               if (!newQuests.find(q => q.questName === nq.questName)) {
                 newQuests.push({ ...nq, status: 'active' });
               }
            });

            // Add activity log
            const newActivityLog = [...(w.activityLog || [])];
            if (result.xpGained) newActivityLog.push({ timestamp: new Date().toISOString(), message: `Получено ${result.xpGained} XP.` });
            if (result.statsUpdates?.humorGained) newActivityLog.push({ timestamp: new Date().toISOString(), message: `Юмор изменен на ${result.statsUpdates.humorGained}%.` });
            if (result.statsUpdates?.auraGained) newActivityLog.push({ timestamp: new Date().toISOString(), message: `Аура изменена на ${result.statsUpdates.auraGained}%.` });
            (result.skillUpdates || []).forEach(su => {
               newActivityLog.push({ timestamp: new Date().toISOString(), message: `Навык '${su.name}' увеличен на +${su.progressGained}.` });
            });

            // Add new posts from characters
            let newCharPosts = [];
            (result.newPostsFromCharacters || []).forEach(cp => {
               newCharPosts.push({
                 id: Date.now().toString() + Math.random(),
                 text: cp.text,
                 author: { name: cp.name, handle: cp.handle.replace('@', ''), avatar: null },
                 timestamp: new Date().toISOString(),
                 replies: [],
                 likes: Math.floor(Math.random() * 490) + 10,
                 isLiked: false,
                 retweets: 0,
                 isRetweeted: false
               });
            });

            return { 
              ...w, 
              posts: [...newCharPosts, ...(w.posts || [])],
              xp: newXp,
              level: newLevel,
              skillPoints: newSkillPoints,
              skills: updatedSkills,
              stats: newStats,
              relationships: updatedRelationships,
              notifications: newNotifications,
              activityLog: newActivityLog,
              quests: newQuests
            };
        });

        newCharPosts.forEach(cp => {
            generateReactions(cp.text, world, cp.author).then(reactionsResult => {
                const allReplies = [
                    ...(reactionsResult.characterReactions || []).map(r => ({ ...r, isChar: true })),
                    ...(reactionsResult.crowdReplies || []).map(r => ({ ...r, isChar: false, avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${r.handle}` }))
                ];
                
                const mentionNotifications = [];
                allReplies.forEach(reply => {
                   if (reply.reply.toLowerCase().includes(`@${userProfile.handle.toLowerCase()}`)) {
                      mentionNotifications.push({
                         type: 'reply',
                         actorName: reply.name,
                         text: `упомянул вас в комментарии`,
                         subText: reply.reply.substring(0, 40) + '...'
                      });
                   }
                });

                updateWorldData(world.id, w => {
                    return {
                        ...w,
                        posts: w.posts.map(p => p.id === cp.id ? { ...p, replies: allReplies } : p),
                        notifications: [...mentionNotifications, ...(w.notifications || [])]
                    };
                });
            }).catch(e => console.error("Failed to generate char post reactions", e));
        });

      }).catch(e => console.error("Фоновое обновление мира не удалось:", e));

    } catch (error) {
      alert("Ошибка генерации ответа: " + error.message);
      setLoading(false);
    }
  };

  const handleLike = (post) => {
    updateWorldData(world.id, w => {
      const posts = w.posts.map(p => {
        if (p.id === post.id) {
          return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? (p.likes || 0) - 1 : (p.likes || 0) + 1 };
        }
        return p;
      });
      return { ...w, posts };
    });
  };

  const handleRetweet = (post) => {
    if (post.isRetweeted) return;
    const newPost = {
      id: Date.now().toString(),
      text: `RT @${post.author.handle}: ${post.text}`,
      author: userProfile,
      timestamp: new Date().toISOString(),
      replies: [],
      likes: 0,
      isLiked: false,
      retweets: 0,
      isRetweeted: false
    };
    
    updateWorldData(world.id, w => {
      const posts = w.posts.map(p => p.id === post.id ? { ...p, isRetweeted: true, retweets: (p.retweets || 0) + 1 } : p);
      return { ...w, posts: [...posts, newPost] };
    });
  };

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    updateWorldData(world.id, w => {
      const posts = w.posts.map(p => {
        if (p.id === activePost.id) {
          return { ...p, replies: [...(p.replies || []), { name: userProfile.name, handle: userProfile.handle, reply: replyText, isChar: false }] };
        }
        return p;
      });
      return { ...w, posts };
    });
    setReplyText('');
    setActivePost(null);
  };

  const handleOpenEvents = async () => {
    setShowEvents(true);
    setEventsLoading(true);
    try {
      const events = await generateEvents(world);
      setEventsList(events.suggestedEvents || []);
    } catch (e) {
      alert("Ошибка загрузки событий: " + e.message);
    } finally {
      setEventsLoading(false);
    }
  };

  const applyEvent = (eventName) => {
    if (!eventName.trim()) return;
    const sysPost = {
      id: Date.now().toString(),
      text: `⚡ СРОЧНЫЕ НОВОСТИ: ${eventName}`,
      author: { name: 'Система', handle: 'system', avatar: null },
      timestamp: new Date().toISOString(),
      replies: [],
      likes: 0,
      isLiked: false,
      retweets: 0,
      isRetweeted: false,
      isSystem: true
    };
    updateWorldData(world.id, w => ({ 
      ...w, 
      posts: [...w.posts, sysPost],
      eventContext: eventName // Store global event context
    }));
    setShowEvents(false);
  };

  return (
    <div 
      className="flex-col pb-20"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div style={{
        height: `${pullDistance}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: refreshing ? 'height 0.3s' : 'none',
        backgroundColor: 'var(--bg-color)',
      }}>
        {(pullDistance > 0 || refreshing) && (
          <div style={{
            transform: `rotate(${pullDistance * 3}deg)`,
            opacity: refreshing ? 1 : pullDistance / 80
          }}>
             <Repeat2 size={24} color={refreshing ? 'var(--accent-color)' : 'var(--text-secondary)'} className={refreshing ? "spin-animation" : ""} />
          </div>
        )}
      </div>

      {/* Feed */}
      <div className="flex-col">
        {world.posts?.length > 0 && pullDistance === 0 && !refreshing && (
           <div className="text-center text-secondary py-2" style={{ fontSize: '0.8rem', opacity: 0.6 }}>
             Потяните вниз, чтобы обновить ленту
           </div>
        )}
        {world.posts?.map(post => (
          <div key={post.id} className="p-4 flex gap-3" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: post.isSystem ? 'rgba(147, 51, 234, 0.1)' : 'transparent' }}>
            <div className="avatar" style={{ width: 48, height: 48, backgroundImage: post.author.avatar ? `url(${post.author.avatar})` : 'none', backgroundColor: post.isSystem ? '#9333ea' : '#333' }}>
              {!post.author.avatar && post.author.name.charAt(0)}
            </div>
            <div className="flex-1 flex-col ml-2">
              <div className="flex items-center gap-1">
                <span style={{ fontWeight: 'bold' }}>{post.author.name}</span>
                <span style={{ color: 'var(--text-secondary)' }}>@{post.author.handle}</span>
              </div>
              <p style={{ marginTop: '4px', fontSize: '1rem', color: '#fff', fontWeight: post.isSystem ? 'bold' : 'normal' }}>{renderTextWithMentions(post.text)}</p>
              
              {!post.isSystem && (
                <div className="flex items-center gap-6 mt-3 text-secondary">
                  <button onClick={() => setActivePost(post)} className="flex items-center gap-1 btn-icon" style={{ width: 'auto', height: 'auto', fontSize: '0.85rem' }}>
                    <MessageCircle size={18} /> {post.replies?.length || 0}
                  </button>
                  <button onClick={() => handleRetweet(post)} className="flex items-center gap-1 btn-icon" style={{ width: 'auto', height: 'auto', fontSize: '0.85rem', color: post.isRetweeted ? 'var(--success-color)' : '' }}>
                    <Repeat2 size={18} /> {post.retweets || 0}
                  </button>
                  <button onClick={() => handleLike(post)} className="flex items-center gap-1 btn-icon" style={{ width: 'auto', height: 'auto', fontSize: '0.85rem', color: post.isLiked ? 'var(--danger-color)' : '' }}>
                    <Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'} /> {post.likes || 0}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FAB Compose & Events */}
      <div style={{ position: 'fixed', bottom: '80px', left: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40 }}>
        <button 
          onClick={handleOpenEvents}
          style={{
            width: '48px', height: '48px', borderRadius: '50%',
            backgroundColor: '#fff', color: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer'
          }}
        >
          <Sparkles size={20} />
        </button>
      </div>

      <div style={{ position: 'fixed', bottom: '80px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40 }}>
        <button 
          onClick={() => setShowCompose(true)}
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            backgroundColor: 'var(--accent-color)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer'
          }}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Events Modal */}
      {showEvents && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', paddingTop: 'max(env(safe-area-inset-top), 40px)' }}>
           <div className="card w-full flex-col" style={{ maxWidth: '400px' }}>
             <header className="p-4 border-b flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
               <h3 style={{ fontSize: '1.2rem', margin: 0 }}>События</h3>
               <button onClick={() => setShowEvents(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Закрыть</button>
             </header>
             <div className="p-4 flex-col gap-3">
                {eventsLoading ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>LLM генерирует события...</div>
                ) : (
                  <>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Выберите событие или создайте своё. Оно повлияет на мир.</p>
                    {eventsList.map((ev, i) => (
                      <button key={i} onClick={() => applyEvent(ev)} className="btn btn-secondary" style={{ textAlign: 'left', padding: '0.8rem', whiteSpace: 'normal' }}>
                        {ev}
                      </button>
                    ))}
                    <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '10px 0' }}></div>
                    <label className="input-label">Свое событие</label>
                    <input type="text" className="input-field" value={customEvent} onChange={e => setCustomEvent(e.target.value)} placeholder="Придумайте событие..." />
                    <button className="btn btn-primary" onClick={() => applyEvent(customEvent)} disabled={!customEvent.trim()}>Запустить событие</button>
                  </>
                )}
             </div>
           </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal 
          world={world} 
          userProfile={userProfile} 
          onClose={() => setShowCompose(false)} 
          onPost={handlePost} 
        />
      )}

      {/* Reply Modal */}
      {activePost && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 100, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingTop: 'max(env(safe-area-inset-top), 40px)' }}>
          <header className="p-4 flex items-center justify-between border-b" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <button onClick={() => setActivePost(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}>Назад</button>
            <div style={{ fontWeight: 'bold' }}>Ветка (Thread)</div>
            <div style={{ width: '40px' }}></div>
          </header>
          
          <div className="p-4 border-b" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex gap-3 mb-3">
              <div className="avatar" style={{ width: 48, height: 48, backgroundImage: activePost.author.avatar ? `url(${activePost.author.avatar})` : 'none', backgroundColor: activePost.isSystem ? '#9333ea' : '#333' }}>
                {!activePost.author.avatar && activePost.author.name.charAt(0)}
              </div>
              <div className="flex-1 ml-2">
                 <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{activePost.author.name}</div>
                 <div style={{ color: 'var(--text-secondary)' }}>@{activePost.author.handle}</div>
              </div>
            </div>
            <p style={{ fontSize: '1.2rem', color: '#fff' }}>{renderTextWithMentions(activePost.text)}</p>
          </div>

          <div className="flex-1 p-4 flex-col gap-4">
            {activePost.replies?.map((reply, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="avatar" style={{ width: 40, height: 40, backgroundImage: reply.avatar ? `url(${reply.avatar})` : 'none', backgroundColor: reply.isChar ? 'var(--accent-purple)' : 'var(--surface-color-hover)' }}>
                  {!reply.avatar && reply.name.charAt(0)}
                </div>
                <div className="flex-1 ml-2">
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{reply.name} <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>{reply.handle}</span></div>
                  <p style={{ fontSize: '1rem', color: '#fff' }}>{renderTextWithMentions(reply.reply)}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', padding: '1rem', display: 'flex', gap: '10px' }}>
             <input 
               type="text" 
               className="input-field" 
               placeholder="Ваш ответ..." 
               style={{ flex: 1, marginBottom: 0 }}
               value={replyText}
               onChange={(e) => setReplyText(e.target.value)}
             />
             <button className="btn btn-primary" onClick={handleReplySubmit} disabled={!replyText.trim()}>Ответить</button>
          </div>
        </div>
      )}
    </div>
  );
}
