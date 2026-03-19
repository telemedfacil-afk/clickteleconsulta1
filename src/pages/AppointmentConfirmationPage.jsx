
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Helmet } from 'react-helmet';
import { Loader2, CheckCircle, User, Calendar, DollarSign, FileText, Video, MessageCircle, Copy, Download, ArrowRight, CreditCard, Landmark, QrCode, ShieldCheck, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// Telemedicine Components
import DoctorTelemedicineButton from '@/components/telemedicine/DoctorTelemedicineButton';
import PatientTelemedicineButton from '@/components/telemedicine/PatientTelemedicineButton';
import TelemedicineStatusIndicator from '@/components/telemedicine/TelemedicineStatusIndicator';
import TelemedicineLogsTable from '@/components/telemedicine/TelemedicineLogsTable';

const AppointmentConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { profile, session } = useAuth();
  
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);

  // Get ID from state (normal flow) or URL (after Stripe redirect)
  const appointmentId = location.state?.appointmentId || searchParams.get('appointmentId');
  const sessionId = searchParams.get('session_id');

  // Verify Stripe Payment if session_id exists
  useEffect(() => {
    const verifyPayment = async () => {
      if (sessionId && appointmentId && !verifyingPayment) {
        setVerifyingPayment(true);
        try {
          const { data, error } = await supabase.functions.invoke('verify-stripe-payment', {
            body: { sessionId, appointmentId }
          });

          if (error) throw error;

          if (data.success) {
            toast({
              title: "Pagamento Confirmado!",
              description: "Sua consulta foi confirmada com sucesso.",
              variant: "success"
            });
            // Clean URL params
            navigate('.', { replace: true, state: { appointmentId } });
          } else {
             toast({
              title: "Pagamento não confirmado",
              description: "Ainda não identificamos o pagamento. Tente novamente ou aguarde alguns instantes.",
              variant: "warning"
            });
          }
        } catch (err) {
          console.error("Payment verification failed:", err);
          toast({
            title: "Erro na verificação",
            description: "Não foi possível verificar o status do pagamento.",
            variant: "destructive"
          });
        } finally {
          setVerifyingPayment(false);
        }
      }
    };
    
    verifyPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, appointmentId]);

  useEffect(() => {
    if (!appointmentId) {
      navigate('/paciente/dashboard/consultas');
      return;
    }

    const fetchAppointmentAndSettings = async () => {
      setLoading(true);
      try {
        // Fetch Admin Settings
        const { data: configData, error: configError } = await supabase
          .from('configuracoes_site')
          .select('settings')
          .limit(1)
          .maybeSingle();

        if (configError) throw configError;
        setAdminSettings(configData?.settings?.payment_settings || {});

        // Fetch Appointment
        const { data, error } = await supabase
            .from('agendamentos')
            .select(`
            *,
            medico:medicos(public_name, specialty, price_in_cents, clinic_logo_url, crm, uf, name),
            guia:guia_id(*),
            patient:perfis_usuarios!agendamentos_patient_perfis_fkey(full_name, cpf, data_nasc, whatsapp, email)
            `)
            .eq('id', appointmentId)
            .single();

        if (error || !data) {
            console.error("Error fetching appointment:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar o agendamento.' });
            navigate('/paciente/dashboard/consultas');
        } else {
            setAppointment(data);
        }

      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
         setLoading(false);
      }
    };

    fetchAppointmentAndSettings();

    const channel = supabase.channel(`confirmation-page-${appointmentId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'agendamentos', 
        filter: `id=eq.${appointmentId}` 
      }, async (payload) => {
          const { data } = await supabase
            .from('agendamentos')
            .select('*, medico:medicos(public_name, specialty, price_in_cents, clinic_logo_url, crm, uf, name), guia:guia_id(*), patient:perfis_usuarios!agendamentos_patient_perfis_fkey(full_name, cpf, data_nasc, whatsapp, email)')
            .eq('id', appointmentId)
            .single();
          if (data) setAppointment(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointmentId, navigate, toast]);

  const handleStripePayment = async () => {
    if (!appointment) return;
    
    setProcessingPayment(true);
    try {
        const { data, error } = await supabase.functions.invoke('create-stripe-session', {
            body: {
                appointmentId: appointment.id,
                priceInCents: appointment.price_in_cents,
                title: `Consulta com ${appointment.medico?.public_name}`,
                successUrl: `${window.location.origin}/agendamento/confirmado?appointmentId=${appointment.id}`,
                cancelUrl: `${window.location.origin}/agendamento/confirmado?appointmentId=${appointment.id}`
            }
        });

        if (error) throw error;
        if (data?.url) {
            window.location.href = data.url;
        } else {
            throw new Error("No checkout URL returned");
        }
    } catch (err) {
        console.error("Stripe error:", err);
        toast({
            variant: "destructive",
            title: "Erro ao iniciar pagamento",
            description: "Não foi possível conectar com o Stripe. Tente novamente."
        });
        setProcessingPayment(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = adminSettings?.whatsapp_number || '5511999999999'; 
    const message = adminSettings?.whatsapp_message 
        ? encodeURIComponent(`${adminSettings.whatsapp_message} (Protocolo: ${appointment?.protocolo})`)
        : encodeURIComponent(`Olá, gostaria de confirmar o pagamento do agendamento ${appointment?.protocolo || ''}`);
        
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const generatePDF = async () => {
    if (!appointment) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Dados do agendamento não encontrados.' });
        return;
    }
    
    setGeneratingPDF(true);
    try {
        const element = document.getElementById('pdf-content-container');
        if (!element) throw new Error("Elemento do PDF não encontrado na página.");

        const canvas = await html2canvas(element, {
            scale: 2, // Higher quality
            useCORS: true,
            logging: false,
            windowWidth: 800 // Force width to avoid responsive shifts
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // A4 proportions
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`guia-agendamento-${appointment.id.substring(0, 8)}.pdf`);
        
        toast({ title: "Sucesso", description: "Guia baixada com sucesso!" });
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        toast({ variant: "destructive", title: "Erro", description: "Falha ao gerar o arquivo PDF. Tente novamente." });
    } finally {
        setGeneratingPDF(false);
    }
  };

  if (loading || verifyingPayment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold">{verifyingPayment ? "Verificando pagamento..." : "Carregando detalhes..."}</h2>
      </div>
    );
  }

  if (!appointment) return null;

  const { medico, patient, appointment_date, appointment_time, price_in_cents, status, protocolo, guia, pagamento_status } = appointment;
  const paymentSettings = adminSettings || {};
  
  const formattedDate = new Date(appointment_date + 'T' + appointment_time).toLocaleString('pt-BR', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  const shortDate = new Date(appointment_date + 'T' + appointment_time).toLocaleDateString('pt-BR');
  const shortTime = new Date(appointment_date + 'T' + appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const isPaid = pagamento_status === 'pago';
  const isDoctor = profile?.role === 'medico' || profile?.role === 'admin';

  return (
    <>
      <Helmet>
        <title>Agendamento Confirmado - Click Teleconsulta</title>
      </Helmet>
      
      <div className="max-w-4xl mx-auto py-8 px-4 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center p-3 bg-green-100 text-green-600 rounded-full mb-4">
             <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Agendamento Realizado com Sucesso!</h1>
          <p className="text-muted-foreground mt-2 text-lg">Seu horário está reservado. {isPaid ? 'O pagamento foi confirmado.' : 'Finalize o pagamento para garantir sua consulta.'}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* TELEMEDICINE SECTION */}
            {isPaid && (
              <Card className="border-l-4 border-l-blue-600 shadow-md bg-blue-50/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Stethoscope className="w-6 h-6" /> Sala de Teleconsulta
                    </CardTitle>
                    <TelemedicineStatusIndicator appointmentId={appointmentId} />
                  </div>
                  <CardDescription>
                    Acesso seguro à videochamada.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
                  <div className="text-sm text-gray-600 max-w-sm">
                    {isDoctor 
                      ? "Como médico, você deve iniciar a consulta para que o paciente possa entrar."
                      : "Aguarde o médico iniciar o atendimento para acessar a sala."
                    }
                  </div>
                  
                  {isDoctor ? (
                    <DoctorTelemedicineButton appointment={appointment} />
                  ) : (
                    <PatientTelemedicineButton appointment={appointment} />
                  )}
                </CardContent>
                
                {/* LOGS TABLE (Only for Doctor/Admin) */}
                {isDoctor && (
                  <div className="px-6 pb-6">
                    <TelemedicineLogsTable appointmentId={appointmentId} />
                  </div>
                )}
              </Card>
            )}

            {/* Detalhes do Agendamento */}
            <Card className="border-t-4 border-t-primary shadow-md h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Detalhes da Consulta
                </CardTitle>
                <CardDescription>Protocolo: <span className="font-mono font-bold text-primary">{protocolo || 'Gerando...'}</span></CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                   <div className="md:col-span-2 space-y-2 pb-4 border-b">
                     <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
                          <User className="w-4 h-4" /> Dados do Paciente
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div><p className="text-sm text-muted-foreground">Nome Completo</p><p className="font-medium text-gray-800">{patient?.full_name}</p></div>
                          <div><p className="text-sm text-muted-foreground">CPF</p><p className="font-medium text-gray-800">{patient?.cpf}</p></div>
                     </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Video className="w-4 h-4" /> Tipo</div>
                    <p className="font-bold text-lg">Teleconsulta (Online)</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Calendar className="w-4 h-4" /> Data e Hora</div>
                    <p className="font-semibold capitalize">{formattedDate}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Status do Agendamento:</span>
                      <Badge variant="outline" className={cn("text-sm font-semibold", status === 'confirmado' ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800")}>
                        {status === 'confirmado' ? 'Confirmado' : status}
                      </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 justify-center p-6 flex flex-col sm:flex-row gap-3">
                 <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={generatePDF} disabled={generatingPDF}>
                    {generatingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {generatingPDF ? 'Gerando PDF...' : 'Baixar Guia PDF'}
                 </Button>
                 
                 {!isDoctor && (
                     <Button variant="ghost" asChild className="w-full sm:w-auto">
                        <Link to="/paciente/dashboard/consultas">Ir para Minhas Consultas</Link>
                     </Button>
                 )}
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar Column: Payment & Contact */}
          <div className="space-y-6">
            <Card className="bg-white border shadow-md h-fit overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pagamento_status === 'pago' ? (
                     <div className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-4">
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                            <ShieldCheck className="h-8 w-8 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-green-700">Pagamento Confirmado</h3>
                            <p className="text-sm text-muted-foreground mt-1">Sua consulta está garantida.</p>
                        </div>
                     </div>
                ) : (
                    <Tabs defaultValue="pix" className="w-full">
                        <TabsList className="w-full grid grid-cols-2 rounded-none border-b h-12">
                            <TabsTrigger value="pix" className="rounded-none h-full">PIX / Transferência</TabsTrigger>
                            <TabsTrigger value="card" className="rounded-none border-r h-full">Cartão de Crédito</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="card" className="p-6 space-y-6 mt-0">
                             <Button size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleStripePayment} disabled={processingPayment}>
                                {processingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                                Pagar R$ {(price_in_cents / 100).toFixed(2).replace('.', ',')}
                            </Button>
                        </TabsContent>

                        <TabsContent value="pix" className="p-6 space-y-6 mt-0">
                           <p className="text-sm text-muted-foreground mb-2">Realize o pagamento e envie o comprovante.</p>
                           {paymentSettings.pix_key && (
                               <div className="bg-muted p-2 rounded mb-3">
                                    <code className="text-xs block overflow-hidden font-bold">{paymentSettings.pix_key}</code>
                               </div>
                           )}
                           <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={handleWhatsApp}>
                                <MessageCircle className="w-4 h-4" /> Enviar Comprovante
                           </Button>
                        </TabsContent>
                    </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* HIDDEN PDF TEMPLATE */}
        <div className="absolute left-[-9999px] top-0 z-[-1] overflow-hidden pointer-events-none">
            <div id="pdf-content-container" className="w-[800px] bg-white p-12 text-gray-900 font-sans border border-gray-100">
                {/* PDF Header */}
                <div className="flex flex-col items-center border-b-2 border-primary/20 pb-6 mb-8 text-center">
                    <h1 className="text-3xl font-black uppercase text-primary tracking-tight">GUIA DE AGENDAMENTO</h1>
                    <p className="text-gray-500 font-medium mt-1 text-lg">Click Teleconsulta</p>
                    <div className="mt-4 px-4 py-1.5 bg-gray-100 rounded-full text-sm font-mono text-gray-700 font-bold border border-gray-200">
                        Protocolo: {protocolo || 'N/A'}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    {/* Appointment Info */}
                    <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-blue-800 mb-4 border-b border-blue-200 pb-2">Informações da Consulta</h2>
                        <div className="space-y-3">
                            <div><p className="text-xs text-blue-600 font-semibold">DATA E HORA</p><p className="font-bold text-gray-800 text-lg">{shortDate} às {shortTime}</p></div>
                            <div><p className="text-xs text-blue-600 font-semibold">TIPO DE ATENDIMENTO</p><p className="font-medium text-gray-800">Teleconsulta (Online por Vídeo)</p></div>
                            <div><p className="text-xs text-blue-600 font-semibold">STATUS DO AGENDAMENTO</p><p className="font-medium text-gray-800">{status === 'confirmado' ? 'Confirmado' : status}</p></div>
                        </div>
                    </div>

                    {/* Doctor Info */}
                    <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-800 mb-4 border-b border-indigo-200 pb-2">Profissional</h2>
                        <div className="space-y-3">
                            <div><p className="text-xs text-indigo-600 font-semibold">NOME DO MÉDICO(A)</p><p className="font-bold text-gray-800">{medico?.public_name || medico?.name || 'Não informado'}</p></div>
                            <div><p className="text-xs text-indigo-600 font-semibold">ESPECIALIDADE</p><p className="font-medium text-gray-800">{medico?.specialty || 'Não informado'}</p></div>
                            <div><p className="text-xs text-indigo-600 font-semibold">REGISTRO (CRM)</p><p className="font-medium text-gray-800">{medico?.crm ? `${medico.crm} - ${medico.uf || ''}` : 'Não informado'}</p></div>
                        </div>
                    </div>
                </div>

                {/* Patient Info */}
                <div className="mb-8">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-200 pb-2">Dados do Paciente</h2>
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 grid grid-cols-2 gap-4">
                        <div><p className="text-xs text-gray-500 font-semibold">NOME COMPLETO</p><p className="font-medium text-gray-800">{patient?.full_name || 'Não informado'}</p></div>
                        <div><p className="text-xs text-gray-500 font-semibold">CPF</p><p className="font-medium text-gray-800">{patient?.cpf || 'Não informado'}</p></div>
                        <div><p className="text-xs text-gray-500 font-semibold">E-MAIL</p><p className="font-medium text-gray-800">{patient?.email || 'Não informado'}</p></div>
                        <div><p className="text-xs text-gray-500 font-semibold">TELEFONE (WHATSAPP)</p><p className="font-medium text-gray-800">{patient?.whatsapp || 'Não informado'}</p></div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mb-8 border border-amber-200 bg-amber-50/50 p-6 rounded-xl">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-amber-800 mb-3 flex items-center gap-2">
                        Instruções Importantes
                    </h2>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 font-medium">
                        <li>Conecte-se com pelo menos <strong>10 minutos de antecedência</strong> do horário agendado.</li>
                        <li>Verifique se a sua <strong>câmera e microfone</strong> estão funcionando corretamente antes de entrar na sala.</li>
                        <li>Escolha um <strong>ambiente silencioso e iluminado</strong> para a sua consulta.</li>
                        <li>Tenha em mãos seus documentos de identificação e exames anteriores, caso possua.</li>
                        <li>Certifique-se de que sua <strong>conexão com a internet está estável</strong>.</li>
                    </ul>
                </div>

                {/* Access Link Info */}
                <div className="bg-gray-900 text-white p-6 rounded-xl text-center mb-8">
                    <h3 className="font-bold text-lg mb-2">Como acessar sua consulta?</h3>
                    <p className="text-gray-300 text-sm mb-4">
                        O link de acesso seguro para a sala de videochamada foi enviado para o seu e-mail cadastrado e também estará disponível na sua área do paciente na plataforma <strong>Click Teleconsulta</strong>.
                    </p>
                    <p className="text-xs text-gray-400">Em caso de dúvidas, contate nosso suporte técnico.</p>
                </div>

                {/* PDF Footer */}
                <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400 flex justify-between items-center">
                    <p>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
                    <p className="font-bold">Click Teleconsulta - Plataforma de Telemedicina</p>
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default AppointmentConfirmationPage;
