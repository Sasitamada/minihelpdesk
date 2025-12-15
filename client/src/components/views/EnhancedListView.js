import React, { useState, useEffect, useRef } from 'react';
import { tasksAPI } from '../../services/api';

/**
 * Enhanced ListView with ClickUp-style features:
 * - Multi-select with Shift+click and checkboxes
 * - Bulk actions (change status, assign, delete)
 * - Inline editing for title
 * - Quick actions on hover
 */
const EnhancedListView = ({
  tasks,
  onTaskClick,
  onTaskUpdate,
  onBulkUpdate,
  onAssigneeChange,
  onDueDateChange,
  statusOptions = [],
  assigneeOptions = [],
  isModalOpen = false
}) => {
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const lastSelectedIndex = useRef(null);
  const inputRef = useRef(null);

  // Show bulk action menu when tasks are selected
  useEffect(() => {
    if (selectedTasks.size > 0 && !bulkActionMenuOpen) {
      setBulkActionMenuOpen(true);
    } else if (selectedTasks.size === 0 && bulkActionMenuOpen) {
      setBulkActionMenuOpen(false);
    }
  }, [selectedTasks.size, bulkActionMenuOpen]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingTaskId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTaskId]);

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#6c757d',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545'
    };
    return colors[priority] || colors.medium;
  };

  const derivedStatusOptions = statusOptions.length
    ? statusOptions
    : [
        { value: 'todo', label: 'To Do', color: '#6c757d' },
        { value: 'inprogress', label: 'In Progress', color: '#4a9eff' },
        { value: 'done', label: 'Done', color: '#2ecc71' }
      ];

  const getStatusStyle = (status) => {
    const option = derivedStatusOptions.find(opt => opt.value === status);
    const color = option?.color || '#6c757d';
    return {
      padding: '4px 10px',
      borderRadius: '999px',
      border: `2px solid ${color}`,
      color,
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'capitalize',
      display: 'inline-block'
    };
  };

  const handleCheckboxClick = (e, taskId, index) => {
    e.stopPropagation();
    const newSelected = new Set(selectedTasks);

    if (e.shiftKey && lastSelectedIndex.current !== null) {
      // Shift+click: select range
      const start = Math.min(lastSelectedIndex.current, index);
      const end = Math.max(lastSelectedIndex.current, index);
      for (let i = start; i <= end; i++) {
        if (tasks[i]) {
          newSelected.add(tasks[i].id);
        }
      }
    } else {
      // Toggle single selection
      if (newSelected.has(taskId)) {
        newSelected.delete(taskId);
      } else {
        newSelected.add(taskId);
      }
    }

    setSelectedTasks(newSelected);
    lastSelectedIndex.current = index;
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    }
  };

  const handleTitleClick = (e, task) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const handleTitleSave = async (taskId) => {
    if (editingTitle.trim() && editingTitle !== tasks.find(t => t.id === taskId)?.title) {
      try {
        await onTaskUpdate(taskId, { title: editingTitle });
      } catch (error) {
        console.error('Error updating title:', error);
        // Rollback on error
        const task = tasks.find(t => t.id === taskId);
        if (task) setEditingTitle(task.title);
      }
    }
    setEditingTaskId(null);
  };

  const handleTitleKeyDown = (e, taskId) => {
    if (e.key === 'Enter') {
      handleTitleSave(taskId);
    } else if (e.key === 'Escape') {
      const task = tasks.find(t => t.id === taskId);
      if (task) setEditingTitle(task.title);
      setEditingTaskId(null);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    if (!newStatus) return;
    try {
      await onTaskUpdate(taskId, { status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handlePriorityChange = async (taskId, newPriority) => {
    try {
      await onTaskUpdate(taskId, { priority: newPriority });
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const handleDueDateChange = (taskId, value) => {
    if (!onDueDateChange) return;
    onDueDateChange(taskId, value);
  };

  const handleAssigneeSelect = (taskId, value) => {
    if (!onAssigneeChange) return;
    onAssigneeChange(taskId, value);
  };

  const parseCustomFields = (task) => {
    if (!task.custom_fields) return [];
    if (Array.isArray(task.custom_fields)) {
      return task.custom_fields;
    }
    if (typeof task.custom_fields === 'object') {
      return Object.entries(task.custom_fields).map(([field, value]) => ({
        field,
        value
      }));
    }
    try {
      const parsed = JSON.parse(task.custom_fields);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'object') {
        return Object.entries(parsed).map(([field, value]) => ({ field, value }));
      }
    } catch (err) {
      // ignore parse errors
    }
    return [];
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedTasks.size === 0 || !newStatus) return;
    
    setIsUpdating(true);
    try {
      const taskIds = Array.from(selectedTasks);
      if (onBulkUpdate) {
        await onBulkUpdate(taskIds, { status: newStatus });
        setSelectedTasks(new Set());
      } else {
        // Fallback: update individually
        await Promise.all(
          taskIds.map(id => onTaskUpdate(id, { status: newStatus }))
        );
        setSelectedTasks(new Set());
      }
    } catch (error) {
      console.error('Error in bulk status update:', error);
      const errorMessage = error.message || 'Failed to update tasks. Please try again.';
      alert(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkPriorityChange = async (newPriority) => {
    if (selectedTasks.size === 0 || !newPriority) return;
    
    setIsUpdating(true);
    try {
      const taskIds = Array.from(selectedTasks);
      if (onBulkUpdate) {
        await onBulkUpdate(taskIds, { priority: newPriority });
        setSelectedTasks(new Set());
      } else {
        await Promise.all(
          taskIds.map(id => onTaskUpdate(id, { priority: newPriority }))
        );
        setSelectedTasks(new Set());
      }
    } catch (error) {
      console.error('Error in bulk priority update:', error);
      const errorMessage = error.message || 'Failed to update tasks. Please try again.';
      alert(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    
    if (!window.confirm(`Delete ${selectedTasks.size} task(s)?`)) return;

    setIsUpdating(true);
    try {
      const taskIds = Array.from(selectedTasks);
      await Promise.all(
        taskIds.map(id => tasksAPI.delete(id))
      );
      setSelectedTasks(new Set());
      // Refresh tasks list
      if (onTaskUpdate) {
        window.location.reload(); // Simple refresh - in production, use proper state management
      }
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('Failed to delete tasks. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Bulk Actions Bar - Hide when modal is open */}
      {bulkActionMenuOpen && selectedTasks.size > 0 && !isModalOpen && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10, // Lower z-index to avoid overlapping modals (modals typically use 1000+)
          background: '#6b5ce6',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <span style={{ fontWeight: '600' }}>
            {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
          </span>
          
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <select
              onChange={(e) => handleBulkStatusChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              disabled={isUpdating}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">Change Status</option>
              <option value="todo">To Do</option>
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
            </select>

            <select
              onChange={(e) => handleBulkPriorityChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              disabled={isUpdating}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">Change Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <button
              onClick={handleBulkDelete}
              disabled={isUpdating}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>

            <button
              onClick={() => setSelectedTasks(new Set())}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              ✕ Clear
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr 120px 120px 140px 160px 120px',
        gap: '16px',
        padding: '12px 16px',
        background: '#f7f8f9',
        borderRadius: '8px',
        marginBottom: '12px',
        fontWeight: '600',
        fontSize: '12px',
        color: '#6c757d',
        textTransform: 'uppercase',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <input
          type="checkbox"
          checked={selectedTasks.size === tasks.length && tasks.length > 0}
          onChange={handleSelectAll}
          style={{ cursor: 'pointer' }}
        />
        <div>Task</div>
        <div style={{ width: '120px', textAlign: 'center' }}>Status</div>
        <div style={{ width: '100px', textAlign: 'center' }}>Priority</div>
        <div style={{ width: '120px', textAlign: 'center' }}>Due Date</div>
        <div style={{ width: '140px', textAlign: 'center' }}>Assignee</div>
        <div style={{ width: '120px', textAlign: 'center' }}>Tags</div>
        <div style={{ width: '160px', textAlign: 'center' }}>Custom Fields</div>
      </div>

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.map((task, index) => {
          const tags = task.tags ? (Array.isArray(task.tags) ? task.tags : JSON.parse(task.tags)) : [];
          const isSelected = selectedTasks.has(task.id);
          const isEditing = editingTaskId === task.id;
          const isHovered = hoveredTaskId === task.id;

          return (
            <div
              key={task.id || task._id}
              onClick={() => !isEditing && onTaskClick(task)}
              onMouseEnter={() => setHoveredTaskId(task.id)}
              onMouseLeave={() => setHoveredTaskId(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 120px 120px 140px 160px 120px',
                gap: '16px',
                padding: '16px',
                background: isSelected ? '#e8ecff' : 'white',
                borderRadius: '8px',
                border: isSelected ? '2px solid #6b5ce6' : '1px solid #e0e0e0',
                cursor: isEditing ? 'text' : 'pointer',
                transition: 'all 0.2s',
                alignItems: 'center',
                position: 'relative'
              }}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => handleCheckboxClick(e, task.id, index)}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: 'pointer' }}
              />

              {/* Task Title & Description */}
              <div style={{ minWidth: 0 }}>
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleTitleSave(task.id)}
                    onKeyDown={(e) => handleTitleKeyDown(e, task.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      border: '2px solid #6b5ce6',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  />
                ) : (
                  <>
                    <div
                      style={{
                        fontWeight: '600',
                        marginBottom: '4px',
                        color: '#333',
                        cursor: 'text'
                      }}
                      onClick={(e) => handleTitleClick(e, task)}
                    >
                      {task.title}
                    </div>
                    {task.description && (
                      <div style={{
                        fontSize: '12px',
                        color: '#6c757d',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {task.description.replace(/<[^>]*>/g, '').substring(0, 60)}...
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Status */}
              <div style={{ width: '120px', textAlign: 'center' }}>
                <select
                  value={task.status || 'todo'}
                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    ...getStatusStyle(task.status),
                    width: '100%',
                    borderRadius: '6px',
                    background: 'white'
                  }}
                >
                  {derivedStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority - Quick Edit on Hover */}
              <div style={{ width: '100px', textAlign: 'center', position: 'relative' }}>
                {isHovered || isSelected ? (
                  <select
                    value={task.priority || 'medium'}
                    onChange={(e) => handlePriorityChange(task.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: `2px solid ${getPriorityColor(task.priority)}`,
                      background: 'white',
                      color: getPriorityColor(task.priority),
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                ) : (
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: `2px solid ${getPriorityColor(task.priority)}`,
                    background: 'white',
                    color: getPriorityColor(task.priority),
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'inline-block'
                  }}>
                    {task.priority || 'medium'}
                  </span>
                )}
              </div>

              {/* Due Date */}
              <div style={{ width: '120px', textAlign: 'center', fontSize: '12px', color: '#6c757d' }}>
                <input
                  type="date"
                  value={task.due_date ? new Date(task.due_date).toISOString().substring(0, 10) : ''}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleDueDateChange(task.id, e.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    fontSize: '12px'
                  }}
                />
              </div>

              {/* Assignee */}
              <div style={{ width: '140px', textAlign: 'center', fontSize: '12px', color: '#6c757d' }}>
                <select
                  value={
                    task.assignees && task.assignees.length > 0
                      ? (task.assignees[0].user_id || task.assignees[0].id)
                      : ''
                  }
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleAssigneeSelect(task.id, e.target.value)}
                  style={{
                    width: '100%',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <option value="">Unassigned</option>
                  {assigneeOptions.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div style={{ width: '120px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {tags.slice(0, 2).map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '2px 8px',
                      background: '#6b5ce6',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '10px'
                    }}
                  >
                    {tag}
                  </span>
                ))}
                {tags.length > 2 && (
                  <span style={{ fontSize: '10px', color: '#6c757d' }}>+{tags.length - 2}</span>
                )}
              </div>

              {/* Custom Fields */}
              <div style={{ width: '160px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {parseCustomFields(task).length === 0 && (
                  <span style={{ fontSize: '11px', color: '#6c757d' }}>—</span>
                )}
                {parseCustomFields(task).slice(0, 3).map((field, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '11px',
                      background: '#f7f8f9',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      textAlign: 'left'
                    }}
                  >
                    <strong>{field.field || field.name}:</strong>{' '}
                    <span>{String(field.value ?? field.defaultValue ?? '-')}</span>
                  </div>
                ))}
                {parseCustomFields(task).length > 3 && (
                  <span style={{ fontSize: '10px', color: '#6c757d' }}>
                    +{parseCustomFields(task).length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          No tasks found
        </div>
      )}
    </div>
  );
};

export default EnhancedListView;

