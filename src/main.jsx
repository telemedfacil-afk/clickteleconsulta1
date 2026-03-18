import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/index.css';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { Toaster } from '@/components/ui/toaster';
import { AppointmentsProvider } from '@/contexts/AppointmentsContext';
import { LoaderProvider } from '@/contexts/LoaderContext';
import { CartProvider } from '@/hooks/useCart';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <LoaderProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppointmentsProvider>
            <CartProvider>
              <App />
              <Toaster />
            </CartProvider>
          </AppointmentsProvider>
        </AuthProvider>
      </BrowserRouter>
    </LoaderProvider>
  </>
);