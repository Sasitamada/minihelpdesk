import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { reportsAPI } from '../../services/api';

const PRIORITY_COLORS = {
  'urgent': '#ef4444',
  'high': '#fd7e14',
  'medium': '#f59e0b',
  'low': '#2ecc71',
  'none': '#94a3b8'
};

const PriorityBreakdownWidget = ({ workspaceId, listId }) => {
  const [priorityData, setPriorityData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriorityData();
  }, [workspaceId, listId]);

  const loadPriorityData = async () => {
    try {
      setLoading(true);
      const params = { workspaceId };
      if (listId) params.listId = listId;
      
      const response = await reportsAPI.getDashboard(params);
      setPriorityData(response.data.priorityBreakdown || []);
    } catch (error) {
      console.error('Error loading priority breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    return priorityData.map(item => ({
      name: (item.priority || 'none').toUpperCase(),
      value: parseInt(item.count || 0),
      color: PRIORITY_COLORS[item.priority?.toLowerCase()] || PRIORITY_COLORS.none
    }));
  }, [priorityData]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No priority data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Priority Breakdown</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" stroke="#6c757d" />
          <YAxis stroke="#6c757d" />
          <Tooltip />
          <Bar dataKey="value" name="Tasks">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriorityBreakdownWidget;

