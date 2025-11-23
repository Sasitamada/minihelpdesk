import React, { useState } from 'react';

const TableView = ({ tasks, onTaskClick, onTaskUpdate }) => {
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === 'due_date') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }

    if (sortBy === 'title') {
      aVal = (aVal || '').toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

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

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return null;
    return <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
        <thead>
          <tr style={{ background: '#f7f8f9', borderBottom: '2px solid #e0e0e0' }}>
            <th
              style={{ padding: '12px', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', color: '#6c757d' }}
              onClick={() => handleSort('title')}
            >
              Task <SortIcon column="title" />
            </th>
            <th
              style={{ padding: '12px', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', color: '#6c757d' }}
              onClick={() => handleSort('status')}
            >
              Status <SortIcon column="status" />
            </th>
            <th
              style={{ padding: '12px', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', color: '#6c757d' }}
              onClick={() => handleSort('priority')}
            >
              Priority <SortIcon column="priority" />
            </th>
            <th
              style={{ padding: '12px', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', color: '#6c757d' }}
              onClick={() => handleSort('due_date')}
            >
              Due Date <SortIcon column="due_date" />
            </th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', color: '#6c757d' }}>
              Assignee
            </th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', color: '#6c757d' }}>
              Tags
            </th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', color: '#6c757d' }}>
              Created
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => {
            const tags = task.tags ? (Array.isArray(task.tags) ? task.tags : JSON.parse(task.tags)) : [];
            return (
              <tr
                key={task.id || task._id}
                onClick={() => onTaskClick(task)}
                style={{
                  borderBottom: '1px solid #e0e0e0',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f7f8f9'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <td style={{ padding: '12px', fontWeight: '500' }}>{task.title}</td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: getStatusColor(task.status),
                      color: 'white'
                    }}
                  >
                    {task.status || 'todo'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: getPriorityColor(task.priority),
                      color: 'white'
                    }}
                  >
                    {task.priority || 'medium'}
                  </span>
                </td>
                <td style={{ padding: '12px', fontSize: '12px', color: '#6c757d' }}>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                </td>
                <td style={{ padding: '12px', fontSize: '12px', color: '#6c757d' }}>
                  {task.assigned_to ? 'Assigned' : 'Unassigned'}
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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
                </td>
                <td style={{ padding: '12px', fontSize: '12px', color: '#6c757d' }}>
                  {task.created_at ? new Date(task.created_at).toLocaleDateString() : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          No tasks found
        </div>
      )}
    </div>
  );
};

export default TableView;

