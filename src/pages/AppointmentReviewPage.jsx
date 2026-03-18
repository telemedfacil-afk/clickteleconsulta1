import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, User, ArrowLeft, CheckCircle2, AlertCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { Helmet } from 'react-helmet';
import { Loader2 } from 'lucide-react';

const AppointmentReviewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { createConfirmedAppointment } = useAppointments();
  const [isLoading, setIsLoading] = useState(false);

  const appointmentDetails = location.state?.appointmentDetails;

  useEffect(() => {
    if (!appointmentDetails) {
      navigate('/agendamentos');
    }
  }, [appointmentDetails, navigate]);

  if (!appointmentDetails) return null;

  const { doctor_name, specialty, appointment_date, appointment_time, price_in_cents } = appointmentDetails;
  const formattedDate = format(new Date(appointment_date + 'T00:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedPrice = (price_in_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleConfirm = async () => {
    setIsLoading(true);
    // Notification creation is handled by database triggers on table 'agendamentos'
    const { data, error } = await createConfirmedAppointment(appointmentDetails);
    setIsLoading(false);

    if (error) {
      return;
    }

    if (data) {
      navigate('/agendamento/confirmado', { state: { appointmentId: data.id } });
    }
  };

  return (
    <>
      <Helmet>
        <title>Revisar Agendamento - Click Teleconsulta</title>
      </Helmet>
      
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate('/agendamentos')} className="mb-4 pl-0 hover:pl-2 transition-all">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para seleção de horários
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2 border-primary/10 shadow-xl overflow-hidden">
            <div className="bg-primary/5 p-6 border-b border-primary/10 text-center">
               <h2 className="text-2xl font-bold text-primary mb-2">Revise seu Agendamento</h2>
               <p className="text-muted-foreground">Confirme os dados abaixo para gerar sua guia de atendimento.</p>
            </div>
            
            <CardContent className="p-8 space-y-6">
              
              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                <div className="bg-primary/10 p-3 rounded-full">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Profissional</p>
                  <p className="text-lg font-bold">{doctor_name}</p>
                  <p className="text-sm text-primary">{specialty}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data</p>
                    <p className="font-semibold capitalize">{formattedDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Horário</p>
                    <p className="font-semibold">{appointment_time}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20">
                 <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                       <p className="text-sm font-medium text-green-800 dark:text-green-300">Tipo de Consulta</p>
                       <p className="font-bold text-green-900 dark:text-green-100">Telemedicina (Online)</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">Valor</p>
                    <p className="text-xl font-bold text-primary">{formattedPrice}</p>
                 </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/10 p-4 rounded-lg flex gap-3 text-sm text-amber-800 dark:text-amber-200 border border-amber-100 dark:border-amber-900/20">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>Ao confirmar, o horário será reservado exclusivamente para você. O pagamento deverá ser realizado na próxima etapa.</p>
              </div>

            </CardContent>
            
            <CardFooter className="p-6 bg-muted/10 flex flex-col gap-3">
              <Button 
                size="lg" 
                className="w-full text-lg font-bold h-12 shadow-lg transition-all hover:scale-[1.01]" 
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Confirmar e Gerar Guia
                    <CheckCircle2 className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/agendamentos')} disabled={isLoading}>
                Cancelar
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default AppointmentReviewPage;