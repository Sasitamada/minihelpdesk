import React from 'react';

const ViewSwitcher = ({ currentView, onViewChange }) => {
  const views = [
    { id: 'list', name: 'List', icon: '📋' },
    { id: 'board', name: 'Board', icon: '🗂️' },
    { id: 'calendar', name: 'Calendar', icon: '📅' },
    { id: 'timeline', name: 'Timeline', icon: '⏱️' },
    { id: 'gantt', name: 'Gantt', icon: '📈' },
    { id: 'table', name: 'Table', icon: '📑' },
    { id: 'workload', name: 'Workload', icon: '⚖️' },
    { id: 'activity', name: 'Activity', icon: '📰' }
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      padding: '4px',
      background: '#f7f8f9',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            background: currentView === view.id ? '#6b5ce6' : 'transparent',
            color: currentView === view.id ? 'white' : '#6c757d',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: currentView === view.id ? '600' : '400',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentView !== view.id) {
              e.target.style.background = '#e8ecff';
            }
          }}
          onMouseLeave={(e) => {
            if (currentView !== view.id) {
              e.target.style.background = 'transparent';
            }
          }}
        >
          <span>{view.icon}</span>
          <span>{view.name}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewSwitcher;

