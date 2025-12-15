import React, { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';

const TimeLogsList = ({ taskId, userId }) => {
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState(null);
  const [editForm, setEditForm] = useState({ duration: '', description: '' });
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntry, setManualEntry] = useState({ hours: '', minutes: '', description: '' });

  useEffect(() => {
    if (taskId) {
      loadTimeLogs();
    }
  }, [taskId]);

  const loadTimeLogs = async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const response = await tasksAPI.getTimeLogs(parseInt(taskId));
      setTimeLogs(response.data);
    } catch (error) {
      console.error('Error loading time logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleDelete = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this time log?')) return;
    
    try {
      await tasksAPI.deleteTimeLog(parseInt(taskId), logId);
      loadTimeLogs();
    } catch (error) {
      console.error('Error deleting time log:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete time log';
      alert(errorMessage);
    }
  };

  const handleEdit = (log) => {
    const hours = Math.floor(log.duration / 3600);
    const minutes = Math.floor((log.duration % 3600) / 60);
    setEditingLog(log.id);
    setEditForm({
      duration: `${hours}:${String(minutes).padStart(2, '0')}`,
      description: log.description || ''
    });
  };

  const handleSaveEdit = async (logId) => {
    try {
      const [hours, minutes] = editForm.duration.split(':').map(Number);
      const totalSeconds = (hours * 3600) + (minutes * 60);
      
      await tasksAPI.updateTimeLog(parseInt(taskId), logId, {
        duration: totalSeconds,
        description: editForm.description
      });
      
      setEditingLog(null);
      loadTimeLogs();
    } catch (error) {
      console.error('Error updating time log:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update time log';
      alert(errorMessage);
    }
  };

  const handleAddManualEntry = async () => {
    if (!userId) {
      alert('User not authenticated. Please log in again.');
      return;
    }
    if (!taskId) {
      alert('Task ID is missing.');
      return;
    }
    
    try {
      const totalSeconds = (parseInt(manualEntry.hours || 0) * 3600) + (parseInt(manualEntry.minutes || 0) * 60);
      
      if (totalSeconds <= 0) {
        alert('Please enter a valid duration');
        return;
      }
      
      await tasksAPI.addTimeLog(parseInt(taskId), {
        userId: parseInt(userId),
        duration: totalSeconds,
        description: manualEntry.description || null,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      });
      
      setShowManualEntry(false);
      setManualEntry({ hours: '', minutes: '', description: '' });
      loadTimeLogs();
    } catch (error) {
      console.error('Error adding manual time log:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add time log';
      alert(errorMessage);
    }
  };

  const totalTime = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading time logs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Time Logs
          {totalTime > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({formatDuration(totalTime)} total)
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          + Add Manual Entry
        </button>
      </div>

      {showManualEntry && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Add Manual Time Entry</h4>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Hours"
                value={manualEntry.hours}
                onChange={(e) => setManualEntry(prev => ({ ...prev, hours: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="0"
              />
              <input
                type="number"
                placeholder="Minutes"
                value={manualEntry.minutes}
                onChange={(e) => setManualEntry(prev => ({ ...prev, minutes: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="0"
                max="59"
              />
            </div>
            <input
              type="text"
              placeholder="Description (optional)"
              value={manualEntry.description}
              onChange={(e) => setManualEntry(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddManualEntry}
                className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Add Entry
              </button>
              <button
                onClick={() => {
                  setShowManualEntry(false);
                  setManualEntry({ hours: '', minutes: '', description: '' });
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {timeLogs.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No time logs yet. Start the timer or add a manual entry.
        </div>
      ) : (
        <div className="space-y-2">
          {timeLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {editingLog === log.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editForm.duration}
                      onChange={(e) => setEditForm(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="HH:MM"
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => handleSaveEdit(log.id)}
                      className="px-3 py-1 bg-primary-500 text-white rounded text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingLog(null)}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description"
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatDuration(log.duration)}
                      </span>
                      {log.user && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          by {log.user.full_name || log.user.username}
                        </span>
                      )}
                    </div>
                    {log.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {log.description}
                      </div>
                    )}
                    {log.start_time && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {format(new Date(log.start_time), 'MMM dd, yyyy HH:mm')}
                        {log.end_time && ` - ${format(new Date(log.end_time), 'HH:mm')}`}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(log)}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeLogsList;

