import React, { useState, useEffect } from 'react';
import { workspacesAPI, workspaceInvitationsAPI } from '../services/api';

const TeamManagement = ({ workspaceId, currentUserRole, isOwner = false }) => {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMembers();
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const loadMembers = async () => {
    try {
      const response = await workspacesAPI.getMembers(workspaceId);
      setMembers(response.data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadInvitations = async () => {
    try {
      const response = await workspaceInvitationsAPI.getByWorkspace(workspaceId);
      setInvitations(response.data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const handleInvite = async () => {
    if (!inviteData.email.trim()) {
      alert('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await workspaceInvitationsAPI.invite({
        workspaceId,
        email: inviteData.email.trim(),
        role: inviteData.role,
        invitedBy: user.id
      });
      
      setInviteData({ email: '', role: 'member' });
      setShowInviteModal(false);
      loadInvitations();
      alert('Invitation sent successfully!');
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert(error.response?.data?.message || 'Error sending invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the workspace?')) {
      return;
    }

    try {
      await workspacesAPI.removeMember(workspaceId, userId);
      loadMembers();
      alert('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Error removing member');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await workspacesAPI.updateMemberRole(workspaceId, userId, { role: newRole });
      loadMembers();
      alert('Role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Error updating role');
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      await workspaceInvitationsAPI.cancel(invitationId);
      loadInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: '#dc3545',
      member: '#4a9eff',
      guest: '#6c757d'
    };
    return colors[role] || colors.member;
  };

  // Allow management if user is admin OR workspace owner
  // Also check if user is workspace owner by comparing with workspace data
  const [workspaceOwner, setWorkspaceOwner] = useState(null);
  
  useEffect(() => {
    const checkWorkspaceOwner = async () => {
      try {
        const workspaceRes = await workspacesAPI.getById(workspaceId);
        setWorkspaceOwner(workspaceRes.data.owner || workspaceRes.data.owner_id);
      } catch (error) {
        console.error('Error checking workspace owner:', error);
      }
    };
    checkWorkspaceOwner();
  }, [workspaceId]);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userIsOwner = workspaceOwner === user.id || isOwner;
  const canManage = currentUserRole === 'admin' || userIsOwner;
  
  console.log('TeamManagement - currentUserRole:', currentUserRole, 'isOwner:', isOwner, 'workspaceOwner:', workspaceOwner, 'user.id:', user.id, 'canManage:', canManage);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Team Members</h2>
        {/* Always show invite button - permissions checked on backend */}
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn btn-primary"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: '#6b5ce6',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          ➕ Invite Member
        </button>
      </div>

      {/* Active Members */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#6c757d' }}>
          Active Members ({members.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {members.map((member) => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                {member.avatar ? (
                  <img
                    src={`http://localhost:5001${member.avatar}`}
                    alt={member.full_name || member.username}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#6b5ce6',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  >
                    {(member.full_name || member.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {member.full_name || member.username}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>{member.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {canManage ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: `2px solid ${getRoleBadgeColor(member.role)}`,
                      background: 'white',
                      color: getRoleBadgeColor(member.role),
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="guest">Guest</option>
                  </select>
                ) : (
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: getRoleBadgeColor(member.role),
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}
                  >
                    {member.role}
                  </span>
                )}

                {canManage && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    style={{
                      padding: '6px 12px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#6c757d' }}>
            Pending Invitations ({invitations.filter(i => i.status === 'pending').length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invitations
              .filter(inv => inv.status === 'pending')
              .map((invitation) => (
                <div
                  key={invitation.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: '#f7f8f9',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{invitation.email}</div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      Invited as {invitation.role} • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowInviteModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div className="modal-title">Invite Team Member</div>
              <button className="close-btn" onClick={() => setShowInviteModal(false)}>×</button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  placeholder="user@example.com"
                />
                <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                  We'll send an invitation email to this address
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                >
                  <option value="admin">Admin - Full access</option>
                  <option value="member">Member - Can edit tasks</option>
                  <option value="guest">Guest - View only</option>
                </select>
                <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                  {inviteData.role === 'admin' && 'Can create workspaces, edit all tasks, manage members'}
                  {inviteData.role === 'member' && 'Can edit tasks, add comments, cannot create workspaces'}
                  {inviteData.role === 'guest' && 'Can view tasks and comments, cannot edit'}
                </p>
              </div>

              <div className="button-group" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleInvite}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;

