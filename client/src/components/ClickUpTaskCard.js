import React from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const ClickUpTaskCard = ({ task, onClick, onDragStart, style = {} }) => {
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'var(--text-muted)',
      medium: 'var(--warning)',
      high: 'var(--error)',
      urgent: 'var(--error)'
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityBg = (priority) => {
    const colors = {
      low: 'rgba(108, 117, 125, 0.1)',
      medium: 'rgba(245, 158, 11, 0.1)',
      high: 'rgba(239, 68, 68, 0.1)',
      urgent: 'rgba(239, 68, 68, 0.2)'
    };
    return colors[priority] || colors.medium;
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <motion.div
      className="task-card"
      onClick={onClick}
      draggable={true}
      onDragStart={onDragStart}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{
        ...style,
        padding: '12px',
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--card-border)',
        cursor: 'pointer',
        transition: 'all var(--transition-base)',
        boxShadow: 'var(--card-shadow)',
        marginBottom: '8px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)';
        e.currentTarget.style.borderColor = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--card-shadow)';
        e.currentTarget.style.borderColor = 'var(--card-border)';
      }}
      role="button"
      tabIndex={0}
      aria-label={`Task: ${task.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div style={{
        fontSize: 'var(--font-size-base)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--text)',
        marginBottom: '8px',
        lineHeight: '1.4'
      }}>
        {task.title}
      </div>
      
      {task.description && (
        <div style={{ 
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-secondary)',
          marginBottom: '8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: '1.4'
        }}>
          {task.description}
        </div>
      )}
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-secondary)'
      }}>
        {task.priority && (
          <span style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            background: getPriorityBg(task.priority),
            color: getPriorityColor(task.priority),
            fontWeight: 'var(--font-weight-medium)',
            textTransform: 'capitalize',
            fontSize: 'var(--font-size-xs)'
          }}>
            {task.priority}
          </span>
        )}
        
        {task.due_date && (
          <span style={{
            color: isOverdue ? 'var(--error)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>📅</span>
            {format(new Date(task.due_date), 'MMM dd')}
          </span>
        )}
        
        {task.assignees && task.assignees.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {task.assignees.slice(0, 3).map((assignee) => (
              <div
                key={assignee.user_id || assignee.id}
                title={assignee.full_name || assignee.username || 'Assignee'}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  fontWeight: 'var(--font-weight-semibold)',
                  fontSize: 'var(--font-size-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)'
                }}
                aria-label={assignee.full_name || assignee.username || 'Assignee'}
              >
                {(assignee.full_name || assignee.username || '?').substring(0, 1).toUpperCase()}
              </div>
            ))}
            {task.assignees.length > 3 && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                +{task.assignees.length - 3}
              </span>
            )}
          </div>
        )}
        
        {task.subtasks && task.subtasks.length > 0 && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--text-secondary)'
          }}>
            <span>✓</span>
            {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default ClickUpTaskCard;

