import React, { useState, useEffect } from 'react';
import useStore, { useBackStore } from '../../store/useStore';
import { MessageCircle, Repeat2, Heart, Plus, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateEvents, generateReactions, processWorldEffects, generatePostSuggestions, simulateBackgroundActivity } from '../../api/llm';
import WorldOnboarding from './WorldOnboarding';
import ComposeModal from './ComposeModal';

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

export default function HomeTab({ world, onOpenThread }) {
  const { userProfile: defaultProfile, updateWorldData } = useStore();
  const userProfile = world.userProfile || defaultProfile;
  const [loading, setLoading] = useState(false);
  const [welcomeData, setWelcomeData] = useState(world.welcomeData);
  const [showCompose, setShowCompose] = useState(false);
  const [postText, setPostText] = useState('');
  const [showEvents, setShowEvents] = useState(false);
  const [eventsList, setEventsList] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [customEvent, setCustomEvent] = useState('');

  useEffect(() => {
    if (showEvents) {
      const id = 'EventsModal';
      useBackStore.getState().pushHandler(id, () => setShowEvents(false));
      return () => useBackStore.getState().removeHandler(id);
    }
  }, [showEvents]);

  // Pull-to-refresh State
  const [refreshing, setRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  // We rely on WorldOnboarding for first-time setup
  if (!world.isInitialized) {
    return <WorldOnboarding world={world} onComplete={() => {}} />;
  }

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
            const cleanHandle = cp.handle.replace('@', '');
            const char = w.relationships?.find(r => r.handle === cleanHandle);
            const avatar = char?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${cleanHandle}`;
            updatedPosts.unshift({
               id: Date.now().toString() + Math.random(),
               text: cp.text,
               author: { name: cp.name, handle: cleanHandle, avatar: avatar },
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
              const cleanHandle = nc.handle.replace('@', '');
              const char = w.relationships?.find(r => r.handle === cleanHandle);
              const avatar = char?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${cleanHandle}`;
              const replyObj = {
                handle: cleanHandle, name: nc.name, reply: nc.reply,
                isChar: true, avatar: avatar
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
        ...(reactionsResult.characterReactions || []).map(r => {
           const cleanHandle = r.handle.replace('@', '');
           const char = world.relationships?.find(rel => rel.handle === cleanHandle);
           return { ...r, isChar: true, handle: cleanHandle, avatar: char?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${cleanHandle}` };
        }),
        ...(reactionsResult.crowdReplies || []).map(r => ({ ...r, isChar: false, handle: r.handle.replace('@', ''), avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${r.handle.replace('@', '')}` }))
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
              if (sIdx > -1) updatedSkills[sIdx].level = Math.min(100, (updatedSkills[sIdx].level || 0) + (su.progressGained || 0));
            });

            // Handle level up
            let newXp = (w.xp || 0) + (result.xpGained || 0);
            let newLevel = w.level || 1;
            let newSkillPoints = w.skillPoints || 0;
            
            while (newXp >= 100) {
               newLevel += 1;
               newXp -= 100;
               newSkillPoints += 3;
            }

            // Handle stats
            const currentStats = w.stats || { humor: 0.0, aura: 0.0 };
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
               const cleanHandle = (cp.handle || '').replace('@', '');
               const char = w.relationships?.find(r => r.handle === cleanHandle);
               const avatar = char?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${cleanHandle}`;
               newCharPosts.push({
                 id: Date.now().toString() + Math.random(),
                 text: cp.text,
                 author: { name: cp.name, handle: cleanHandle, avatar: avatar },
                 timestamp: new Date().toISOString(),
                 replies: (cp.replies || []).map(r => {
                   const rHandle = (r.handle || '').replace('@', '');
                   const rChar = w.relationships?.find(rel => rel.handle === rHandle);
                   const rAvatar = rChar?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${rHandle}`;
                   return {
                     handle: rHandle, name: r.name, reply: r.reply, isChar: true, avatar: rAvatar
                   };
                 }),
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



  const handleOpenEvents = async () => {
    setShowEvents(true);
    setEventsLoading(true);
    try {
      setCurrentEventIndex(0);
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
      author: { name: 'Вестник Мира', handle: 'world_news', avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=world_news' },
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
      posts: [sysPost, ...w.posts],
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
        {(loading || refreshing) && (
          <div className="post-card" style={{ gap: '12px' }}>
            <div className="flex items-center gap-3 w-full">
              <div className="skeleton skeleton-avatar"></div>
              <div className="flex-col gap-1 w-full" style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '30%' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '20%' }}></div>
              </div>
            </div>
            <div className="flex-col gap-2 w-full mt-2">
              <div className="skeleton skeleton-text" style={{ width: '100%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}
        {world.posts?.length > 0 && pullDistance === 0 && !refreshing && (
           <div className="pull-hint">
             Потяните вниз, чтобы обновить ленту
           </div>
        )}
        {world.posts?.filter(post => !post.text.startsWith('RT @')).map(post => (
          <div key={post.id} className={`post-card${post.isSystem ? ' system' : ''}`}>
            <div
              className="avatar"
              style={{
                width: 48,
                height: 48,
                backgroundImage: post.author.avatar 
                  ? `url(${post.author.avatar})` 
                  : (post.author.handle !== userProfile.handle && !post.isSystem && !world.relationships?.some(r => r.handle === post.author.handle)
                     ? `url(https://api.dicebear.com/7.x/shapes/svg?seed=${post.author.handle})` 
                     : 'none'),
                backgroundColor: post.isSystem ? '#9333ea' : '#333',
              }}
            >
              {!post.author.avatar && (!world.relationships?.some(r => r.handle === post.author.handle) && post.author.handle !== userProfile.handle && !post.isSystem ? null : (post.author.name && post.author.name.charAt(0)))}
            </div>
            <div className="flex-1 flex-col ml-3">
              <div className="post-author">
                <span className="post-author-name">{post.author.name}</span>
                <span className="post-author-handle">@{post.author.handle}</span>
              </div>
              <p className={`post-text${post.isSystem ? ' system' : ''}`}>{renderTextWithMentions(post.text)}</p>
              
              {!post.isSystem && (
                <div className="post-actions">
                  <button onClick={() => onOpenThread?.(post)} className="post-action-btn">
                    <MessageCircle size={18} /> {post.replies?.length || 0}
                  </button>
                  <button onClick={() => handleRetweet(post)} className={`post-action-btn${post.isRetweeted ? ' retweeted' : ''}`}>
                    <Repeat2 size={18} /> {post.retweets || 0}
                  </button>
                  <button onClick={() => handleLike(post)} className={`post-action-btn${post.isLiked ? ' liked' : ''}`}>
                    <Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'} /> {post.likes || 0}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FAB Events (left) */}
      <button onClick={handleOpenEvents} className="fab fab-secondary" style={{ left: '20px' }}>
        <Sparkles size={20} />
      </button>

      {/* FAB Compose (right) */}
      <button onClick={() => setShowCompose(true)} className="fab fab-primary" style={{ right: '20px' }}>
        <Plus size={24} />
      </button>

      {/* Events Modal */}
      {showEvents && (
        <div className="modal-overlay">
           <div className="card w-full flex-col" style={{ maxWidth: '400px' }}>
             <header className="modal-header">
               <h3 className="modal-title">События</h3>
               <button onClick={() => setShowEvents(false)} className="btn btn-ghost">Закрыть</button>
             </header>
             <div className="p-4 flex-col gap-3">
                {eventsLoading ? (
                  <div className="flex-col gap-4">
                    <div className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-sm)' }}></div>
                    <div className="flex justify-between items-center px-4">
                      <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
                      <div className="skeleton" style={{ width: '40px', height: '16px', borderRadius: '4px' }}></div>
                      <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Выберите событие или создайте своё. Оно повлияет на мир.</p>
                    {eventsList.length > 0 && (
                      <div className="flex-col gap-2 items-center w-full">
                        <div className="event-suggestion w-full text-center" style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {eventsList[currentEventIndex]}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <button 
                            className="btn-icon" 
                            onClick={() => setCurrentEventIndex(prev => (prev > 0 ? prev - 1 : eventsList.length - 1))}
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <span className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {currentEventIndex + 1} / {eventsList.length}
                          </span>
                          <button 
                            className="btn-icon" 
                            onClick={() => setCurrentEventIndex(prev => (prev < eventsList.length - 1 ? prev + 1 : 0))}
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>
                        <button className="btn btn-secondary w-full mt-2" onClick={() => applyEvent(eventsList[currentEventIndex])}>
                          Выбрать это событие
                        </button>
                      </div>
                    )}
                    <div className="divider" style={{ margin: '0.5rem 0' }}></div>
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

    </div>
  );
}
