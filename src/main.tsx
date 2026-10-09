import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { registerSW } from 'virtual:pwa-register';
import { ApiError } from './lib/api';
import { ToastProvider } from './components/Toast';
import './i18n';
import './index.css';
import CreateRoom from './pages/CreateRoom';
import Join from './pages/Join';
import Landing from './pages/Landing';
import Room, { RedirectHome } from './pages/Room';
import { ActivityTab, BalancesTab, ExpensesTab } from './pages/tabs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/new', element: <CreateRoom /> },
  { path: '/join', element: <Join /> },
  { path: '/j', element: <Join /> },
  { path: '/r/:roomId/invite', lazy: () => import('./pages/Invite').then((m) => ({ Component: m.default })) },
  {
    path: '/r/:roomId',
    element: <Room />,
    children: [
      { index: true, element: <ExpensesTab /> },
      { path: 'balances', element: <BalancesTab /> },
      { path: 'activity', element: <ActivityTab /> },
    ],
  },
  { path: '*', element: <RedirectHome /> },
]);

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
