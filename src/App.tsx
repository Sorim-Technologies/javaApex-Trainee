
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell, AuthCallback, MigrationWizard } from './components/Layout';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*" element={<MigrationWizard />} />
        
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
