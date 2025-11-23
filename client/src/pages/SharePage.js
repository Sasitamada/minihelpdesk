import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sharingAPI } from '../services/api';
import EnhancedTaskModal from '../components/EnhancedTaskModal';

const SharePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState(null);
  const [link, setLink] = useState(null);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    loadShareResource();
  }, [token]);

  const loadShareResource = async () => {
    try {
      const response = await sharingAPI.getByToken(token);
      setLink(response.data.link);
      setResource(response.data.resource);
    } catch (error) {
      setError(error.response?.data?.message || 'Share link not found or expired');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ color: '#dc3545', marginBottom: '16px' }}>Error</h2>
        <p style={{ color: '#6c757d', marginBottom: '24px' }}>{error}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            background: '#6b5ce6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Go to Home
        </button>
      </div>
    );
  }

  if (!resource) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p>Resource not found</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            background: '#f7f8f9',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          ← Back to Home
        </button>
        <div style={{
          padding: '12px',
          background: '#e8ecff',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#6b5ce6'
        }}>
          🔗 Shared via link • {link.access_level} access
        </div>
      </div>

      {link.resource_type === 'task' && (
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
            {resource.title}
          </h1>
          <button
            onClick={() => setSelectedTask(resource)}
            style={{
              padding: '10px 20px',
              background: '#6b5ce6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '24px'
            }}
          >
            View Full Task Details
          </button>
          <div style={{
            padding: '24px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <strong>Status:</strong> {resource.status}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <strong>Priority:</strong> {resource.priority}
            </div>
            {resource.description && (
              <div style={{ marginBottom: '16px' }}>
                <strong>Description:</strong>
                <div dangerouslySetInnerHTML={{ __html: resource.description }} />
              </div>
            )}
            {resource.due_date && (
              <div>
                <strong>Due Date:</strong> {new Date(resource.due_date).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}

      {link.resource_type === 'project' && (
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px' }}>
            {resource.name}
          </h1>
          {resource.description && (
            <p style={{ color: '#6c757d', marginBottom: '24px' }}>{resource.description}</p>
          )}
          <div style={{
            padding: '24px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <p>Project shared via link. Access level: {link.access_level}</p>
            {link.access_level === 'edit' && (
              <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '8px' }}>
                You have edit access to this project.
              </p>
            )}
          </div>
        </div>
      )}

      {selectedTask && (
        <EnhancedTaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={async () => {
            await loadShareResource();
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
};

export default SharePage;

