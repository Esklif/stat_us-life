import React, { useState, useEffect } from 'react';
import { X, Lightbulb, Target } from 'lucide-react';
import { generatePostSuggestions } from '../../api/llm';
import { useBackStore } from '../../store/useStore';

export default function ComposeModal({ world, userProfile, onClose, onPost }) {
  const [postText, setPostText] = useState('');

  useEffect(() => {
    const id = 'ComposeModal';
    useBackStore.getState().pushHandler(id, onClose);
    return () => useBackStore.getState().removeHandler(id);
  }, [onClose]);

  const activeQuests = (world.quests || []).filter(q => q.status === 'active');

  const handlePost = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!postText.trim()) return;
    onPost(postText);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#0a0a0a',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Scrollable content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingTop: 'max(env(safe-area-inset-top), 16px)'
      }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          position: 'sticky',
          top: 0,
          backgroundColor: '#0a0a0a',
          zIndex: 10
        }}>
          <button 
            onClick={onClose} 
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>
          <button 
            onClick={handlePost} 
            style={{ 
              background: postText.trim() ? '#ffffff' : 'rgba(255,255,255,0.25)', 
              color: postText.trim() ? '#000' : 'rgba(0,0,0,0.5)', 
              border: 'none', 
              padding: '8px 24px', 
              borderRadius: '999px', 
              fontWeight: '700', 
              fontSize: '15px', 
              cursor: postText.trim() ? 'pointer' : 'default',
              transition: 'all 0.2s ease'
            }}
          >
            Опубликовать
          </button>
        </div>

        {/* Side Quests Section */}
        {activeQuests.length > 0 && (
          <div style={{ padding: '8px 0 16px 0' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 16px',
              marginBottom: '10px',
              color: '#9ca3af',
              fontSize: '13px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <Target size={14} />
              <span>Активный квест</span>
            </div>

            {/* Horizontal scroll container */}
            <div style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x mandatory',
              paddingLeft: '16px',
              paddingRight: '16px',
              paddingBottom: '4px',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}>
              {activeQuests.map((q, idx) => (
                <div key={idx} style={{
                  flex: '0 0 75vw',
                  maxWidth: '320px',
                  scrollSnapAlign: 'start',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  border: '1px solid #2a2a2a',
                  boxSizing: 'border-box'
                }}>
                  <p style={{
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: '#e5e5e5',
                    margin: '0 0 8px 0',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word'
                  }}>{q.description}</p>
                  <div style={{
                    fontSize: '13px',
                    color: '#fbbf24',
                    fontWeight: '700'
                  }}>{q.questName}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: '#1f1f1f', margin: '0 16px' }} />

        {/* Compose Area */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '20px 16px',
          minHeight: '160px'
        }}>
          {/* Avatar */}
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#333',
            backgroundImage: userProfile.avatar ? `url(${userProfile.avatar})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#fff'
          }}>
            {!userProfile.avatar && (userProfile.name || 'P').charAt(0)}
          </div>

          {/* Text input area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '6px'
            }}>
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#fff' }}>
                {userProfile.name}
              </span>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                @{userProfile.handle}
              </span>
            </div>
              <textarea 
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="О чем вы думаете?..."
                maxLength={280}
                style={{ 
                  width: '100%', 
                  background: 'transparent', 
                  border: 'none', 
                  outline: 'none', 
                  color: '#fff', 
                  fontSize: '18px', 
                  lineHeight: '1.5', 
                  resize: 'none', 
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  minHeight: '100px',
                  padding: 0,
                  margin: 0,
                  overflow: 'hidden'
                }}
                autoFocus
              />
              <div style={{ textAlign: 'right', fontSize: '0.85rem', color: postText.length >= 280 ? 'var(--danger-color)' : '#6b7280', marginTop: '4px' }}>
                {postText.length}/280
              </div>
          </div>
        </div>

      </div>
    </div>
  );
}
