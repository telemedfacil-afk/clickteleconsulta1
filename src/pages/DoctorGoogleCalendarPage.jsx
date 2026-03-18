import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, AlertTriangle, XCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const DoctorGoogleCalendarPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [calendarInfo, setCalendarInfo] = useState({ email: null, loading: true, error: null });

    const getGoogleUserEmail = useCallback(async (accessToken) => {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!response.ok) {
                if (response.status === 401) return null; // Expired token
                throw new Error('Falha ao buscar informações do usuário Google');
            }
            const data = await response.json();
            return data.email;
        } catch (error) {
            console.error("Erro ao buscar email do usuário Google: ", error);
            return null;
        }
    }, []);

    const handleDisconnect = useCallback(async () => {
        if (!user) return;
        try {
            await supabase.from('medico_integracoes').delete().match({ medico_user_id: user.id, provider: 'google_calendar' });
            toast({ title: 'Desconectado', description: 'A integração com o Google Calendar foi removida.' });
            navigate('/medico/dashboard/integracoes');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao desconectar', description: error.message });
        }
    }, [user, toast, navigate]);

    useEffect(() => {
        const fetchIntegration = async () => {
            if (!user) return;
            setCalendarInfo({ email: null, loading: true, error: null });

            const { data: integration, error } = await supabase
                .from('medico_integracoes')
                .select('access_token')
                .eq('medico_user_id', user.id)
                .eq('provider', 'google_calendar')
                .maybeSingle();

            if (error || !integration) {
                setCalendarInfo({ email: null, loading: false, error: 'Integração não encontrada. Por favor, conecte sua conta novamente.' });
                navigate('/medico/dashboard/integracoes');
                return;
            }

            const email = await getGoogleUserEmail(integration.access_token);
            if (!email) {
                // Token probably expired, disconnect silently and redirect
                await handleDisconnect();
                return;
            }

            setCalendarInfo({ email, loading: false, error: null });
        };

        fetchIntegration();
    }, [user, navigate, getGoogleUserEmail, handleDisconnect]);

    if (calendarInfo.loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (calendarInfo.error) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro na Integração</AlertTitle>
                <AlertDescription>{calendarInfo.error}</AlertDescription>
            </Alert>
        );
    }

    const calendarSrc = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarInfo.email)}&ctz=America/Sao_Paulo`;

    return (
        <>
            <Helmet>
                <title>Google Calendar - Painel do Médico</title>
            </Helmet>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Google Calendar</h1>
                        <p className="text-muted-foreground">Sua agenda sincronizada. Conectado como: {calendarInfo.email}</p>
                    </div>
                    <Button variant="destructive" onClick={handleDisconnect}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Desconectar
                    </Button>
                </div>

                <div className="rounded-lg border overflow-hidden aspect-video">
                    <iframe
                        src={calendarSrc}
                        style={{ border: 0 }}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        title="Google Calendar"
                    ></iframe>
                </div>
            </div>
        </>
    );
};

export default DoctorGoogleCalendarPage;