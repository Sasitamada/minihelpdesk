import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { tasksAPI, usersAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import Widget from '../components/dashboard/Widget';
import BurndownChart from '../components/dashboard/BurndownChart';
import TaskByAssignee from '../components/dashboard/TaskByAssignee';
import SprintMetrics from '../components/dashboard/SprintMetrics';
import CustomKPI from '../components/dashboard/CustomKPI';
import TimeTrackingWidget from '../components/dashboard/TimeTrackingWidget';
import WorkloadWidget from '../components/dashboard/WorkloadWidget';
import ActivityFeedWidget from '../components/dashboard/ActivityFeedWidget';
import TaskCountWidget from '../components/dashboard/TaskCountWidget';
import StatusBreakdownWidget from '../components/dashboard/StatusBreakdownWidget';
import PriorityBreakdownWidget from '../components/dashboard/PriorityBreakdownWidget';
import DueDateTimelineWidget from '../components/dashboard/DueDateTimelineWidget';
import { dashboardWidgetsAPI, reportsAPI } from '../services/api';

// Sortable Widget Wrapper
const SortableWidget = ({ id, children, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Widget {...props} isDragging={isDragging}>
        {children}
      </Widget>
    </div>
  );
};

const EnhancedDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sprintStartDate, setSprintStartDate] = useState(() => {
    const saved = localStorage.getItem('sprintStartDate');
    return saved || format(startOfWeek(new Date()), 'yyyy-MM-dd');
  });
  const [sprintEndDate, setSprintEndDate] = useState(() => {
    const saved = localStorage.getItem('sprintEndDate');
    return saved || format(endOfWeek(new Date()), 'yyyy-MM-dd');
  });
  
  const [workspaceId, setWorkspaceId] = useState(null);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  
  // Widget configuration
  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    return saved ? JSON.parse(saved) : [
      { id: 'task-count', type: 'task-count', visible: true },
      { id: 'status-breakdown', type: 'status-breakdown', visible: true },
      { id: 'priority-breakdown', type: 'priority-breakdown', visible: true },
      { id: 'kpi-overview', type: 'kpi-overview', visible: true },
      { id: 'burndown', type: 'burndown', visible: true },
      { id: 'task-by-assignee', type: 'task-by-assignee', visible: true },
      { id: 'sprint-metrics', type: 'sprint-metrics', visible: true },
      { id: 'velocity-chart', type: 'velocity-chart', visible: true },
      { id: 'completion-trend', type: 'completion-trend', visible: true },
      { id: 'time-tracking', type: 'time-tracking', visible: false },
      { id: 'workload', type: 'workload', visible: false },
      { id: 'activity-feed', type: 'activity-feed', visible: false },
      { id: 'due-date-timeline', type: 'due-date-timeline', visible: false }
    ];
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    localStorage.setItem('dashboardWidgets', JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    localStorage.setItem('sprintStartDate', sprintStartDate);
  }, [sprintStartDate]);

  useEffect(() => {
    localStorage.setItem('sprintEndDate', sprintEndDate);
  }, [sprintEndDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Load tasks
      const tasksResponse = await tasksAPI.getAll();
      // Handle new paginated response format: { data: [...], pagination: {...} }
      // or old format: array directly
      let allTasks = [];
      if (Array.isArray(tasksResponse.data)) {
        allTasks = tasksResponse.data;
      } else if (tasksResponse.data && Array.isArray(tasksResponse.data.data)) {
        allTasks = tasksResponse.data.data;
      } else if (Array.isArray(tasksResponse)) {
        allTasks = tasksResponse;
      }
      
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

      // Load users
      try {
        const usersResponse = await usersAPI.getAll();
        setUsers(usersResponse.data || []);
      } catch (err) {
        console.error('Error loading users:', err);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleWidget = (widgetId) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    ));
  };

  const removeWidget = (widgetId) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  // Ensure tasks is always an array (used throughout component)
  const tasksArray = Array.isArray(tasks) ? tasks : [];

  // Calculate metrics
  const stats = React.useMemo(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const myTasks = tasksArray.filter(t => t.assigned_to === user.id);
    const today = new Date().toISOString().split('T')[0];
    const dueToday = tasksArray.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date).toISOString().split('T')[0];
      return dueDate === today && t.status !== 'done';
    });
    const overdue = tasksArray.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date() && t.status !== 'done';
    });

    // Calculate velocity (tasks completed per day in last 7 days)
    const last7Days = tasksArray.filter(t => {
      if (t.status !== 'done' || !t.updated_at) return false;
      const updated = new Date(t.updated_at);
      return updated >= subDays(new Date(), 7);
    });
    const velocity = last7Days.length / 7;

    // Calculate completion rate
    const completionRate = tasksArray.length > 0 
      ? (tasksArray.filter(t => t.status === 'done').length / tasksArray.length) * 100 
      : 0;

    // Calculate average completion time
    const completedTasks = tasksArray.filter(t => t.status === 'done' && t.created_at && t.updated_at);
    const avgCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => {
          const created = new Date(t.created_at);
          const updated = new Date(t.updated_at);
          return sum + (updated - created) / (1000 * 60 * 60 * 24); // days
        }, 0) / completedTasks.length
      : 0;

    return {
      totalTasks: tasksArray.length,
      myTasks: myTasks.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      velocity: Math.round(velocity * 10) / 10,
      completionRate: Math.round(completionRate),
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10
    };
  }, [tasksArray]);

  // Chart data
  const statusData = [
    { name: 'To Do', value: tasksArray.filter(t => t.status === 'todo').length },
    { name: 'In Progress', value: tasksArray.filter(t => t.status === 'inprogress').length },
    { name: 'Done', value: tasksArray.filter(t => t.status === 'done').length }
  ];

  const priorityData = tasksArray.reduce((acc, task) => {
    const priority = task.priority || 'medium';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  const priorityChartData = Object.entries(priorityData).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  // Velocity chart data (last 7 days)
  const velocityData = React.useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayTasks = tasksArray.filter(t => {
        if (t.status !== 'done' || !t.updated_at) return false;
        const updated = new Date(t.updated_at);
        return format(updated, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });
      days.push({
        date: format(date, 'MMM dd'),
        completed: dayTasks.length
      });
    }
    return days;
  }, [tasksArray]);

  // Completion trend (last 14 days)
  const completionTrendData = React.useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayTasks = tasksArray.filter(t => {
        if (t.status !== 'done' || !t.updated_at) return false;
        const updated = new Date(t.updated_at);
        return format(updated, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });
      days.push({
        date: format(date, 'MMM dd'),
        completed: dayTasks.length
      });
    }
    return days;
  }, [tasksArray]);

  const COLORS = ['#7b68ee', '#4a9eff', '#2ecc71'];
  const PRIORITY_COLORS = { low: '#6c757d', medium: '#ffc107', high: '#fd7e14', urgent: '#dc3545' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  const visibleWidgets = widgets.filter(w => w.visible);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white"> Helpdesk Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWidgetModal(true)}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            + Add Widget
          </button>
          <input
            type="date"
            value={sprintStartDate}
            onChange={(e) => setSprintStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            title="Sprint Start Date"
          />
          <input
            type="date"
            value={sprintEndDate}
            onChange={(e) => setSprintEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            title="Sprint End Date"
          />
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

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomKPI
          title="Total Tasks"
          value={stats.totalTasks}
          change={0}
          changeType="neutral"
          color="blue"
        />
        <CustomKPI
          title="My Tasks"
          value={stats.myTasks}
          change={0}
          changeType="neutral"
          color="purple"
        />
        <CustomKPI
          title="Velocity"
          value={stats.velocity}
          subtitle="tasks/day (last 7 days)"
          change={0}
          changeType="neutral"
          color="green"
        />
        <CustomKPI
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          change={0}
          changeType="neutral"
          color="orange"
        />
      </div>

      {/* Draggable Widgets */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets.map(w => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleWidgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                id={widget.id}
                title={getWidgetTitle(widget.type)}
                onRemove={() => removeWidget(widget.id)}
                className={getWidgetClassName(widget.type)}
              >
                {renderWidget(widget.type, {
                  tasks: tasksArray,
                  users,
                  sprintStartDate,
                  sprintEndDate,
                  statusData,
                  priorityChartData,
                  velocityData,
                  completionTrendData,
                  COLORS,
                  PRIORITY_COLORS,
                  workspaceId
                })}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Widget Selector Modal */}
      <AnimatePresence>
        {showWidgetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowWidgetModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Widget</h2>
                <button
                  onClick={() => setShowWidgetModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { type: 'task-count', title: 'Task Count', icon: '📊' },
                  { type: 'status-breakdown', title: 'Status Breakdown', icon: '📈' },
                  { type: 'priority-breakdown', title: 'Priority Breakdown', icon: '🎯' },
                  { type: 'time-tracking', title: 'Time Tracking', icon: '⏱️' },
                  { type: 'workload', title: 'Workload & Utilization', icon: '⚖️' },
                  { type: 'activity-feed', title: 'Activity Feed', icon: '📰' },
                  { type: 'due-date-timeline', title: 'Due Date Timeline', icon: '📅' },
                  { type: 'burndown', title: 'Burndown Chart', icon: '📉' },
                  { type: 'sprint-metrics', title: 'Sprint Metrics', icon: '🏃' },
                  { type: 'task-by-assignee', title: 'Tasks by Assignee', icon: '👥' },
                  { type: 'velocity-chart', title: 'Velocity Chart', icon: '📊' },
                  { type: 'completion-trend', title: 'Completion Trend', icon: '📈' }
                ].map((widgetOption) => {
                  const exists = widgets.find(w => w.type === widgetOption.type);
                  return (
                    <button
                      key={widgetOption.type}
                      onClick={() => {
                        if (!exists) {
                          const newWidget = {
                            id: `${widgetOption.type}-${Date.now()}`,
                            type: widgetOption.type,
                            visible: true
                          };
                          setWidgets(prev => [...prev, newWidget]);
                        } else {
                          toggleWidget(exists.id);
                        }
                        setShowWidgetModal(false);
                      }}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        exists
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{widgetOption.icon}</span>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {widgetOption.title}
                          </div>
                          {exists && (
                            <div className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                              {exists.visible ? 'Visible' : 'Hidden'}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget Selector */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Widget Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {widgets.map(widget => (
            <label key={widget.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={widget.visible}
                onChange={() => toggleWidget(widget.id)}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {getWidgetTitle(widget.type)}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getWidgetTitle = (type) => {
  const titles = {
    'task-count': 'Task Count',
    'status-breakdown': 'Status Breakdown',
    'priority-breakdown': 'Priority Breakdown',
    'kpi-overview': 'KPI Overview',
    'burndown': 'Burndown Chart',
    'task-by-assignee': 'Tasks by Assignee',
    'sprint-metrics': 'Sprint Metrics',
    'velocity-chart': 'Velocity Chart',
    'completion-trend': 'Completion Trend',
    'time-tracking': 'Time Tracking',
    'workload': 'Workload & Utilization',
    'activity-feed': 'Activity Feed',
    'due-date-timeline': 'Due Date Timeline'
  };
  return titles[type] || type;
};

const getWidgetClassName = (type) => {
  const classes = {
    'sprint-metrics': 'lg:col-span-2',
    'burndown': 'lg:col-span-2',
    'completion-trend': 'lg:col-span-2',
    'time-tracking': 'lg:col-span-2',
    'workload': 'lg:col-span-2',
    'activity-feed': 'lg:col-span-2',
    'due-date-timeline': 'lg:col-span-2'
  };
  return classes[type] || '';
};

const renderWidget = (type, props) => {
  const { tasks, users, sprintStartDate, sprintEndDate, statusData, priorityChartData, velocityData, completionTrendData, COLORS, PRIORITY_COLORS, workspaceId } = props;
  // Ensure tasks is an array (it should already be tasksArray from parent, but be safe)
  const tasksArray = Array.isArray(tasks) ? tasks : [];
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  switch (type) {
    case 'task-count':
      return <TaskCountWidget workspaceId={workspaceId} />;
    
    case 'status-breakdown':
      return <StatusBreakdownWidget workspaceId={workspaceId} />;
    
    case 'priority-breakdown':
      return <PriorityBreakdownWidget workspaceId={workspaceId} />;
    
    case 'time-tracking':
      return <TimeTrackingWidget workspaceId={workspaceId} userId={user.id} />;
    
    case 'workload':
      return <WorkloadWidget workspaceId={workspaceId} />;
    
    case 'activity-feed':
      return <ActivityFeedWidget workspaceId={workspaceId} />;
    
    case 'due-date-timeline':
      return <DueDateTimelineWidget workspaceId={workspaceId} />;
    
    case 'burndown':
      return <BurndownChart tasks={tasksArray} sprintStartDate={sprintStartDate} sprintEndDate={sprintEndDate} />;
    
    case 'task-by-assignee':
      return <TaskByAssignee tasks={tasksArray} users={users} />;
    
    case 'sprint-metrics':
      return <SprintMetrics tasks={tasksArray} sprintStartDate={sprintStartDate} sprintEndDate={sprintEndDate} />;
    
    case 'status-distribution':
      return (
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
      );
    
    case 'velocity-chart':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={velocityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" stroke="#6c757d" />
            <YAxis stroke="#6c757d" />
            <Tooltip />
            <Bar dataKey="completed" fill="#10b981" name="Tasks Completed" />
          </BarChart>
        </ResponsiveContainer>
      );
    
    case 'priority-breakdown':
      return (
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
      );
    
    case 'completion-trend':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={completionTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" stroke="#6c757d" />
            <YAxis stroke="#6c757d" />
            <Tooltip />
            <Area type="monotone" dataKey="completed" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Tasks Completed" />
          </AreaChart>
        </ResponsiveContainer>
      );
    
    default:
      return <div>Widget not found</div>;
  }
};

export default EnhancedDashboard;

