import React, { useState, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  title: string;
  createdAt: string;
  hotelId?: string;
  userId: string;
}

export default function NotificationBell({ isScrolled }: { isScrolled: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/notifications/getUnreadCount', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => setUnreadCount(data.unreadCount || 0))
      .catch(err => console.error('Error fetching unread count:', err));
  }, []);

  useEffect(() => {
    if (showDropdown) {
      const token = localStorage.getItem('token');
      fetch('/api/notifications/getNotifications', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(data => setNotifications(data.notifications || []))
        .catch(err => console.error('Error fetching notifications:', err));
    }
  }, [showDropdown]);

  const handleNotificationClick = async (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDropdown(false);

    if (!notification.isRead) {
      try {
        await fetch('/api/notifications/markNotificationAsRead', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ notificationId: notification.id }),
        });

        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }
  };

  return (
    <div className="relative inline-block">
      <button onClick={() => setShowDropdown(prev => !prev)} className="relative p-2">
        <FaBell className={`h-6 w-6 text-white1 ${isScrolled ? '!text-gray-800' : '!text-white'}`} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3 font-bold border-b">Notifications</div>
          {notifications.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No notifications</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {notifications.map(notification => (
                <li
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`cursor-pointer px-4 py-3 text-sm hover:bg-gray-100 flex justify-between items-center ${
                    !notification.isRead ? 'font-semibold' : 'text-gray-500'
                  }`}
                >
                  <div className={`text-xs ${notification.isRead ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div>{notification.title}</div>
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                  {!notification.isRead && (
                    <span className="ml-2 w-2.5 h-2.5 bg-red-500 rounded-full" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-bold mb-2">{selectedNotification.title}</h3>
            <p className="mb-4">{selectedNotification.message}</p>
            <button
              onClick={() => setSelectedNotification(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
