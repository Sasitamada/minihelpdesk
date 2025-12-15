import React from 'react';
import { format } from 'date-fns';

const TaskCard = ({ task, onClick, onDragStart }) => {
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high':
      case 'urgent':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  };

  return (
    <div
      className="task-card"
      onClick={onClick}
      draggable={true}
      onDragStart={onDragStart}
      style={{ cursor: 'grab' }}
    >
      <div className="task-title">{task.title}</div>
      {task.description && (
        <div style={{ 
          fontSize: '12px', 
          color: '#6c757d', 
          marginBottom: '8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          {task.description}
        </div>
      )}
      
      <div className="task-meta">
        <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
          {task.priority}
        </span>
        {task.due_date && (
          <span style={{ color: new Date(task.due_date) < new Date() ? '#c72525' : '#6c757d' }}>
            📅 {format(new Date(task.due_date), 'MMM dd')}
          </span>
        )}
        {!task.due_date && (
          <span style={{ color: '#6c757d' }}>📅 No date</span>
        )}
      {task.assignees && task.assignees.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
          {task.assignees.slice(0, 3).map((assignee) => (
            <div
              key={assignee.user_id || assignee.id}
              title={assignee.full_name || assignee.username || 'Assignee'}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#e8ecff',
                color: '#6b5ce6',
                fontWeight: '600',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {(assignee.full_name || assignee.username || '?').substring(0, 1).toUpperCase()}
            </div>
          ))}
          {task.assignees.length > 3 && (
            <span style={{ fontSize: '12px', color: '#6c757d', alignSelf: 'center' }}>
              +{task.assignees.length - 3}
            </span>
          )}
        </div>
      )}
        {task.subtasks && task.subtasks.length > 0 && (
          <span>
            ✓ {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
