
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import AuthCallback from './components/AuthCallback';
import BRDReport from './components/BRDReport';
import LoginPage from './components/LoginPage';
import RepositoryPage from './components/RepositoryPage';
import ProfilePage from './components/ProfilePage';
import { isAuthenticated } from './services/frontendAuth';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AppShell><AuthCallback /></AppShell>} />
        <Route path="/docs" element={<AppShell><BRDReport /></AppShell>} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppShell>
                <ProfilePage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <RepositoryPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
