import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { workspacesAPI, spacesAPI, listsAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const ClickUpSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [workspaces, setWorkspaces] = useState([]);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState(new Set());
  const [expandedSpaces, setExpandedSpaces] = useState(new Set());
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [workspaceStructures, setWorkspaceStructures] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, [location.pathname]);

  useEffect(() => {
    // Load structure for each workspace
    workspaces.forEach(workspace => {
      if (expandedWorkspaces.has(workspace.id)) {
        loadWorkspaceStructure(workspace.id);
      }
    });
  }, [expandedWorkspaces, workspaces]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await workspacesAPI.getAll();
      setWorkspaces(response.data || []);
      
      // Auto-expand workspace if we're viewing it
      const pathMatch = location.pathname.match(/\/workspaces\/(\d+)/);
      if (pathMatch) {
        const workspaceId = parseInt(pathMatch[1]);
        setExpandedWorkspaces(prev => new Set([...prev, workspaceId]));
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceStructure = async (workspaceId) => {
    if (workspaceStructures[workspaceId]) return; // Already loaded
    
    try {
      const response = await spacesAPI.getByWorkspace(workspaceId);
      setWorkspaceStructures(prev => ({
        ...prev,
        [workspaceId]: response.data || []
      }));
    } catch (error) {
      console.error('Error loading workspace structure:', error);
    }
  };

  const toggleWorkspace = (workspaceId) => {
    setExpandedWorkspaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workspaceId)) {
        newSet.delete(workspaceId);
      } else {
        newSet.add(workspaceId);
        loadWorkspaceStructure(workspaceId);
      }
      return newSet;
    });
  };

  const toggleSpace = (spaceId) => {
    setExpandedSpaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spaceId)) {
        newSet.delete(spaceId);
      } else {
        newSet.add(spaceId);
      }
      return newSet;
    });
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleListClick = (listId) => {
    navigate(`/project/${listId}`);
    setIsMobileMenuOpen(false);
  };

  const isListActive = (listId) => {
    const pathMatch = location.pathname.match(/\/project\/(\d+)/);
    return pathMatch && parseInt(pathMatch[1]) === listId;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: '12px',
          left: '12px',
          zIndex: 1001,
          padding: '8px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          color: 'var(--text)'
        }}
        aria-label="Toggle menu"
        aria-expanded={isMobileMenuOpen}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--modal-overlay)',
            zIndex: 999,
          }}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div 
        className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}
        style={{ 
          width: '280px', 
          background: 'var(--sidebar-bg)', 
          borderRight: '1px solid var(--sidebar-border)',
          overflowY: 'auto',
          height: '100vh',
          transition: 'background-color var(--transition-base), border-color var(--transition-base)'
        }}
      >
        <div 
          className="sidebar-header" 
          style={{ 
            padding: '16px', 
            borderBottom: '1px solid var(--sidebar-border)',
            transition: 'border-color var(--transition-base)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div 
            className="logo" 
            style={{ 
              fontSize: '18px', 
              fontWeight: '700', 
              color: 'var(--accent)',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            MiniHelpDesk
          </div>
          <button
            className="mobile-menu-button"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              padding: '4px'
            }}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 5L5 15M5 5l10 10"/>
            </svg>
          </button>
        </div>

        <div className="sidebar-menu" style={{ padding: '8px' }}>
          {/* Dashboard */}
          <div 
            className={`menu-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
            onClick={() => {
              navigate('/dashboard');
              setIsMobileMenuOpen(false);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
              background: location.pathname === '/dashboard' ? 'var(--accent-light)' : 'transparent',
              color: location.pathname === '/dashboard' ? 'var(--accent)' : 'var(--text)',
              transition: 'all var(--transition-base)',
              fontWeight: location.pathname === '/dashboard' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)'
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== '/dashboard') {
                e.currentTarget.style.background = 'var(--surface-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== '/dashboard') {
                e.currentTarget.style.background = 'transparent';
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Dashboard"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/dashboard');
                setIsMobileMenuOpen(false);
              }
            }}
          >
            <span>📊</span>
            <span>Dashboard</span>
          </div>

          {/* Workspaces Section */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: '600', 
              textTransform: 'uppercase', 
              color: 'var(--text-secondary)',
              padding: '8px 12px',
              letterSpacing: '0.5px'
            }}>
              Workspaces
            </div>

            {loading ? (
              <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>
            ) : workspaces.length === 0 ? (
              <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '14px' }}>No workspaces</div>
            ) : (
              workspaces.map(workspace => {
                const isExpanded = expandedWorkspaces.has(workspace.id);
                const structure = workspaceStructures[workspace.id] || [];
                
                return (
                  <div key={workspace.id} style={{ marginBottom: '4px' }}>
                    {/* Workspace Header */}
                    <div
                      onClick={() => {
                        toggleWorkspace(workspace.id);
                        navigate(`/workspaces/${workspace.id}`);
                        setIsMobileMenuOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: location.pathname === `/workspaces/${workspace.id}` ? 'var(--accent-light)' : 'transparent',
                        color: location.pathname === `/workspaces/${workspace.id}` ? 'var(--accent)' : 'var(--text)',
                        fontWeight: 'var(--font-weight-medium)',
                        transition: 'all var(--transition-base)'
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Workspace: ${workspace.name}`}
                      aria-expanded={isExpanded}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleWorkspace(workspace.id);
                          navigate(`/workspaces/${workspace.id}`);
                          setIsMobileMenuOpen(false);
                        }
                      }}
                    >
                      <span style={{ fontSize: '12px' }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <div 
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '3px',
                          background: workspace.color || '#7b68ee',
                          flexShrink: 0
                        }}
                        aria-hidden="true"
                      />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {workspace.name}
                      </span>
                    </div>

                    {/* Spaces (nested) */}
                    <AnimatePresence>
                      {isExpanded && structure.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ marginLeft: '20px', overflow: 'hidden' }}
                        >
                          {structure.map(space => {
                            const isSpaceExpanded = expandedSpaces.has(space.id);
                            
                            return (
                              <div key={space.id} style={{ marginTop: '4px' }}>
                                {/* Space Header */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSpace(space.id);
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '13px',
                                    color: 'var(--text-secondary)',
                                    transition: 'all var(--transition-base)'
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Space: ${space.name}`}
                                  aria-expanded={isSpaceExpanded}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      toggleSpace(space.id);
                                    }
                                  }}
                                >
                                  <span style={{ fontSize: '10px' }}>
                                    {isSpaceExpanded ? '▼' : '▶'}
                                  </span>
                                  <div 
                                    style={{ 
                                      width: '10px', 
                                      height: '10px', 
                                      borderRadius: '2px',
                                      background: space.color || '#ffb347',
                                      flexShrink: 0
                                    }}
                                    aria-hidden="true"
                                  />
                                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {space.name}
                                  </span>
                                </div>

                                {/* Folders and Lists */}
                                <AnimatePresence>
                                  {isSpaceExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      style={{ marginLeft: '20px', overflow: 'hidden' }}
                                    >
                                      {/* Lists directly in space */}
                                      {space.lists && space.lists.length > 0 && (
                                        <div>
                                          {space.lists.map(list => (
                                            <div
                                              key={list.id}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleListClick(list.id);
                                              }}
                                              style={{
                                                padding: '6px 12px',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '13px',
                                                background: isListActive(list.id) ? 'var(--accent-light)' : 'transparent',
                                                color: isListActive(list.id) ? 'var(--accent)' : 'var(--text)',
                                                marginTop: '2px',
                                                transition: 'all var(--transition-base)'
                                              }}
                                              role="button"
                                              tabIndex={0}
                                              aria-label={`List: ${list.name}`}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                  e.preventDefault();
                                                  handleListClick(list.id);
                                                }
                                              }}
                                            >
                                              <div 
                                                style={{ 
                                                  width: '8px', 
                                                  height: '8px', 
                                                  borderRadius: '2px',
                                                  background: list.color || '#4a9eff',
                                                  flexShrink: 0
                                                }}
                                                aria-hidden="true"
                                              />
                                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {list.name}
                                              </span>
                                              {list.task_count > 0 && (
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                  {list.task_count}
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Folders */}
                                      {space.folders && space.folders.map(folder => {
                                        const isFolderExpanded = expandedFolders.has(folder.id);
                                        
                                        return (
                                          <div key={folder.id} style={{ marginTop: '4px' }}>
                                            {/* Folder Header */}
                                            <div
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFolder(folder.id);
                                              }}
                                              style={{
                                                padding: '6px 12px',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '13px',
                                                color: 'var(--text-secondary)',
                                                fontWeight: 'var(--font-weight-medium)',
                                                transition: 'all var(--transition-base)'
                                              }}
                                              role="button"
                                              tabIndex={0}
                                              aria-label={`Folder: ${folder.name}`}
                                              aria-expanded={isFolderExpanded}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                  e.preventDefault();
                                                  toggleFolder(folder.id);
                                                }
                                              }}
                                            >
                                              <span style={{ fontSize: '10px' }}>
                                                {isFolderExpanded ? '▼' : '▶'}
                                              </span>
                                              <div 
                                                style={{ 
                                                  width: '10px', 
                                                  height: '10px', 
                                                  borderRadius: '2px',
                                                  background: folder.color || '#6b5ce6',
                                                  flexShrink: 0
                                                }}
                                                aria-hidden="true"
                                              />
                                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {folder.name}
                                              </span>
                                            </div>

                                            {/* Lists in Folder */}
                                            <AnimatePresence>
                                              {isFolderExpanded && folder.lists && folder.lists.length > 0 && (
                                                <motion.div
                                                  initial={{ height: 0, opacity: 0 }}
                                                  animate={{ height: 'auto', opacity: 1 }}
                                                  exit={{ height: 0, opacity: 0 }}
                                                  style={{ marginLeft: '20px', overflow: 'hidden' }}
                                                >
                                                  {folder.lists.map(list => (
                                                    <div
                                                      key={list.id}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleListClick(list.id);
                                                      }}
                                                      style={{
                                                        padding: '6px 12px',
                                                        borderRadius: 'var(--radius-sm)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        fontSize: '13px',
                                                        background: isListActive(list.id) ? 'var(--accent-light)' : 'transparent',
                                                        color: isListActive(list.id) ? 'var(--accent)' : 'var(--text)',
                                                        marginTop: '2px',
                                                        transition: 'all var(--transition-base)'
                                                      }}
                                                      role="button"
                                                      tabIndex={0}
                                                      aria-label={`List: ${list.name}`}
                                                      onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                          e.preventDefault();
                                                          handleListClick(list.id);
                                                        }
                                                      }}
                                                    >
                                                      <div 
                                                        style={{ 
                                                          width: '8px', 
                                                          height: '8px', 
                                                          borderRadius: '2px',
                                                          background: list.color || '#4a9eff',
                                                          flexShrink: 0
                                                        }}
                                                        aria-hidden="true"
                                                      />
                                                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {list.name}
                                                      </span>
                                                      {list.task_count > 0 && (
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                          {list.task_count}
                                                        </span>
                                                      )}
                                                    </div>
                                                  ))}
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}

            {/* New Workspace Button */}
            <button 
              onClick={() => {
                navigate('/workspaces');
                setIsMobileMenuOpen(false);
              }}
              style={{ 
                width: '100%', 
                marginTop: '8px', 
                padding: '8px 12px',
                background: 'transparent',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all var(--transition-base)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-hover)';
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
              aria-label="Create new workspace"
            >
              + New Workspace
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClickUpSidebar;
