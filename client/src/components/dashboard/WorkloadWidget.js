import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { reportsAPI } from '../../services/api';
import { format, subDays } from 'date-fns';

const WorkloadWidget = ({ workspaceId, dateRange = 30 }) => {
  const [workload, setWorkload] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkload();
  }, [workspaceId, dateRange]);

  const loadWorkload = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = subDays(endDate, dateRange);
      
      const response = await reportsAPI.getWorkload({
        workspaceId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      setWorkload(response.data);
    } catch (error) {
      console.error('Error loading workload:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    return workload.map(user => ({
      name: user.user.full_name || user.user.username || 'Unknown',
      tasks: user.taskCount,
      overdue: user.overdueCount,
      hours: parseFloat(user.totalHours || 0),
      utilization: user.utilization
    }));
  }, [workload]);

  const getColor = (utilization) => {
    switch (utilization) {
      case 'high': return '#ef4444'; // red
      case 'medium': return '#fd7e14'; // orange
      default: return '#2ecc71'; // green
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading workload data...</div>;
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No workload data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Workload & Utilization</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Tasks assigned per user</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" stroke="#6c757d" angle={-45} textAnchor="end" height={80} />
          <YAxis stroke="#6c757d" />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'tasks') return [value, 'Total Tasks'];
              if (name === 'overdue') return [value, 'Overdue Tasks'];
              if (name === 'hours') return [`${value} hours`, 'Time Tracked'];
              return [value, name];
            }}
            labelStyle={{ color: '#6c757d' }}
          />
          <Bar dataKey="tasks" name="Total Tasks" fill="#6b5ce6">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.utilization)} />
            ))}
          </Bar>
          <Bar dataKey="overdue" name="Overdue" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>

      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span>Low (0-5 tasks)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500"></div>
          <span>Medium (6-10 tasks)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span>High (10+ tasks)</span>
        </div>
      </div>
    </div>
  );
};

export default WorkloadWidget;

