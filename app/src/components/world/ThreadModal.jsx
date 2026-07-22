import React, { useState, useEffect } from 'react';
import useStore, { useBackStore } from '../../store/useStore';
import { generateReactions } from '../../api/llm';
import { CornerDownRight } from 'lucide-react';

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

export default function ThreadModal({ world, post, userProfile, onClose }) {
  const { updateWorldData } = useStore();
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const id = 'ThreadModal';
    useBackStore.getState().pushHandler(id, onClose);
    return () => useBackStore.getState().removeHandler(id);
  }, [onClose]);

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;

    const newReply = {
      handle: userProfile.handle,
      name: userProfile.name,
      reply: replyText,
      avatar: userProfile.avatar,
      isChar: true
    };

    let updatedPost = { ...post, replies: [...(post.replies || []), newReply] };

    updateWorldData(world.id, w => {
      const pIdx = w.posts?.findIndex(p => p.id === post.id);
      if (pIdx > -1) {
        const posts = [...w.posts];
        posts[pIdx] = updatedPost;
        return { ...w, posts };
      }
      return w;
    });

    const currentReplyText = replyText;
    setReplyText('');

    try {
      const response = await generateReactions(currentReplyText, world, userProfile);
      
      updateWorldData(world.id, w => {
        const pIdx = w.posts?.findIndex(p => p.id === post.id);
        if (pIdx > -1) {
          const posts = [...w.posts];
          let postToUpdate = { ...posts[pIdx] };
          
          const newNpcReplies = [];
          if (response.characterReactions) {
            response.characterReactions.forEach(cr => {
              const char = (w.relationships || []).find(r => r.handle.replace('@','') === cr.handle.replace('@',''));
              newNpcReplies.push({
                handle: cr.handle,
                name: cr.name,
                reply: cr.reply,
                avatar: char?.avatar,
                isChar: true
              });
            });
          }
          if (response.crowdReplies) {
            response.crowdReplies.forEach(cr => {
              newNpcReplies.push({
                handle: cr.handle,
                name: cr.name,
                reply: cr.reply,
                isChar: false
              });
            });
          }

          postToUpdate.replies = [...(postToUpdate.replies || []), ...newNpcReplies];
          posts[pIdx] = postToUpdate;
          
          return { ...w, posts };
        }
        return w;
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="modal-fullscreen">
      <header className="modal-header">
        <button onClick={onClose} className="btn btn-ghost">Назад</button>
        <div className="modal-title">Ветка (Thread)</div>
        <div style={{ width: '40px' }}></div>
      </header>
      
      <div className="flex-col p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex gap-3 mb-3 items-center">
          <div
            className="avatar"
            style={{
              width: 48,
              height: 48,
              backgroundImage: post.author.avatar ? `url(${post.author.avatar})` : 'none',
              backgroundColor: post.isSystem ? '#9333ea' : '#333',
            }}
          >
            {!post.author.avatar && post.author.name.charAt(0)}
          </div>
          <div className="flex-col justify-center">
             <div className="post-author-name" style={{ fontSize: '1.1rem' }}>{post.author.name}</div>
             <div className="post-author-handle">@{post.author.handle}</div>
          </div>
        </div>
        <p className="post-text" style={{ fontSize: '1rem', marginTop: 0 }}>{renderTextWithMentions(post.text)}</p>
      </div>

      <div className="flex-1 p-4 flex-col gap-4" style={{ overflowY: 'auto' }}>
        {post.replies?.map((reply, idx) => (
          <div key={idx} className="flex gap-3 mb-2">
            <div
              className="avatar"
              style={{
                width: 40,
                height: 40,
                backgroundImage: reply.avatar ? `url(${reply.avatar})` : 'none',
                backgroundColor: reply.isChar ? 'var(--accent-purple)' : 'var(--surface-color-hover)',
              }}
            >
              {!reply.avatar && reply.name.charAt(0)}
            </div>
            <div className="flex-1 flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="post-author-name">{reply.name}</span>
                <span className="post-author-handle">@{reply.handle.replace('@','')}</span>
              </div>
              <p className="post-text" style={{ fontSize: '1rem', marginTop: '4px' }}>{renderTextWithMentions(reply.reply)}</p>
              <div style={{ marginTop: '4px', fontSize: '0.8rem' }}>
                <button 
                  onClick={() => setReplyText(prev => `${prev ? prev.trim() + ' ' : ''}@${reply.handle.replace('@','')} `)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
                >
                  <CornerDownRight size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
         <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
           <div style={{ position: 'relative', flex: 1 }}>
             <textarea 
               className="input-field" 
               placeholder="Ваш ответ..." 
               maxLength={280}
               rows={1}
               value={replyText}
               onChange={e => setReplyText(e.target.value)}
               onInput={e => {
                 e.target.style.height = 'auto';
                 e.target.style.height = e.target.scrollHeight + 'px';
               }}
               onKeyPress={e => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   if (replyText.trim()) {
                     handleReplySubmit();
                     e.target.style.height = 'auto';
                   }
                 }
               }}
               style={{ paddingRight: '50px', resize: 'none', overflow: 'hidden', minHeight: '44px', maxHeight: '150px' }}
             />
             <div style={{ position: 'absolute', right: '10px', bottom: '12px', fontSize: '0.75rem', color: replyText.length >= 280 ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
               {replyText.length}/280
             </div>
           </div>
           <button className="btn btn-primary" style={{ height: '44px' }} onClick={handleReplySubmit} disabled={!replyText.trim()}>Ответить</button>
         </div>
      </div>
    </div>
  );
}
