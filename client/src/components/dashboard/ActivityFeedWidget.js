import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

const ActivityFeedWidget = ({ workspaceId, limit = 10 }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ eventType: '', userId: '' });

  useEffect(() => {
    loadActivities();
  }, [workspaceId, filter]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const params = {
        workspaceId,
        limit
      };
      
      if (filter.eventType) {
        params.eventType = filter.eventType;
      }
      
      if (filter.userId) {
        params.userId = filter.userId;
      }
      
      const response = await reportsAPI.getActivity(params);
      setActivities(response.data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'created': return '✨';
      case 'updated': return '✏️';
      case 'status_changed': return '🔄';
      case 'assigned': return '👤';
      case 'commented': return '💬';
      case 'deleted': return '🗑️';
      default: return '📝';
    }
  };

  const getActionText = (activity) => {
    if (activity.action === 'status_changed') {
      return `changed status from "${activity.oldValue}" to "${activity.newValue}"`;
    } else if (activity.action === 'updated' && activity.fieldName) {
      return `updated ${activity.fieldName}`;
    } else if (activity.action === 'assigned') {
      return `assigned task`;
    } else if (activity.action === 'commented') {
      return `commented`;
    } else {
      return activity.action;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading activity...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
        <select
          value={filter.eventType}
          onChange={(e) => setFilter(prev => ({ ...prev, eventType: e.target.value }))}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Events</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="status_changed">Status Changed</option>
          <option value="assigned">Assigned</option>
          <option value="commented">Commented</option>
        </select>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No recent activity
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold">
                {activity.userAvatar ? (
                  <img
                    src={`http://localhost:5001${activity.userAvatar}`}
                    alt={activity.userName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (activity.userName || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-grow min-w-0">
                <div className="text-sm text-gray-900 dark:text-white">
                  <span className="font-semibold">{activity.userName || 'Unknown'}</span>{' '}
                  <span className="text-gray-600 dark:text-gray-400">
                    {getActionIcon(activity.action)} {getActionText(activity)}
                  </span>
                </div>
                {activity.taskTitle && (
                  <div className="text-sm text-primary-600 dark:text-primary-400 mt-1 truncate">
                    {activity.taskTitle}
                  </div>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityFeedWidget;

