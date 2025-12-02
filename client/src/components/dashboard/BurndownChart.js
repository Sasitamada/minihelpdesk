import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isWithinInterval } from 'date-fns';

const BurndownChart = ({ tasks, sprintStartDate, sprintEndDate }) => {
  const chartData = useMemo(() => {
    if (!sprintStartDate || !sprintEndDate) {
      return [];
    }

    const start = new Date(sprintStartDate);
    const end = new Date(sprintEndDate);
    const days = eachDayOfInterval({ start, end });
    
    // Calculate total story points or tasks at start
    const totalTasks = tasks.length;
    const totalStoryPoints = tasks.reduce((sum, task) => {
      const points = task.custom_fields?.find(f => f.name === 'Story Points')?.value || 1;
      return sum + (parseInt(points) || 1);
    }, 0);

    // Ideal burndown line (straight line from total to 0)
    const idealBurndown = totalStoryPoints / days.length;

    // Calculate actual burndown
    const data = days.map((day, index) => {
      const dayEnd = addDays(day, 1);
      const completedByDay = tasks.filter(task => {
        if (!task.updated_at) return false;
        const taskDate = new Date(task.updated_at);
        return task.status === 'done' && taskDate <= dayEnd;
      });

      const completedPoints = completedByDay.reduce((sum, task) => {
        const points = task.custom_fields?.find(f => f.name === 'Story Points')?.value || 1;
        return sum + (parseInt(points) || 1);
      }, 0);

      const remainingPoints = totalStoryPoints - completedPoints;
      const idealRemaining = Math.max(0, totalStoryPoints - (idealBurndown * (index + 1)));

      return {
        date: format(day, 'MMM dd'),
        'Ideal Burndown': Math.round(idealRemaining),
        'Actual Burndown': Math.round(remainingPoints),
        'Completed': Math.round(completedPoints)
      };
    });

    return data;
  }, [tasks, sprintStartDate, sprintEndDate]);

  if (!sprintStartDate || !sprintEndDate) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Set sprint start and end dates to view burndown chart
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="date" stroke="#6c757d" />
        <YAxis stroke="#6c757d" />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="Ideal Burndown" 
          stroke="#94a3b8" 
          strokeDasharray="5 5"
          strokeWidth={2}
        />
        <Line 
          type="monotone" 
          dataKey="Actual Burndown" 
          stroke="#ef4444" 
          strokeWidth={2}
        />
        <Line 
          type="monotone" 
          dataKey="Completed" 
          stroke="#10b981" 
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default BurndownChart;

