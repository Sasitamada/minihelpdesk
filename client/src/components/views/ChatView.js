import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';

const ChatView = ({ tasks, onTaskClick }) => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (selectedTask) {
      loadMessages();
    }
  }, [selectedTask]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!selectedTask) return;
    // In a real implementation, you would load comments as messages
    // For now, we'll use task comments
    try {
      const response = await fetch(`http://localhost:5000/api/comments/task/${selectedTask.id || selectedTask._id}`);
      const data = await response.json();
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTask) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const response = await fetch('http://localhost:5000/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage,
          task: selectedTask.id || selectedTask._id,
          author: user.id
        })
      });
      
      if (response.ok) {
        setNewMessage('');
        loadMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div style={{ display: 'flex', height: '600px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Task List Sidebar */}
      <div style={{ width: '300px', borderRight: '1px solid #e0e0e0', overflowY: 'auto', background: '#f7f8f9' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', background: 'white' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Tasks</h3>
        </div>
        <div style={{ padding: '8px' }}>
          {tasks.map((task) => (
            <div
              key={task.id || task._id}
              onClick={() => setSelectedTask(task)}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: selectedTask?.id === task.id ? '#e8ecff' : 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                border: selectedTask?.id === task.id ? '2px solid #6b5ce6' : '1px solid #e0e0e0',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{task.title}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                {task.status} • {task.priority}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedTask ? (
          <>
            <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', background: 'white' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{selectedTask.title}</h3>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                Click to view task details
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#fafafa' }}>
              {messages.map((message, idx) => (
                <div
                  key={message.id || idx}
                  style={{
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#6b5ce6',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {(message.author?.full_name || message.author?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {message.author?.full_name || message.author?.username || 'User'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6c757d' }}>
                        {format(new Date(message.created_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginLeft: '40px',
                      padding: '12px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}
                    dangerouslySetInnerHTML={{ __html: message.content }}
                  />
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid #e0e0e0', background: 'white' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  style={{
                    padding: '10px 24px',
                    background: '#6b5ce6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d' }}>
            Select a task to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;

