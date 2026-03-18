import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { Loader2, Calendar, Users, DollarSign, Check, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import useAsync from '@/hooks/useAsync';

const DoctorDashboardPage = () => {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const { appointments: allAppointments, loading: appointmentsLoading, updateAppointmentStatus } = useAppointments();
    const [view, setView] = useState('agenda');

    const fetchDoctorProfile = React.useCallback(async () => {
        if (!user) return null;
        const { data, error } = await supabase.from('medicos').select('*').eq('user_id', user.id).single();
        if (error) {
            console.error("Error fetching doctor profile:", error);
            return null;
        }
        return data;
    }, [user]);

    const { value: doctorProfile, status: doctorProfileStatus, error: doctorProfileError } = useAsync(fetchDoctorProfile, true);

    const doctorAppointments = React.useMemo(() => {
        if (!doctorProfile) return [];
        return allAppointments.filter(appt => appt.medico_id === doctorProfile.id);
    }, [allAppointments, doctorProfile]);

    const handleCancel = async (id) => {
        await updateAppointmentStatus(id, 'cancelled');
    };
    
    const handleConfirm = async (id) => {
        await updateAppointmentStatus(id, 'confirmed');
    };

    const statusVariant = {
        'confirmado': 'default',
        'pendente': 'secondary',
        'atendido': 'outline',
        'cancelado': 'destructive',
        'pending_payment': 'secondary',
    };

    const TodayAppointments = () => {
        const today = new Date().toISOString().split('T')[0];
        const todaysAppts = doctorAppointments.filter(a => a.appointment_date === today && (a.status === 'confirmado' || a.status === 'pendente'));

        if (appointmentsLoading) {
            return <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
        }

        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Consultas de Hoje</h2>
                {todaysAppts.length > 0 ? todaysAppts.map(appt => (
                    <Card key={appt.id}>
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold">{appt.appointment_time?.slice(0,5)}</p>
                                <p>Paciente: <span className="text-muted-foreground">{appt.paciente_nome || "Nome não disponível"}</span></p>
                                <Badge variant={statusVariant[appt.status] || 'default'}>{appt.status}</Badge>
                            </div>
                            <div className="flex gap-2">
                                {appt.status === 'pendente' && <Button size="sm" onClick={() => handleConfirm(appt.id)}><Check className="w-4 h-4 mr-1"/> Confirmar</Button>}
                                <Button size="sm" variant="destructive" onClick={() => handleCancel(appt.id)}><X className="w-4 h-4 mr-1"/> Cancelar</Button>
                            </div>
                        </CardContent>
                    </Card>
                )) : <p>Nenhuma consulta para hoje.</p>}
            </div>
        );
    }

    const NotAvailable = () => {
        toast({
            title: "🚧 Funcionalidade em desenvolvimento!",
            description: "Você pode solicitar esta funcionalidade no próximo prompt! 🚀",
        });
        return (
            <div>
                <h2 className="text-2xl font-semibold">{view === 'config' ? 'Configurar Agenda' : 'Financeiro'}</h2>
                <p className="text-muted-foreground mt-4">Esta funcionalidade está em desenvolvimento e estará disponível em breve.</p>
            </div>
        )
    };
    
    return (
        <>
            <Helmet><title>Painel do Médico - Click Teleconsulta</title></Helmet>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold">Painel do Médico</h1>
                    <p className="text-muted-foreground">Bem-vindo(a), {profile?.full_name}!</p>
                </div>

                <div className="flex gap-2 border-b pb-2">
                    <Button variant={view === 'agenda' ? 'secondary' : 'ghost'} onClick={() => setView('agenda')}>Consultas do Dia</Button>
                    <Button variant={view === 'config' ? 'secondary' : 'ghost'} onClick={() => setView('config')}>Ajustar Agenda</Button>
                    <Button variant={view === 'financeiro' ? 'secondary' : 'ghost'} onClick={() => setView('financeiro')}>Financeiro</Button>
                </div>

                {doctorProfileStatus === 'pending' ? <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div> : (
                    <>
                        {view === 'agenda' && <TodayAppointments />}
                        {(view === 'config' || view === 'financeiro') && <NotAvailable />}
                    </>
                )}
            </div>
        </>
    );
};

export default DoctorDashboardPage;