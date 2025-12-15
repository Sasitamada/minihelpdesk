import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { spacesAPI, foldersAPI, listsAPI } from '../services/api';

// Sortable List Item
const SortableListItem = ({ list, onDelete, onNavigate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onNavigate(list.id)}
      className="list-item"
      style={{
        ...style,
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        background: '#fff',
        cursor: 'grab',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <div 
          style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '3px',
            background: list.color || '#4a9eff',
            flexShrink: 0
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', color: '#2d3748' }}>
            {list.name}
          </div>
          {list.description && (
            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
              {list.description}
            </div>
          )}
        </div>
        {list.task_count > 0 && (
          <span style={{ 
            fontSize: '12px', 
            color: '#6c757d',
            background: '#f7f8f9',
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            {list.task_count}
          </span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(list.id);
        }}
        style={{
          padding: '4px 8px',
          background: 'transparent',
          border: 'none',
          color: '#dc3545',
          cursor: 'pointer',
          fontSize: '12px',
          marginLeft: '8px'
        }}
      >
        ×
      </button>
    </div>
  );
};

const EnhancedSpaceManager = ({ workspaceId }) => {
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSpaces, setExpandedSpaces] = useState(new Set());
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', color: '' });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (workspaceId) {
      loadStructure();
    }
  }, [workspaceId]);

  const loadStructure = async () => {
    try {
      setLoading(true);
      const response = await spacesAPI.getByWorkspace(workspaceId);
      setSpaces(response.data || []);
      // Auto-expand first space
      if (response.data && response.data.length > 0) {
        setExpandedSpaces(new Set([response.data[0].id]));
      }
    } catch (error) {
      console.error('Error loading spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event, spaceId, folderId = null) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const lists = folderId 
      ? spaces.find(s => s.id === spaceId)?.folders.find(f => f.id === folderId)?.lists || []
      : spaces.find(s => s.id === spaceId)?.lists || [];

    const oldIndex = lists.findIndex(l => l.id === active.id);
    const newIndex = lists.findIndex(l => l.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(lists, oldIndex, newIndex);
    
    // Update positions
    const listOrders = reordered.map((list, index) => ({
      id: list.id,
      position: index
    }));

    try {
      await listsAPI.reorder({ listOrders });
      loadStructure(); // Reload to get updated positions
    } catch (error) {
      console.error('Error reordering lists:', error);
      alert('Failed to reorder lists');
    }
  };

  const handleCreateSpace = async () => {
    const name = prompt('Space name:');
    if (!name) return;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await spacesAPI.create({ 
        workspaceId, 
        name,
        color: '#ff6b6b',
        createdBy: user.id
      });
      loadStructure();
    } catch (error) {
      console.error('Error creating space:', error);
      alert(error.response?.data?.message || 'Failed to create space');
    }
  };

  const handleCreateFolder = async (spaceId) => {
    const name = prompt('Folder name:');
    if (!name) return;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await foldersAPI.create({ 
        spaceId, 
        name,
        color: '#6b5ce6',
        createdBy: user.id
      });
      loadStructure();
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder');
    }
  };

  const handleCreateList = async (spaceId, folderId = null) => {
    const name = prompt('List name:');
    if (!name) return;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await listsAPI.create({
        name,
        workspaceId,
        spaceId,
        folderId,
        color: '#4a9eff',
        owner: user.id
      });
      loadStructure();
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list');
    }
  };

  const handleEdit = (item, type) => {
    setEditingItem({ id: item.id, type });
    setEditForm({
      name: item.name,
      description: item.description || '',
      color: item.color || '#4a9eff'
    });
  };

  const handleSaveEdit = async () => {
    try {
      if (editingItem.type === 'space') {
        await spacesAPI.update(editingItem.id, editForm);
      } else if (editingItem.type === 'folder') {
        await foldersAPI.update(editingItem.id, editForm);
      } else if (editingItem.type === 'list') {
        await listsAPI.update(editingItem.id, editForm);
      }
      setEditingItem(null);
      loadStructure();
    } catch (error) {
      console.error('Error updating:', error);
      alert('Failed to update');
    }
  };

  const handleDelete = async (id, type) => {
    const confirmMsg = type === 'space' 
      ? 'Delete this space? Lists will be moved out.'
      : type === 'folder'
      ? 'Delete this folder? Lists will move outside.'
      : 'Delete this list? All tasks will be deleted.';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      if (type === 'space') {
        await spacesAPI.delete(id);
      } else if (type === 'folder') {
        await foldersAPI.delete(id);
      } else if (type === 'list') {
        await listsAPI.delete(id);
      }
      loadStructure();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Workspace Structure</h1>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>
            Organize your workspace with Spaces, Folders, and Lists
          </p>
        </div>
        <button
          onClick={handleCreateSpace}
          style={{
            padding: '10px 20px',
            background: '#6b5ce6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          + New Space
        </button>
      </div>

      {spaces.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          background: '#f7f8f9',
          borderRadius: '12px',
          border: '2px dashed #e0e0e0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            No spaces yet
          </div>
          <div style={{ color: '#6c757d', marginBottom: '20px' }}>
            Create your first space to organize your workspace
          </div>
          <button
            onClick={handleCreateSpace}
            style={{
              padding: '10px 20px',
              background: '#6b5ce6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Create Space
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {spaces.map(space => {
            const isExpanded = expandedSpaces.has(space.id);
            
            return (
              <div
                key={space.id}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  background: '#fff',
                  overflow: 'hidden'
                }}
              >
                {/* Space Header */}
                <div
                  style={{
                    padding: '16px 20px',
                    background: isExpanded ? '#f7f8f9' : '#fff',
                    borderBottom: isExpanded ? '1px solid #e0e0e0' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setExpandedSpaces(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(space.id)) {
                        newSet.delete(space.id);
                      } else {
                        newSet.add(space.id);
                      }
                      return newSet;
                    });
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <span style={{ fontSize: '12px', color: '#6c757d' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <div 
                      style={{ 
                        width: '16px', 
                        height: '16px', 
                        borderRadius: '4px',
                        background: space.color || '#ff6b6b'
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px' }}>{space.name}</div>
                      {space.description && (
                        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                          {space.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(space, 'space');
                      }}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateFolder(space.id);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#6b5ce6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      + Folder
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateList(space.id);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#4a9eff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      + List
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(space.id, 'space');
                      }}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid #dc3545',
                        color: '#dc3545',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Space Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '20px' }}>
                        {/* Lists directly in space */}
                        {space.lists && space.lists.length > 0 && (
                          <div style={{ marginBottom: '24px' }}>
                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: '600', 
                              textTransform: 'uppercase',
                              color: '#6c757d',
                              letterSpacing: '0.5px',
                              marginBottom: '12px'
                            }}>
                              Lists ({space.lists.length})
                            </div>
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(e) => handleDragEnd(e, space.id)}
                            >
                              <SortableContext
                                items={space.lists.map(l => l.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                {space.lists.map(list => (
                                  <SortableListItem
                                    key={list.id}
                                    list={list}
                                    onDelete={(id) => handleDelete(id, 'list')}
                                    onNavigate={(id) => navigate(`/project/${id}`)}
                                  />
                                ))}
                              </SortableContext>
                            </DndContext>
                          </div>
                        )}

                        {/* Folders */}
                        {space.folders && space.folders.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {space.folders.map(folder => {
                              const isFolderExpanded = expandedFolders.has(folder.id);
                              
                              return (
                                <div
                                  key={folder.id}
                                  style={{
                                    border: '1px solid #e9e9e9',
                                    borderRadius: '10px',
                                    background: '#fafbff',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {/* Folder Header */}
                                  <div
                                    style={{
                                      padding: '12px 16px',
                                      background: isFolderExpanded ? '#f0f4ff' : '#fafbff',
                                      borderBottom: isFolderExpanded ? '1px solid #e9e9e9' : 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                      setExpandedFolders(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(folder.id)) {
                                          newSet.delete(folder.id);
                                        } else {
                                          newSet.add(folder.id);
                                        }
                                        return newSet;
                                      });
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                      <span style={{ fontSize: '11px', color: '#6c757d' }}>
                                        {isFolderExpanded ? '▼' : '▶'}
                                      </span>
                                      <div 
                                        style={{ 
                                          width: '14px', 
                                          height: '14px', 
                                          borderRadius: '3px',
                                          background: folder.color || '#6b5ce6'
                                        }}
                                      />
                                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                        {folder.name}
                                      </div>
                                      {folder.lists && folder.lists.length > 0 && (
                                        <span style={{ fontSize: '12px', color: '#6c757d' }}>
                                          ({folder.lists.length})
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(folder, 'folder');
                                        }}
                                        style={{
                                          padding: '4px 10px',
                                          background: 'transparent',
                                          border: '1px solid #e0e0e0',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '11px'
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCreateList(space.id, folder.id);
                                        }}
                                        style={{
                                          padding: '4px 10px',
                                          background: '#4a9eff',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '11px'
                                        }}
                                      >
                                        + List
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(folder.id, 'folder');
                                        }}
                                        style={{
                                          padding: '4px 10px',
                                          background: 'transparent',
                                          border: '1px solid #dc3545',
                                          color: '#dc3545',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '11px'
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>

                                  {/* Folder Lists */}
                                  <AnimatePresence>
                                    {isFolderExpanded && folder.lists && folder.lists.length > 0 && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ padding: '12px', overflow: 'hidden' }}
                                      >
                                        <DndContext
                                          sensors={sensors}
                                          collisionDetection={closestCenter}
                                          onDragEnd={(e) => handleDragEnd(e, space.id, folder.id)}
                                        >
                                          <SortableContext
                                            items={folder.lists.map(l => l.id)}
                                            strategy={verticalListSortingStrategy}
                                          >
                                            {folder.lists.map(list => (
                                              <SortableListItem
                                                key={list.id}
                                                list={list}
                                                onDelete={(id) => handleDelete(id, 'list')}
                                                onNavigate={(id) => navigate(`/project/${id}`)}
                                              />
                                            ))}
                                          </SortableContext>
                                        </DndContext>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Empty state */}
                        {(!space.lists || space.lists.length === 0) && 
                         (!space.folders || space.folders.length === 0) && (
                          <div style={{
                            padding: '40px',
                            textAlign: 'center',
                            color: '#6c757d',
                            background: '#f7f8f9',
                            borderRadius: '8px',
                            border: '2px dashed #e0e0e0'
                          }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                              No lists or folders yet
                            </div>
                            <div style={{ fontSize: '13px' }}>
                              Create a folder or list to organize your tasks
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setEditingItem(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '400px',
              maxWidth: '90vw'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
              Edit {editingItem.type}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                style={{
                  padding: '10px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <textarea
                placeholder="Description (optional)"
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                style={{
                  padding: '10px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
              <input
                type="color"
                value={editForm.color}
                onChange={(e) => setEditForm({...editForm, color: e.target.value})}
                style={{
                  width: '100%',
                  height: '40px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={() => setEditingItem(null)}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSpaceManager;

