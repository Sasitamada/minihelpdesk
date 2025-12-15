import React, { useRef, useState } from 'react';
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

const GanttView = ({ tasks, onTaskClick, onDateChange }) => {
  const scrollRef = useRef(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // Get date range from tasks
  const getDateRange = () => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        start: startOfWeek(today),
        end: endOfWeek(addDays(today, 30))
      };
    }

    const dates = tasks
      .filter(t => t.due_date)
      .map(t => new Date(t.due_date));
    
    if (dates.length === 0) {
      const today = new Date();
      return {
        start: startOfWeek(today),
        end: endOfWeek(addDays(today, 30))
      };
    }

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return {
      start: startOfWeek(minDate),
      end: endOfWeek(addDays(maxDate, 7))
    };
  };

  const { start, end } = getDateRange();
  const days = eachDayOfInterval({ start, end });
  const totalDays = differenceInDays(end, start);

  const getTaskPosition = (task) => {
    if (!task.due_date) return null;
    const taskDate = new Date(task.due_date);
    const daysFromStart = differenceInDays(taskDate, start);
    return {
      left: (daysFromStart / totalDays) * 100,
      width: Math.max(3, (1 / totalDays) * 100 * 1.5)
    };
  };

  const handleDropOnDate = (date) => {
    if (!draggedTaskId || !onDateChange) return;
    onDateChange(draggedTaskId, date);
    setDraggedTaskId(null);
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

  return (
    <div style={{ width: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Header with dates */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            borderBottom: '2px solid #e0e0e0',
            background: '#f7f8f9',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          <div style={{ width: '250px', padding: '12px', fontWeight: '600', borderRight: '1px solid #e0e0e0' }}>
            Task
          </div>
          <div style={{ display: 'flex', minWidth: `${totalDays * 20}px` }}>
            {days.filter((_, idx) => idx % 7 === 0).map((day, idx) => (
              <div
                key={idx}
                style={{
                  minWidth: '140px',
                  padding: '12px',
                  textAlign: 'center',
                  borderRight: '1px solid #e0e0e0',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                {format(day, 'MMM dd')}
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {tasks.map((task, idx) => {
            const position = getTaskPosition(task);
            return (
              <div
                key={task.id || task._id}
                style={{
                  display: 'flex',
                  borderBottom: '1px solid #e0e0e0',
                  minHeight: '50px',
                  alignItems: 'center'
                }}
              >
                {/* Task name */}
                <div
                  style={{
                    width: '250px',
                    padding: '12px',
                    borderRight: '1px solid #e0e0e0',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  onClick={() => onTaskClick(task)}
                >
                  <div>{task.title}</div>
                  {task.blocked_count > 0 && (
                    <span style={{ color: '#dc3545', fontSize: '11px' }}>
                      ⛔ {task.blocked_count} blocker{task.blocked_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Gantt bar area */}
                <div
                  style={{
                    position: 'relative',
                    minWidth: `${totalDays * 20}px`,
                    height: '50px',
                    background: '#fafafa'
                  }}
                >
                  {days.map((day, idx) => (
                    <div
                      key={idx}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropOnDate(day)}
                      style={{
                        position: 'absolute',
                        left: `${(idx / totalDays) * 100}%`,
                        top: 0,
                        width: `${100 / totalDays}%`,
                        height: '50px',
                        borderLeft: idx % 7 === 0 ? '1px dashed #e0e0e0' : 'none',
                        zIndex: 1
                      }}
                    />
                  ))}
                  {position && (
                    <div
                      draggable
                      onDragStart={() => setDraggedTaskId(task.id || task._id)}
                      onClick={() => onTaskClick(task)}
                      style={{
                        position: 'absolute',
                        left: `${position.left}%`,
                        top: '10px',
                        width: `${position.width}%`,
                        minWidth: '40px',
                        height: '30px',
                        background: getPriorityColor(task.priority),
                        borderRadius: '4px',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: '600',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        zIndex: 2
                      }}
                      title={task.title}
                    >
                      {task.title.substring(0, 6)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            No tasks with due dates found
          </div>
        )}
      </div>
    </div>
  );
};

export default GanttView;

