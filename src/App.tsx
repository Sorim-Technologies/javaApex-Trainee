
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MigrationWizard from './components/wizard/MigrationWizard';
import AppShell from './components/layout/AppShell';
import AuthCallback from './components/pages/AuthCallback';
import DocsPage from './components/pages/DocsPage';
import DashboardPage from './components/dashboard/DashboardPage';
import { frontendUsageRegistry } from './frontendUsage';
import './App.css';

void frontendUsageRegistry;

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/*" element={<MigrationWizard />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
