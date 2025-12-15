import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { spacesAPI, foldersAPI, listsAPI } from '../services/api';

const SpaceManager = ({ workspaceId }) => {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (workspaceId) {
      loadStructure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, refreshKey]);

  const loadStructure = async () => {
    try {
      setLoading(true);
      const response = await spacesAPI.getByWorkspace(workspaceId);
      setSpaces(response.data || []);
    } catch (error) {
      console.error('Error loading spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpace = async () => {
    const name = prompt('Space name');
    if (!name) return;

    try {
      await spacesAPI.create({ workspaceId, name });
      triggerRefresh();
    } catch (error) {
      console.error('Error creating space:', error);
      alert(error.response?.data?.message || 'Failed to create space');
    }
  };

  const handleDeleteSpace = async (spaceId) => {
    if (!window.confirm('Delete this space? Lists will be moved out of this space.')) return;
    try {
      await spacesAPI.delete(spaceId);
      triggerRefresh();
    } catch (error) {
      console.error('Error deleting space:', error);
      alert('Failed to delete space');
    }
  };

  const handleCreateFolder = async (spaceId) => {
    const name = prompt('Folder name');
    if (!name) return;

    try {
      await foldersAPI.create({ spaceId, name });
      triggerRefresh();
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('Delete this folder? Lists will move outside of this folder.')) return;
    try {
      await foldersAPI.delete(folderId);
      triggerRefresh();
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Failed to delete folder');
    }
  };

  const handleCreateList = async (spaceId, folderId = null) => {
    const name = prompt('List name');
    if (!name) return;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await listsAPI.create({
        name,
        description: '',
        workspaceId,
        owner: user.id,
        spaceId,
        folderId,
      });
      triggerRefresh();
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list');
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Delete this list and all of its tasks?')) return;
    try {
      await listsAPI.delete(listId);
      triggerRefresh();
    } catch (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list');
    }
  };

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading spaces...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Spaces</h2>
          <p style={{ color: '#6c757d' }}>Organize your workspace with Spaces, Folders, and Lists</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateSpace}>
          ➕ New Space
        </button>
      </div>

      {spaces.map((space) => (
        <div
          key={space.id}
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(15,15,15,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{space.name}</div>
              {space.description && <div style={{ color: '#6c757d', fontSize: '14px' }}>{space.description}</div>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => handleCreateFolder(space.id)}>
                + Folder
              </button>
              <button className="btn btn-secondary" onClick={() => handleCreateList(space.id, null)}>
                + List
              </button>
              <button
                className="btn btn-secondary"
                style={{ background: '#ffe5e5', color: '#c0392b' }}
                onClick={() => handleDeleteSpace(space.id)}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Lists directly under space */}
          {space.lists.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#6c757d', letterSpacing: '0.05em' }}>
                Lists
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
                {space.lists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => navigate(`/project/${list.id}`)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid #e0e0e0',
                      minWidth: '180px',
                      background: '#f8f9fc',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{list.name}</div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>{list.description || 'No description'}</div>
                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: '8px', padding: '4px 8px', fontSize: '12px', background: '#ffe5e5', color: '#c0392b' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteList(list.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Folders */}
          {space.folders.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {space.folders.map((folder) => (
                <div
                  key={folder.id}
                  style={{
                    border: '1px solid #e9e9e9',
                    borderRadius: '10px',
                    padding: '16px',
                    background: '#fafbff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{folder.name}</div>
                      {folder.description && (
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>{folder.description}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" onClick={() => handleCreateList(space.id, folder.id)}>
                        + List
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ background: '#ffe5e5', color: '#c0392b' }}
                        onClick={() => handleDeleteFolder(folder.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {folder.lists.length === 0 ? (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px dashed #d0d0d0',
                        color: '#6c757d',
                        fontSize: '13px',
                      }}
                    >
                      No lists in this folder. Create one!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
                      {folder.lists.map((list) => (
                        <div
                          key={list.id}
                          onClick={() => navigate(`/project/${list.id}`)}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: '1px solid #e0e0e0',
                            minWidth: '180px',
                            background: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>{list.name}</div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {list.description || 'No description'}
                          </div>
                          <button
                            className="btn btn-secondary"
                            style={{ marginTop: '8px', padding: '4px 8px', fontSize: '12px', background: '#ffe5e5', color: '#c0392b' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteList(list.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SpaceManager;

