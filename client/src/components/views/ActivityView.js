import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';

const ActivityView = ({ activities = [] }) => {
  const users = useMemo(() => {
    const set = new Map();
    activities.forEach(activity => {
      if (!set.has(activity.userId) && activity.userName) {
        set.set(activity.userId, activity.userName);
      }
    });
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }));
  }, [activities]);

  const eventTypes = useMemo(() => {
    return Array.from(new Set(activities.map(activity => activity.action))).filter(Boolean);
  }, [activities]);

  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    search: ''
  });

  const filteredActivities = activities.filter(activity => {
    if (filters.userId && String(activity.userId) !== filters.userId) return false;
    if (filters.action && activity.action !== filters.action) return false;
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      if (
        !activity.taskTitle?.toLowerCase().includes(needle) &&
        !activity.details?.toLowerCase().includes(needle)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '16px'
        }}
      >
        <select
          value={filters.userId}
          onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e0e0e0' }}
        >
          <option value="">All Users</option>
          {users.map(user => (
            <option key={user.id || user.name} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>

        <select
          value={filters.action}
          onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e0e0e0' }}
        >
          <option value="">All Events</option>
          {eventTypes.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Search task or description..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e0e0e0'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredActivities.map(activity => (
          <div
            key={`${activity.taskId}-${activity.id}-${activity.createdAt}`}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '10px',
              padding: '12px 16px',
              background: '#fff',
              display: 'flex',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#e8ecff',
                color: '#6b5ce6',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {(activity.userName || 'U').substring(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: '#6c757d' }}>
                {format(new Date(activity.createdAt), 'MMM dd, yyyy HH:mm')}
              </div>
              <div style={{ fontWeight: 600, margin: '4px 0' }}>
                {activity.userName || 'Unknown'} {activity.action} on{' '}
                <span style={{ color: '#6b5ce6' }}>{activity.taskTitle}</span>
              </div>
              {activity.details && (
                <div style={{ fontSize: '13px', color: '#495057' }}>{activity.details}</div>
              )}
            </div>
            <div
              style={{
                alignSelf: 'center',
                padding: '4px 10px',
                borderRadius: '999px',
                background: '#f7f8f9',
                fontSize: '11px',
                textTransform: 'uppercase',
                color: '#6c757d',
                fontWeight: 600
              }}
            >
              {activity.action}
            </div>
          </div>
        ))}
      </div>

      {filteredActivities.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          No activity found for the selected filters.
        </div>
      )}
    </div>
  );
};

export default ActivityView;


