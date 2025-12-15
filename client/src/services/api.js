import axios from 'axios';

// Ensure API URL always ends with /api
let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
if (!API_URL.endsWith('/api')) {
  API_URL = API_URL.endsWith('/') ? `${API_URL}api` : `${API_URL}/api`;
}

// Force log to console to verify correct URL is loaded
console.log('%c🚀 API Base URL:', 'color: green; font-weight: bold; font-size: 14px;', API_URL);
console.log('%c🚀 Server Port: 5001', 'color: green; font-weight: bold;');
console.log('%c✅ Client configured correctly!', 'color: green; font-weight: bold;');
if (API_URL.includes('5000')) {
  console.error('%c❌ ERROR: API URL is using port 5000! Should be 5001!', 'color: red; font-weight: bold; font-size: 16px;');
  console.error('%cPlease clear browser cache and hard refresh (Cmd+Shift+R)', 'color: red; font-weight: bold;');
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Workspaces
export const workspacesAPI = {
  getAll: () => api.get('/workspaces'),
  getById: (id) => api.get(`/workspaces/${id}`),
  create: (data) => api.post('/workspaces/open', data),
  update: (id, data) => api.put(`/workspaces/${id}`, data),
  delete: (id) => api.delete(`/workspaces/${id}`),
  getMembers: (id) => api.get(`/workspaces/${id}/members`),
  addMember: (id, data) => api.post(`/workspaces/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/workspaces/${id}/members/${userId}`),
  updateMemberRole: (id, userId, data) => api.put(`/workspaces/${id}/members/${userId}`, data),
};

// Projects
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getByWorkspace: (workspaceId) => api.get(`/projects/workspace/${workspaceId}`),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Tasks
export const tasksAPI = {
  getAll: async (params) => {
    const response = await api.get('/tasks', { params });
    // Handle both old format (array) and new format (object with data/pagination)
    if (Array.isArray(response.data)) {
      return { ...response, data: response.data };
    }
    return response; // New format already has data property
  },
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  patch: (id, data) => api.patch(`/tasks/${id}`, data), // PATCH for partial updates with optimistic concurrency
  delete: (id, userId) => api.delete(`/tasks/${id}`, { data: { userId } }),
  bulkUpdate: (tasks) => api.put('/tasks/bulk/update', { tasks }), // Legacy bulk update
  bulkPatch: (taskIds, updates) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
      return Promise.reject(new Error('User not authenticated'));
    }
    return api.patch('/tasks/bulk', { taskIds, updates, userId: user.id });
  }, // New bulk PATCH endpoint
  uploadAttachments: (id, formData) => api.post(`/tasks/${id}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteAttachment: (id, filename, userId) => api.delete(`/tasks/${id}/attachments/${filename}`, { data: { userId } }),
  addReminder: (id, data) => api.post(`/tasks/${id}/reminders`, data),
  getHistory: (id) => api.get(`/tasks/${id}/history`),
  // New endpoints for enhanced features
  getDependencies: (id) => api.get(`/tasks/${id}/dependencies`),
  addDependency: (id, dependencyTaskId) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return api.post(`/tasks/${id}/dependencies`, { dependencyTaskId, userId: user.id });
  },
  removeDependency: (id, dependencyTaskId) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return api.delete(`/tasks/${id}/dependencies/${dependencyTaskId}`, { data: { userId: user.id } });
  },
  getAssignees: (id) => api.get(`/tasks/${id}/assignees`),
  addAssignee: (id, userId) => api.post(`/tasks/${id}/assignees`, { userId }),
  removeAssignee: (id, userId) => api.delete(`/tasks/${id}/assignees/${userId}`),
  getWatchers: (id) => api.get(`/tasks/${id}/watchers`),
  addWatcher: (id, userId) => api.post(`/tasks/${id}/watchers`, { userId }),
  removeWatcher: (id, userId) => api.delete(`/tasks/${id}/watchers/${userId}`),
  getChecklists: (id) => api.get(`/tasks/${id}/checklists`),
  createChecklist: (id, data) => api.post(`/tasks/${id}/checklists`, data),
  updateChecklist: (id, checklistId, data) => api.put(`/tasks/${id}/checklists/${checklistId}`, data),
  deleteChecklist: (id, checklistId) => api.delete(`/tasks/${id}/checklists/${checklistId}`),
  // Time tracking
  getTimeLogs: (id) => api.get(`/tasks/${id}/time-logs`),
  addTimeLog: (id, data) => api.post(`/tasks/${id}/time-logs`, data),
  updateTimeLog: (id, logId, data) => api.patch(`/tasks/${id}/time-logs/${logId}`, data),
  deleteTimeLog: (id, logId) => api.delete(`/tasks/${id}/time-logs/${logId}`),
  getTimerStatus: (id, userId) => api.get(`/tasks/${id}/timer/status`, { params: { userId } }),
  startTimer: (id, data) => api.post(`/tasks/${id}/timer/start`, data),
  stopTimer: (id, data) => api.post(`/tasks/${id}/timer/stop`, data),
};

// Comments
export const commentsAPI = {
  getByTask: (taskId) => api.get(`/comments/task/${taskId}`),
  getById: (id) => api.get(`/comments/${id}`),
  getAssigned: (userId) => api.get(`/comments/assigned/${userId}`),
  create: (data) => api.post('/comments', data),
  update: (id, data) => api.put(`/comments/${id}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
};

