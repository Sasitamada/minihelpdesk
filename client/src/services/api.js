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
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id, userId) => api.delete(`/tasks/${id}`, { data: { userId } }),
  bulkUpdate: (tasks) => api.put('/tasks/bulk/update', { tasks }),
  uploadAttachments: (id, formData) => api.post(`/tasks/${id}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteAttachment: (id, filename, userId) => api.delete(`/tasks/${id}/attachments/${filename}`, { data: { userId } }),
  addReminder: (id, data) => api.post(`/tasks/${id}/reminders`, data),
  getHistory: (id) => api.get(`/tasks/${id}/history`),
  // New endpoints for enhanced features
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
};

// Comments
export const commentsAPI = {
  getByTask: (taskId) => api.get(`/comments/task/${taskId}`),
  getById: (id) => api.get(`/comments/${id}`),
  create: (data) => api.post('/comments', data),
  update: (id, data) => api.put(`/comments/${id}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
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

export default api;
