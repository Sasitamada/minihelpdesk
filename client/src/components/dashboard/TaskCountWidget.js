import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';

const TaskCountWidget = ({ workspaceId, listId, spaceId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [workspaceId, listId, spaceId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const params = { workspaceId };
      if (listId) params.listId = listId;
      if (spaceId) params.spaceId = spaceId;
      
      const response = await reportsAPI.getDashboard(params);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading task stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8 text-gray-500">No data available</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Open Tasks</div>
        <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">
          {stats.openTasks}
        </div>
      </div>
      
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <div className="text-sm text-green-600 dark:text-green-400 font-medium">Completed</div>
        <div className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">
          {stats.completedTasks}
        </div>
      </div>
      
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
        <div className="text-sm text-red-600 dark:text-red-400 font-medium">Overdue</div>
        <div className="text-3xl font-bold text-red-900 dark:text-red-100 mt-2">
          {stats.overdueTasks}
        </div>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Tasks</div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
          {stats.totalTasks}
        </div>
      </div>
    </div>
  );
};

export default TaskCountWidget;

