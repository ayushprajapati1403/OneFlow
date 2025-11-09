import { useState, useCallback } from 'react';

export type Page = 'landing' | 'signin' | 'signup' | 'dashboard' | 'projects' | 'project-detail' | 'tasks' | 'timesheets' | 'analytics' | 'settings';

export function useNavigate() {
  const navigate = useCallback((page: Page, params?: any) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { page, params } }));
  }, []);

  return navigate;
}

export function useCurrentPage() {
  const [currentPage, setCurrentPage] = useState<{ page: Page; params?: any }>({ page: 'landing' });

  const handleNavigate = useCallback((event: Event) => {
    const customEvent = event as CustomEvent;
    setCurrentPage(customEvent.detail);
  }, []);

  if (typeof window !== 'undefined') {
    window.addEventListener('navigate', handleNavigate);
  }

  return currentPage;
}
