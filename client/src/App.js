import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import './pages/Landing.css';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WorkspaceList from './pages/WorkspaceList';
import ProjectView from './pages/ProjectView';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Settings from './pages/Settings';
import WorkspaceDetails from './pages/WorkspaceDetails';
import SharePage from './pages/SharePage';

// Main App Layout Component
const AppLayout = ({ children }) => (
  <div className="app">
    <Sidebar />
    <div className="main-content">
      <Header />
      <div className="content-area">
        {children}
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page - Default */}
        <Route path="/" element={<Landing />} />
        
        {/* Dashboard */}
        <Route path="/dashboard" element={
          <AppLayout>
            <Dashboard />
          </AppLayout>
        } />
        
        {/* Workspaces */}
        <Route path="/workspaces" element={
          <AppLayout>
            <WorkspaceList />
          </AppLayout>
        } />
        <Route path="/workspaces/:workspaceId" element={
          <AppLayout>
            <WorkspaceDetails />
          </AppLayout>
        } />
        
        {/* Settings */}
        <Route path="/settings" element={
          <AppLayout>
            <Settings />
          </AppLayout>
        } />
        
        {/* Project View */}
        <Route path="/project/:projectId" element={
          <AppLayout>
            <ProjectView />
          </AppLayout>
        } />
        
        {/* Share Page (no layout) */}
        <Route path="/share/:token" element={<SharePage />} />
      </Routes>
    </Router>
  );
}

export default App;