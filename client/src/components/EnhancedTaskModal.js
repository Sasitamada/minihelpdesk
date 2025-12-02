import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { commentsAPI, tasksAPI, usersAPI } from '../services/api';
import RichTextComment from './RichTextComment';
import ShareModal from './ShareModal';
import useSocket from '../hooks/useSocket';

const EnhancedTaskModal = ({ task, onClose, onSave, onDelete, project }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    tags: []
  });

  const [assignees, setAssignees] = useState([]);
  const [watchers, setWatchers] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [users, setUsers] = useState([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showWatcherDropdown, setShowWatcherDropdown] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [newTag, setNewTag] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [description, setDescription] = useState('');
  const [checklistItems, setChecklistItems] = useState({});
  const [showShareModal, setShowShareModal] = useState(false);
  const { socket } = useSocket();
  const quillRef = useRef(null);

  useEffect(() => {
    if (task) {
      const tags = task.tags ? (Array.isArray(task.tags) ? task.tags : JSON.parse(task.tags)) : [];
      const taskSubtasks = task.subtasks ? (Array.isArray(task.subtasks) ? task.subtasks : JSON.parse(task.subtasks)) : [];
      const taskAttachments = task.attachments ? (Array.isArray(task.attachments) ? task.attachments : JSON.parse(task.attachments)) : [];
      const taskCustomFields = task.custom_fields ? (Array.isArray(task.custom_fields) ? task.custom_fields : JSON.parse(task.custom_fields || '[]')) : [];
      
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
        tags: tags
      });
      setDescription(task.description || '');
      setSubtasks(taskSubtasks);
      setAttachments(taskAttachments);
      setCustomFields(taskCustomFields);
      loadTaskDetails();
      loadComments();
      loadAssignees();
      loadWatchers();
      loadChecklists();
      
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, socket]);

  useEffect(() => {
    if (!socket || !task?.id) return;
    
    const handleNewComment = (comment) => {
      setComments(prev => [comment, ...prev]);
    };

    const handleTaskUpdate = (data) => {
      if (data.taskId === task.id) {
        // Reload task data
        loadTaskDetails();
        loadAssignees();
        loadWatchers();
        loadChecklists();
        // Update form data if needed
        if (data.task) {
          setFormData(prev => ({
            ...prev,
            title: data.task.title || prev.title,
            status: data.task.status || prev.status,
            priority: data.task.priority || prev.priority
          }));
        }
      }
    };

    const handleMention = (data) => {
      // Show notification for mentions
      if (data.taskId === task.id) {
        alert(`You were mentioned in a comment on this task!`);
      }
    };
    
    socket.on('new-comment', handleNewComment);
    socket.on('task-updated', handleTaskUpdate);
    socket.on('mention', handleMention);
    
    return () => {
      socket.off('new-comment', handleNewComment);
      socket.off('task-updated', handleTaskUpdate);
      socket.off('mention', handleMention);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const loadAssignees = async () => {
    if (task?.id) {
      try {
        const response = await tasksAPI.getAssignees(task.id);
        setAssignees(response.data || []);
      } catch (error) {
        console.error('Error loading assignees:', error);
      }
    }
  };

  const loadWatchers = async () => {
    if (task?.id) {
      try {
        const response = await tasksAPI.getWatchers(task.id);
        setWatchers(response.data || []);
      } catch (error) {
        console.error('Error loading watchers:', error);
      }
    }
  };

  const loadChecklists = async () => {
    if (task?.id) {
      try {
        const response = await tasksAPI.getChecklists(task.id);
        setChecklists(response.data || []);
      } catch (error) {
        console.error('Error loading checklists:', error);
      }
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

  const handleSubmit = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    await onSave({
      ...formData,
      description,
      subtasks,
      tags: formData.tags,
      assignees: assignees.map(a => a.user_id || a.id),
      customFields,
      userId: user.id
    });
  };

  const handleAddAssignee = async (userId) => {
    if (task?.id) {
      try {
        await tasksAPI.addAssignee(task.id, userId);
        loadAssignees();
        setShowAssigneeDropdown(false);
      } catch (error) {
        console.error('Error adding assignee:', error);
      }
    }
  };

  const handleRemoveAssignee = async (userId) => {
    if (task?.id) {
      try {
        await tasksAPI.removeAssignee(task.id, userId);
        loadAssignees();
      } catch (error) {
        console.error('Error removing assignee:', error);
      }
    }
  };

  const handleAddWatcher = async (userId) => {
    if (task?.id) {
      try {
        await tasksAPI.addWatcher(task.id, userId);
        loadWatchers();
        setShowWatcherDropdown(false);
      } catch (error) {
        console.error('Error adding watcher:', error);
      }
    }
  };

  const handleRemoveWatcher = async (userId) => {
    if (task?.id) {
      try {
        await tasksAPI.removeWatcher(task.id, userId);
        loadWatchers();
      } catch (error) {
        console.error('Error removing watcher:', error);
      }
    }
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

  const handleAddChecklist = async () => {
    if (newChecklistName.trim() && task?.id) {
      try {
        await tasksAPI.createChecklist(task.id, { name: newChecklistName.trim(), items: [] });
        setNewChecklistName('');
        loadChecklists();
      } catch (error) {
        console.error('Error creating checklist:', error);
      }
    }
  };

  const handleUpdateChecklist = async (checklistId, items) => {
    if (task?.id) {
      try {
        await tasksAPI.updateChecklist(task.id, checklistId, { items });
        loadChecklists();
      } catch (error) {
        console.error('Error updating checklist:', error);
      }
    }
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
      } catch (error) {
        console.error('Error adding comment:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'blockquote', 'code-block'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'blockquote', 'code-block'
  ];

  const availableUsers = users.filter(u => 
    !assignees.some(a => (a.user_id || a.id) === u.id)
  );

  const availableWatchers = users.filter(u => 
    !watchers.some(w => (w.user_id || w.id) === u.id)
  );

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
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="text"
                  className="text-2xl font-bold bg-transparent border-none outline-none flex-1 text-gray-900 dark:text-white"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Task Title"
                />
                {task?.id && (
                  <button
                    onClick={() => setShowShareModal(true)}
                    style={{
                      padding: '8px 16px',
                      background: '#6b5ce6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Share task"
                  >
                    🔗 Share
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="todo">To Do</option>
                  <option value="inprogress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <select
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                {formData.dueDate && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Due: {new Date(formData.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none ml-4"
            >
              ×
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description - Rich Text Editor */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Description</h3>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={description}
                      onChange={setDescription}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="Add a description..."
                      className="min-h-[200px]"
                    />
                  </div>
                </div>

                {/* Subtasks */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Subtasks</h3>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                      placeholder="Add subtask"
                    />
                    <button
                      onClick={handleAddSubtask}
                      className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                    >
                      Add
                    </button>
                  </div>
                  {subtasks.map((subtask, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={() => handleToggleSubtask(index)}
                        className="w-4 h-4"
                      />
                      <span className={`flex-1 ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        {subtask.title}
                      </span>
                      <button
                        onClick={() => handleDeleteSubtask(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Checklists */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Checklists</h3>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={newChecklistName}
                      onChange={(e) => setNewChecklistName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddChecklist()}
                      placeholder="Add checklist name"
                    />
                    <button
                      onClick={handleAddChecklist}
                      className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                    >
                      Add
                    </button>
                  </div>
                  {checklists.map((checklist) => {
                    const items = Array.isArray(checklist.items) ? checklist.items : (checklist.items ? JSON.parse(checklist.items) : []);
                    const newItem = checklistItems[checklist.id] || '';
                    return (
                      <div key={checklist.id} className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <h4 className="font-medium mb-2 text-gray-900 dark:text-white">{checklist.name}</h4>
                        {items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 mb-1">
                            <input
                              type="checkbox"
                              checked={item.completed || false}
                              onChange={() => {
                                const updated = [...items];
                                updated[idx].completed = !updated[idx].completed;
                                handleUpdateChecklist(checklist.id, updated);
                              }}
                              className="w-4 h-4"
                            />
                            <span className={item.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}>
                              {item.title}
                            </span>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            value={newItem}
                            onChange={(e) => setChecklistItems({ ...checklistItems, [checklist.id]: e.target.value })}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && newItem.trim()) {
                                const updated = [...items, { title: newItem.trim(), completed: false }];
                                handleUpdateChecklist(checklist.id, updated);
                                setChecklistItems({ ...checklistItems, [checklist.id]: '' });
                              }
                            }}
                            placeholder="Add item"
                          />
                          <button
                            onClick={() => {
                              if (newItem.trim()) {
                                const updated = [...items, { title: newItem.trim(), completed: false }];
                                handleUpdateChecklist(checklist.id, updated);
                                setChecklistItems({ ...checklistItems, [checklist.id]: '' });
                              }
                            }}
                            className="px-3 py-1 bg-primary-500 text-white rounded text-sm hover:bg-primary-600"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Attachments */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Attachments</h3>
                  {task?.id && (
                    <>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="mb-3"
                      />
                      {attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded mb-2">
                          <a
                            href={`http://localhost:5001${att.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-500 hover:underline"
                          >
                            {att.filename}
                          </a>
                          <button
                            onClick={() => handleDeleteAttachment(att.filename)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Comments */}
                {task && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Comments ({comments.length})</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                      {comments.map((comment, idx) => (
                        <div key={comment.id || idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {comment.author?.full_name || comment.author?.username || 'User'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <div
                            className="text-sm text-gray-900 dark:text-gray-100"
                            dangerouslySetInnerHTML={{ __html: comment.content }}
                          />
                        </div>
                      ))}
                    </div>
                    <RichTextComment
                      taskId={task.id}
                      onSave={handleAddComment}
                      placeholder="Add a comment..."
                    />
                  </div>
                )}

                {/* Activity Log */}
                {task && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Activity</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {taskHistory.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No activity yet</p>
                      ) : (
                        taskHistory.map((entry, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                            <div className="text-gray-600 dark:text-gray-400">
                              <strong>{entry.username || entry.full_name || 'User'}</strong> {entry.action}
                              {entry.field_name && ` ${entry.field_name}`}
                              <span className="text-xs ml-2">{formatDate(entry.created_at)}</span>
                            </div>
                            {entry.old_value && (
                              <div className="text-red-600 dark:text-red-400 mt-1">
                                From: {typeof entry.old_value === 'string' ? entry.old_value : JSON.stringify(entry.old_value)}
                              </div>
                            )}
                            {entry.new_value && (
                              <div className="text-green-600 dark:text-green-400 mt-1">
                                To: {typeof entry.new_value === 'string' ? entry.new_value : JSON.stringify(entry.new_value)}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-4">
                {/* Assignees */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Assignees</h3>
                    <div className="relative">
                      <button
                        onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                        className="text-primary-500 hover:text-primary-700 text-sm"
                      >
                        + Add
                      </button>
                      {showAssigneeDropdown && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-10 max-h-60 overflow-y-auto">
                          {availableUsers.map(user => (
                            <button
                              key={user.id}
                              onClick={() => handleAddAssignee(user.id)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                            >
                              {user.avatar ? (
                                <img src={`http://localhost:5001${user.avatar}`} alt={user.username} className="w-6 h-6 rounded-full" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs">
                                  {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm">{user.full_name || user.username}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {assignees.map(assignee => {
                    const user = users.find(u => u.id === (assignee.user_id || assignee.id));
                    if (!user) return null;
                    return (
                      <div key={assignee.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded mb-1">
                        <div className="flex items-center gap-2">
                          {user.avatar ? (
                                <img src={`http://localhost:5001${user.avatar}`} alt={user.username} className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs">
                              {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm text-gray-900 dark:text-white">{user.full_name || user.username}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveAssignee(user.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Watchers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Watchers</h3>
                    <div className="relative">
                      <button
                        onClick={() => setShowWatcherDropdown(!showWatcherDropdown)}
                        className="text-primary-500 hover:text-primary-700 text-sm"
                      >
                        + Add
                      </button>
                      {showWatcherDropdown && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-10 max-h-60 overflow-y-auto">
                          {availableWatchers.map(user => (
                            <button
                              key={user.id}
                              onClick={() => handleAddWatcher(user.id)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                            >
                              {user.avatar ? (
                                <img src={`http://localhost:5001${user.avatar}`} alt={user.username} className="w-6 h-6 rounded-full" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs">
                                  {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm">{user.full_name || user.username}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {watchers.map(watcher => {
                    const user = users.find(u => u.id === (watcher.user_id || watcher.id));
                    if (!user) return null;
                    return (
                      <div key={watcher.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded mb-1">
                        <div className="flex items-center gap-2">
                          {user.avatar ? (
                                <img src={`http://localhost:5001${user.avatar}`} alt={user.username} className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs">
                              {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm text-gray-900 dark:text-white">{user.full_name || user.username}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveWatcher(user.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Due Date */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Due Date</h3>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>

                {/* Tags */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Tags</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-primary-500 text-white rounded text-xs flex items-center gap-1"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add tag"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-3 py-1 bg-primary-500 text-white rounded text-sm hover:bg-primary-600"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Reminders */}
                {task?.id && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Reminders</h3>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="datetime-local"
                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                      />
                      <button
                        onClick={handleAddReminder}
                        className="px-3 py-1 bg-primary-500 text-white rounded text-sm hover:bg-primary-600"
                      >
                        Add
                      </button>
                    </div>
                    {reminders.map((reminder, idx) => (
                      <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs mb-1">
                        {formatDate(reminder.reminder_date)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Fields */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Custom Fields</h3>
                  {customFields.map((field, idx) => (
                    <div key={idx} className="mb-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400">{field.name}</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        value={field.value || ''}
                        onChange={(e) => {
                          const updated = [...customFields];
                          updated[idx].value = e.target.value;
                          setCustomFields(updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
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
                {task ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Share Modal */}
      {showShareModal && task?.id && (
        <ShareModal
          resourceType="task"
          resourceId={task.id}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </AnimatePresence>
  );
};

export default EnhancedTaskModal;

