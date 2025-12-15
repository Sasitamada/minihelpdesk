import React, { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '../services/api';
import { format } from 'date-fns';

const NotificationsPanel = ({ userId, onNotificationClick }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (userId) {
      loadNotifications();
      loadUnreadCount();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        loadUnreadCount();
        if (isOpen) {
          loadNotifications();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [userId, isOpen]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = await notificationsAPI.getByUser(userId);
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!userId) return;
    try {
      const response = await notificationsAPI.getUnreadCount(userId);
      setUnreadCount(response.data?.count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead(userId);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationsAPI.delete(notificationId);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'mention':
        return '💬';
      case 'comment_assigned':
        return '📌';
      case 'task_assigned':
        return '✅';
      case 'status_change':
        return '🔄';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'mention':
        return '#6b5ce6';
      case 'comment_assigned':
        return '#ffc107';
      case 'task_assigned':
        return '#2ecc71';
      case 'status_change':
        return '#4a9eff';
      default:
        return '#6c757d';
    }
  };

  if (!userId) return null;

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Notifications Icon */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            loadNotifications();
          }
        }}
        style={{
          position: 'relative',
          padding: '8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: '20px'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: '400px',
            maxHeight: '600px',
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  padding: '4px 12px',
                  border: 'none',
                  background: '#6b5ce6',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.read) {
                      handleMarkAsRead(notification.id);
                    }
                    if (onNotificationClick) {
                      onNotificationClick(notification);
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    background: notification.read ? 'white' : '#f7f8f9',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start'
                  }}
                  onMouseEnter={(e) => {
                    if (notification.read) {
                      e.currentTarget.style.background = '#f7f8f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (notification.read) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <div
                    style={{
                      fontSize: '24px',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: getNotificationColor(notification.type) + '20',
                      color: getNotificationColor(notification.type)
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: notification.read ? '400' : '600', marginBottom: '4px' }}>
                      {notification.message}
                    </div>
                    {notification.from_user && (
                      <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                        from {notification.from_user.full_name || notification.from_user.username}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                  {!notification.read && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#6b5ce6',
                        marginTop: '4px'
                      }}
                    />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    style={{
                      padding: '4px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#999',
                      fontSize: '12px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;

