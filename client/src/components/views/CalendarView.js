import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

const CalendarView = ({ tasks, onTaskClick, onDateChange }) => {
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
      low: '#6c757d',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545'
    };
    return colors[priority] || colors.medium;
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

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
        <button
          onClick={prevMonth}
          style={{
            padding: '8px 16px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            background: 'white',
            cursor: 'pointer'
          }}
        >
          ← Previous
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: '600' }}>
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <button
          onClick={nextMonth}
          style={{
            padding: '8px 16px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            background: 'white',
            cursor: 'pointer'
          }}
        >
          Next →
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px'
      }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            style={{
              padding: '12px',
              textAlign: 'center',
              fontWeight: '600',
              fontSize: '12px',
              color: '#6c757d',
              textTransform: 'uppercase'
            }}
          >
            {day}
          </div>
        ))}

        {days.map((day, idx) => {
          const dayTasks = getTasksForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={idx}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropOnDate(day)}
              style={{
                minHeight: '120px',
                padding: '8px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                background: isCurrentMonth ? 'white' : '#f7f8f9',
                position: 'relative'
              }}
            >
              <div style={{
                fontSize: '14px',
                fontWeight: isToday ? '600' : '400',
                color: isToday ? '#6b5ce6' : (isCurrentMonth ? '#333' : '#999'),
                marginBottom: '8px',
                padding: isToday ? '2px 6px' : '0',
                background: isToday ? '#e8ecff' : 'transparent',
                borderRadius: isToday ? '4px' : '0',
                display: 'inline-block'
              }}>
                {format(day, 'd')}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id || task._id}
                    draggable
                    onDragStart={() => setDraggedTaskId(task.id || task._id)}
                    onClick={() => onTaskClick(task)}
                    style={{
                      padding: '4px 6px',
                      background: getPriorityColor(task.priority),
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: '500'
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div style={{
                    fontSize: '10px',
                    color: '#6c757d',
                    textAlign: 'center',
                    padding: '2px'
                  }}>
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled tasks */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Unscheduled</h3>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropUnscheduled}
          style={{
            minHeight: '80px',
            border: '2px dashed #e0e0e0',
            borderRadius: '8px',
            padding: '16px',
            background: '#fafbff',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          {unscheduledTasks.length === 0 && (
            <span style={{ color: '#6c757d', fontSize: '13px' }}>
              Drag tasks here to clear their due dates.
            </span>
          )}
          {unscheduledTasks.map(task => (
            <div
              key={task.id || task._id}
              draggable
              onDragStart={() => setDraggedTaskId(task.id || task._id)}
              onClick={() => onTaskClick(task)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#fff',
                border: '1px solid #e0e0e0',
                cursor: 'grab',
                minWidth: '200px'
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{task.title}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>No due date</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;

