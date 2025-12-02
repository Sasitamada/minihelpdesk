import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { commentsAPI, tasksAPI, usersAPI } from '../services/api';
import RichTextComment from './RichTextComment';
import useSocket from '../hooks/useSocket';

const TaskModal = ({ task, onClose, onSave, onDelete, project }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    assignedTo: null,
    tags: []
  });

  const [subtasks, setSubtasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [newTag, setNewTag] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [reminderDate, setReminderDate] = useState('');
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const { socket } = useSocket();

  useEffect(() => {
    if (task) {
      const tags = task.tags ? (Array.isArray(task.tags) ? task.tags : JSON.parse(task.tags)) : [];
      const taskSubtasks = task.subtasks ? (Array.isArray(task.subtasks) ? task.subtasks : JSON.parse(task.subtasks)) : [];
      const taskAttachments = task.attachments ? (Array.isArray(task.attachments) ? task.attachments : JSON.parse(task.attachments)) : [];
      
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
        assignedTo: task.assigned_to || null,
        tags: tags
      });
      setSubtasks(taskSubtasks);
      setAttachments(taskAttachments);
      loadTaskDetails();
      loadComments();
      
      // Join task room for real-time updates
      if (socket && task.id) {
        socket.emit('join-task', task.id);
      }
    }
    loadUsers();
    
    return () => {
      if (socket && task?.id) {
        socket.emit('leave-task', task.id);
      }
    };
  }, [task, socket]);
  
  // Listen for real-time comment updates
  useEffect(() => {
    if (!socket || !task?.id) return;
    
    const handleNewComment = (comment) => {
      setComments(prev => [comment, ...prev]);
    };
    
    socket.on('new-comment', handleNewComment);
    
    return () => {
      socket.off('new-comment', handleNewComment);
    };
  }, [socket, task]);

  const loadTaskDetails = async () => {
    if (task?.id) {
      try {
        const response = await tasksAPI.getById(task.id);
        setTaskHistory(response.data.history || []);
        setReminders(response.data.reminders || []);
      } catch (error) {
        console.error('Error loading task details:', error);
      }
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadComments = async () => {
    if (task?.id) {
      try {
        const response = await commentsAPI.getByTask(task.id);
        setComments(response.data);
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    }
  };

  const handleSubmit = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    onSave({
      ...formData,
      subtasks,
      tags: formData.tags,
      userId: user.id
    });
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, { title: newSubtask, completed: false }]);
      setNewSubtask('');
    }
  };

  const handleToggleSubtask = (index) => {
    const updated = [...subtasks];
    updated[index].completed = !updated[index].completed;
    setSubtasks(updated);
  };

  const handleDeleteSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (files.length === 0 || !task?.id) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));
    formData.append('userId', user.id);

    try {
      const response = await tasksAPI.uploadAttachments(task.id, formData);
      setAttachments(response.data.attachments || []);
      loadTaskDetails();
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files');
    }
  };

  const handleDeleteAttachment = async (filename) => {
    if (!task?.id) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const response = await tasksAPI.deleteAttachment(task.id, filename, user.id);
      setAttachments(response.data.attachments || []);
      loadTaskDetails();
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  const handleAddReminder = async () => {
    if (!reminderDate || !task?.id) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      await tasksAPI.addReminder(task.id, {
        reminderDate: new Date(reminderDate).toISOString(),
        userId: user.id
      });
      setReminderDate('');
      loadTaskDetails();
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  };

  const handleAddComment = async (content) => {
    if (content.trim() && task?.id) {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        await commentsAPI.create({
          content: content,
          task: task.id,
          author: user.id
        });
        // Comment will be added via WebSocket
      } catch (error) {
        console.error('Error adding comment:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#6c757d',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545'
    };
    return colors[priority] || colors.medium;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {task ? 'Edit Task' : 'Create New Task'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('details')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'details' ? '2px solid #6b5ce6' : '2px solid transparent',
              color: activeTab === 'details' ? '#6b5ce6' : '#6c757d',
              cursor: 'pointer',
              fontWeight: activeTab === 'details' ? '600' : '400'
            }}
          >
            Details
          </button>
          {task && (
            <>
              <button
                onClick={() => setActiveTab('comments')}
                style={{
                  padding: '12px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'comments' ? '2px solid #6b5ce6' : '2px solid transparent',
                  color: activeTab === 'comments' ? '#6b5ce6' : '#6c757d',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'comments' ? '600' : '400'
                }}
              >
                Comments ({comments.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                style={{
                  padding: '12px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'history' ? '2px solid #6b5ce6' : '2px solid transparent',
                  color: activeTab === 'history' ? '#6b5ce6' : '#6c757d',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'history' ? '600' : '400'
                }}
              >
                History
              </button>
            </>
          )}
        </div>

          <div className="overflow-y-auto flex-1 p-6">
          {activeTab === 'details' && (
            <>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows="4"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter task description"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="todo">To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select
                    className="form-select"
                    value={formData.assignedTo || ''}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value ? parseInt(e.target.value) : null })}
                  >
                    <option value="">Unassigned</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.full_name || user.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div className="form-group">
                <label className="form-label">Tags</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {formData.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: '#6b5ce6',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px' }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tag (e.g., bug, UI, backend)"
                  />
                  <button className="btn btn-secondary" onClick={handleAddTag}>Add</button>
                </div>
              </div>

              {/* Subtasks */}
              <div className="form-group">
                <label className="form-label">Subtasks</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                    placeholder="Add subtask"
                  />
                  <button className="btn btn-secondary" onClick={handleAddSubtask}>Add</button>
                </div>
                {subtasks.map((subtask, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '8px',
                    background: '#f7f8f9',
                    borderRadius: '4px',
                    marginBottom: '4px'
                  }}>
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={() => handleToggleSubtask(index)}
                    />
                    <span style={{ flex: 1, textDecoration: subtask.completed ? 'line-through' : 'none' }}>
                      {subtask.title}
                    </span>
                    <button 
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => handleDeleteSubtask(index)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              {/* Attachments */}
              <div className="form-group">
                <label className="form-label">Attachments</label>
                {task?.id && (
                  <>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      style={{ marginBottom: '12px' }}
                    />
                    {attachments.map((att, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px',
                        background: '#f7f8f9',
                        borderRadius: '4px',
                        marginBottom: '4px'
                      }}>
                        <span style={{ flex: 1 }}>{att.filename}</span>
                        <a href={`http://localhost:5001${att.path}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px' }}>View</a>
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => handleDeleteAttachment(att.filename)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Reminders */}
              {task?.id && (
                <div className="form-group">
                  <label className="form-label">Reminders</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                    />
                    <button className="btn btn-secondary" onClick={handleAddReminder}>Add Reminder</button>
                  </div>
                  {reminders.map((reminder, idx) => (
                    <div key={idx} style={{ 
                      padding: '8px',
                      background: '#f7f8f9',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      fontSize: '12px'
                    }}>
                      {formatDate(reminder.reminder_date)}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'comments' && task && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {comments.map((comment, idx) => (
                    <motion.div
                      key={comment.id || comment._id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {comment.author?.avatar ? (
                          <img 
                            src={`http://localhost:5001${comment.author.avatar}`} 
                            alt={comment.author.username} 
                            className="w-6 h-6 rounded-full" 
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs">
                            {(comment.author?.full_name || comment.author?.username || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {comment.author?.full_name || comment.author?.username || 'User'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <div 
                        className="text-sm text-gray-900 dark:text-gray-100"
                        dangerouslySetInnerHTML={{ __html: comment.content }}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <RichTextComment 
                taskId={task.id} 
                onSave={handleAddComment}
                placeholder="Add a comment... Use @ to mention someone"
              />
            </div>
          )}

          {activeTab === 'history' && task && (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {taskHistory.length === 0 ? (
                <p style={{ color: '#6c757d', textAlign: 'center', padding: '40px' }}>No history available</p>
              ) : (
                taskHistory.map((entry, idx) => (
                  <div key={idx} style={{ 
                    padding: '12px',
                    background: '#f7f8f9',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                      {entry.username || entry.full_name || 'User'} {entry.action} {entry.field_name || 'task'} - {formatDate(entry.created_at)}
                    </div>
                    {entry.old_value && (
                      <div style={{ fontSize: '11px', color: '#dc3545' }}>
                        From: {typeof entry.old_value === 'string' ? entry.old_value : JSON.parse(entry.old_value)}
                      </div>
                    )}
                    {entry.new_value && (
                      <div style={{ fontSize: '11px', color: '#28a745' }}>
                        To: {typeof entry.new_value === 'string' ? entry.new_value : JSON.parse(entry.new_value)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 px-6 pb-6">
            <div>
              {task && onDelete && (
                <button
                  className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                  onClick={onDelete}
                >
                  Delete Task
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                onClick={handleSubmit}
              >
                {task ? 'Update' : 'Create'} Task
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TaskModal;