// Notifications
export const notificationsAPI = {
  getByUser: (userId, unreadOnly = false) => api.get(`/notifications/user/${userId}`, { params: { unreadOnly } }),
  getUnreadCount: (userId) => api.get(`/notifications/user/${userId}/unread-count`),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: (userId) => api.patch(`/notifications/user/${userId}/read-all`),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Docs/Pages
export const docsAPI = {
  getByWorkspace: (workspaceId) => api.get(`/docs/workspace/${workspaceId}`),
  getById: (id) => api.get(`/docs/${id}`),
  create: (data) => api.post('/docs', data),
  update: (id, data) => api.put(`/docs/${id}`, data),
  delete: (id) => api.delete(`/docs/${id}`),
};

// Workspace Chat
export const workspaceChatAPI = {
  getMessages: (workspaceId) => api.get(`/workspace-chat/${workspaceId}`),
  sendMessage: (workspaceId, formData) => api.post(`/workspace-chat/${workspaceId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getAiSuggestion: (workspaceId, prompt) => api.post(`/workspace-chat/${workspaceId}/ai`, { prompt }),
};

// Spaces & Folders
export const spacesAPI = {
  getByWorkspace: (workspaceId) => api.get(`/spaces/workspace/${workspaceId}`),
  create: (data) => api.post('/spaces', data),
  update: (id, data) => api.put(`/spaces/${id}`, data),
  delete: (id) => api.delete(`/spaces/${id}`),
};

export const foldersAPI = {
  getBySpace: (spaceId) => api.get(`/folders/space/${spaceId}`),
  create: (data) => api.post('/folders', data),
  update: (id, data) => api.put(`/folders/${id}`, data),
  delete: (id) => api.delete(`/folders/${id}`),
};

// Lists (ClickUp-style hierarchy)
export const listsAPI = {
  getByWorkspace: (workspaceId) => api.get(`/lists/workspace/${workspaceId}`),
  getByFolder: (folderId) => api.get(`/lists/folder/${folderId}`),
  getBySpace: (spaceId) => api.get(`/lists/space/${spaceId}`),
  getById: (id) => api.get(`/lists/${id}`),
  create: (data) => api.post('/lists', data),
  update: (id, data) => api.put(`/lists/${id}`, data),
  delete: (id) => api.delete(`/lists/${id}`),
  reorder: (listOrders) => api.patch('/lists/reorder', { listOrders }),
};

// Integrations
export const integrationsAPI = {
  getByWorkspace: (workspaceId) => api.get(`/integrations/workspace/${workspaceId}`),
  connect: (data) => api.post('/integrations/connect', data),
  disconnect: (data) => api.post('/integrations/disconnect', data),
  sync: (id) => api.post(`/integrations/${id}/sync`),
  getLogs: (id) => api.get(`/integrations/${id}/logs`),
};

// Automations
export const automationsAPI = {
  getByWorkspace: (workspaceId) => api.get(`/automations/workspace/${workspaceId}`),
  getById: (id) => api.get(`/automations/${id}`),
  create: (data) => api.post('/automations', data),
  update: (id, data) => api.put(`/automations/${id}`, data),
  delete: (id) => api.delete(`/automations/${id}`),
  toggle: (id) => api.patch(`/automations/${id}/toggle`),
};

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// Users
export const usersAPI = {
  getById: (id) => api.get(`/users/${id}`),
  getAll: (params) => api.get('/users', { params }),
  update: (id, formData) => api.put(`/users/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

// Workspace Invitations
export const workspaceInvitationsAPI = {
  invite: (data) => api.post('/workspace-invitations/invite', data),
  accept: (token, data) => api.post(`/workspace-invitations/accept/${token}`, data),
  getByWorkspace: (workspaceId) => api.get(`/workspace-invitations/workspace/${workspaceId}`),
  cancel: (id) => api.delete(`/workspace-invitations/${id}`),
};

// Sharing
export const sharingAPI = {
  generate: (data) => api.post('/sharing/generate', data),
  getByToken: (token) => api.get(`/sharing/${token}`),
  getByResource: (type, id) => api.get(`/sharing/resource/${type}/${id}`),
  revoke: (token) => api.delete(`/sharing/${token}`),
};

// Time Logs
export const timeLogsAPI = {
  getByTask: (taskId) => api.get(`/time-logs/task/${taskId}`),
  getByUser: (userId, params) => api.get(`/time-logs/user/${userId}`, { params }),
  getReport: (params) => api.get('/time-logs/report', { params }),
  create: (data) => api.post('/time-logs', data),
  update: (id, data) => api.put(`/time-logs/${id}`, data),
  delete: (id) => api.delete(`/time-logs/${id}`),
};

// Reports
export const reportsAPI = {
  getDashboard: (params) => api.get('/reports/dashboard', { params }),
  getWorkload: (params) => api.get('/reports/workload', { params }),
  getActivity: (params) => api.get('/reports/activity', { params }),
  getSprint: (params) => api.get('/reports/sprint', { params }),
};

// Dashboard Widgets
export const dashboardWidgetsAPI = {
  getByUserWorkspace: (userId, workspaceId) => api.get(`/dashboard-widgets/user/${userId}/workspace/${workspaceId}`),
  create: (data) => api.post('/dashboard-widgets', data),
  update: (id, data) => api.put(`/dashboard-widgets/${id}`, data),
  reorder: (data) => api.patch('/dashboard-widgets/reorder', data),
  delete: (id) => api.delete(`/dashboard-widgets/${id}`),
};

// Search
export const searchAPI = {
  search: (params) => api.get('/search', { params }),
};

// Saved Searches
export const savedSearchesAPI = {
  getAll: (params) => api.get('/saved-searches', { params }),
  getById: (id, params) => api.get(`/saved-searches/${id}`, { params }),
  create: (data) => api.post('/saved-searches', data),
  update: (id, data) => api.patch(`/saved-searches/${id}`, data),
  delete: (id, params) => api.delete(`/saved-searches/${id}`, { params }),
};

// Activity
export const activityAPI = {
  search: (params) => api.get('/activity', { params }),
};

export default api;
