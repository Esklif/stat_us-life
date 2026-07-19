import React from 'react';
import { Reply, UserPlus } from 'lucide-react';

export default function NotificationsTab({ world }) {
  const notifications = world.notifications || [];

  if (notifications.length === 0) {
    return <div className="p-4 text-center mt-10" style={{ color: 'var(--text-secondary)' }}>Пока нет уведомлений.</div>;
  }

  return (
    <div className="flex-col pb-20">
      <div className="p-4" style={{ fontSize: '1.25rem', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)' }}>
        Уведомления
      </div>
      <div className="flex-col">
        {notifications.map((notif, idx) => (
          <div key={idx} className="p-4 flex gap-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ marginTop: '4px' }}>
              {notif.type === 'reply' ? <Reply size={20} color="var(--accent-color)" /> : <UserPlus size={20} color="var(--accent-color)" />}
            </div>
            <div className="flex-1 flex-col gap-2">
              <div className="flex gap-2">
                <div className="avatar" style={{ width: 32, height: 32, backgroundColor: 'var(--accent-purple)' }}>
                  {notif.actorName?.charAt(0) || '*'}
                </div>
              </div>
              <div style={{ fontSize: '1rem', color: '#fff' }}>
                <span style={{ fontWeight: 'bold' }}>{notif.actorName}</span> {notif.text} <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>· День {world.day || 1}</span>
              </div>
              {notif.subText && (
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{notif.subText}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
