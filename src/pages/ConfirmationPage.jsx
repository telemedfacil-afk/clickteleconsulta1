import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Loader2, User, Calendar, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const ConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  const appointmentId = location.state?.appointmentId;

  useEffect(() => {
    if (!appointmentId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum agendamento encontrado para confirmação.',
      });
      navigate('/paciente/dashboard/consultas');
      return;
    }

    const fetchAppointmentAndGuide = async () => {
      setLoading(true);
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('agendamentos')
        .select(`
          *, 
          medico:medicos(public_name, specialty), 
          guias:guia_id(*)
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError || !appointmentData) {
        toast({
          variant: 'destructive',
          title: 'Erro ao buscar agendamento',
          description: 'Não foi possível encontrar os detalhes da sua confirmação.',
        });
        navigate('/paciente/dashboard/consultas');
        return;
      }
      
      setAppointment(appointmentData);
      setLoading(false);
    };

    fetchAppointmentAndGuide();
    
    const channel = supabase.channel(`public:agendamentos:id=eq.${appointmentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'agendamentos',
        filter: `id=eq.${appointmentId}`
      }, async (payload) => {
         const { data: guideData, error: guideError } = await supabase
          .from('guias')
          .select('*')
          .eq('agendamento_id', payload.new.id)
          .maybeSingle();

        setAppointment(prev => ({...prev, ...payload.new, guias: guideData || null}))
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }

  }, [appointmentId, navigate, toast]);

  const handleDownloadGuide = () => {
    toast({
      title: "🚧 Em Breve!",
      description: "A geração do PDF da guia está sendo finalizada. Você poderá baixá-la em breve!",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <h1 className="text-2xl font-semibold">Carregando confirmação...</h1>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Agendamento Confirmado! - Click Teleconsulta</title>
      </Helmet>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center text-center py-12"
      >
        <Card className="w-full max-w-2xl">
          <CardHeader className="items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
            >
              <CheckCircle className="h-20 w-20 text-green-500" />
            </motion.div>
            <CardTitle className="text-3xl pt-4">
              Horário agendado com sucesso!
            </CardTitle>
            <CardDescription className="pt-2 max-w-md">
              Seu horário foi confirmado e a guia foi enviada ao médico responsável. Você receberá o contato do médico em breve, que fará seu atendimento e enviará o link da consulta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-left">
            <div className="border-t border-b divide-y">
              <div className="flex items-center gap-4 p-4">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Protocolo da Guia</p>
                  <p className="font-bold text-lg">{appointment?.protocolo || 'Gerando...'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4">
                <User className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Médico</p>
                  <p className="font-medium">{appointment?.medico?.public_name} ({appointment?.medico?.specialty})</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4">
                <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Data e Hora</p>
                  <p className="font-medium">{new Date(appointment?.appointment_date + 'T' + appointment?.appointment_time).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" variant="outline" onClick={handleDownloadGuide}>
                <Download className="mr-2 h-4 w-4" />
                Baixar Guia
              </Button>
              <Button size="lg" asChild variant="default">
                <Link to="/paciente/dashboard/consultas">
                  Ir para Minhas Consultas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
};

export default ConfirmationPage;