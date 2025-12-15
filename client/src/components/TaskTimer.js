import React, { useState, useEffect, useRef } from 'react';
import { tasksAPI } from '../services/api';
import { format } from 'date-fns';

const TaskTimer = ({ taskId, userId, onTimeUpdate }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [timerLogId, setTimerLogId] = useState(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Check for existing timer on mount
    if (taskId && userId) {
      checkTimerStatus();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [taskId, userId]);

  const checkTimerStatus = async () => {
    if (!userId || !taskId) return;
    try {
      const response = await tasksAPI.getTimerStatus(parseInt(taskId), parseInt(userId));
      if (response.data.active) {
        setIsRunning(true);
        setStartTime(new Date(response.data.startTime));
        setElapsed(response.data.elapsed);
        setTimerLogId(response.data.logId);
        startInterval(response.data.startTime);
      }
    } catch (error) {
      console.error('Error checking timer status:', error);
    }
  };

  const startInterval = (start) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      const now = new Date();
      const elapsedSeconds = Math.floor((now - new Date(start)) / 1000);
      setElapsed(elapsedSeconds);
      if (onTimeUpdate) {
        onTimeUpdate(elapsedSeconds);
      }
    }, 1000);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!userId) {
      alert('User not authenticated. Please log in again.');
      return;
    }
    if (!taskId) {
      alert('Task ID is missing.');
      return;
    }
    
    try {
      setLoading(true);
      const response = await tasksAPI.startTimer(parseInt(taskId), { userId: parseInt(userId) });
      setIsRunning(true);
      setStartTime(new Date(response.data.start_time));
      setTimerLogId(response.data.id);
      setElapsed(0);
      startInterval(response.data.start_time);
    } catch (error) {
      console.error('Error starting timer:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to start timer';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!userId || !taskId) {
      alert('User or task ID is missing.');
      return;
    }
    
    try {
      setLoading(true);
      const response = await tasksAPI.stopTimer(parseInt(taskId), { userId: parseInt(userId) });
      setIsRunning(false);
      setStartTime(null);
      setTimerLogId(null);
      setElapsed(0);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (onTimeUpdate) {
        onTimeUpdate(0);
      }
      
      // Reload time logs if callback provided
      if (onTimeUpdate) {
        setTimeout(() => {
          window.location.reload(); // Simple reload, or use a callback
        }, 500);
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to stop timer';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Time Tracker</h3>
        {isRunning && (
          <span className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Running
          </span>
        )}
      </div>
      
      <div className="text-center mb-4">
        <div className="text-4xl font-mono font-bold text-primary-600 dark:text-primary-400 mb-2">
          {formatTime(elapsed)}
        </div>
        {startTime && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Started: {format(new Date(startTime), 'MMM dd, yyyy HH:mm')}
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Starting...' : '▶ Start Timer'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Stopping...' : '⏹ Stop Timer'}
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskTimer;

