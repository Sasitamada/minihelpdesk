import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { timeLogsAPI, usersAPI, workspacesAPI } from '../services/api';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';

const TimesheetPage = () => {
  const { workspaceId } = useParams();
  const [timeLogs, setTimeLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState(null);
  const [editForm, setEditForm] = useState({ hours: '', minutes: '', description: '' });

  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadUsers();
  }, [workspaceId]);

  useEffect(() => {
    loadTimeLogs();
  }, [workspaceId, selectedUserId, weekStart, weekEnd]);

  const loadUsers = async () => {
    try {
      if (workspaceId) {
        const response = await workspacesAPI.getMembers(workspaceId);
        setUsers(response.data);
      } else {
        const response = await usersAPI.getAll();
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTimeLogs = async () => {
    try {
      setLoading(true);
      const params = {
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        groupBy: 'day'
      };
      
      if (workspaceId) {
        params.workspaceId = workspaceId;
      }
      
      if (selectedUserId && selectedUserId !== 'all') {
        params.userId = selectedUserId;
      }
      
      const response = await timeLogsAPI.getReport(params);
      
      // Get detailed logs for editing
      const detailedParams = {
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString()
      };
      if (workspaceId) detailedParams.workspaceId = workspaceId;
      if (selectedUserId && selectedUserId !== 'all') detailedParams.userId = selectedUserId;
      
      const detailedResponse = await timeLogsAPI.getReport({ ...detailedParams, groupBy: null });
      setTimeLogs(detailedResponse.data || []);
    } catch (error) {
      console.error('Error loading time logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeLogsForDay = (day, userId) => {
    return timeLogs.filter(log => {
      if (userId && log.user_id !== parseInt(userId)) return false;
      if (!log.start_time) return false;
      const logDate = parseISO(log.start_time);
      return isSameDay(logDate, day);
    });
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTotalForDay = (day, userId) => {
    const logs = getTimeLogsForDay(day, userId);
    return logs.reduce((sum, log) => sum + (log.duration || 0), 0);
  };

  const getTotalForWeek = (userId) => {
    return weekDays.reduce((sum, day) => sum + getTotalForDay(day, userId), 0);
  };

  const handleEdit = (log) => {
    const hours = Math.floor(log.duration / 3600);
    const minutes = Math.floor((log.duration % 3600) / 60);
    setEditingLog(log.id);
    setEditForm({
      hours: hours.toString(),
      minutes: minutes.toString(),
      description: log.description || ''
    });
  };

  const handleSaveEdit = async (log) => {
    try {
      const totalSeconds = (parseInt(editForm.hours || 0) * 3600) + (parseInt(editForm.minutes || 0) * 60);
      await timeLogsAPI.update(log.id, {
        duration: totalSeconds,
        description: editForm.description
      });
      setEditingLog(null);
      loadTimeLogs();
    } catch (error) {
      console.error('Error updating time log:', error);
      alert('Failed to update time log');
    }
  };

  const handleDelete = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this time log?')) return;
    try {
      await timeLogsAPI.delete(logId);
      loadTimeLogs();
    } catch (error) {
      console.error('Error deleting time log:', error);
      alert('Failed to delete time log');
    }
  };

  const displayUsers = selectedUserId === 'all' ? users : users.filter(u => u.user_id === parseInt(selectedUserId) || u.id === parseInt(selectedUserId));

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading timesheet...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Timesheet</h1>
        <div className="flex gap-4 items-center">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Users</option>
            {users.map(user => (
              <option key={user.user_id || user.id} value={user.user_id || user.id}>
                {user.full_name || user.username}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10">
                User
              </th>
              {weekDays.map(day => (
                <th key={day.toISOString()} className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white min-w-[120px]">
                  <div>{format(day, 'EEE')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{format(day, 'MMM dd')}</div>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {displayUsers.map(user => {
              const userId = user.user_id || user.id;
              return (
                <tr key={userId} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10">
                    {user.full_name || user.username}
                  </td>
                  {weekDays.map(day => {
                    const dayLogs = getTimeLogsForDay(day, userId);
                    const dayTotal = getTotalForDay(day, userId);
                    return (
                      <td key={day.toISOString()} className="px-2 py-2 align-top">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
                            {formatDuration(dayTotal)}
                          </div>
                          {dayLogs.map(log => (
                            <div
                              key={log.id}
                              className="text-xs p-1 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
                            >
                              {editingLog === log.id ? (
                                <div className="space-y-1">
                                  <div className="flex gap-1">
                                    <input
                                      type="number"
                                      value={editForm.hours}
                                      onChange={(e) => setEditForm(prev => ({ ...prev, hours: e.target.value }))}
                                      placeholder="H"
                                      className="w-8 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                                      min="0"
                                    />
                                    <input
                                      type="number"
                                      value={editForm.minutes}
                                      onChange={(e) => setEditForm(prev => ({ ...prev, minutes: e.target.value }))}
                                      placeholder="M"
                                      className="w-8 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                                      min="0"
                                      max="59"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Description"
                                    className="w-full px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleSaveEdit(log)}
                                      className="flex-1 px-1 py-0.5 text-xs bg-primary-500 text-white rounded"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingLog(null)}
                                      className="px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="font-medium">{formatDuration(log.duration)}</div>
                                  {log.description && (
                                    <div className="text-gray-600 dark:text-gray-400 truncate" title={log.description}>
                                      {log.description}
                                    </div>
                                  )}
                                  <div className="flex gap-1 mt-1">
                                    <button
                                      onClick={() => handleEdit(log)}
                                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDelete(log.id)}
                                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                                    >
                                      Del
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    {formatDuration(getTotalForWeek(userId))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimesheetPage;

