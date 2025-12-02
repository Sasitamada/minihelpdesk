import React, { useState, useEffect } from 'react';
import { integrationsAPI } from '../services/api';

const AVAILABLE_INTEGRATIONS = [
  {
    type: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync tasks and due dates to Google Calendar.',
    fields: [
      { key: 'calendarId', label: 'Calendar ID', placeholder: 'primary' },
    ],
  },
  {
    type: 'slack',
    name: 'Slack',
    description: 'Post task updates to a Slack channel.',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
      { key: 'channel', label: 'Channel', placeholder: '#tasks' },
    ],
  },
  {
    type: 'github',
    name: 'GitHub',
    description: 'Create GitHub issues from tasks.',
    fields: [
      { key: 'repo', label: 'Repository', placeholder: 'org/repo' },
      { key: 'token', label: 'Personal Access Token', placeholder: 'ghp_xxx', type: 'password' },
    ],
  },
  {
    type: 'zapier',
    name: 'Zapier',
    description: 'Trigger Zaps when tasks change.',
    fields: [
      { key: 'webhookUrl', label: 'Zapier Webhook URL', placeholder: 'https://hooks.zapier.com/...' },
    ],
  },
  {
    type: 'drive',
    name: 'Drive / Dropbox',
    description: 'Attach cloud files directly to tasks.',
    fields: [
      { key: 'folderId', label: 'Folder/Shared ID', placeholder: 'drive-folder-id' },
    ],
  },
];

const IntegrationsManager = ({ workspaceId }) => {
  const [integrations, setIntegrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState({});
  const [logs, setLogs] = useState({});

  useEffect(() => {
    if (workspaceId) {
      loadIntegrations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const response = await integrationsAPI.getByWorkspace(workspaceId);
      const map = {};
      response.data?.forEach((integration) => {
        map[integration.type] = integration;
      });
      setIntegrations(map);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (integrationId) => {
    try {
      if (!integrationId) return;
      const response = await integrationsAPI.getLogs(integrationId);
      setLogs((prev) => ({
        ...prev,
        [integrationId]: response.data || [],
      }));
    } catch (error) {
      console.error('Error loading integration logs:', error);
    }
  };

  const handleConnect = async (integration, settings) => {
    if (!workspaceId) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setConnecting((prev) => ({ ...prev, [integration.type]: true }));
    try {
      await integrationsAPI.connect({
        workspaceId,
        type: integration.type,
        settings,
        createdBy: user.id,
      });
      await loadIntegrations();
    } catch (error) {
      console.error('Error connecting integration:', error);
      alert(error.response?.data?.message || 'Failed to connect integration');
    } finally {
      setConnecting((prev) => ({ ...prev, [integration.type]: false }));
    }
  };

  const handleDisconnect = async (integrationType) => {
    if (!workspaceId) return;
    if (!window.confirm('Disconnect this integration?')) return;
    try {
      await integrationsAPI.disconnect({
        workspaceId,
        type: integrationType,
      });
      await loadIntegrations();
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      alert('Failed to disconnect integration');
    }
  };

  const handleSync = async (integrationId) => {
    try {
      await integrationsAPI.sync(integrationId);
      await loadIntegrations();
      loadLogs(integrationId);
    } catch (error) {
      console.error('Error syncing integration:', error);
      alert('Failed to sync integration');
    }
  };

  const renderFields = (integration) => {
    const current = integrations[integration.type];
    const settings = current?.settings || {};
    return integration.fields.map((field) => (
      <div key={`${integration.type}-${field.key}`} style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
          {field.label}
        </label>
        <input
          type={field.type || 'text'}
          className="form-input"
          placeholder={field.placeholder}
          defaultValue={settings[field.key] || ''}
          onChange={(e) => {
            setIntegrations((prev) => ({
              ...prev,
              [integration.type]: {
                ...(prev[integration.type] || {}),
                pendingSettings: {
                  ...(prev[integration.type]?.pendingSettings || {}),
                  [field.key]: e.target.value,
                },
              },
            }));
          }}
        />
      </div>
    ));
  };

  const getSettingsForConnect = (integrationType) => {
    const current = integrations[integrationType];
    if (current?.pendingSettings) return current.pendingSettings;
    return current?.settings || {};
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading integrations...</div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>Integrations</h2>
      <p style={{ color: '#6c757d', marginBottom: '24px' }}>
        Connect workspace-wide integrations. Each integration mirrors core ClickUp capabilities (Calendar Sync, Slack updates, GitHub issues, Zapier automations, and Drive/Dropbox attachments).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {AVAILABLE_INTEGRATIONS.map((integration) => {
          const current = integrations[integration.type];
          const status = current?.status || 'disconnected';
          const isConnected = status === 'connected';

          return (
            <div
              key={integration.type}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                padding: '20px',
                background: 'white',
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 280px' }}>
                <h3 style={{ marginBottom: '4px' }}>{integration.name}</h3>
                <p style={{ color: '#6c757d', marginBottom: '12px' }}>{integration.description}</p>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    background: isConnected ? '#e5f7ed' : '#f3f3f3',
                    color: isConnected ? '#1e8e3e' : '#6c757d',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isConnected ? '#1e8e3e' : '#adb5bd',
                    }}
                  ></span>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </div>
                {current?.last_synced_at && (
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                    Last synced: {new Date(current.last_synced_at).toLocaleString()}
                  </div>
                )}
              </div>

              <div style={{ flex: '1 1 320px' }}>
                {renderFields(integration)}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {!isConnected ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleConnect(integration, getSettingsForConnect(integration.type))}
                      disabled={connecting[integration.type]}
                    >
                      {connecting[integration.type] ? 'Connecting…' : 'Connect'}
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleSync(current.id)}
                      >
                        Sync Now
                      </button>
                      <button
                        className="btn btn-tertiary"
                        onClick={() => handleDisconnect(integration.type)}
                      >
                        Disconnect
                      </button>
                      <button
                        className="btn btn-tertiary"
                        onClick={() => loadLogs(current.id)}
                      >
                        View Logs
                      </button>
                    </>
                  )}
                </div>
              </div>

              {logs[current?.id]?.length > 0 && (
                <div style={{ flexBasis: '100%' }}>
                  <div
                    style={{
                      marginTop: '12px',
                      border: '1px solid #f1f1f1',
                      borderRadius: '8px',
                      background: '#fafafa',
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}
                  >
                    {logs[current.id].map((log) => (
                      <div
                        key={log.id}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid #f1f1f1',
                          fontSize: '13px',
                        }}
                      >
                        <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>{log.level}</div>
                        <div>{log.message}</div>
                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IntegrationsManager;

