import React from 'react';

const ListView = ({ tasks, onTaskClick, onTaskUpdate }) => {
  const handleStatusChange = async (taskId, newStatus) => {
    if (onTaskUpdate) {
      await onTaskUpdate(taskId, { status: newStatus });
    }
  };

  const handlePriorityChange = async (taskId, newPriority) => {
    if (onTaskUpdate) {
      await onTaskUpdate(taskId, { priority: newPriority });
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#6c757d',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      todo: '#6c757d',
      inprogress: '#4a9eff',
      done: '#2ecc71'
    };
    return colors[status] || colors.todo;
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto auto auto',
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
        <div style={{ width: '40px' }}>Status</div>
        <div>Task</div>
        <div style={{ width: '100px', textAlign: 'center' }}>Priority</div>
        <div style={{ width: '120px', textAlign: 'center' }}>Due Date</div>
        <div style={{ width: '120px', textAlign: 'center' }}>Assignee</div>
        <div style={{ width: '100px', textAlign: 'center' }}>Tags</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.map((task) => {
          const tags = task.tags ? (Array.isArray(task.tags) ? task.tags : JSON.parse(task.tags)) : [];
          return (
            <div
              key={task.id || task._id}
              onClick={() => onTaskClick(task)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto auto auto auto',
                gap: '16px',
                padding: '16px',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                cursor: 'pointer',
                transition: 'all 0.2s',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Status */}
              <select
                value={task.status || 'todo'}
                onChange={(e) => handleStatusChange(task.id || task._id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: `2px solid ${getStatusColor(task.status)}`,
                  background: 'white',
                  color: getStatusColor(task.status),
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100px'
                }}
              >
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>

              {/* Task Title & Description */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {task.blocked_count > 0 && (
                    <span
                      title="This task is blocked by other tasks"
                      style={{ color: '#dc3545' }}
                    >
                      ⛔
                    </span>
                  )}
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#333' }}>
                    {task.title}
                  </div>
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
              </div>

              {/* Priority */}
              <div style={{ width: '100px', textAlign: 'center' }}>
                <select
                  value={task.priority || 'medium'}
                  onChange={(e) => handlePriorityChange(task.id || task._id, e.target.value)}
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
              </div>

              {/* Due Date */}
              <div style={{ width: '120px', textAlign: 'center', fontSize: '12px', color: '#6c757d' }}>
                {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
              </div>

              {/* Assignee */}
              <div style={{ width: '120px', textAlign: 'center', fontSize: '12px', color: '#6c757d' }}>
                {task.assigned_to ? 'Assigned' : 'Unassigned'}
              </div>

              {/* Tags */}
              <div style={{ width: '100px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
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

export default ListView;

