import React, { useState } from 'react';
import { format, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

const TimelineView = ({ tasks, onTaskClick }) => {
  const [timeframe, setTimeframe] = useState('week'); // week, month, quarter

  const getDateRange = () => {
    const today = new Date();
    switch (timeframe) {
      case 'week':
        return {
          start: startOfWeek(today),
          end: endOfWeek(today)
        };
      case 'month':
        return {
          start: startOfWeek(new Date(today.getFullYear(), today.getMonth(), 1)),
          end: endOfWeek(new Date(today.getFullYear(), today.getMonth() + 1, 0))
        };
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        return {
          start: startOfWeek(new Date(today.getFullYear(), quarter * 3, 1)),
          end: endOfWeek(new Date(today.getFullYear(), (quarter + 1) * 3, 0))
        };
      default:
        return {
          start: startOfWeek(today),
          end: endOfWeek(today)
        };
    }
  };

  const { start, end } = getDateRange();
  const days = eachDayOfInterval({ start, end });
  const totalDays = differenceInDays(end, start) + 1;

  const getTaskPosition = (task) => {
    if (!task.due_date && !task.created_at) return null;
    const taskDate = new Date(task.due_date || task.created_at);
    const daysFromStart = differenceInDays(taskDate, start);
    
    if (daysFromStart < 0 || daysFromStart > totalDays) return null;

    return {
      left: (daysFromStart / totalDays) * 100,
      width: Math.max(2, (totalDays * 0.05))
    };
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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '16px',
        background: '#f7f8f9',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['week', 'month', 'quarter'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: '8px 16px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                background: timeframe === tf ? '#6b5ce6' : 'white',
                color: timeframe === tf ? 'white' : '#333',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontWeight: timeframe === tf ? '600' : '400'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '14px', color: '#6c757d' }}>
          {format(start, 'MMM dd')} - {format(end, 'MMM dd, yyyy')}
        </div>
      </div>

      {/* Timeline Header */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e0e0e0',
        background: '#f7f8f9',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ width: '200px', padding: '12px', fontWeight: '600', borderRight: '1px solid #e0e0e0' }}>
          Task
        </div>
        <div style={{ flex: 1, position: 'relative', minHeight: '40px' }}>
          {days.filter((_, idx) => idx % Math.max(1, Math.floor(totalDays / 10)) === 0).map((day, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `${(idx * Math.max(1, Math.floor(totalDays / 10)) / totalDays) * 100}%`,
                padding: '12px 4px',
                fontSize: '11px',
                fontWeight: '600',
                color: '#6c757d'
              }}
            >
              {format(day, 'MMM dd')}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {tasks.map((task, idx) => {
          const position = getTaskPosition(task);
          return (
            <div
              key={task.id || task._id}
              style={{
                display: 'flex',
                borderBottom: '1px solid #e0e0e0',
                minHeight: '60px',
                alignItems: 'center',
                background: idx % 2 === 0 ? 'white' : '#fafafa'
              }}
            >
              {/* Task Info */}
              <div
                style={{
                  width: '200px',
                  padding: '12px',
                  borderRight: '1px solid #e0e0e0',
                  cursor: 'pointer'
                }}
                onClick={() => onTaskClick(task)}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{task.title}</div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: getStatusColor(task.status),
                    color: 'white',
                    fontWeight: '600'
                  }}>
                    {task.status}
                  </span>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: getPriorityColor(task.priority),
                    color: 'white',
                    fontWeight: '600'
                  }}>
                    {task.priority}
                  </span>
                </div>
              </div>

              {/* Timeline Bar */}
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  height: '60px',
                  background: '#fafafa'
                }}
              >
                {position && (
                  <div
                    onClick={() => onTaskClick(task)}
                    style={{
                      position: 'absolute',
                      left: `${position.left}%`,
                      top: '15px',
                      width: `${position.width}%`,
                      height: '30px',
                      background: getPriorityColor(task.priority),
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: '600',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      border: `2px solid ${getStatusColor(task.status)}`
                    }}
                    title={`${task.title} - ${task.due_date ? format(new Date(task.due_date), 'MMM dd') : 'No due date'}`}
                  >
                    {task.title.substring(0, 8)}
                  </div>
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

export default TimelineView;

