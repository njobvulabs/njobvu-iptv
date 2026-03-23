import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { useM3U } from './hooks/useM3U';
import HomePage from './pages/HomePage';
import PlayerPage from './pages/PlayerPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { channels, loading, error, sourceStatus, retrySource, isFromCache } = useM3U();

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={<HomePage channels={channels} loading={loading} error={error} sourceStatus={sourceStatus} retrySource={retrySource} isFromCache={isFromCache} />} 
          />
          <Route 
            path="/player/:channelId" 
            element={<PlayerPage channels={channels} />} 
          />
          <Route 
            path="/settings" 
            element={<SettingsPage />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}