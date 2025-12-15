import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { timeLogsAPI } from '../../services/api';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

const TimeTrackingWidget = ({ workspaceId, userId, dateRange = 7 }) => {
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('day'); // 'day', 'user', 'task'
  const [filterUserId, setFilterUserId] = useState(userId || 'all');

  useEffect(() => {
    loadTimeLogs();
  }, [workspaceId, filterUserId, groupBy, dateRange]);

  const loadTimeLogs = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = subDays(endDate, dateRange);
      
      const params = {
        workspaceId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy
      };
      
      if (filterUserId && filterUserId !== 'all') {
        params.userId = filterUserId;
      }
      
      const response = await timeLogsAPI.getReport(params);
      setTimeLogs(response.data);
    } catch (error) {
      console.error('Error loading time logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (groupBy === 'day') {
      return timeLogs.map(log => ({
        name: format(new Date(log.date), 'MMM dd'),
        hours: parseFloat(log.totalHours || 0),
        entries: log.count
      }));
    } else if (groupBy === 'user') {
      return timeLogs.map(log => ({
        name: log.full_name || log.username || 'Unknown',
        hours: parseFloat(log.totalHours || 0),
        entries: log.count
      }));
    } else if (groupBy === 'task') {
      return timeLogs.map(log => ({
        name: (log.task_title || 'Untitled').substring(0, 20),
        hours: parseFloat(log.totalHours || 0),
        entries: log.count
      }));
    }
    return [];
  }, [timeLogs, groupBy]);

  const totalHours = useMemo(() => {
    return timeLogs.reduce((sum, log) => sum + parseFloat(log.totalHours || 0), 0).toFixed(2);
  }, [timeLogs]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading time tracking data...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Time Tracking</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total: {totalHours} hours</p>
        </div>
        <div className="flex gap-2">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="day">By Day</option>
            <option value="user">By User</option>
            <option value="task">By Task</option>
          </select>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No time tracking data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="name" stroke="#6c757d" angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="#6c757d" />
            <Tooltip
              formatter={(value) => [`${value} hours`, 'Time']}
              labelStyle={{ color: '#6c757d' }}
            />
            <Legend />
            <Bar dataKey="hours" fill="#6b5ce6" name="Hours Tracked" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default TimeTrackingWidget;

