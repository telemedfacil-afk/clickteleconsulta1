import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Loader2, User, Calendar, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const AppointmentSuccessPage = () => {
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
        title: 'Erro de Navegação',
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
          guia:guias!agendamentos_guia_id_fkey(protocolo, pdf_url),
          patient:perfis_usuarios!agendamentos_patient_perfis_fkey(full_name)
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError || !appointmentData) {
        toast({
          variant: 'destructive',
          title: 'Erro ao Buscar Agendamento',
          description: 'Não foi possível encontrar os detalhes da sua confirmação.',
        });
        navigate('/paciente/dashboard/consultas');
        return;
      }
      
      setAppointment(appointmentData);
      setLoading(false);
    };

    fetchAppointmentAndGuide();

  }, [appointmentId, navigate, toast]);

  const handleDownloadGuide = () => {
    toast({
      title: "🚧 Em Breve!",
      description: "A geração do PDF da guia está sendo finalizada. Você poderá baixá-la em breve no seu painel!",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <h1 className="text-2xl font-semibold">Finalizando seu agendamento...</h1>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Agendamento Concluído! - Click Teleconsulta</title>
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="container mx-auto px-4 py-12"
      >
        <Card className="w-full max-w-2xl mx-auto overflow-hidden shadow-2xl shadow-primary/10">
          <CardHeader className="items-center bg-gradient-to-br from-green-50 to-emerald-50 p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
            >
              <CheckCircle className="h-24 w-24 text-green-500" />
            </motion.div>
            <CardTitle className="text-4xl font-bold text-gray-800 pt-4">
              Agendamento Concluído!
            </CardTitle>
            <CardDescription className="pt-2 max-w-md text-center text-lg">
              Sua consulta foi confirmada com sucesso. A guia já foi enviada ao médico.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="border rounded-lg">
              <div className="flex items-center gap-4 p-4 border-b">
                <FileText className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Protocolo da Guia</p>
                  <p className="font-bold text-xl tracking-wider">{appointment?.guia?.protocolo || 'Gerando...'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 border-b">
                <User className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Médico(a)</p>
                  <p className="font-semibold text-lg">{appointment?.medico?.public_name} ({appointment?.medico?.specialty})</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4">
                <Calendar className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Data e Hora (Horário de Brasília)</p>
                  <p className="font-semibold text-lg">{new Date(appointment?.horario_inicio).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}</p>
                </div>
              </div>
            </div>
            
            <div className="text-center text-muted-foreground text-sm pt-4">
                <p>O médico responsável entrará em contato para realizar o atendimento e enviar o link da consulta.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" variant="outline" onClick={handleDownloadGuide}>
                <Download className="mr-2 h-4 w-4" />
                Baixar Guia
              </Button>
              <Button size="lg" asChild>
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

export default AppointmentSuccessPage;