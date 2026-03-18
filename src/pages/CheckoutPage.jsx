import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ShieldCheck, ArrowLeft, UserCircle, FileText, Tag, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const PatientDataReview = ({ profile, user }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCircle className="w-6 h-6 text-primary"/> Dados do Paciente</CardTitle>
            <CardDescription>Estes são os dados que serão usados no seu agendamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
             <div className="flex justify-between items-center"><span>Nome Completo</span><span className="font-medium text-right">{profile?.full_name || 'Não informado'}</span></div>
             <div className="flex justify-between items-center"><span>CPF</span><span className="font-medium text-right">{profile?.cpf || 'Não informado'}</span></div>
             <div className="flex justify-between items-center"><span>Data de Nascimento</span><span className="font-medium text-right">{profile?.data_nasc ? new Date(profile.data_nasc + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}</span></div>
             <div className="flex justify-between items-center"><span>Telefone</span><span className="font-medium text-right">{profile?.whatsapp || 'Não informado'}</span></div>
             <div className="flex justify-between items-center"><span>E-mail</span><span className="font-medium text-right">{user?.email || 'Não informado'}</span></div>
        </CardContent>
    </Card>
);

const CheckoutPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { createConfirmedAppointment, refetchAppointments } = useAppointments();
    const { profile, user } = useAuth();
    const [isConfirming, setIsConfirming] = useState(false);
    
    const appointmentDetails = location.state?.appointmentDetails;
    
    const isProfileComplete = profile && profile.full_name && profile.cpf && profile.data_nasc && profile.whatsapp;

    useEffect(() => {
        if (!appointmentDetails) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Nenhum horário selecionado.',
            });
            navigate('/agendamentos');
        }
    }, [appointmentDetails, navigate, toast]);

    const handleGoToCompleteProfile = () => {
        navigate('/paciente/dashboard/dados', {
            state: {
                from: 'checkout',
                appointmentDetails: appointmentDetails
            }
        });
    };

    const handleConfirmAppointment = async () => {
        if (!isProfileComplete || !user || !appointmentDetails.medico_id) {
            toast({
                variant: 'destructive',
                title: 'Dados incompletos',
                description: 'Por favor, complete seu cadastro e selecione um horário válido.',
            });
            return;
        }

        setIsConfirming(true);
        
        const payload = {
            medico_id: appointmentDetails.medico_id,
            servico_id: appointmentDetails.servico_id,
            horario_inicio: appointmentDetails.horario_inicio,
            horario_fim: appointmentDetails.horario_fim,
            price_in_cents: appointmentDetails.price_in_cents,
        }

        const { data: newAppointment, error } = await createConfirmedAppointment(payload);

        if (error) {
            setIsConfirming(false);
            // Se o erro for de horário já agendado, redireciona para o painel de consultas sem exibir erro.
            if (error.message.includes('agendamentos_confirmados_unicos_idx')) {
                navigate('/paciente/dashboard/consultas');
                return;
            }

            // Para outros erros, exibe a notificação.
            toast({
                variant: "destructive",
                title: "Erro no Agendamento",
                description: error.message,
                duration: 5000,
            });
            setTimeout(() => navigate('/agendamentos'), 4000);

        } else if (newAppointment) {
            toast({
                title: "Guia gerada!",
                description: `Seu agendamento foi confirmado e a guia enviada ao médico.`,
                duration: 5000
            });
            
            await refetchAppointments();

            navigate('/agendamento-sucesso', { 
                replace: true, 
                state: { appointmentId: newAppointment.id }
            });
        }
    };

    if (!appointmentDetails || !profile) {
        return (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

  return (
    <>
        <Helmet>
            <title>Confirmar Agendamento - Click Teleconsulta</title>
        </Helmet>
        <div className="max-w-4xl mx-auto py-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold">Confirme seu Agendamento</h1>
                <p className="text-muted-foreground mt-2">Revise os detalhes abaixo para confirmar sua consulta.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
                <PatientDataReview profile={profile} user={user} />

                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileText className="w-6 h-6 text-primary"/> Detalhes da Consulta</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between items-center"><span>Médico</span><span className="font-medium text-right">{appointmentDetails.doctor_name}</span></div>
                            <div className="flex justify-between items-center"><span>Especialidade</span><span className="font-medium text-right">{appointmentDetails.specialty}</span></div>
                            <div className="flex justify-between items-center"><span>Data</span><span className="font-medium text-right">{new Date(appointmentDetails.horario_inicio).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span></div>
                            <div className="flex justify-between items-center"><span>Hora</span><span className="font-medium text-right">{new Date(appointmentDetails.horario_inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', timeZone: 'America/Sao_Paulo'})} (Brasília)</span></div>
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Tag className="w-6 h-6 text-primary"/> Valor</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">Total: R$ {(appointmentDetails.price_in_cents / 100).toFixed(2).replace('.', ',')}</p>
                            <p className="text-sm text-muted-foreground mt-1">O pagamento será confirmado pelo profissional.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            {!isProfileComplete && (
                <Card className="mt-8 bg-amber-50 border-amber-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <AlertTriangle className="w-8 h-8 text-amber-500" />
                        <div>
                            <h4 className="font-semibold text-amber-900">Dados Incompletos</h4>
                            <p className="text-sm text-amber-800">
                                Para continuar, por favor, complete seu cadastro na sua área de paciente.
                            </p>
                        </div>
                        <Button onClick={handleGoToCompleteProfile} className="ml-auto">
                            Completar Cadastro
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Card className="mt-8">
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
                    <Button variant="outline" type="button" onClick={() => navigate('/agendamentos')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar e Escolher Outro Horário
                    </Button>
                    <Button size="lg" onClick={handleConfirmAppointment} disabled={isConfirming || !isProfileComplete}>
                        {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                        Confirmar e Gerar Guia
                    </Button>
                </CardFooter>
            </Card>
        </div>
    </>
  );
};

export default CheckoutPage;