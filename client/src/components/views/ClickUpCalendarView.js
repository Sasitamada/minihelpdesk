import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { motion } from 'framer-motion';

const ClickUpCalendarView = ({ tasks, onTaskClick, onDateChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      return isSameDay(taskDate, date);
    });
  };

  const unscheduledTasks = tasks.filter(task => !task.due_date);

  const handleDropOnDate = (date) => {
    if (!draggedTaskId || !onDateChange) return;
    onDateChange(draggedTaskId, date);
    setDraggedTaskId(null);
  };

  const handleDropUnscheduled = () => {
    if (!draggedTaskId || !onDateChange) return;
    onDateChange(draggedTaskId, null);
    setDraggedTaskId(null);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'var(--text-muted)',
      medium: 'var(--warning)',
      high: 'var(--error)',
      urgent: 'var(--error)'
    };
    return colors[priority] || colors.medium;
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div style={{ 
      width: '100%',
      padding: '24px',
      background: 'var(--bg-secondary)',
      minHeight: '100%'
    }}>
      {/* Calendar Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '16px 20px',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)'
      }}>
        <button
          onClick={prevMonth}
          className="calendar-nav-btn"
          style={{
            padding: '8px 16px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            transition: 'all var(--transition-base)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
          }}
          aria-label="Previous month"
        >
          ← Previous
        </button>
        <h2 style={{ 
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--text)'
        }}>
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <button
          onClick={nextMonth}
          className="calendar-nav-btn"
          style={{
            padding: '8px 16px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            transition: 'all var(--transition-base)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
          }}
          aria-label="Next month"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px',
        marginBottom: '24px'
      }}>
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            style={{
              padding: '12px',
              textAlign: 'center',
              fontWeight: 'var(--font-weight-semibold)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {days.map((day, index) => {
          const dayTasks = getTasksForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnDate(day);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = 'var(--surface-hover)';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface)';
              }}
              style={{
                minHeight: '120px',
                padding: '8px',
                background: isCurrentMonth ? 'var(--surface)' : 'var(--bg-secondary)',
                border: isCurrentDay 
                  ? '2px solid var(--accent)' 
                  : '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                opacity: isCurrentMonth ? 1 : 0.4
              }}
              onMouseEnter={(e) => {
                if (isCurrentMonth) {
                  e.currentTarget.style.background = 'var(--surface-hover)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isCurrentMonth ? 'var(--surface)' : 'var(--bg-secondary)';
              }}
              role="button"
              tabIndex={0}
              aria-label={`${format(day, 'MMMM d, yyyy')} - ${dayTasks.length} tasks`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // Could open date picker or task list for this day
                }
              }}
            >
              <div style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: isCurrentDay ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
                color: isCurrentDay ? 'var(--accent)' : 'var(--text)',
                marginBottom: '8px'
              }}>
                {format(day, 'd')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {dayTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id || task._id}
                    draggable
                    onDragStart={() => setDraggedTaskId(task.id || task._id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(task);
                    }}
                    style={{
                      padding: '4px 8px',
                      background: getPriorityColor(task.priority || 'medium'),
                      color: 'white',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-medium)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      transition: 'all var(--transition-base)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.8';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    padding: '2px 8px'
                  }}>
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Unscheduled Tasks */}
      {unscheduledTasks.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text)',
            marginBottom: '16px'
          }}>
            Unscheduled Tasks ({unscheduledTasks.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {unscheduledTasks.map(task => (
              <div
                key={task.id || task._id}
                draggable
                onDragStart={() => setDraggedTaskId(task.id || task._id)}
                onClick={() => onTaskClick(task)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropUnscheduled();
                }}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  padding: '12px',
                  background: 'var(--surface-hover)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  transition: 'all var(--transition-base)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface-hover)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div style={{
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--text)',
                  marginBottom: '4px'
                }}>
                  {task.title}
                </div>
                {task.priority && (
                  <span style={{
                    fontSize: 'var(--font-size-xs)',
                    color: getPriorityColor(task.priority),
                    textTransform: 'capitalize'
                  }}>
                    {task.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClickUpCalendarView;

