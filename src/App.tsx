import { BrowserRouter, Routes, Route } from "react-router-dom";
import MigrationWizard from "./components/MigrationWizard";
import AppShell from "./components/AppShell";
import AuthCallback from "./components/AuthCallback";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/auth/google/callback"
            element={<AuthCallback provider="google" />}
          />
          <Route path="/*" element={<MigrationWizard />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
