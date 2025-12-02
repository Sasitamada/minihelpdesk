import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { usersAPI } from '../services/api';

const RichTextComment = ({ taskId, onSave, placeholder = "Add a comment..." }) => {
  const [content, setContent] = useState('');
  const [users, setUsers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const quillRef = useRef(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleMention = (value, delta, source) => {
    if (source === 'user') {
      const text = value.replace(/<[^>]*>/g, '');
      const atIndex = text.lastIndexOf('@');
      
      if (atIndex !== -1) {
        const afterAt = text.substring(atIndex + 1);
        const spaceIndex = afterAt.indexOf(' ');
        
        if (spaceIndex === -1 || spaceIndex > 0) {
          const searchTerm = afterAt.split(/\s/)[0].toLowerCase();
          
          if (searchTerm.length > 0) {
            const filtered = users.filter(user =>
              (user.username || '').toLowerCase().includes(searchTerm) ||
              (user.full_name || '').toLowerCase().includes(searchTerm)
            );
            setFilteredUsers(filtered);
            setShowMentions(filtered.length > 0);
          } else {
            setShowMentions(false);
          }
        } else {
          setShowMentions(false);
        }
      } else {
        setShowMentions(false);
      }
    }
  };

  const insertMention = (user) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const text = quill.getText();
    const atIndex = text.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const length = text.length - atIndex;
      quill.deleteText(atIndex, length);
      quill.insertText(atIndex, `@${user.username} `, 'user');
    }
    
    setShowMentions(false);
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'blockquote'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'blockquote'
  ];

  const handleSubmit = () => {
    if (content.trim()) {
      onSave(content);
      setContent('');
    }
  };

  return (
    <div className="relative">
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={(value, delta, source) => {
            setContent(value);
            handleMention(value, delta, source);
          }}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="min-h-[150px]"
        />
      </div>
      
      {showMentions && filteredUsers.length > 0 && (
        <div className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
          {filteredUsers.map(user => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              {user.avatar ? (
                <img src={`http://localhost:5001${user.avatar}`} alt={user.username} className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs">
                  {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-medium text-sm">{user.full_name || user.username}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      <div className="flex justify-end mt-2">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Post Comment
        </button>
      </div>
    </div>
  );
};

export default RichTextComment;

