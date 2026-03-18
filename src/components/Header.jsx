import React, { useState } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { LogOut, CalendarDays, LayoutDashboard, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import NotificationBell from '@/components/NotificationBell';

const Header = () => {
  const { session, signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleDashboardRedirect = () => {
    navigate('/paciente/dashboard');
  };

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-light transition-all duration-200 ${
      isActive
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-border h-16 flex items-center">
        <nav className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-primary/5 rounded-lg group-hover:bg-primary/10 transition-colors">
              <img 
                src="https://horizons-cdn.hostinger.com/678b5778-a611-4960-82cc-681a679036f7/8d9783d546a3becefb36676e0f018f25.png" 
                alt="Click Teleconsulta Logo" 
                className="w-10 h-10 object-contain" 
              />
            </div>
            <span className="text-lg font-semibold text-gray-800 tracking-tight">Click Teleconsulta</span>
          </Link>
          
          <div className="flex items-center gap-4">
              <NavLink to="/agendamentos" className={navLinkClasses}>
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden md:inline">Agendar Consulta</span>
              </NavLink>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <>
                <NotificationBell />

                <Button variant="ghost" size="sm" onClick={handleDashboardRedirect} className="flex items-center gap-2 font-normal text-gray-600 hover:text-primary hover:bg-primary/5">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Painel do Paciente</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gray-500 hover:text-red-600 hover:bg-red-50">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
               <div className="flex items-center gap-2">
                  <Button onClick={() => navigate('/acesso-paciente')} className="font-light bg-primary hover:bg-primary/90 rounded-full px-6">
                      <User className="w-4 h-4 mr-2" />
                      Área do Paciente
                  </Button>
              </div>
            )}
          </div>
        </nav>
      </header>
    </>
  );
};

export default Header;