import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/dashboard/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import AccountsPage from './pages/AccountsPage';
import BudgetPage from './pages/BudgetPage';
import DebtsPage from './pages/DebtsPage';
import FamilyPage from './pages/FamilyPage';
import CalendarPage from './pages/CalendarPage';
import AIPage from './pages/AIPage';
import TransfersPage from './pages/TransfersPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import GoalsPage from './pages/GoalsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
});

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-screen">
      <div className="loader" />
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" /> : children;
}

export default function App() {
  return (
    <ThemeProvider>
    <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="transfers" element={<TransfersPage />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="debts" element={<DebtsPage />} />
              <Route path="family" element={<FamilyPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="ai" element={<AIPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="subscriptions" element={<SubscriptionsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
    </LanguageProvider>
    </ThemeProvider>
  );
}
