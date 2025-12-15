import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { listsAPI, tasksAPI, workspacesAPI } from '../services/api';
import ViewSwitcher from '../components/ViewSwitcher';
import KanbanBoard from '../components/KanbanBoard';
import ClickUpBoardView from '../components/views/ClickUpBoardView';
import EnhancedListView from '../components/views/EnhancedListView';
import CalendarView from '../components/views/CalendarView';
import ClickUpCalendarView from '../components/views/ClickUpCalendarView';
import GanttView from '../components/views/GanttView';
import TableView from '../components/views/TableView';
import TimelineView from '../components/views/TimelineView';
import WorkloadView from '../components/views/WorkloadView';
import ActivityView from '../components/views/ActivityView';
import EnhancedTaskModal from '../components/EnhancedTaskModal';
import ShareModal from '../components/ShareModal';
import useSocket from '../hooks/useSocket';

const ProjectView = () => {
  const { projectId } = useParams(); // This is actually listId now
  const [list, setList] = useState(null);
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
  const [currentView, setCurrentView] = useState('list');
  const [showShareModal, setShowShareModal] = useState(false);
  const { socket } = useSocket();
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);

  useEffect(() => {
    loadProject();
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, filters]);

  // Real-time task updates via WebSocket
  useEffect(() => {
    if (!socket || !projectId) return;

    const handleTaskUpdate = (data) => {
      // Reload tasks when updated
      loadTasks();
    };

    socket.on('task-updated', handleTaskUpdate);
    
    // Join workspace room for real-time updates
    socket.emit('join-workspace', list?.workspace_id);

    return () => {
      socket.off('task-updated', handleTaskUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, projectId, list]);

  const loadProject = async () => {
    try {
      // Try lists API first, fallback to projects API for backward compatibility
      try {
        const response = await listsAPI.getById(projectId);
        setList(response.data);
        if (response.data?.workspace_id) {
          loadWorkspaceMembers(response.data.workspace_id);
        }
      } catch (err) {
        // Fallback: try projects API (for old URLs)
        const projectsAPI = (await import('../services/api')).projectsAPI;
        const response = await projectsAPI.getById(projectId);
        setList(response.data);
        if (response.data?.workspace_id) {
          loadWorkspaceMembers(response.data.workspace_id);
        }
      }
    } catch (error) {
      console.error('Error loading list:', error);
    }
  };

  const loadWorkspaceMembers = async (workspaceId) => {
    try {
      const response = await workspacesAPI.getMembers(workspaceId);
      setWorkspaceMembers(response.data || []);
    } catch (error) {
      console.error('Error loading workspace members:', error);
    }
  };

  const loadTasks = async () => {
    try {
      // Use listId instead of projectId (backward compatible)
      const params = {
        listId: projectId,
        includeAssignees: 'true',
        includeHistory: 'true'
      };
      // Also support projectId for backward compatibility
      if (!params.listId) params.projectId = projectId;
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assignedTo) params.assignedTo = filters.assignedTo;
      if (filters.tag) params.tag = filters.tag;
      
      const response = await tasksAPI.getAll(params);
      // Handle new paginated response format (backward compatible)
      const tasksData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setTasks(tasksData);

      const historyItems = tasksData.flatMap(task =>
        (task.history || []).map(entry => ({
          id: entry.id,
          taskId: task.id,
          taskTitle: task.title,
          action: entry.action,
          userId: entry.user_id,
          userName: entry.full_name || entry.username,
          createdAt: entry.created_at,
          details: entry.field_name
            ? `${entry.field_name}: ${entry.old_value || '-'} → ${entry.new_value || '-'}`
            : entry.action
        }))
      );
      setActivityFeed(historyItems);
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
        listId: projectId, // Use listId for new ClickUp-style hierarchy
        project: projectId, // Keep for backward compatibility
        workspace: list?.workspace_id || list?.workspace,
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
      const userId = user.id || updates.userId;
      
      if (!userId) {
        const errorMsg = 'User not authenticated. Please log in again.';
        alert(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Use PATCH for partial updates (supports optimistic concurrency)
      await tasksAPI.patch(taskId, {
        ...updates,
        userId: userId,
        dueDate: updates.dueDate ? new Date(updates.dueDate).toISOString() : null
      });
      loadTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      // Handle authentication error (403)
      if (error.response?.status === 403) {
        const errorMsg = error.response?.data?.message || 'Authentication required. Please log in again.';
        alert(errorMsg);
        // Optionally redirect to login or reload
        return;
      }
      // Handle conflict error (409)
      if (error.response?.status === 409) {
        alert('This task was modified by another user. Please refresh and try again.');
        loadTasks(); // Reload to get latest version
        return;
      }
      throw error; // Re-throw for component to handle
    }
  };

  const handleDueDateChange = async (taskId, value) => {
    try {
      const normalizedDate =
        value instanceof Date
          ? value.toISOString()
          : value
          ? new Date(value).toISOString()
          : null;
      await handleUpdateTask(taskId, {
        dueDate: normalizedDate
      });
    } catch (error) {
      console.error('Error updating due date:', error);
    }
  };

  const handleAssigneeChange = async (taskId, userId) => {
    try {
      if (!userId) {
        const task = tasks.find(t => (t.id || t._id) === taskId);
        if (task?.assignees?.length) {
          await Promise.all(
            task.assignees.map(assignee =>
              tasksAPI.removeAssignee(taskId, assignee.user_id || assignee.id)
            )
          );
        }
      } else {
        await tasksAPI.addAssignee(taskId, userId);
      }
      await loadTasks();
    } catch (error) {
      console.error('Error updating assignee:', error);
    }
  };

  const handleBulkUpdate = async (taskIds, updates) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.id) {
        throw new Error('User not authenticated. Please log in again.');
      }
      await tasksAPI.bulkPatch(taskIds, updates);
      loadTasks();
    } catch (error) {
      console.error('Error in bulk update:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update tasks. Please try again.';
      throw new Error(errorMessage);
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
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.id;
      
      if (!userId) {
        alert('User not authenticated. Please log in again.');
        return;
      }
      
      await tasksAPI.update(taskId, { status: newStatus, userId });
      loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      if (error.response?.status === 403) {
        alert('Authentication required. Please log in again.');
      }
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

  const statusOptions = useMemo(() => {
    const map = new Map();
    tasks.forEach(task => {
      if (!task.status) return;
      if (!map.has(task.status)) {
        map.set(task.status, {
          value: task.status,
          label: task.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        });
      }
    });
    return Array.from(map.values());
  }, [tasks]);

  const assigneeOptions = useMemo(() => {
    return workspaceMembers.map(member => ({
      id: member.user_id || member.id,
      name: member.full_name || member.username || 'Member'
    }));
  }, [workspaceMembers]);

  const unscheduledTasks = useMemo(
    () => tasks.filter(task => !task.due_date),
    [tasks]
  );

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  }

  if (!list) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>List not found</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '13px', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {list.workspace_name || 'Workspace'} 
            {list.space_name ? ` • ${list.space_name}` : ''} 
            {list.folder_name ? ` • ${list.folder_name}` : ''}
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '600', margin: '4px 0 8px' }}>
            {list.name}
          </h1>
          <p style={{ color: '#6c757d' }}>{list.description || 'No description'}</p>
          {list.task_count !== undefined && (
            <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '4px' }}>
              {list.task_count} {list.task_count === 1 ? 'task' : 'tasks'}
            </p>
          )}
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
        <EnhancedListView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
          onTaskUpdate={handleUpdateTask}
          onBulkUpdate={handleBulkUpdate}
          onAssigneeChange={handleAssigneeChange}
          onDueDateChange={handleDueDateChange}
          statusOptions={statusOptions}
          assigneeOptions={assigneeOptions}
          isModalOpen={!!selectedTask}
        />
      )}

      {currentView === 'board' && (
        <ClickUpBoardView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
          onTaskDrop={handleTaskDrop}
          statusOptions={statusOptions}
        />
      )}

      {currentView === 'calendar' && (
        <ClickUpCalendarView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
          onDateChange={(taskId, date) => handleDueDateChange(taskId, date)}
        />
      )}

      {currentView === 'timeline' && (
        <TimelineView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
          onDateChange={(taskId, date) => handleDueDateChange(taskId, date)}
        />
      )}

      {currentView === 'gantt' && (
        <GanttView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
          onDateChange={(taskId, date) => handleDueDateChange(taskId, date)}
        />
      )}

      {currentView === 'table' && (
        <TableView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
          onTaskUpdate={handleUpdateTask}
          statusOptions={statusOptions}
        />
      )}

      {currentView === 'workload' && (
        <WorkloadView
          tasks={tasks}
          members={workspaceMembers}
          onTaskClick={(task) => setSelectedTask(task)}
        />
      )}

      {currentView === 'activity' && (
        <ActivityView activities={activityFeed} />
      )}

      {showCreateModal && (
        <EnhancedTaskModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateTask}
          project={list}
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
          project={list}
        />
      )}

      {/* Share Modal */}
      {showShareModal && list && (
        <ShareModal
          resourceType="list"
          resourceId={list.id}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default ProjectView;
