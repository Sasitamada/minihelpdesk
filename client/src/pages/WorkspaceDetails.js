import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workspacesAPI, projectsAPI, tasksAPI, spacesAPI } from '../services/api';
import EnhancedTaskModal from '../components/EnhancedTaskModal';
import WorkspaceChat from '../components/WorkspaceChat';
import TeamManagement from '../components/TeamManagement';
import AutomationManager from '../components/AutomationManager';
import SpaceManager from '../components/SpaceManager';
import IntegrationsManager from '../components/IntegrationsManager';

const WorkspaceDetails = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [userRole, setUserRole] = useState('member');
  const [isOwner, setIsOwner] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '', color: '#7b68ee' });

  useEffect(() => {
    loadWorkspaceData();
  }, [workspaceId]);

  const loadWorkspaceData = async () => {
    try {
      const workspaceRes = await workspacesAPI.getById(workspaceId);
      setWorkspace(workspaceRes.data);
      setEditData({
        name: workspaceRes.data.name || '',
        description: workspaceRes.data.description || '',
        color: workspaceRes.data.color || '#7b68ee'
      });

      // Check user role
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('Workspace owner:', workspaceRes.data.owner, 'User ID:', user.id);
      
      // Check if user is workspace owner
      if (workspaceRes.data.owner == user.id || workspaceRes.data.owner_id == user.id) {
        setUserRole('admin');
        setIsOwner(true);
        console.log('User is workspace owner - setting role to admin');
      } else {
        // Check member role
        try {
          const membersRes = await workspacesAPI.getMembers(workspaceId);
          const member = membersRes.data.find(m => m.user_id == user.id);
          if (member) {
            setUserRole(member.role || 'member');
            console.log('User role from members:', member.role);
          } else {
            console.log('User not found in members list');
          }
        } catch (err) {
          console.error('Error checking member role:', err);
        }
      }

      const projectsRes = await projectsAPI.getByWorkspace(workspaceId);
      setProjects(projectsRes.data);

      const tasksRes = await tasksAPI.getAll({ workspaceId });
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Error loading workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    try {
      await workspacesAPI.update(workspaceId, editData);
      setShowEditModal(false);
      loadWorkspaceData();
    } catch (error) {
      console.error('Error updating workspace:', error);
      alert('Failed to update workspace');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this workspace? This will delete all projects and tasks inside it.')) {
      try {
        await workspacesAPI.delete(workspaceId);
        navigate('/workspaces');
      } catch (error) {
        console.error('Error deleting workspace:', error);
        alert('Failed to delete workspace');
      }
    }
  };

  const handleClose = () => {
    navigate('/workspaces');
  };

  const handleAddTask = async (taskData) => {
    try {
      // Get first project or create a default one
      let projectId = projects.length > 0 ? projects[0].id : null;
      
      if (!projectId) {
        // Create a default list if none exists
        const spacesResponse = await spacesAPI.getByWorkspace(workspaceId);
        const defaultSpace = spacesResponse.data?.[0];
        const newProject = await projectsAPI.create({
          name: 'General',
          description: 'Default list for tasks',
          workspace: workspaceId,
          spaceId: defaultSpace?.id || null
        });
        projectId = newProject.data.id;
        loadWorkspaceData();
      }

      await tasksAPI.create({
        ...taskData,
        project: projectId,
        workspace: workspaceId
      });
      setShowAddTaskModal(false);
      loadWorkspaceData();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  }

  if (!workspace) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Workspace not found</div>;
  }

  return (
    <div>
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '2px solid #e4e6e8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div 
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              background: workspace.color || '#7b68ee',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          ></div>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: '#1a1a1a' }}>
              {workspace.name}
            </h1>
            <p style={{ fontSize: '16px', color: '#6c757d' }}>
              {workspace.description || 'No description'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowAddTaskModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            ➕ Add Task
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowEditModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            ✏️ Edit
          </button>
          <button 
            className="btn"
            onClick={handleDelete}
            style={{ 
              background: '#fee', 
              color: '#c72525',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🗑️ Delete
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleClose}
          >
            Close Workspace
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e0e0e0',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '3px solid #6b5ce6' : '3px solid transparent',
            color: activeTab === 'overview' ? '#6b5ce6' : '#6c757d',
            cursor: 'pointer',
            fontWeight: activeTab === 'overview' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('spaces')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'spaces' ? '3px solid #6b5ce6' : '3px solid transparent',
            color: activeTab === 'spaces' ? '#6b5ce6' : '#6c757d',
            cursor: 'pointer',
            fontWeight: activeTab === 'spaces' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Spaces
        </button>
        <button
          onClick={() => setActiveTab('team')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'team' ? '3px solid #6b5ce6' : '3px solid transparent',
            color: activeTab === 'team' ? '#6b5ce6' : '#6c757d',
            cursor: 'pointer',
            fontWeight: activeTab === 'team' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Team
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'integrations' ? '3px solid #6b5ce6' : '3px solid transparent',
            color: activeTab === 'integrations' ? '#6b5ce6' : '#6c757d',
            cursor: 'pointer',
            fontWeight: activeTab === 'integrations' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Integrations
        </button>
        <button
          onClick={() => setActiveTab('automations')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'automations' ? '3px solid #6b5ce6' : '3px solid transparent',
            color: activeTab === 'automations' ? '#6b5ce6' : '#6c757d',
            cursor: 'pointer',
            fontWeight: activeTab === 'automations' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Automations
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'chat' ? '3px solid #6b5ce6' : '3px solid transparent',
            color: activeTab === 'chat' ? '#6b5ce6' : '#6c757d',
            cursor: 'pointer',
            fontWeight: activeTab === 'chat' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          Chat
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div className="card">
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>Lists</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6b5ce6' }}>{projects.length}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>Total Tasks</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>{tasks.length}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>Completed</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2ecc71' }}>
            {tasks.filter(t => t.status === 'done').length}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>In Progress</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4a9eff' }}>
            {tasks.filter(t => t.status === 'inprogress').length}
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Lists</h2>
          <button 
            className="btn btn-primary"
            onClick={async () => {
              const name = prompt('Enter list name:');
              if (!name) return;

              try {
                const spacesResponse = await spacesAPI.getByWorkspace(workspaceId);
                const defaultSpace = spacesResponse.data?.[0];
                await projectsAPI.create({
                  name,
                  description: '',
                  workspace: workspaceId,
                  spaceId: defaultSpace?.id || null
                });
                loadWorkspaceData();
              } catch (error) {
                alert('Failed to create list');
              }
            }}
          >
            + New List
          </button>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {projects.map(project => (
            <div 
              key={project.id} 
              className="card" 
              style={{ 
                minWidth: '240px', 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => navigate(`/project/${project.id}`)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '6px', 
                    background: project.color || '#4a9eff' 
                  }}
                ></div>
                <h4 style={{ fontSize: '16px', fontWeight: '600' }}>{project.name}</h4>
              </div>
              <p style={{ fontSize: '13px', color: '#6c757d' }}>
                {project.description || 'No description'}
              </p>
            </div>
          ))}
          {projects.length === 0 && (
            <div style={{ 
              width: '100%', 
              padding: '40px', 
              textAlign: 'center', 
              color: '#6c757d',
              background: '#f7f8f9',
              borderRadius: '12px'
            }}>
              No projects yet. Create one to get started!
            </div>
          )}
        </div>
      </div>

      {/* Recent Tasks */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>Recent Tasks</h2>
        {tasks.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#6c757d',
            background: '#f7f8f9',
            borderRadius: '12px'
          }}>
            No tasks yet. Click "Add Task" to create one!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tasks.slice(0, 10).map(task => (
              <div 
                key={task.id}
                className="card"
                style={{ 
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onClick={() => navigate(`/project/${task.project_id}`)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '16px' }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6c757d' }}>
                    Status: {task.status} • Priority: {task.priority}
                  </div>
                </div>
                <div className={`priority-badge priority-${task.priority || 'medium'}`}>
                  {task.priority}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit Workspace</div>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Workspace Name</label>
              <input
                type="text"
                className="form-input"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Enter workspace name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows="3"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['#7b68ee', '#4a9eff', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'].map(color => (
                  <button
                    key={color}
                    onClick={() => setEditData({ ...editData, color })}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      border: editData.color === color ? '3px solid #333' : '2px solid #e0e0e0',
                      background: color,
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="button-group" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

        </>
      )}

      {activeTab === 'spaces' && (
        <SpaceManager workspaceId={workspaceId} />
      )}

      {activeTab === 'team' && (
        <TeamManagement 
          workspaceId={workspaceId} 
          currentUserRole={userRole} 
          isOwner={isOwner}
        />
      )}

      {activeTab === 'integrations' && (
        <IntegrationsManager workspaceId={workspaceId} />
      )}

      {activeTab === 'automations' && (
        <AutomationManager workspaceId={workspaceId} />
      )}

      {activeTab === 'chat' && (
        <WorkspaceChat workspaceId={workspaceId} />
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <EnhancedTaskModal
          onClose={() => setShowAddTaskModal(false)}
          onSave={handleAddTask}
          project={{ id: projects[0]?.id, workspace: workspaceId }}
        />
      )}
    </div>
  );
};

export default WorkspaceDetails;
