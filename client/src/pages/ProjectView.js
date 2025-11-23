import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectsAPI, tasksAPI } from '../services/api';
import ViewSwitcher from '../components/ViewSwitcher';
import KanbanBoard from '../components/KanbanBoard';
import ListView from '../components/views/ListView';
import CalendarView from '../components/views/CalendarView';
import GanttView from '../components/views/GanttView';
import TableView from '../components/views/TableView';
import ChatView from '../components/views/ChatView';
import TimelineView from '../components/views/TimelineView';
import EnhancedTaskModal from '../components/EnhancedTaskModal';
import ShareModal from '../components/ShareModal';
import useSocket from '../hooks/useSocket';

const ProjectView = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    assignedTo: '',
    tag: ''
  });
  const [currentView, setCurrentView] = useState('board');
  const [showShareModal, setShowShareModal] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    loadProject();
    loadTasks();
  }, [projectId]);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  // Real-time task updates via WebSocket
  useEffect(() => {
    if (!socket || !projectId) return;

    const handleTaskUpdate = (data) => {
      // Reload tasks when updated
      loadTasks();
    };

    socket.on('task-updated', handleTaskUpdate);
    
    // Join project room for real-time updates
    socket.emit('join-workspace', project?.workspace_id);

    return () => {
      socket.off('task-updated', handleTaskUpdate);
    };
  }, [socket, projectId, project]);

  const loadProject = async () => {
    try {
      const response = await projectsAPI.getById(projectId);
      setProject(response.data);
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const params = { projectId };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assignedTo) params.assignedTo = filters.assignedTo;
      if (filters.tag) params.tag = filters.tag;
      
      const response = await tasksAPI.getAll(params);
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(task => 
        task.title?.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }

    if (filters.assignedTo) {
      filtered = filtered.filter(task => task.assigned_to === parseInt(filters.assignedTo));
    }

    if (filters.tag) {
      filtered = filtered.filter(task => {
        const tags = task.tags ? (Array.isArray(task.tags) ? task.tags : JSON.parse(task.tags)) : [];
        return tags.some(t => t.toLowerCase().includes(filters.tag.toLowerCase()));
      });
    }

    setFilteredTasks(filtered);
  };

  const handleCreateTask = async (taskData) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await tasksAPI.create({
        ...taskData,
        project: projectId,
        workspace: project?.workspace_id || project?.workspace,
        createdBy: user.id,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null
      });
      loadTasks();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await tasksAPI.update(taskId, {
        ...updates,
        userId: user.id,
        dueDate: updates.dueDate ? new Date(updates.dueDate).toISOString() : null
      });
      loadTasks();
      setSelectedTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await tasksAPI.delete(taskId, user.id);
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleTaskDrop = async (taskId, newStatus) => {
    try {
      await tasksAPI.update(taskId, { status: newStatus });
      loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      assignedTo: '',
      tag: ''
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  }

  if (!project) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Project not found</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
            {project.name}
          </h1>
          <p style={{ color: '#6c757d' }}>{project.description || 'No description'}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowShareModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🔗 Share Project
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + New Task
          </button>
        </div>
      </div>

      {/* View Switcher */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
      </div>

      <div style={{ 
        marginBottom: '24px', 
        padding: '16px',
        background: '#f7f8f9',
        borderRadius: '8px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center'
      }}>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Search tasks..." 
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}
        />
        
        <select 
          className="form-select" 
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          style={{ width: 'auto', minWidth: '120px' }}
        >
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="inprogress">In Progress</option>
          <option value="done">Done</option>
        </select>

        <select 
          className="form-select" 
          value={filters.priority}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
          style={{ width: 'auto', minWidth: '120px' }}
        >
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <input
          type="text"
          className="form-input"
          placeholder="Filter by tag..."
          value={filters.tag}
          onChange={(e) => handleFilterChange('tag', e.target.value)}
          style={{ width: 'auto', minWidth: '150px' }}
        />

        {(filters.search || filters.status || filters.priority || filters.tag || filters.assignedTo) && (
          <button 
            className="btn btn-secondary"
            onClick={clearFilters}
            style={{ fontSize: '12px', padding: '8px 12px' }}
          >
            Clear Filters
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#6c757d' }}>
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Render Current View */}
      {currentView === 'list' && (
        <ListView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
          onTaskUpdate={handleUpdateTask}
        />
      )}

      {currentView === 'board' && (
        <KanbanBoard 
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
          onTaskDrop={handleTaskDrop}
        />
      )}

      {currentView === 'calendar' && (
        <CalendarView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
        />
      )}

      {currentView === 'gantt' && (
        <GanttView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
        />
      )}

      {currentView === 'table' && (
        <TableView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
          onTaskUpdate={handleUpdateTask}
        />
      )}

      {currentView === 'chat' && (
        <ChatView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
        />
      )}

      {currentView === 'timeline' && (
        <TimelineView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
        />
      )}

      {showCreateModal && (
        <EnhancedTaskModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateTask}
          project={project}
        />
      )}

      {selectedTask && (
        <EnhancedTaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={(updates) => handleUpdateTask(selectedTask.id || selectedTask._id, updates)}
          onDelete={() => {
            handleDeleteTask(selectedTask.id || selectedTask._id);
            setSelectedTask(null);
          }}
          project={project}
        />
      )}

      {/* Share Modal */}
      {showShareModal && project && (
        <ShareModal
          resourceType="project"
          resourceId={project.id}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default ProjectView;
