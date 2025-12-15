import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { tasksAPI } from '../../services/api';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, isWithinInterval } from 'date-fns';

const DueDateTimelineWidget = ({ workspaceId, listId, weeks = 4 }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [workspaceId, listId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params = { workspaceId };
      if (listId) params.listId = listId;
      
      const response = await tasksAPI.getAll(params);
      const tasksData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now);
    const end = endOfWeek(now);
    const weeksList = eachWeekOfInterval({ start, end: new Date(end.getTime() + (weeks - 1) * 7 * 24 * 60 * 60 * 1000) });
    
    return weeksList.map(weekStart => {
      const weekEnd = endOfWeek(weekStart);
      const weekTasks = tasks.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
      });
      
      return {
        week: format(weekStart, 'MMM dd'),
        tasks: weekTasks.length,
        overdue: weekTasks.filter(t => new Date(t.due_date) < now && t.status !== 'done').length,
        completed: weekTasks.filter(t => t.status === 'done').length
      };
    });
  }, [tasks, weeks]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Due Date Timeline</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="week" stroke="#6c757d" />
          <YAxis stroke="#6c757d" />
          <Tooltip />
          <Bar dataKey="tasks" fill="#6b5ce6" name="Total Tasks" />
          <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
          <Bar dataKey="completed" fill="#2ecc71" name="Completed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DueDateTimelineWidget;

