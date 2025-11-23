import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspacesAPI } from '../services/api';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';

const WorkspaceList = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const response = await workspacesAPI.getAll();
      setWorkspaces(response.data);
    } catch (error) {
      console.error('Error loading workspaces:', error);
    }
  };

  const handleCreateWorkspace = async (data) => {
    try {
      console.log('Creating workspace with data:', data);
      const response = await workspacesAPI.create(data);
      console.log('Workspace created successfully:', response.data);
      setShowCreateModal(false);
      loadWorkspaces();
      // Show success message
      alert('Workspace created successfully!');
    } catch (error) {
      console.error('Error creating workspace:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create workspace';
      alert(`Error: ${errorMessage}`);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '28px', fontWeight: '600' }}>
        Workspaces
      </h1>

      {/* Workspaces List */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {workspaces.map(workspace => (
          <div
            key={workspace.id}
            onClick={() => navigate(`/workspaces/${workspace.id}`)}
            className="card"
            style={{ 
              minWidth: '280px',
              cursor: 'pointer',
              border: '1px solid #e0e0e0',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '8px', 
                  background: workspace.color || '#7b68ee' 
                }}
              ></div>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{workspace.name}</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#6c757d' }}>
              {workspace.description || 'No description'}
            </p>
          </div>
        ))}
        
        <div
          onClick={() => setShowCreateModal(true)}
          className="card"
          style={{ 
            minWidth: '280px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed #e0e0e0',
            color: '#6c757d'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>+</div>
            <div>New Workspace</div>
          </div>
        </div>
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateWorkspace}
        />
      )}
    </div>
  );
};

export default WorkspaceList;