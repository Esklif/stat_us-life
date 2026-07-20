import React from 'react';
import { Heart, Reply, Zap, Bell } from 'lucide-react';

const notifIcon = (type) => {
  switch (type) {
    case 'like': return <Heart size={20} />;
    case 'reply': return <Reply size={20} />;
    default: return <Zap size={20} />;
  }
};

const notifIconModifier = (type) => {
  switch (type) {
    case 'like': return ' like';
    case 'reply': return ' reply';
    default: return ' system';
  }
};

export default function NotificationsTab({ world }) {
  const notifications = world.notifications || [];

  if (notifications.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Bell size={48} />
        </div>
        <div className="empty-state-title">Нет уведомлений</div>
        <div className="empty-state-text">Пока нет уведомлений.</div>
      </div>
    );
  }

  return (
    <div className="flex-col pb-20">
      <div className="flex-col">
        {notifications.map((notif, idx) => (
          <div key={idx} className="notif-item">
            <div className={`notif-icon${notifIconModifier(notif.type)}`}>
              {notifIcon(notif.type)}
            </div>
            <div className="flex-1 flex-col gap-2">
              <div className="flex gap-2">
                <div className="avatar" style={{ width: 32, height: 32, backgroundColor: 'var(--accent-purple)' }}>
                  {notif.actorName?.charAt(0) || '*'}
                </div>
              </div>
              <div className="notif-text">
                <span className="post-author-name">{notif.actorName}</span> {notif.text} <span className="notif-time">· День {world.day || 1}</span>
              </div>
              {notif.subText && (
                <div className="notif-subtext">{notif.subText}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
