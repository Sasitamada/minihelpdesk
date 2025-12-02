import React, { useEffect, useState, useRef } from 'react';
import { workspaceChatAPI } from '../services/api';

const users = [
  { id: 'you', name: 'You', avatar: '🧑' },
  { id: 'alex', name: 'Alex Morgan', avatar: '👩' },
  { id: 'jordan', name: 'Jordan Lee', avatar: '🧔' },
  { id: 'ai', name: 'Mini AI Assistant', avatar: '🤖' }
];

const WorkspaceChat = ({ workspaceId }) => {
  const [messages, setMessages] = useState([]);
  const [selectedTab, setSelectedTab] = useState('chat');
  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(users[0]);
  const [attachments, setAttachments] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await workspaceChatAPI.getMessages(workspaceId);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return;

    const formData = new FormData();
    formData.append('author', selectedUser.name);
    formData.append('message', message);
    attachments.forEach(file => {
      formData.append('attachments', file);
    });

    try {
      const response = await workspaceChatAPI.sendMessage(workspaceId, formData);
      setMessages(prev => [...prev, response.data]);
      setMessage('');
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    try {
      const prompt = message || 'Provide a quick summary for the team.';
      const response = await workspaceChatAPI.getAiSuggestion(workspaceId, prompt);
      const aiMessage = {
        id: Date.now(),
        author: 'Mini AI Assistant',
        message: response.data.message,
        attachments: [],
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI suggestion error:', error);
      alert('AI assistant is currently unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const renderMessage = (msg) => {
    const isAI = msg.author === 'Mini AI Assistant';
    return (
      <div
        key={msg.id}
        style={{
          background: isAI ? '#f0f4ff' : '#ffffff',
          border: '1px solid #e0e0e0',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          gap: '16px'
        }}
      >
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
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          {msg.author?.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ fontWeight: '600' }}>{msg.author || 'Unknown'}</div>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              {new Date(msg.created_at).toLocaleString()}
            </div>
          </div>
          <div style={{ fontSize: '14px', color: '#2c3e50', whiteSpace: 'pre-wrap' }}>
            {msg.message}
          </div>
          {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {msg.attachments.map((file, index) => (
                <a
                  key={index}
                  href={file.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    textDecoration: 'none',
                    color: '#6b5ce6',
                    background: '#f8f9ff'
                  }}
                >
                  📎 {file.originalName || 'attachment'}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: '48px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '24px', borderBottom: '2px solid #e4e6e8', flex: 1 }}>
          {['chat', 'calendar', 'assigned'].map(tab => (
            <div
              key={tab}
              onClick={() => setSelectedTab(tab)}
              style={{
                padding: '12px 0',
                cursor: 'pointer',
                fontWeight: selectedTab === tab ? '700' : '600',
                color: selectedTab === tab ? '#6b5ce6' : '#6c757d',
                borderBottom: selectedTab === tab ? '3px solid #6b5ce6' : '3px solid transparent'
              }}
            >
              {tab === 'chat' && 'Chat'}
              {tab === 'calendar' && 'Calendar'}
              {tab === 'assigned' && "Assigned Tasks"}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary">🔍 Search</button>
          <button className="btn btn-secondary">📄 Replies</button>
          <button className="btn btn-secondary">✅ Assigned</button>
          <button className="btn btn-secondary">⚙️ Settings</button>
        </div>
      </div>

      <div style={{
        border: '1px solid #e0e0e0',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '24px', background: '#ffffff', borderBottom: '1px solid #e0e0e0' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Chat with your team</h2>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>
            Collaborate with your teammates, share updates, and let Mini AI Assistant draft quick summaries.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="btn btn-secondary">📅 View Calendar</button>
            <button className="btn btn-secondary">📞 Start SyncUp</button>
          </div>
        </div>

        <div style={{
          flex: 1,
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '24px',
          background: '#f9fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {messages.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#6c757d',
              padding: '40px',
              background: '#ffffff',
              borderRadius: '16px'
            }}>
              Start the conversation with your team or ask Mini AI for a quick update.
            </div>
          ) : (
            messages.map(msg => renderMessage(msg))
          )}
          <div ref={chatEndRef} />
        </div>

        <div style={{
          padding: '20px',
          background: '#ffffff',
          borderTop: '1px solid #e0e0e0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <select
              value={selectedUser.id}
              onChange={(e) => {
                const user = users.find(u => u.id === e.target.value) || users[0];
                setSelectedUser(user);
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }}
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            <button
              className="btn btn-secondary"
              onClick={handleAiSuggest}
              disabled={aiLoading}
            >
              {aiLoading ? 'Thinking...' : '✨ Ask Mini AI'}
            </button>
          </div>

          {attachments.length > 0 && (
            <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {attachments.map((file, index) => (
                <div
                  key={index}
                  style={{
                    background: '#f8f9ff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontSize: '12px' }}>📎 {file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#f7f8f9',
            border: '1px solid #e0e0e0',
            borderRadius: '16px',
            padding: '12px 16px'
          }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '20px'
              }}
              title="Attach files"
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <input
              type="text"
              placeholder={`Write to ${selectedUser.name}, press 'space' for AI, '/' for commands`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                outline: 'none'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
              onClick={handleSendMessage}
              style={{
                border: 'none',
                background: '#6b5ce6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceChat;
