import React, { useState } from 'react';
import TaskCard from './TaskCard';

const KanbanBoard = ({ tasks, onTaskClick, onTaskDrop, statusOptions = [] }) => {
  const defaultColumns = [
    { id: 'todo', title: 'To Do', status: 'todo', color: '#6c757d' },
    { id: 'inprogress', title: 'In Progress', status: 'inprogress', color: '#4a9eff' },
    { id: 'done', title: 'Done', status: 'done', color: '#2ecc71' }
  ];

  const columns = statusOptions.length
    ? statusOptions.map(option => ({
        id: option.value,
        title: option.label,
        status: option.value,
        color: option.color || '#6c757d'
      }))
    : defaultColumns;

  const [draggedTask, setDraggedTask] = useState(null);

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (status) => {
    if (draggedTask && draggedTask.status !== status) {
      onTaskDrop(draggedTask.id || draggedTask._id, status);
    }
    setDraggedTask(null);
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="kanban-board">
      {columns.map(column => {
        const columnTasks = getTasksByStatus(column.status);
        return (
          <div
            key={column.id}
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.status)}
          >
            <div className="column-header">
              <div className="column-title" style={{ color: column.color }}>
                {column.title}
              </div>
              <div className="task-count">{columnTasks.length}</div>
            </div>
            <div style={{ minHeight: '400px' }}>
              {columnTasks.map(task => (
                <TaskCard
                  key={task.id || task._id}
                  task={task}
                  onDragStart={() => handleDragStart(task)}
                  onClick={() => onTaskClick(task)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
