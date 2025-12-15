import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DarkModeToggle from './DarkModeToggle';
import NotificationsPanel from './NotificationsPanel';
import AdvancedSearch from './AdvancedSearch';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user.id);
    
    // Extract workspace ID from URL if available
    const pathMatch = location.pathname.match(/\/workspaces\/(\d+)/);
    if (pathMatch) {
      setWorkspaceId(parseInt(pathMatch[1]));
    }
  }, [location]);

  const handleSettings = () => {
    navigate('/settings');
  };

  const getPageTitle = () => {
    if (location.pathname.startsWith('/workspaces/')) {
      return 'Workspace Details';
    }
    switch(location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/workspaces': return 'Workspaces';
      case '/settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="header">
      <div className="header-left">
        <div className="header-title">
          {getPageTitle()}
        </div>
      </div>
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {currentUserId && (
          <NotificationsPanel
            userId={currentUserId}
            onNotificationClick={(notification) => {
              // Navigate to task if related
              if (notification.related_type === 'comment' || notification.related_type === 'task') {
                // You can implement navigation logic here
                console.log('Notification clicked:', notification);
              }
            }}
          />
        )}
        <DarkModeToggle />
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowAdvancedSearch(true)}
          title="Advanced Search"
        >
          🔍 Search
        </button>
        <AdvancedSearch
          isOpen={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
          workspaceId={workspaceId}
        />
        <button className="btn btn-secondary" onClick={handleSettings}>
          ⚙️ Settings
        </button>
      </div>
    </div>
  );
};

export default Header;
