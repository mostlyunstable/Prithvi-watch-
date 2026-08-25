import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { OverviewPage } from './pages/OverviewPage';
import { RiskMapPage } from './pages/RiskMapPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { HistoryPage } from './pages/HistoryPage';
import { ObservationsPage } from './pages/ObservationsPage';
import { ModelPage } from './pages/ModelPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { AlertsPage } from './pages/AlertsPage';
import { MethodologyPage } from './pages/MethodologyPage';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/map" element={<RiskMapPage />} />
            <Route path="/assessment" element={<AssessmentPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/observations" element={<ObservationsPage />} />
            <Route path="/model" element={<ModelPage />} />
            <Route path="/scenarios" element={<ScenariosPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/methodology" element={<MethodologyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
