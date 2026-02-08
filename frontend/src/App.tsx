import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { useMemo } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SignalRProvider } from './contexts/SignalRContext';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { getTheme } from './constants/themes';
import { LoginPage } from './pages/LoginPage';
import { ListsPage } from './pages/ListsPage';
import { ListDetailPage } from './pages/ListDetailPage';
import { AcceptSharePage } from './pages/AcceptSharePage';
import { SettingsPage } from './pages/SettingsPage';
import { UpdateBanner } from './components/UpdateBanner';
import { LoadingScreen } from './components/LoadingScreen';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/share/:token" element={<AcceptSharePage />} />
      <Route
        path="/lists"
        element={
          <PrivateRoute>
            <ListsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/lists/:listId"
        element={
          <PrivateRoute>
            <ListDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/lists" replace />} />
    </Routes>
  );
}

function ThemedApp() {
  const { currentTheme } = useTheme();
  const theme = useMemo(() => getTheme(currentTheme), [currentTheme]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <SignalRProvider>
        <UpdateBanner />
        <AppRoutes />
      </SignalRProvider>
    </MuiThemeProvider>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

