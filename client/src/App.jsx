import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 1. Import our Auth Provider and Protector
import { AuthProvider } from './providers/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';

// 2. Import our Pages & Layouts
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { WorkspaceView } from './pages/WorkspaceView';
import { SmartView } from './pages/SmartView';
import { Settings } from './pages/Settings'; 
import { AppLayout } from './layouts/AppLayout';

function App() {
  return (
    // AuthProvider checks the cookie on load and provides Zustand state
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          
          {/* --- PUBLIC ROUTES --- */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* --- PROTECTED ROUTES WITH LAYOUT --- */}
          {/* We wrap the AppLayout in the ProtectedRoute, so the whole shell is secured */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            
            {/* The new Dashboard route */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Smart Views (Today & Upcoming) */}
            <Route path="/smart/:view" element={<SmartView />} />
            
            {/* The Workspace route renders INSIDE the AppLayout's <Outlet /> */}
            <Route path="/w/:workspaceId" element={<WorkspaceView />} />

            {/* The Settings route */}
            <Route path="/settings" element={<Settings />} /> 
            
            {/* Redirect the root URL straight to the dashboard! */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

          </Route>

          {/* --- FALLBACK --- */}
          {/* If they type a random URL, send them to REGISTER first */}
          <Route path="*" element={<Navigate to="/register" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;