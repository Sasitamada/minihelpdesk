import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ClickUpTaskCard from '../ClickUpTaskCard';

const SortableTaskCard = ({ task, onTaskClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id || task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ClickUpTaskCard
        task={task}
        onClick={() => onTaskClick(task)}
        style={{
          cursor: 'grab',
          marginBottom: '12px',
          boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        }}
      />
    </div>
  );
};

const ClickUpBoardView = ({ tasks, onTaskClick, onTaskDrop, statusOptions = [] }) => {
  const defaultColumns = [
    { id: 'todo', title: 'To Do', status: 'todo', color: 'var(--text-muted)' },
    { id: 'inprogress', title: 'In Progress', status: 'inprogress', color: 'var(--info)' },
    { id: 'done', title: 'Done', status: 'done', color: 'var(--success)' }
  ];

  const columns = statusOptions.length
    ? statusOptions.map(option => ({
        id: option.value,
        title: option.label,
        status: option.value,
        color: option.color || 'var(--text-muted)'
      }))
    : defaultColumns;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const taskId = active.id;
    const columnId = over.id;
    const column = columns.find(col => col.id === columnId);
    
    if (column && onTaskDrop) {
      onTaskDrop(taskId, column.status);
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div style={{ 
      padding: '24px',
      background: 'var(--bg-secondary)',
      minHeight: '100%'
    }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div style={{
          display: 'flex',
          gap: '20px',
          overflowX: 'auto',
          paddingBottom: '12px',
          minHeight: 'calc(100vh - 200px)'
        }}>
          {columns.map(column => {
            const columnTasks = getTasksByStatus(column.status);
            return (
              <div
                key={column.id}
                style={{
                  minWidth: '320px',
                  width: '320px',
                  background: 'var(--surface)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '16px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 150px)'
                }}
              >
                {/* Column Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: column.color
                      }}
                    />
                    <h3 style={{
                      fontSize: 'var(--font-size-base)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--text)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {column.title}
                    </h3>
                  </div>
                  <span style={{
                    background: 'var(--surface-hover)',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--text-secondary)'
                  }}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  paddingRight: '4px'
                }}>
                  <SortableContext
                    items={columnTasks.map(t => t.id || t._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {columnTasks.map(task => (
                      <SortableTaskCard
                        key={task.id || task._id}
                        task={task}
                        onTaskClick={onTaskClick}
                      />
                    ))}
                  </SortableContext>
                  
                  {columnTasks.length === 0 && (
                    <div style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: 'var(--font-size-sm)'
                    }}>
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
};

export default ClickUpBoardView;
