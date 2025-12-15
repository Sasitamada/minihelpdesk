import React, { useState, useEffect } from 'react';
import { commentsAPI } from '../services/api';
import RichTextComment from './RichTextComment';
import { format } from 'date-fns';
import useSocket from '../hooks/useSocket';

const ThreadedComments = ({ taskId, workspaceMembers = [], currentUserId }) => {
  const [comments, setComments] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [assigningTo, setAssigningTo] = useState(null);
  const [members, setMembers] = useState(workspaceMembers);
  const { socket } = useSocket();

  useEffect(() => {
    loadComments();
    if (workspaceMembers.length === 0) {
      loadWorkspaceMembers();
    } else {
      setMembers(workspaceMembers);
    }

    // Real-time updates via WebSocket
    if (socket && taskId) {
      socket.emit('join-task', taskId);
      
      socket.on('new-comment', (comment) => {
        loadComments(); // Reload to get threaded structure
      });
      
      return () => {
        socket.emit('leave-task', taskId);
        socket.off('new-comment');
      };
    }
  }, [taskId, workspaceMembers, socket]);

  const loadWorkspaceMembers = async () => {
    try {
      // Try to get members from users API as fallback
      const { usersAPI } = require('../services/api');
      const response = await usersAPI.getAll();
      setMembers(response.data || []);
    } catch (error) {
      console.error('Error loading workspace members:', error);
    }
  };

  const loadComments = async () => {
    try {
      const response = await commentsAPI.getByTask(taskId);
      setComments(response.data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAddComment = async (content, parentId = null, assignedTo = null) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await commentsAPI.create({
        content,
        task: taskId,
        author: user.id,
        parent_comment_id: parentId,
        assigned_to: assignedTo
      });
      await loadComments();
      setReplyingTo(null);
      setAssigningTo(null);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    }
  };

  const handleAssignComment = async (commentId, userId) => {
    try {
      await commentsAPI.update(commentId, { assigned_to: userId });
      await loadComments();
    } catch (error) {
      console.error('Error assigning comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentsAPI.delete(commentId);
      await loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const renderComment = (comment, depth = 0) => {
    const isAssigned = comment.assigned_to === currentUserId;
    const hasMentions = comment.mentions && comment.mentions.length > 0;

    return (
      <div
        key={comment.id}
        style={{
          marginLeft: depth > 0 ? '32px' : '0',
          marginBottom: '16px',
          padding: '12px',
          background: isAssigned ? '#fff3cd' : '#f7f8f9',
          borderRadius: '8px',
          border: isAssigned ? '2px solid #ffc107' : '1px solid #e0e0e0'
        }}
      >
        {/* Comment Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          {comment.author?.avatar ? (
            <img
              src={`http://localhost:5001${comment.author.avatar}`}
              alt={comment.author.username}
              style={{ width: '32px', height: '32px', borderRadius: '50%' }}
            />
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#6b5ce6',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '12px'
              }}
            >
              {(comment.author?.full_name || comment.author?.username || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>
              {comment.author?.full_name || comment.author?.username || 'User'}
            </div>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
            </div>
          </div>
          {hasMentions && (
            <span
              style={{
                padding: '2px 8px',
                background: '#e8ecff',
                color: '#6b5ce6',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}
            >
              @mentioned
            </span>
          )}
          {comment.assigned_user && (
            <span
              style={{
                padding: '2px 8px',
                background: '#fff3cd',
                color: '#856404',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}
            >
              Assigned to {comment.assigned_user.full_name || comment.assigned_user.username}
            </span>
          )}
        </div>

        {/* Comment Content */}
        <div
          style={{ marginBottom: '8px', fontSize: '14px', color: '#333' }}
          dangerouslySetInnerHTML={{ __html: comment.content }}
        />

        {/* Comment Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            style={{
              padding: '4px 12px',
              border: 'none',
              background: 'transparent',
              color: '#6b5ce6',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            {replyingTo === comment.id ? 'Cancel Reply' : 'Reply'}
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setAssigningTo(assigningTo === comment.id ? null : comment.id)}
              style={{
                padding: '4px 12px',
                border: 'none',
                background: 'transparent',
                color: '#6b5ce6',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              {comment.assigned_user ? 'Reassign' : 'Assign'}
            </button>
            {assigningTo === comment.id && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '8px',
                  zIndex: 100,
                  minWidth: '200px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Assign to:</div>
                {members.map(member => (
                  <button
                    key={member.user_id || member.id}
                    onClick={() => {
                      handleAssignComment(comment.id, member.user_id || member.id || member.user?.id);
                      setAssigningTo(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    onMouseEnter={(e) => (e.target.style.background = '#f7f8f9')}
                    onMouseLeave={(e) => (e.target.style.background = 'transparent')}
                  >
                    {member.full_name || member.username}
                  </button>
                ))}
                <button
                  onClick={() => {
                    handleAssignComment(comment.id, null);
                    setAssigningTo(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#dc3545',
                    marginTop: '4px',
                    borderTop: '1px solid #e0e0e0',
                    paddingTop: '8px'
                  }}
                >
                  Unassign
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => handleDeleteComment(comment.id)}
            style={{
              padding: '4px 12px',
              border: 'none',
              background: 'transparent',
              color: '#dc3545',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Delete
          </button>
        </div>

        {/* Reply Input */}
        {replyingTo === comment.id && (
          <div style={{ marginTop: '12px', marginLeft: '16px' }}>
            <RichTextComment
              taskId={taskId}
              onSave={(content) => handleAddComment(content, comment.id)}
              placeholder="Write a reply..."
            />
          </div>
        )}

        {/* Render Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
          Comments ({comments.reduce((count, c) => count + 1 + (c.replies?.length || 0), 0)})
        </h3>
      </div>

      {/* Comments List */}
      <div style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '16px' }}>
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>

      {/* Add New Comment */}
      <div>
        <RichTextComment
          taskId={taskId}
          onSave={(content) => handleAddComment(content)}
          placeholder="Add a comment..."
        />
      </div>
    </div>
  );
};

export default ThreadedComments;

