import React, { useState, useEffect } from 'react';
import { automationsAPI, usersAPI } from '../services/api';

const AutomationManager = ({ workspaceId }) => {
  const [automations, setAutomations] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    triggerType: 'task_created',
    triggerConditions: {},
    actionType: 'assign_user',
    actionData: {}
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAutomations();
    loadUsers();
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAutomations = async () => {
    try {
      const response = await automationsAPI.getByWorkspace(workspaceId);
      setAutomations(response.data || []);
    } catch (error) {
      console.error('Error loading automations:', error);
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

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert('Please enter an automation name');
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await automationsAPI.create({
        workspaceId,
        name: formData.name,
        triggerType: formData.triggerType,
        triggerConditions: formData.triggerConditions,
        actionType: formData.actionType,
        actionData: formData.actionData,
        createdBy: user.id
      });
      
      setShowCreateModal(false);
      setFormData({
        name: '',
        triggerType: 'task_created',
        triggerConditions: {},
        actionType: 'assign_user',
        actionData: {}
      });
      loadAutomations();
      alert('Automation created successfully!');
    } catch (error) {
      console.error('Error creating automation:', error);
      alert(error.response?.data?.message || 'Error creating automation');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (automationId, currentEnabled) => {
    try {
      await automationsAPI.toggle(automationId);
      loadAutomations();
    } catch (error) {
      console.error('Error toggling automation:', error);
    }
  };

  const handleDelete = async (automationId) => {
    if (!window.confirm('Are you sure you want to delete this automation?')) {
      return;
    }

    try {
      await automationsAPI.delete(automationId);
      loadAutomations();
    } catch (error) {
      console.error('Error deleting automation:', error);
    }
  };

  const getTriggerLabel = (type) => {
    const labels = {
      task_created: 'When task is created',
      status_changed: 'When status changes',
      due_date_close: 'When due date is close'
    };
    return labels[type] || type;
  };

  const getActionLabel = (type) => {
    const labels = {
      assign_user: 'Assign user',
      notify: 'Send notification',
      send_reminder: 'Send reminder'
    };
    return labels[type] || type;
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Automations</h2>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>
            Automate your workflow with triggers and actions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ➕ Create Automation
        </button>
      </div>

      {/* Automations List */}
      {automations.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#f7f8f9',
          borderRadius: '12px',
          color: '#6c757d'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a' }}>
            No automations yet
          </div>
          <div style={{ marginBottom: '24px' }}>
            Create your first automation to automate your workflow
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Automation
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {automations.map((automation) => (
            <div
              key={automation.id}
              style={{
                padding: '20px',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{automation.name}</h3>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: automation.enabled ? '#2ecc71' : '#6c757d',
                      color: 'white'
                    }}
                  >
                    {automation.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  <strong>{getTriggerLabel(automation.trigger_type)}</strong> → <strong>{getActionLabel(automation.action_type)}</strong>
                </div>
                {automation.action_data?.userId && (
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                    User: {users.find(u => u.id === automation.action_data.userId)?.full_name || automation.action_data.userId}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleToggle(automation.id, automation.enabled)}
                  style={{
                    padding: '6px 12px',
                    background: automation.enabled ? '#6c757d' : '#2ecc71',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {automation.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleDelete(automation.id)}
                  style={{
                    padding: '6px 12px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div className="modal-title">Create Automation</div>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Automation Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Auto-assign new tasks"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">When (Trigger)</label>
                <select
                  className="form-select"
                  value={formData.triggerType}
                  onChange={(e) => setFormData({ ...formData, triggerType: e.target.value })}
                >
                  <option value="task_created">When task is created</option>
                  <option value="status_changed">When status changes</option>
                  <option value="due_date_close">When due date is close</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Then (Action)</label>
                <select
                  className="form-select"
                  value={formData.actionType}
                  onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                >
                  <option value="assign_user">Assign user</option>
                  <option value="notify">Send notification</option>
                  <option value="send_reminder">Send reminder</option>
                </select>
              </div>

              {/* Action-specific fields */}
              {formData.actionType === 'assign_user' && (
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Assign to User</label>
                  <select
                    className="form-select"
                    value={formData.actionData.userId || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      actionData: { ...formData.actionData, userId: parseInt(e.target.value) }
                    })}
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.actionType === 'notify' && (
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Notify Users</label>
                  <select
                    className="form-select"
                    multiple
                    value={formData.actionData.userIds || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                      setFormData({
                        ...formData,
                        actionData: { ...formData.actionData, userIds: selected }
                      });
                    }}
                    style={{ minHeight: '100px' }}
                  >
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username} ({user.email})
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                    Hold Ctrl/Cmd to select multiple users
                  </p>
                </div>
              )}

              {formData.actionType === 'send_reminder' && (
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Hours Before Due Date</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.actionData.hoursBefore || 24}
                    onChange={(e) => setFormData({
                      ...formData,
                      actionData: { ...formData.actionData, hoursBefore: parseInt(e.target.value) }
                    })}
                    min="1"
                    max="168"
                  />
                  <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                    Send reminder this many hours before the due date (1-168 hours)
                  </p>
                </div>
              )}

              <div className="button-group" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleCreate}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Automation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationManager;

