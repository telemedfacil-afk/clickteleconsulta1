import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
    Calendar, 
    LogOut, 
    Loader2, 
    AlertCircle, 
    Wallet, 
    HelpCircle, 
    Users, 
    MessageSquare, 
    CreditCard, 
    Settings, 
    BarChart3, 
    Clock,
    Stethoscope,
    Star
} from 'lucide-react';
import DoctorConsultations from '@/components/doctor/DoctorConsultations';
import DoctorProfile from '@/components/doctor/DoctorProfile';
import DoctorSchedule from '@/components/doctor/DoctorSchedule';
import DoctorFinance from '@/components/doctor/DoctorFinance';
import DoctorHelp from '@/components/doctor/DoctorHelp';
import DoctorSecurity from '@/components/doctor/DoctorSecurity';
import DoctorDocuments from '@/components/doctor/DoctorDocuments';
import DoctorSubscriptionPage from '@/pages/doctor/DoctorSubscriptionPage';
import PacientesListPage from '@/pages/pacientes/PacientesListPage';
import DoctorAreaHeader from '@/components/doctor/DoctorAreaHeader';
import MessagesPage from '@/pages/MessagesPage';
import DoctorReviewsPage from '@/pages/doctor/DoctorReviewsPage';
import DoctorProceduresPage from '@/pages/doctor/DoctorProceduresPage';

