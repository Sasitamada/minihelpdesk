import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DarkModeToggle from './DarkModeToggle';
import NotificationsPanel from './NotificationsPanel';
import AdvancedSearch from './AdvancedSearch';
import { useTheme } from '../contexts/ThemeContext';

const ClickUpHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showViewSwitcher, setShowViewSwitcher] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user.id);
    
    // Extract workspace ID from URL if available
    const pathMatch = location.pathname.match(/\/workspaces\/(\d+)/);
    if (pathMatch) {
      setWorkspaceId(parseInt(pathMatch[1]));
    }
  }, [location]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowAdvancedSearch(true);
      }
      // Cmd/Ctrl + / for search
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowAdvancedSearch(true);
      }
      // G + D for dark mode toggle
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        let gPressed = true;
        const handleD = (e2) => {
          if (e2.key === 'd' && !e2.metaKey && !e2.ctrlKey && gPressed) {
            e2.preventDefault();
            toggleTheme();
          }
          gPressed = false;
          window.removeEventListener('keydown', handleD);
        };
        window.addEventListener('keydown', handleD);
        setTimeout(() => {
          gPressed = false;
          window.removeEventListener('keydown', handleD);
        }, 1000);
      }
      // C for quick create
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShowQuickCreate(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  const getPageTitle = () => {
    if (location.pathname.startsWith('/project/')) {
      return 'List View';
    }
    if (location.pathname.startsWith('/workspaces/')) {
      return 'Workspace';
    }
    switch(location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/workspaces': return 'Workspaces';
      case '/settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  const handleQuickCreate = (type) => {
    if (type === 'task' && workspaceId) {
      // Navigate to create task
      navigate(`/workspaces/${workspaceId}?action=create-task`);
    } else if (type === 'list' && workspaceId) {
      // Navigate to create list
      navigate(`/workspaces/${workspaceId}?action=create-list`);
    }
    setShowQuickCreate(false);
  };

  return (
    <>
      <header 
        className="sticky top-0 z-40 bg-header-bg border-b border-header-border shadow-sm"
        style={{
          background: 'var(--header-bg)',
          borderColor: 'var(--header-border)',
        }}
      >
        <div className="flex items-center justify-between px-6 h-14">
          {/* Left Section */}
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-text truncate">
              {getPageTitle()}
            </h1>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div 
                className="relative"
                onClick={() => setShowAdvancedSearch(true)}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search tasks, comments, lists... (⌘K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowAdvancedSearch(true)}
                  className="w-full h-9 px-4 pl-10 bg-surface border border-border rounded-lg text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="7" cy="7" r="5"/>
                    <path d="m11 11 3 3"/>
                  </svg>
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-text-muted">
                  <kbd className="px-1.5 py-0.5 bg-surface-hover border border-border rounded text-xs">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 bg-surface-hover border border-border rounded text-xs">K</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* View Switcher */}
            {location.pathname.startsWith('/project/') && (
              <div className="relative">
                <button
                  onClick={() => setShowViewSwitcher(!showViewSwitcher)}
                  className="flex items-center gap-2 px-3 h-9 bg-surface border border-border rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                  aria-label="Switch view"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="5" height="5" rx="1"/>
                    <rect x="9" y="2" width="5" height="5" rx="1"/>
                    <rect x="2" y="9" width="5" height="5" rx="1"/>
                    <rect x="9" y="9" width="5" height="5" rx="1"/>
                  </svg>
                  <span>List</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m3 4.5 3 3 3-3"/>
                  </svg>
                </button>

                <AnimatePresence>
                  {showViewSwitcher && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-50"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <button
                        onClick={() => {
                          navigate(location.pathname.replace('/project/', '/board/'));
                          setShowViewSwitcher(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-text hover:bg-surface-hover transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="2" width="12" height="12" rx="1"/>
                            <path d="M2 6h12M6 2v12"/>
                          </svg>
                          <span>Board</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          navigate(location.pathname.replace('/project/', '/calendar/'));
                          setShowViewSwitcher(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-text hover:bg-surface-hover transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="2" width="12" height="12" rx="1"/>
                            <path d="M2 6h12M6 2v4"/>
                          </svg>
                          <span>Calendar</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          navigate(location.pathname);
                          setShowViewSwitcher(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-text hover:bg-surface-hover transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 3h12M2 8h12M2 13h12"/>
                          </svg>
                          <span>List</span>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Quick Create */}
            <div className="relative">
              <button
                onClick={() => setShowQuickCreate(!showQuickCreate)}
                className="flex items-center gap-2 px-4 h-9 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 shadow-sm"
                aria-label="Quick create"
                title="Quick create (C)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v10M3 8h10"/>
                </svg>
                <span>Create</span>
              </button>

              <AnimatePresence>
                {showQuickCreate && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowQuickCreate(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-lg shadow-xl py-2 z-50"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <button
                        onClick={() => handleQuickCreate('task')}
                        className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-surface-hover transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded bg-accent-light flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3v10M3 8h10"/>
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium">New Task</div>
                          <div className="text-xs text-text-muted">Create a new task</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleQuickCreate('list')}
                        className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-surface-hover transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded bg-accent-light flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 3h12M2 8h12M2 13h12"/>
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium">New List</div>
                          <div className="text-xs text-text-muted">Create a new list</div>
                        </div>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications */}
            {currentUserId && (
              <NotificationsPanel />
            )}

            {/* Dark Mode Toggle */}
            <DarkModeToggle />

            {/* Settings */}
            <button
              onClick={() => navigate('/settings')}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="9" r="2"/>
                <path d="M9 1v4M9 13v4M17 9h-4M5 9H1M14.66 3.34l-2.83 2.83M6.17 11.83l-2.83 2.83M14.66 14.66l-2.83-2.83M6.17 6.17l-2.83-2.83"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Advanced Search Modal */}
      <AdvancedSearch
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        workspaceId={workspaceId}
      />
    </>
  );
};

export default ClickUpHeader;

