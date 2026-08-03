import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initCustomAlert } from './utils/customAlert'

// Polyfill Node.prototype.removeChild & insertBefore to prevent Google Translate DOM mutations from crashing React
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (console) console.warn('Cannot remove child, parent mismatch caused by DOM mutation (Google Translate)');
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) console.warn('Cannot insert before, parent mismatch caused by DOM mutation (Google Translate)');
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Initialize TanStack Query Client for caching & automatic refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes stale time
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize custom animated alert dialogs
initCustomAlert();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
