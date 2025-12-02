import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TaskByAssignee = ({ tasks, users = [] }) => {
  const userMap = useMemo(() => {
    const map = {};
    users.forEach(user => {
      map[user.id] = user;
    });
    return map;
  }, [users]);

  const chartData = useMemo(() => {
    const assigneeStats = {};
    
    tasks.forEach(task => {
      // Handle both single assignee and multiple assignees
      const assignees = [];
      if (task.assignees && Array.isArray(task.assignees)) {
        assignees.push(...task.assignees);
      }
      if (task.assigned_to) {
        assignees.push(task.assigned_to);
      }
      
      // If no assignees, skip
      if (assignees.length === 0) return;
      
      assignees.forEach(assigneeId => {
        if (!assigneeStats[assigneeId]) {
          assigneeStats[assigneeId] = {
            userId: assigneeId,
            total: 0,
            todo: 0,
            inProgress: 0,
            done: 0
          };
        }
        
        assigneeStats[assigneeId].total++;
        if (task.status === 'todo') assigneeStats[assigneeId].todo++;
        else if (task.status === 'inprogress') assigneeStats[assigneeId].inProgress++;
        else if (task.status === 'done') assigneeStats[assigneeId].done++;
      });
    });

    return Object.values(assigneeStats)
      .map(stat => ({
        name: userMap[stat.userId]?.full_name || userMap[stat.userId]?.username || `User ${stat.userId}`,
        total: stat.total,
        todo: stat.todo,
        inProgress: stat.inProgress,
        done: stat.done
      }))
      .sort((a, b) => b.total - a.total);
  }, [tasks, userMap]);

  const COLORS = {
    todo: '#94a3b8',
    inProgress: '#3b82f6',
    done: '#10b981'
  };

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No tasks assigned yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis type="number" stroke="#6c757d" />
        <YAxis dataKey="name" type="category" stroke="#6c757d" width={120} />
        <Tooltip />
        <Bar dataKey="todo" stackId="a" fill={COLORS.todo} name="To Do" />
        <Bar dataKey="inProgress" stackId="a" fill={COLORS.inProgress} name="In Progress" />
        <Bar dataKey="done" stackId="a" fill={COLORS.done} name="Done" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TaskByAssignee;

