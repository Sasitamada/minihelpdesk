import React, { useState } from 'react';
import TaskCard from './TaskCard';

const KanbanBoard = ({ tasks, onTaskClick, onTaskDrop }) => {
  const columns = [
    { id: 'todo', title: 'To Do', status: 'todo' },
    { id: 'inprogress', title: 'In Progress', status: 'inprogress' },
    { id: 'done', title: 'Done', status: 'done' }
  ];

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
              <div className="column-title">{column.title}</div>
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
