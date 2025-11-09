import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { Landing } from './pages/Landing';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Tasks } from './pages/Tasks';
import { Timesheets } from './pages/Timesheets';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { Contacts } from './pages/Contacts';
import { Team } from './pages/Team';
import { Layout } from './components/Layout';
import { Page } from './hooks/useNavigate';
import { ProjectDetail } from './pages/ProjectDetail';

function AppRouter() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<{ page: Page; params?: any }>({
    page: user ? 'dashboard' : 'landing',
  });

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const customEvent = event as CustomEvent;
      setCurrentPage(customEvent.detail);
    };

    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (user && (currentPage.page === 'landing' || currentPage.page === 'signin' || currentPage.page === 'signup')) {
        setCurrentPage({ page: 'dashboard' });
      } else if (!user && !['landing', 'signin', 'signup'].includes(currentPage.page)) {
        setCurrentPage({ page: 'landing' });
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    switch (currentPage.page) {
      case 'signin':
        return <SignIn />;
      case 'signup':
        return <SignUp />;
      default:
        return <Landing />;
    }
  }

  const renderPage = () => {
    switch (currentPage.page) {
      case 'dashboard':
        return <Dashboard />;
      case 'projects':
        return <Projects />;
      case 'project-detail':
        return <ProjectDetail key={currentPage.params?.uuid ?? 'project-detail'} uuid={currentPage.params?.uuid} />;
      case 'tasks':
        return <Tasks />;
      case 'timesheets':
        return <Timesheets />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      case 'contacts':
        return <Contacts />;
      case 'team':
        return <Team />;
      default:
        return <Dashboard />;
    }
  };

  return <Layout currentPage={currentPage.page}>{renderPage()}</Layout>;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <AppRouter />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
