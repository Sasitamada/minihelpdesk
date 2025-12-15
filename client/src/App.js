import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import './pages/Landing.css';

// Components
import Sidebar from './components/Sidebar';
import ClickUpSidebar from './components/ClickUpSidebar';
import Header from './components/Header';
import ClickUpHeader from './components/ClickUpHeader';
import WorkspaceList from './pages/WorkspaceList';
import ProjectView from './pages/ProjectView';
import Dashboard from './pages/EnhancedDashboard';
import Landing from './pages/Landing';
import Settings from './pages/Settings';
import WorkspaceDetails from './pages/WorkspaceDetails';
import SharePage from './pages/SharePage';
import DocsPage from './pages/DocsPage';
import TimesheetPage from './pages/TimesheetPage';

// Main App Layout Component
const AppLayout = ({ children, useClickUpSidebar = true, useClickUpHeader = true }) => {
  const SidebarComponent = useClickUpSidebar ? ClickUpSidebar : Sidebar;
  const HeaderComponent = useClickUpHeader ? ClickUpHeader : Header;
  return (
    <div className="app" style={{ 
      display: 'flex', 
      height: '100vh', 
      overflow: 'hidden',
      background: 'var(--bg-secondary)'
    }}>
      <SidebarComponent />
      <div className="main-content" style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        background: 'var(--bg-secondary)'
      }}>
        <HeaderComponent />
        <div className="content-area" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 40px',
          background: 'var(--bg-secondary)'
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page - Default */}
        <Route path="/" element={<Landing />} />
        
        {/* Dashboard */}
        <Route path="/dashboard" element={
          <AppLayout useClickUpSidebar={true} useClickUpHeader={true}>
            <Dashboard />
          </AppLayout>
        } />
        
        {/* Workspaces */}
        <Route path="/workspaces" element={
          <AppLayout useClickUpSidebar={true} useClickUpHeader={true}>
            <WorkspaceList />
          </AppLayout>
        } />
        <Route path="/workspaces/:workspaceId" element={
          <AppLayout useClickUpSidebar={true} useClickUpHeader={true}>
            <WorkspaceDetails />
          </AppLayout>
        } />
        
        {/* Settings */}
        <Route path="/settings" element={
          <AppLayout useClickUpSidebar={true} useClickUpHeader={true}>
            <Settings />
          </AppLayout>
        } />
        
        {/* Project View */}
        <Route path="/project/:projectId" element={
          <AppLayout useClickUpSidebar={true} useClickUpHeader={true}>
            <ProjectView />
          </AppLayout>
        } />
        
        {/* Docs/Pages */}
        <Route path="/workspaces/:workspaceId/docs" element={
          <AppLayout useClickUpSidebar={true} useClickUpHeader={true}>
            <DocsPage />
          </AppLayout>
        } />
        
        {/* Timesheet */}
        <Route path="/timesheet" element={
          <AppLayout useClickUpSidebar={true} useClickUpHeader={true}>
            <TimesheetPage />
          </AppLayout>
        } />
        <Route path="/workspaces/:workspaceId/timesheet" element={
          <AppLayout useClickUpSidebar={true} useClickUpHeader={true}>
            <TimesheetPage />
          </AppLayout>
        } />
        
        {/* Share Page (no layout) */}
        <Route path="/share/:token" element={<SharePage />} />
      </Routes>
    </Router>
  );
}

export default App;