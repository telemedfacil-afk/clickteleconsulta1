import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, Loader2, ShieldCheck as ShieldLock, XCircle, Calendar, User, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

const useCountdown = (targetDate) => {
    const countDownDate = new Date(targetDate).getTime();
    const [countDown, setCountDown] = useState(countDownDate - new Date().getTime());
    useEffect(() => {
        const interval = setInterval(() => {
            setCountDown(countDownDate - new Date().getTime());
        }, 1000);
        return () => clearInterval(interval);
    }, [countDownDate]);
    return getReturnValues(countDown);
};
const getReturnValues = (countDown) => {
    if (countDown < 0) {
        return { minutes: 0, seconds: 0, isExpired: true };
    }
    const minutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((countDown % (1000 * 60)) / 1000);
    return { minutes, seconds, isExpired: false };
};

const PaymentPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [appointment, setAppointment] = useState(null);
    const [loading, setLoading] = useState(true);

    const appointmentId = location.state?.appointmentId;
    const countdown = useCountdown(appointment?.expires_at);

    const isReservationActive = useMemo(() => {
        if (!appointment || !appointment.expires_at) return false;
        if (appointment.status === 'cancelado' || appointment.pagamento_status === 'expirado') return false;
        return !countdown.isExpired;
    }, [appointment, countdown.isExpired]);

    useEffect(() => {
        if (!appointmentId) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Nenhum agendamento encontrado para pagamento.',
            });
            navigate('/paciente/dashboard/consultas');
            return;
        }

        const fetchAppointment = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('agendamentos')
                .select('*, medico:medicos(name, specialty)')
                .eq('id', appointmentId)
                .single();

            if (error || !data) {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao buscar agendamento',
                    description: 'Não foi possível encontrar os detalhes da sua reserva.',
                });
                navigate('/paciente/dashboard/consultas');
                return;
            }
            setAppointment(data);
            setLoading(false);
        };

        fetchAppointment();

        const channel = supabase.channel(`appointment_payment_updates:${appointmentId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'agendamentos',
                filter: `id=eq.${appointmentId}`
            }, (payload) => {
                setAppointment(prev => ({ ...prev, ...payload.new }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [appointmentId, navigate, toast]);

    const handlePayment = () => {
        toast({
            title: "🚧 Pagamento em Desenvolvimento",
            description: "A integração com o sistema de pagamento será adicionada em breve. Por enquanto, o médico confirmará o pagamento manualmente.",
        });
        navigate('/paciente/dashboard/consultas');
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <h1 className="text-2xl font-semibold">Carregando página de pagamento...</h1>
            </div>
        );
    }

    if (!isReservationActive) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-12">
                <Card className="w-full max-w-lg border-destructive">
                    <CardHeader className="items-center">
                        <XCircle className="h-20 w-20 text-destructive" />
                        <CardTitle className="text-3xl pt-4">Reserva Expirada</CardTitle>
                        <CardDescription className="pt-2 max-w-md">
                            O tempo para pagamento deste agendamento acabou. O horário agora está disponível para outras pessoas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button size="lg" asChild className="w-full">
                            <Link to="/agendamentos">
                                Agendar um Novo Horário
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Pagamento - Click Teleconsulta</title>
            </Helmet>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl mx-auto"
            >
                <Card className="overflow-hidden">
                    <CardHeader className="bg-primary/5 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">Seu horário está reservado!</CardTitle>
                                <CardDescription className="mt-1">Realize o pagamento para garantir sua consulta.</CardDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-muted-foreground">Tempo restante</p>
                                <p className="text-3xl font-bold text-destructive tabular-nums">
                                    {String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="border rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-lg">Resumo da Consulta</h3>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground flex items-center gap-2"><User className="w-4 h-4"/> Médico</span>
                                <span className="font-medium">{appointment.medico.name}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4"/> Data e Hora</span>
                                <span className="font-medium">{new Date(appointment.appointment_date + 'T' + appointment.appointment_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg border-t pt-3 mt-3">
                                <span className="text-muted-foreground flex items-center gap-2 font-semibold"><Tag className="w-5 h-5"/> Total</span>
                                <span className="font-bold text-primary">R$ {(appointment.price_in_cents / 100).toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="font-semibold text-lg mb-3">Forma de Pagamento</h3>
                            <div className="border rounded-lg p-6 text-center bg-muted/30">
                                <p className="text-muted-foreground">A integração com pagamentos online (Cartão de Crédito, PIX) está sendo finalizada.</p>
                                <p className="text-sm text-muted-foreground mt-2">Por enquanto, o médico irá confirmar seu pagamento manualmente após o contato.</p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/50 p-6">
                        <Button size="lg" className="w-full" onClick={handlePayment}>
                            <ShieldLock className="w-5 h-5 mr-2" />
                            Entendido, ir para minhas consultas
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </>
    );
};

export default PaymentPage;