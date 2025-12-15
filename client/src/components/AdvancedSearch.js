import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { searchAPI, savedSearchesAPI, usersAPI, workspacesAPI, activityAPI } from '../services/api';
import { format } from 'date-fns';

const AdvancedSearch = ({ isOpen, onClose, workspaceId }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState({ tasks: [], comments: [], lists: [] });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'activity'
  
  // Filter state
  const [filters, setFilters] = useState({
    status: [],
    priority: [],
    assignee: [],
    tags: [],
    dueDateFrom: '',
    dueDateTo: '',
    createdBy: '',
    createdDateFrom: '',
    createdDateTo: '',
    includeComments: false,
    eventType: [], // For activity search
    type: 'all' // 'all', 'tasks', 'comments', 'lists'
  });

  useEffect(() => {
    if (isOpen) {
      loadSavedSearches();
      loadUsers();
    }
  }, [isOpen, workspaceId]);

  const loadSavedSearches = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await savedSearchesAPI.getAll({
        userId: user.id,
        workspaceId
      });
      setSavedSearches(response.data);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    }
  };

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

  const handleSearch = async () => {
    if (activeTab === 'activity') {
      handleActivitySearch();
      return;
    }

    if (!searchQuery.trim() && !hasActiveFilters()) {
      return;
    }

    setLoading(true);
    try {
      const params = {
        q: searchQuery || undefined,
        workspaceId,
        ...filters,
        includeComments: filters.includeComments ? 'true' : 'false',
        status: filters.status.length > 0 ? filters.status : undefined,
        priority: filters.priority.length > 0 ? filters.priority : undefined,
        assignee: filters.assignee.length > 0 ? filters.assignee : undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined
      };

      // Remove undefined values
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await searchAPI.search(params);
      setResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  const handleActivitySearch = async () => {
    setLoading(true);
    try {
      const params = {
        workspaceId,
        search: searchQuery || undefined,
        userId: filters.createdBy || undefined,
        eventType: filters.eventType.length > 0 ? filters.eventType : undefined,
        dateFrom: filters.createdDateFrom || undefined,
        dateTo: filters.createdDateTo || undefined
      };

      // Remove undefined values
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await activityAPI.search(params);
      setActivities(response.data);
    } catch (error) {
      console.error('Activity search error:', error);
      alert('Failed to search activity');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = () => {
    return filters.status.length > 0 ||
           filters.priority.length > 0 ||
           filters.assignee.length > 0 ||
           filters.tags.length > 0 ||
           filters.dueDateFrom ||
           filters.dueDateTo ||
           filters.createdBy ||
           filters.createdDateFrom ||
           filters.createdDateTo ||
           filters.eventType.length > 0;
  };

  const handleSaveSearch = async () => {
    const name = prompt('Enter a name for this search:');
    if (!name) return;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await savedSearchesAPI.create({
        userId: user.id,
        workspaceId,
        name,
        queryText: searchQuery,
        filterConfig: filters,
        scope: workspaceId ? 'workspace' : 'global',
        scopeId: workspaceId
      });
      loadSavedSearches();
      alert('Search saved successfully!');
    } catch (error) {
      console.error('Error saving search:', error);
      alert('Failed to save search');
    }
  };

  const handleLoadSavedSearch = async (savedSearch) => {
    setSearchQuery(savedSearch.query_text || '');
    if (savedSearch.filter_config) {
      setFilters({
        ...filters,
        ...savedSearch.filter_config
      });
    }
    // Trigger search
    setTimeout(() => handleSearch(), 100);
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      assignee: [],
      tags: [],
      dueDateFrom: '',
      dueDateTo: '',
      createdBy: '',
      createdDateFrom: '',
      createdDateTo: '',
      includeComments: false,
      eventType: [],
      type: 'all'
    });
  };

  const handleTaskClick = (taskId) => {
    navigate(`/project/${taskId}`);
    onClose();
  };

  const handleCommentClick = (taskId) => {
    navigate(`/project/${taskId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced Search</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 px-4 py-2 text-center font-medium ${
                activeTab === 'search'
                  ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Search
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 px-4 py-2 text-center font-medium ${
                activeTab === 'activity'
                  ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Activity
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search tasks, comments, lists..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-lg ${
                  hasActiveFilters()
                    ? 'bg-primary-100 border-primary-500 text-primary-700 dark:bg-primary-900 dark:border-primary-400 dark:text-primary-300'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                Filters {hasActiveFilters() && '●'}
              </button>
            </div>

            {/* Active Filters */}
            {hasActiveFilters() && (
              <div className="flex flex-wrap gap-2 mt-3">
                {filters.status.map(s => (
                  <span key={s} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                    Status: {s}
                    <button onClick={() => setFilters({...filters, status: filters.status.filter(x => x !== s)})} className="ml-1">×</button>
                  </span>
                ))}
                {filters.priority.map(p => (
                  <span key={p} className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-sm">
                    Priority: {p}
                    <button onClick={() => setFilters({...filters, priority: filters.priority.filter(x => x !== p)})} className="ml-1">×</button>
                  </span>
                ))}
                {filters.assignee.map(a => {
                  const user = users.find(u => (u.id || u.user_id) == a);
                  return (
                    <span key={a} className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm">
                      Assignee: {user?.full_name || user?.username || a}
                      <button onClick={() => setFilters({...filters, assignee: filters.assignee.filter(x => x != a)})} className="ml-1">×</button>
                    </span>
                  );
                })}
                {filters.eventType.map(et => (
                  <span key={et} className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-sm">
                    Event: {et.replace('_', ' ')}
                    <button onClick={() => setFilters({...filters, eventType: filters.eventType.filter(x => x !== et)})} className="ml-1">×</button>
                  </span>
                ))}
                <button onClick={clearFilters} className="text-sm text-red-600 dark:text-red-400 hover:underline">
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-4 grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    {['todo', 'inprogress', 'done'].map(status => (
                      <label key={status} className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={filters.status.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({...filters, status: [...filters.status, status]});
                            } else {
                              setFilters({...filters, status: filters.status.filter(s => s !== status)});
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-900 dark:text-white capitalize">{status}</span>
                      </label>
                    ))}
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                    {['low', 'medium', 'high', 'urgent'].map(priority => (
                      <label key={priority} className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={filters.priority.includes(priority)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({...filters, priority: [...filters.priority, priority]});
                            } else {
                              setFilters({...filters, priority: filters.priority.filter(p => p !== priority)});
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-900 dark:text-white capitalize">{priority}</span>
                      </label>
                    ))}
                  </div>

                  {/* Assignee */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assignee</label>
                    <div className="max-h-32 overflow-y-auto">
                      {users.map(user => {
                        const userId = user.id || user.user_id;
                        return (
                          <label key={userId} className="flex items-center gap-2 mb-1">
                            <input
                              type="checkbox"
                              checked={filters.assignee.includes(String(userId))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilters({...filters, assignee: [...filters.assignee, String(userId)]});
                                } else {
                                  setFilters({...filters, assignee: filters.assignee.filter(a => a != userId)});
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {user.full_name || user.username}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={filters.dueDateFrom}
                      onChange={(e) => setFilters({...filters, dueDateFrom: e.target.value})}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm mb-2"
                      placeholder="From"
                    />
                    <input
                      type="date"
                      value={filters.dueDateTo}
                      onChange={(e) => setFilters({...filters, dueDateTo: e.target.value})}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
                      placeholder="To"
                    />
                  </div>

                  {/* Created By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Created By</label>
                    <select
                      value={filters.createdBy}
                      onChange={(e) => setFilters({...filters, createdBy: e.target.value})}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
                    >
                      <option value="">All users</option>
                      {users.map(user => {
                        const userId = user.id || user.user_id;
                        return (
                          <option key={userId} value={userId}>
                            {user.full_name || user.username}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Created Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Created Date</label>
                    <input
                      type="date"
                      value={filters.createdDateFrom}
                      onChange={(e) => setFilters({...filters, createdDateFrom: e.target.value})}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm mb-2"
                      placeholder="From"
                    />
                    <input
                      type="date"
                      value={filters.createdDateTo}
                      onChange={(e) => setFilters({...filters, createdDateTo: e.target.value})}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
                      placeholder="To"
                    />
                  </div>

                  {/* Include Comments */}
                  {activeTab === 'search' && (
                    <div className="col-span-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.includeComments}
                          onChange={(e) => setFilters({...filters, includeComments: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">Search in comments</span>
                      </label>
                    </div>
                  )}

                  {/* Event Type (for Activity) */}
                  {activeTab === 'activity' && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Type</label>
                      {['created', 'updated', 'status_changed', 'assigned', 'commented', 'time_logged', 'timer_started', 'timer_stopped'].map(eventType => (
                        <label key={eventType} className="flex items-center gap-2 mb-1">
                          <input
                            type="checkbox"
                            checked={filters.eventType.includes(eventType)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters({...filters, eventType: [...filters.eventType, eventType]});
                              } else {
                                setFilters({...filters, eventType: filters.eventType.filter(e => e !== eventType)});
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-900 dark:text-white capitalize">{eventType.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Searching...</div>
            ) : activeTab === 'activity' ? (
              /* Activity Results */
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Activity ({activities.length})
                </h3>
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No activity found. Try adjusting your filters.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activities.map(activity => (
                      <div
                        key={activity.id}
                        onClick={() => activity.taskId && handleTaskClick(activity.taskId)}
                        className={`p-3 bg-gray-50 dark:bg-gray-700 rounded-lg ${activity.taskId ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm">
                            {(activity.userName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900 dark:text-white">
                              <span className="font-semibold">{activity.userName || 'Unknown'}</span>{' '}
                              <span className="capitalize">{activity.action}</span>
                              {activity.taskTitle && (
                                <span className="text-primary-600 dark:text-primary-400">
                                  {' '}on {activity.taskTitle}
                                </span>
                              )}
                            </div>
                            {activity.fieldName && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {activity.fieldName}: {activity.oldValue} → {activity.newValue}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(activity.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Saved Searches */}
                {savedSearches.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Saved Searches</h3>
                    <div className="flex flex-wrap gap-2">
                      {savedSearches.map(search => (
                        <button
                          key={search.id}
                          onClick={() => handleLoadSavedSearch(search)}
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          {search.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks Results */}
                {results.tasks.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Tasks ({results.tasks.length})
                    </h3>
                    <div className="space-y-2">
                      {results.tasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => handleTaskClick(task.id)}
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">{task.title}</div>
                              {task.description && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                  {task.description.substring(0, 100)}...
                                </div>
                              )}
                              <div className="flex gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>#{task.id}</span>
                                <span className="capitalize">{task.status}</span>
                                <span className="capitalize">{task.priority}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments Results */}
                {results.comments.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Comments ({results.comments.length})
                    </h3>
                    <div className="space-y-2">
                      {results.comments.map(comment => (
                        <div
                          key={comment.id}
                          onClick={() => handleCommentClick(comment.task.id)}
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm">
                              {(comment.author.full_name || comment.author.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {comment.author.full_name || comment.author.username}
                              </div>
                              <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                {comment.content.substring(0, 150)}...
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                in task: {comment.task.title}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lists Results */}
                {results.lists.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Lists ({results.lists.length})
                    </h3>
                    <div className="space-y-2">
                      {results.lists.map(list => (
                        <div
                          key={list.id}
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="font-semibold text-gray-900 dark:text-white">{list.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {list.workspace_name} {list.space_name && `> ${list.space_name}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!loading && results.tasks.length === 0 && results.comments.length === 0 && results.lists.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No results found. Try adjusting your search or filters.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSaveSearch}
              disabled={!searchQuery && !hasActiveFilters()}
              className="px-4 py-2 text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save this search
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdvancedSearch;

