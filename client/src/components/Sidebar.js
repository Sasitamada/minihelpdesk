import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { workspacesAPI } from '../services/api';
import CreateWorkspaceModal from './CreateWorkspaceModal';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadWorkspaces();
    setActiveItem(location.pathname);
  }, [location.pathname]);

  const loadWorkspaces = async () => {
    try {
      const response = await workspacesAPI.getAll();
      setWorkspaces(response.data);
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceClick = (workspace) => {
    setActiveItem(workspace.id);
    if (workspace?.id) {
      navigate(`/workspaces/${workspace.id}`);
    }
  };

  const handleDashboardClick = () => {
    setActiveItem('dashboard');
    navigate('/dashboard');
  };

  const handleCreateWorkspace = async (data) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await workspacesAPI.create({
        ...data,
        owner: user.id || null,
      });
      setShowCreateModal(false);
      loadWorkspaces();
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">MiniHelpDesk</div>
      </div>
      <div className="sidebar-menu">
        <div 
          className={`menu-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
        >
          <span>📊</span>
          <span>Dashboard</span>
        </div>
        
        <div 
          className={`menu-item ${location.pathname === '/workspaces' ? 'active' : ''}`}
          onClick={() => navigate('/workspaces')}
        >
          <span>📁</span>
          <span>Workspaces</span>
        </div>
        
        <div className="workspace-section">
          <div className="section-title">Workspaces</div>
          {loading ? (
            <div style={{ padding: '12px', color: '#6c757d' }}>Loading...</div>
          ) : workspaces.length === 0 ? (
            <div style={{ padding: '12px', color: '#6c757d' }}>No workspaces yet</div>
          ) : (
            workspaces.map(workspace => (
              <div
                key={workspace.id}
                className={`workspace-item ${location.pathname === `/workspaces/${workspace.id}` ? 'active' : ''}`}
                onClick={() => handleWorkspaceClick(workspace)}
              >
                <div 
                  className="workspace-icon"
                  style={{ background: workspace.color || '#7b68ee' }}
                ></div>
                <span>{workspace.name}</span>
              </div>
            ))
          )}
          <button 
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '8px', padding: '8px' }}
            onClick={() => setShowCreateModal(true)}
          >
            + New Workspace
          </button>
        </div>
      </div>

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateWorkspace}
        />
      )}
    </div>
  );
};

export default Sidebar;
