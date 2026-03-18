import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Video, CheckCircle2, User, AlertCircle, FileText, RefreshCw, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import TCLEConsentModal from '@/components/telemedicine/TCLEConsentModal';
import { openJitsiRoom } from '@/utils/telemedicineUtils';
import { useToast } from "@/components/ui/use-toast";

const GuestAppointmentPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { toast } = useToast();
    
    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [appointment, setAppointment] = useState(null);
    const [consentModalOpen, setConsentModalOpen] = useState(false);
    
    // Polling interval ref
    const [pollInterval, setPollInterval] = useState(null);

    const fetchAppointment = async (isPolling = false) => {
        if (!token) {
            setError('Token de acesso não fornecido.');
            setLoading(false);
            return;
        }

        if (!isPolling) setLoading(true);

        try {
            const { data: responseData, error: funcError } = await supabase.functions.invoke('get_guest_appointment_by_token', {
                body: { token }
            });

            if (funcError) {
                // If it's a network error during polling, just ignore/warn
                if (isPolling) {
                    console.warn("Polling error (network):", funcError);
                    return;
                }
                throw new Error(funcError.message || 'Erro ao conectar com o servidor.');
            }
            
            if (responseData?.error) {
                 if (isPolling && responseData.error === 'Token expired') {
                     // If expired during polling, stop polling and show error
                     clearInterval(pollInterval);
                 }
                 throw new Error(responseData.error);
            }

            const data = responseData.data;
            setAppointment(data);
            
            // Sync local storage state just in case
            const localConsent = localStorage.getItem(`consentAccepted:${data.id}`);
            if (localConsent === "true" && !data.consentAccepted) {
                 // We could potentially trigger a background sync here if needed, 
                 // but typically we rely on the modal flow to have updated the backend.
            }

        } catch (err) {
            if (!isPolling) {
                let msg = err.message || 'Erro ao carregar dados.';
                if (msg === 'Invalid or expired token') msg = 'Link inválido ou expirado.';
                if (msg === 'Token expired') msg = 'Este link expirou.';
                setError(msg);
            }
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointment();
        
        // Poll status every 10 seconds to check if doctor started (canJoin becomes true)
        const interval = setInterval(() => {
            fetchAppointment(true);
        }, 10000);
        
        setPollInterval(interval);
        
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleConsentSuccess = () => {
        // Refresh data to reflect consent status
        fetchAppointment();
    };

    const handleJoinClick = () => {
        if (!appointment?.videoRoom) {
            toast({
                title: "Erro",
                description: "Sala de vídeo não configurada.",
                variant: "destructive"
            });
            return;
        }
        
        const result = openJitsiRoom(appointment.videoRoom, appointment.guestName || "Visitante");
        
        if (!result.ok) {
             toast({
                title: "Erro ao abrir sala",
                description: "Verifique se o bloqueador de popups está desativado.",
                variant: "destructive"
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Carregando informações da consulta...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-red-100 shadow-lg">
                    <CardHeader>
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <CardTitle className="text-red-700 text-center">Acesso Indisponível</CardTitle>
                        <CardDescription className="text-center">{error}</CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const isConsentAccepted = appointment?.consentAccepted || localStorage.getItem(`consentAccepted:${appointment?.id}`) === "true";
    const canJoin = appointment?.canJoin;

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-xl border-blue-100">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 relative">
                        <Avatar className="w-24 h-24 border-4 border-white shadow-md mx-auto">
                            <AvatarImage src={appointment.doctorImage} />
                            <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
                                {appointment.doctorName?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-1/2 translate-x-10 bg-green-500 border-2 border-white w-5 h-5 rounded-full" title="Online"></div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">{appointment.doctorName}</CardTitle>
                    <CardDescription className="text-primary font-medium flex items-center justify-center gap-1">
                        {appointment.specialty}
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6 pt-4">
                    {/* Appointment Details */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                        <div className="flex items-center gap-3 text-gray-700 pb-3 border-b border-gray-50">
                            <User className="w-5 h-5 text-blue-500" />
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Paciente</p>
                                <p className="font-medium text-sm">{appointment.guestName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700 pb-3 border-b border-gray-50">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Data e Hora</p>
                                <p className="font-medium text-sm capitalize">
                                    {format(new Date(appointment.appointmentDate), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Status</p>
                                <p className="font-medium text-sm capitalize">{appointment.status === 'agendado' ? 'Confirmado' : appointment.status}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Area */}
                    <div className="space-y-4">
                        {!isConsentAccepted ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center space-y-3">
                                <div className="flex items-center justify-center gap-2 text-amber-800 font-semibold">
                                    <FileText className="w-5 h-5" />
                                    Termos de Uso
                                </div>
                                <p className="text-sm text-amber-700">
                                    Para acessar a videochamada, é necessário ler e aceitar os termos de consentimento.
                                </p>
                                <Button 
                                    onClick={() => setConsentModalOpen(true)}
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                                >
                                    Ler e Aceitar Termos
                                </Button>
                            </div>
                        ) : !canJoin ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center space-y-4">
                                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                                    <div className="absolute inset-0 bg-blue-400 rounded-full opacity-20 animate-ping"></div>
                                    <div className="relative bg-blue-100 p-3 rounded-full">
                                        <Clock className="w-8 h-8 text-blue-600" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-blue-900 text-lg">Sala de Espera</h3>
                                    <p className="text-blue-700 text-sm mt-1">
                                        Aguarde, o médico iniciará a chamada em breve...
                                    </p>
                                </div>
                                <div className="text-xs text-blue-500 animate-pulse">
                                    Atualizando status automaticamente
                                </div>
                            </div>
                        ) : (
                             <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                 <Button 
                                    className="w-full h-14 text-lg shadow-lg bg-green-600 hover:bg-green-700 transition-all hover:scale-[1.02]" 
                                    onClick={handleJoinClick}
                                 >
                                    <Video className="w-6 h-6 mr-3" />
                                    Entrar na Videochamada
                                </Button>
                                <p className="text-xs text-center text-gray-400">
                                    Ao clicar, uma nova janela segura será aberta.
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pt-4 border-t bg-gray-50/50 rounded-b-xl">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                        <User className="w-3 h-3" /> Acesso seguro para convidados
                    </div>
                </CardFooter>
            </Card>

            {/* Consent Modal */}
            <TCLEConsentModal
                open={consentModalOpen}
                onOpenChange={setConsentModalOpen}
                isGuest={true}
                appointmentId={appointment.id}
                consentToken={appointment.consentToken}
                onConsentSuccess={handleConsentSuccess}
            />
        </div>
    );
};

export default GuestAppointmentPage;