import React, { useState, useEffect } from 'react';
import { sharingAPI } from '../services/api';

const ShareModal = ({ resourceType, resourceId, onClose }) => {
  const [links, setLinks] = useState([]);
  const [expiresIn, setExpiresIn] = useState('7'); // days
  const [accessLevel, setAccessLevel] = useState('view');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLinks();
  }, [resourceType, resourceId]);

  const loadLinks = async () => {
    try {
      const response = await sharingAPI.getByResource(resourceType, resourceId);
      setLinks(response.data || []);
    } catch (error) {
      console.error('Error loading share links:', error);
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await sharingAPI.generate({
        resourceType,
        resourceId,
        expiresIn: parseInt(expiresIn),
        accessLevel,
        userId: user.id
      });
      await loadLinks();
      setExpiresIn('7');
      setAccessLevel('view');
    } catch (error) {
      console.error('Error generating link:', error);
      alert('Error generating share link');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeLink = async (token) => {
    if (!window.confirm('Are you sure you want to revoke this share link?')) return;
    
    try {
      await sharingAPI.revoke(token);
      await loadLinks();
    } catch (error) {
      console.error('Error revoking link:', error);
      alert('Error revoking share link');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div className="modal-title">Share {resourceType === 'task' ? 'Task' : 'Project'}</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ padding: '24px' }}>
          {/* Generate New Link */}
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f7f8f9', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Create Share Link</h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Expires In (days)
              </label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="form-select"
                style={{ width: '100%' }}
              >
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="">Never</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Access Level
              </label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                className="form-select"
                style={{ width: '100%' }}
              >
                <option value="view">View Only</option>
                <option value="comment">Can Comment</option>
                <option value="edit">Can Edit</option>
              </select>
            </div>

            <button
              onClick={handleGenerateLink}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? 'Generating...' : 'Generate Share Link'}
            </button>
          </div>

          {/* Existing Links */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Active Share Links</h3>
            {links.length === 0 ? (
              <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
                No share links created yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {links.map((link) => (
                  <div
                    key={link.id}
                    style={{
                      padding: '12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px',
                      background: 'white'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                          {link.access_level} access
                        </div>
                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                          {link.expires_at
                            ? `Expires: ${new Date(link.expires_at).toLocaleDateString()}`
                            : 'Never expires'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeLink(link.token)}
                        style={{
                          padding: '4px 8px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        Revoke
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        readOnly
                        value={link.shareUrl || `${window.location.origin}/share/${link.token}`}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      />
                      <button
                        onClick={() => copyToClipboard(link.shareUrl || `${window.location.origin}/share/${link.token}`)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;

