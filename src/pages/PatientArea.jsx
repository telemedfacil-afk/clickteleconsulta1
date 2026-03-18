import React from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, HelpCircle, LogOut, User, PlusCircle, Home, FileSignature, MessageSquare, Star } from 'lucide-react';
import PatientConsultations from '@/components/patient/PatientConsultations';
import SupportPage from '@/pages/SupportPage';
import PatientNewAppointmentPage from '@/pages/patient/PatientNewAppointmentPage';
import PatientData from '@/components/patient/PatientData';
import MessagesPage from '@/pages/MessagesPage';
import PatientReviewsPage from '@/pages/patient/PatientReviewsPage';

const PatientArea = () => {
    const { profile, signOut, session } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    }`;
    
    if (!session) {
      return <Navigate to="/" replace />;
    }

    return (
        <>
            <Helmet>
                <title>Área do Paciente - Click Teleconsulta</title>
            </Helmet>
            <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
                <aside className="hidden md:flex flex-col gap-4 sticky top-24">
                   <div className="flex flex-col items-center text-center p-4 border border-border rounded-lg bg-card">
                       <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                           <User className="w-10 h-10 text-primary" />
                       </div>
                       <h2 className="text-lg font-bold">{profile?.full_name}</h2>
                       <p className="text-sm text-muted-foreground">Paciente</p>
                   </div>
                    <Card className="p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase px-3 mb-2">Painel</p>
                        <nav className="flex flex-col gap-1">
                           <NavLink to="/paciente/dashboard/consultas" className={navLinkClasses}>
                                <Calendar className="w-5 h-5"/>
                                Minhas Consultas
                            </NavLink>
                             <NavLink to="/paciente/dashboard/agendar" className={navLinkClasses}>
                                <PlusCircle className="w-5 h-5"/>
                                Agendar Consulta
                            </NavLink>
                            <NavLink to="/paciente/dashboard/mensagens" className={navLinkClasses}>
                                <MessageSquare className="w-5 h-5"/>
                                Mensagens
                            </NavLink>
                            <NavLink to="/paciente/dashboard/avaliacoes" className={navLinkClasses}>
                                <Star className="w-5 h-5"/>
                                Avaliações
                            </NavLink>
                             <NavLink to="/paciente/dashboard/dados" className={navLinkClasses}>
                                <FileSignature className="w-5 h-5"/>
                                Meus Dados
                            </NavLink>
                             <NavLink to="/paciente/dashboard/suporte" className={navLinkClasses}>
                                <HelpCircle className="w-5 h-5"/>
                                Suporte
                            </NavLink>
                        </nav>
                         <p className="text-xs font-semibold text-muted-foreground uppercase px-3 mt-4 mb-2">Outros</p>
                         <nav className="flex flex-col gap-1">
                           <NavLink to="/" className={navLinkClasses}>
                                <Home className="w-5 h-5"/>
                                Página Inicial
                            </NavLink>
                            <Button variant="ghost" onClick={handleSignOut} className={`${navLinkClasses({isActive:false})} w-full justify-start`}>
                               <LogOut className="w-5 h-5"/>
                               Sair
                            </Button>
                         </nav>
                    </Card>
                </aside>
                <main>
                   <Routes>
                        <Route path="/" element={<Navigate to="consultas" replace />} />
                        <Route path="consultas" element={<PatientConsultations />} />
                        <Route path="agendar" element={<PatientNewAppointmentPage />} />
                        <Route path="mensagens" element={<MessagesPage />} />
                        <Route path="avaliacoes" element={<PatientReviewsPage />} />
                        <Route path="dados" element={<PatientData />} />
                        <Route path="suporte" element={<SupportPage />} />
                   </Routes>
                </main>
            </div>
        </>
    );
}

export default PatientArea;