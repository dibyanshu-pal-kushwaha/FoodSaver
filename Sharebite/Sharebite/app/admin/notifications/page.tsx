'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getCurrentUser } from '@/lib/storage';
import { Notification } from '@/lib/types';

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    // Admin can see all notifications
    setNotifications(getNotifications(''));
  };

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead(id);
    loadNotifications();
  };

  const handleMarkAllAsRead = () => {
    const user = getCurrentUser();
    if (user) {
      markAllNotificationsAsRead(user.id);
      loadNotifications();
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'expiry': return 'bg-yellow-100 text-yellow-800';
      case 'donation': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">All Notifications</h1>
          {notifications.filter(n => !n.read).length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer ${
                !notification.read ? 'border-l-4 border-blue-500' : ''
              }`}
              onClick={() => !notification.read && handleMarkAsRead(notification.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(notification.type)}`}>
                      {notification.type}
                    </span>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    User ID: {notification.user_id} | {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No notifications yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}