const DoctorArea = () => {
    const { signOut, profile, session, loading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [doctorImageUrl, setDoctorImageUrl] = useState(null);

    useEffect(() => {
        let mounted = true;
        const fetchDoctorImage = async () => {
            if (session?.user?.id) {
                const { data } = await supabase
                    .from('medicos')
                    .select('image_url')
                    .eq('user_id', session.user.id)
                    .maybeSingle();
                
                if (mounted && data?.image_url) {
                    setDoctorImageUrl(data.image_url);
                }
            }
        };
        fetchDoctorImage();
        return () => { mounted = false; };
    }, [session?.user?.id]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const menuItems = [
        { 
            id: 'consultas',
            href: '/medico/dashboard/consultas', 
            label: 'Consultas', 
            icon: Calendar 
        },
        { 
            id: 'pacientes',
            href: '/medico/dashboard/pacientes', 
            label: 'Pacientes', 
            icon: Users 
        }, 
        { 
            id: 'mensagens',
            href: '/medico/dashboard/mensagens',
            label: 'Mensagens', 
            icon: MessageSquare 
        },
        { 
            id: 'avaliacoes',
            href: '/medico/dashboard/avaliacoes',
            label: 'Avaliações', 
            icon: Star 
        },
        { 
            id: 'pagamentos',
            href: '/medico/dashboard/pagamentos', 
            label: 'Pagamentos', 
            icon: CreditCard 
        },
        { 
            id: 'financeiro',
            href: '/medico/dashboard/financeiro', 
            label: 'Financeiro', 
            icon: Wallet 
        },
        { 
            id: 'relatorios',
            href: '/medico/dashboard/relatorios',
            label: 'Relatórios', 
            icon: BarChart3 
        },
        { 
            id: 'agenda',
            href: '/medico/dashboard/agenda', 
            label: 'Agenda', 
            icon: Clock 
        },
        { 
            id: 'configuracoes',
            href: '/medico/dashboard/perfil',
            label: 'Configurações', 
            icon: Settings 
        },
        {
            id: 'procedimentos',
            href: '/medico/dashboard/procedimentos',
            label: 'Procedimentos',
            icon: Stethoscope
        },
        { 
            id: 'ajuda',
            href: '/medico/dashboard/ajuda', 
            label: 'Ajuda', 
            icon: HelpCircle 
        },
    ];

    if (loading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }
    
    if (!session) {
      return <Navigate to="/" replace />;
    }
    
    if (!profile) {
        return (
            <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h1 className="mt-4 text-2xl font-bold text-gray-900">Perfil não encontrado</h1>
                <p className="mt-2 text-gray-500">Não conseguimos carregar os dados do seu perfil.</p>
                <div className="mt-6 flex gap-4">
                    <Button onClick={() => window.location.reload()}>Recarregar</Button>
                    <Button variant="outline" onClick={handleSignOut}>Sair</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            {/* Sidebar positioned relatively with fixed width, always visible */}
            <aside className="w-[88px] bg-white border-r border-gray-200 flex flex-col items-center py-8 gap-6 z-20 flex-shrink-0">
                <div className="mb-4">
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <div className="p-0.5 rounded-full ring-2 ring-gray-100 hover:ring-blue-100 transition-all cursor-pointer">
                                <Avatar className="h-10 w-10 rounded-full">
                                    <AvatarImage src={doctorImageUrl} className="object-cover" />
                                    <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-sm rounded-full">
                                        {profile?.full_name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium bg-gray-900 text-white border-0 rounded-lg shadow-lg">
                            <p>{profile?.full_name}</p>
                            <p className="text-xs text-gray-400">Médico</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                <nav className="flex flex-col gap-4 w-full items-center flex-1 overflow-y-auto max-h-[calc(100vh-180px)] px-2 no-scrollbar">
                    {menuItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);
                        
                        return (
                            <Tooltip key={item.id} delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Link
                                        to={item.href}
                                        className={`
                                            relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 group
                                            ${isActive 
                                                ? 'text-blue-600 bg-blue-50 shadow-sm' 
                                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        <item.icon 
                                            size={22} 
                                            strokeWidth={isActive ? 2 : 1.5}
                                            className={`transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} 
                                        />
                                        {isActive && (
                                            <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full" />
                                        )}
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="font-medium bg-gray-900 text-white border-0 ml-3 rounded-lg shadow-xl px-3 py-1.5">
                                    {item.label}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </nav>

                <div className="mt-auto pt-4 flex flex-col gap-2 w-full items-center pb-4">
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleSignOut}
                                className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 group"
                            >
                                <LogOut size={20} strokeWidth={1.5} className="transition-transform group-hover:translate-x-0.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium bg-red-600 text-white border-red-600 ml-2 rounded-lg">
                            Sair da conta
                        </TooltipContent>
                    </Tooltip>
                </div>
            </aside>

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top navigation positioned relatively, always visible */}
                <DoctorAreaHeader />

                {/* Page content with Outlet/Routes */}
                <main className="flex-1 overflow-auto p-6 bg-gray-100">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Routes>
                            <Route path="/" element={<Navigate to="consultas" replace />} />
                            <Route path="consultas" element={<DoctorConsultations />} />
                            <Route path="pacientes" element={<PacientesListPage />} />
                            <Route path="mensagens" element={<MessagesPage />} />
                            <Route path="avaliacoes" element={<DoctorReviewsPage />} />
                            <Route path="procedimentos" element={<DoctorProceduresPage />} />
                            
                            {/* Core Features */}
                            <Route path="prescricoes" element={<DoctorDocuments />} />
                            <Route path="perfil" element={<DoctorProfile />} />
                            <Route path="agenda" element={<DoctorSchedule />} />
                            <Route path="financeiro" element={<DoctorFinance />} />
                            <Route path="pagamentos" element={<DoctorSubscriptionPage />} />
                            <Route path="seguranca" element={<DoctorSecurity />} />
                            <Route path="ajuda" element={<DoctorHelp />} />

                            {/* Placeholders */}
                            <Route path="relatorios" element={
                                <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-5">
                                    <div className="p-6 bg-white rounded-2xl shadow-sm">
                                        <BarChart3 className="h-10 w-10 text-blue-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Relatórios</h2>
                                        <p className="text-gray-500 max-w-sm mt-2">
                                            Métricas detalhadas e relatórios de desempenho da sua clínica estarão disponíveis aqui.
                                        </p>
                                    </div>
                                </div>
                            } />

                        </Routes>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DoctorArea;