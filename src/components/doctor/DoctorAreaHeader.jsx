import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import NotificationBell from '@/components/NotificationBell';

const DoctorAreaHeader = () => {
  const { signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    try {
        setIsLoggingOut(true);
        await signOut();
        navigate('/');
    } catch (error) {
        console.error("Logout failed", error);
    } finally {
        setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-100 h-16 shrink-0 z-40 relative shadow-sm">
        <div className="h-full px-6 md:px-8 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-blue-50 rounded-lg">
              <img 
                src="https://horizons-cdn.hostinger.com/678b5778-a611-4960-82cc-681a679036f7/8d9783d546a3becefb36676e0f018f25.png" 
                alt="Click Teleconsulta Logo" 
                className="w-8 h-8 object-contain" 
              />
            </div>
            <span className="text-xl font-bold text-gray-800 tracking-tight hidden md:block">
              Click Teleconsulta
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
             {/* Notification Bell Component */}
             <NotificationBell />

             <Link 
                to="/medico/dashboard"
                className="hidden md:flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium"
             >
                <LayoutDashboard className="w-4 h-4" />
                Meu Painel
             </Link>
             
             <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                disabled={isLoggingOut || authLoading}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2 font-medium text-sm px-2"
            >
                {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                <span className="hidden md:inline">Sair da Conta</span>
            </Button>
          </div>
        </div>
      </header>
    </>
  );
};

export default DoctorAreaHeader;