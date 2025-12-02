import React, { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalTasks: 0,
    todoTasks: 0,
    inProgressTasks: 0,
    doneTasks: 0,
    myTasks: 0,
    dueToday: 0,
    overdue: 0,
    recentTasks: [],
    activityFeed: []
  });
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await tasksAPI.getAll();
      let allTasks = response.data || [];
      
      // Apply filters
      if (filter === 'my') {
        allTasks = allTasks.filter(t => t.assigned_to === user.id);
      } else if (filter === 'due-today') {
        const today = new Date().toISOString().split('T')[0];
        allTasks = allTasks.filter(t => {
          if (!t.due_date) return false;
          const dueDate = new Date(t.due_date).toISOString().split('T')[0];
          return dueDate === today;
        });
      } else if (filter === 'overdue') {
        const today = new Date();
        allTasks = allTasks.filter(t => {
          if (!t.due_date) return false;
          return new Date(t.due_date) < today && t.status !== 'done';
        });
      }
      
      setTasks(allTasks);
      
      const myTasks = response.data.filter(t => t.assigned_to === user.id);
      const today = new Date().toISOString().split('T')[0];
      const dueToday = response.data.filter(t => {
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date).toISOString().split('T')[0];
        return dueDate === today && t.status !== 'done';
      });
      const overdue = response.data.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date() && t.status !== 'done';
      });

      // Load task history for activity feed
      const activityFeed = [];
      for (const task of response.data.slice(0, 20)) {
        try {
          const historyRes = await tasksAPI.getHistory(task.id || task._id);
          if (historyRes.data && historyRes.data.length > 0) {
            const latestActivity = historyRes.data[0];
            activityFeed.push({
              ...latestActivity,
              taskTitle: task.title,
              taskId: task.id || task._id
            });
          }
        } catch (err) {
          // Skip if history not available
        }
      }
      
      activityFeed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setStats({
        totalTasks: response.data.length,
        todoTasks: response.data.filter(t => t.status === 'todo').length,
        inProgressTasks: response.data.filter(t => t.status === 'inprogress').length,
        doneTasks: response.data.filter(t => t.status === 'done').length,
        myTasks: myTasks.length,
        dueToday: dueToday.length,
        overdue: overdue.length,
        recentTasks: response.data.slice(0, 10),
        activityFeed: activityFeed.slice(0, 10)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusData = [
    { name: 'To Do', value: stats.todoTasks },
    { name: 'In Progress', value: stats.inProgressTasks },
    { name: 'Done', value: stats.doneTasks }
  ];

  const priorityData = tasks.reduce((acc, task) => {
    const priority = task.priority || 'medium';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  const priorityChartData = Object.entries(priorityData).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  const COLORS = ['#7b68ee', '#4a9eff', '#2ecc71'];
  const PRIORITY_COLORS = { low: '#6c757d', medium: '#ffc107', high: '#fd7e14', urgent: '#dc3545' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Tasks</option>
            <option value="my">My Tasks</option>
            <option value="due-today">Due Today</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
        >
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Tasks</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalTasks}</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
        >
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">My Tasks</div>
          <div className="text-3xl font-bold text-primary-500">{stats.myTasks}</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
        >
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Due Today</div>
          <div className="text-3xl font-bold text-yellow-500">{stats.dueToday}</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
        >
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Overdue</div>
          <div className="text-3xl font-bold text-red-500">{stats.overdue}</div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Task Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart> 
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Task Status Chart</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" stroke="#6c757d" />
              <YAxis stroke="#6c757d" />
              <Tooltip />
              <Bar dataKey="value" fill="#7b68ee" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {priorityChartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" stroke="#6c757d" />
              <YAxis stroke="#6c757d" />
              <Tooltip />
              <Bar dataKey="value">
                {priorityChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name.toLowerCase()] || '#6c757d'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Activity Feed & Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Activity</h3>
          {stats.activityFeed.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No recent activity</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.activityFeed.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2"></div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{activity.username || activity.full_name || 'User'}</span>
                      {' '}{activity.action} {activity.field_name || 'task'} on
                      {' '}<span className="font-medium">{activity.taskTitle}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Tasks</h3>
          {stats.recentTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No tasks yet. Create a workspace and start adding tasks!
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stats.recentTasks.map(task => (
                <div
                  key={task.id || task._id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {task.status} • {task.priority || 'medium'} priority
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {task.priority || 'medium'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
