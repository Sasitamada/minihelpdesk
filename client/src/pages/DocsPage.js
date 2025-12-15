import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { docsAPI } from '../services/api';
import { format } from 'date-fns';

const DocsPage = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadDocs();
    }
  }, [workspaceId]);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const response = await docsAPI.getByWorkspace(workspaceId);
      setDocs(response.data || []);
    } catch (error) {
      console.error('Error loading docs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoc = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await docsAPI.create({
        title: 'Untitled Document',
        content: '',
        workspace_id: workspaceId,
        created_by: user.id
      });
      setDocs([response.data, ...docs]);
      setSelectedDoc(response.data);
      setTitle(response.data.title);
      setContent(response.data.content || '');
      setIsEditing(true);
    } catch (error) {
      console.error('Error creating doc:', error);
      alert('Failed to create document');
    }
  };

  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc);
    setTitle(doc.title);
    setContent(doc.content || '');
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    try {
      await docsAPI.update(selectedDoc.id, { title, content });
      await loadDocs();
      setIsEditing(false);
      // Update selected doc
      const updated = docs.find(d => d.id === selectedDoc.id);
      if (updated) {
        setSelectedDoc({ ...updated, title, content });
      }
    } catch (error) {
      console.error('Error saving doc:', error);
      alert('Failed to save document');
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc || !window.confirm('Delete this document?')) return;
    try {
      await docsAPI.delete(selectedDoc.id);
      setDocs(docs.filter(d => d.id !== selectedDoc.id));
      setSelectedDoc(null);
      setTitle('');
      setContent('');
    } catch (error) {
      console.error('Error deleting doc:', error);
      alert('Failed to delete document');
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '300px',
          borderRight: '1px solid #e0e0e0',
          padding: '16px',
          overflowY: 'auto',
          background: '#f7f8f9'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Docs</h2>
          <button
            onClick={handleCreateDoc}
            style={{
              padding: '8px 16px',
              background: '#6b5ce6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            + New
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>Loading...</div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            No documents yet. Create your first doc!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {docs.map(doc => (
              <div
                key={doc.id}
                onClick={() => handleSelectDoc(doc)}
                style={{
                  padding: '12px',
                  background: selectedDoc?.id === doc.id ? '#e8ecff' : 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: selectedDoc?.id === doc.id ? '2px solid #6b5ce6' : '1px solid #e0e0e0'
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{doc.title}</div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  Updated {format(new Date(doc.updated_at), 'MMM dd, yyyy')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedDoc ? (
          <>
            {/* Toolbar */}
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              {isEditing ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '2px solid #6b5ce6',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                />
              ) : (
                <h2 style={{ fontSize: '20px', fontWeight: '600' }}>{title}</h2>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      style={{
                        padding: '8px 16px',
                        background: '#6b5ce6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setTitle(selectedDoc.title);
                        setContent(selectedDoc.content || '');
                      }}
                      style={{
                        padding: '8px 16px',
                        background: '#e0e0e0',
                        color: '#333',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        padding: '8px 16px',
                        background: '#6b5ce6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      style={{
                        padding: '8px 16px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Editor */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              {isEditing ? (
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  style={{ height: 'calc(100% - 100px)' }}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link', 'blockquote', 'code-block'],
                      [{ 'color': [] }, { 'background': [] }],
                      ['clean']
                    ]
                  }}
                />
              ) : (
                <div
                  style={{ fontSize: '16px', lineHeight: '1.6' }}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6c757d'
            }}
          >
            Select a document or create a new one
          </div>
        )}
      </div>
    </div>
  );
};

export default DocsPage;

