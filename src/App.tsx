
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MigrationWizard from './components/MigrationWizard';
import AppShell from './components/AppShell';
import AuthCallback from './components/AuthCallback';
import DocsPage from './components/DocsPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/*" element={<MigrationWizard />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
