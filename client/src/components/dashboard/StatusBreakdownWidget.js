import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { reportsAPI } from '../../services/api';

const COLORS = ['#6b5ce6', '#2ecc71', '#fd7e14', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

const StatusBreakdownWidget = ({ workspaceId, listId }) => {
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatusData();
  }, [workspaceId, listId]);

  const loadStatusData = async () => {
    try {
      setLoading(true);
      const params = { workspaceId };
      if (listId) params.listId = listId;
      
      const response = await reportsAPI.getDashboard(params);
      setStatusData(response.data.statusBreakdown || []);
    } catch (error) {
      console.error('Error loading status breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    return statusData.map(item => ({
      name: item.status || 'Unknown',
      value: parseInt(item.count || 0)
    }));
  }, [statusData]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No status data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Status Breakdown</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatusBreakdownWidget;

