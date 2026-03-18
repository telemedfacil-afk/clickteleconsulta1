import React, { useMemo, useState } from 'react';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, Video, PlusCircle, CheckCircle2, AlertTriangle, XCircle, MousePointerClick, ExternalLink, Copy, FileText, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { useJitsiRoom } from '@/hooks/useJitsiRoom';
import PatientTelemedicineButton from '@/components/telemedicine/PatientTelemedicineButton';
import { generateJitsiURL } from '@/utils/telemedicineUtils';

const PatientConsultations = () => {
    const { appointments, loading, fetchAppointments } = useAppointments();
    const { toast } = useToast();
    const navigate = useNavigate();
    
    // Integrate Jitsi Hook for blocked room handling only
    const { generateRoomInfo } = useJitsiRoom();
    const [blockedRoom, setBlockedRoom] = useState(null);
    
    const upcomingAppointments = useMemo(() => appointments
        .filter(appt => ['confirmado', 'reagendado', 'pendente'].includes(appt.status))
        .sort((a, b) => new Date(a.horario_inicio) - new Date(b.horario_inicio)), [appointments]);

    const pastAppointments = useMemo(() => appointments
        .filter(appt => !['confirmado', 'reagendado', 'pendente'].includes(appt.status))
        .sort((a, b) => new Date(b.horario_inicio) - new Date(a.horario_inicio)), [appointments]);

    const getCallAccessibility = (scheduledTime, callOpenMinutesAfter = 30) => {
        const now = new Date();
        const scheduled = new Date(scheduledTime);
        const minutesUntil = (scheduled.getTime() - now.getTime()) / (1000 * 60);
        const minutesAfter = (now.getTime() - scheduled.getTime()) / (1000 * 60);
        
        // Allowed if within 60 mins before AND within allowable time after
        const isAccessible = minutesUntil <= 60 && minutesAfter <= callOpenMinutesAfter;
        const isTooEarly = minutesUntil > 60;
        const isExpired = minutesAfter > callOpenMinutesAfter;
        
        return { isAccessible, isTooEarly, isExpired, minutesUntil: Math.ceil(minutesUntil) };
    };

    const copyFallbackInfo = () => {
        if(!blockedRoom) return;
        navigator.clipboard.writeText(`${blockedRoom.url}\nSenha: ${blockedRoom.password}`);
        toast({ title: "Copiado!", description: "Link e senha copiados para a área de transferência." });
    };

    const StatusInfo = ({ status, paymentStatus }) => {
        let variant = 'default';
        let text = 'Confirmada';
        let icon = <CheckCircle2 className="w-3 h-3 mr-1.5" />;
        let className = "";
    
        if (status === 'confirmado' || status === 'reagendado' || status === 'pendente') {
            if (paymentStatus === 'pago') {
                variant = 'custom';
                className = "bg-blue-600 hover:bg-blue-700 text-white border-transparent"; // Blue for paid
                text = 'Confirmada e Paga';
            } else {
                variant = 'amber';
                text = 'Aguardando Pagamento';
                icon = <AlertTriangle className="w-3 h-3 mr-1.5" />;
            }
        } else if (status === 'atendido') {
            variant = 'success';
            text = 'Realizada';
        } else {
            variant = 'destructive';
            text = status === 'cancelado' ? 'Cancelada' : 'Expirada';
            icon = <XCircle className="w-3 h-3 mr-1.5" />;
        }
    
        return (
            <Badge variant={variant} className={`mb-2 sm:mb-0 h-7 flex items-center justify-center ${className}`}>
                {icon}
                {text}
            </Badge>
        );
    };

    const rowVariants = {
        initial: { opacity: 0, y: -10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, x: -20 },
    };

    const AppointmentList = ({ appointmentsList }) => {
        if (appointmentsList.length === 0) {
            return (
                <div className="text-center py-8 border-2 border-dashed rounded-lg mt-4">
                    <p className="text-muted-foreground mb-4">Nenhuma consulta encontrada nesta categoria.</p>
                    <Button asChild><Link to="/paciente/dashboard/agendar"><PlusCircle className="w-4 h-4 mr-2"/> Agendar nova consulta</Link></Button>
                </div>
            );
        }

        return (
            <ul className="space-y-4 mt-4">
                 <AnimatePresence>
                    {appointmentsList.map(appt => {
                        const callAccess = getCallAccessibility(appt.horario_inicio, appt.call_open_minutes_after);
                        const isUpcoming = ['confirmado', 'reagendado', 'pendente'].includes(appt.status);
                        
                        // Check status sala for "Waiting doctor" message
                        const doctorStarted = appt.status_sala === 'medico_iniciou';
                        
                        // Pass callback to refresh local data if consent changes
                        const handleConsentChange = (isAccepted) => {
                             // Optional: trigger a refetch if needed globally, though button handles its own state mostly
                             // fetchAppointments(); 
                        };

                        return (
                            <motion.li 
                                key={appt.id} 
                                layout
                                variants={rowVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="p-5 border rounded-lg shadow-sm bg-white hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div className="flex-1 cursor-pointer" onClick={() => navigate('/agendamento/confirmado', { state: { appointmentId: appt.id } })}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-bold text-lg text-gray-900">
                                                {appt.medicos?.public_name || appt.medicos?.name}
                                            </p>
                                            {doctorStarted && isUpcoming && (
                                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px] animate-pulse">
                                                    Ao vivo
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground font-medium mb-3">{appt.medicos?.specialty}</p>
                                        
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                                            <span className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded">
                                                <Calendar size={14} className="text-primary"/> 
                                                {new Date(appt.horario_inicio).toLocaleDateString('pt-BR', {timeZone: 'America/Sao_Paulo'})}
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded">
                                                <Clock size={14} className="text-primary"/> 
                                                {new Date(appt.horario_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                                       <div className="flex flex-wrap justify-end gap-2 w-full">
                                            {/* Badge */}
                                            <StatusInfo status={appt.status} paymentStatus={appt.pagamento_status} />
                                       </div>
                                        
                                        {/* Action Button: PatientTelemedicineButton now handles logic */}
                                        {isUpcoming && (
                                            <div className="w-full sm:w-auto">
                                                {callAccess.isAccessible ? (
                                                    <PatientTelemedicineButton 
                                                        appointment={appt} 
                                                        onConsentStatusChange={handleConsentChange}
                                                    />
                                                ) : (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="w-full sm:w-auto">
                                                                <Button 
                                                                    disabled 
                                                                    className="w-full sm:w-[200px] bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                                                >
                                                                    <Lock size={16} className="mr-2"/>
                                                                    Acessar videochamada
                                                                </Button>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" className="bg-slate-800 text-white border-slate-700">
                                                            <p className="text-xs flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                                                {callAccess.isTooEarly 
                                                                    ? `Disponível em ${callAccess.minutesUntil}min` 
                                                                    : "Expirado"}
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.li>
                        );
                    })}
                 </AnimatePresence>
            </ul>
        );
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-2xl font-bold text-gray-800">Minhas Consultas</CardTitle>
                <CardDescription>Gerencie seus agendamentos, realize pagamentos e acesse suas teleconsultas.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
                {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div> : (
                    <Tabs defaultValue="upcoming" className="w-full">
                        <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6">
                            <TabsTrigger value="upcoming">Próximas</TabsTrigger>
                            <TabsTrigger value="history">Histórico</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upcoming" className="mt-0">
                            <AppointmentList appointmentsList={upcomingAppointments} />
                        </TabsContent>
                        <TabsContent value="history" className="mt-0">
                            <AppointmentList appointmentsList={pastAppointments} />
                        </TabsContent>
                    </Tabs>
                )}
            </CardContent>
            
            {/* Popup Fallback Dialog */}
            <Dialog open={!!blockedRoom} onOpenChange={(open) => !open && setBlockedRoom(null)}>
                <DialogContent className="sm:max-w-md rounded-xl shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="w-5 h-5" />
                            Janela Bloqueada
                        </DialogTitle>
                        <DialogDescription>
                            O navegador bloqueou a abertura automática da videochamada.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-gray-600">
                            Utilize o botão abaixo para abrir a sala manualmente ou copie os dados de acesso.
                        </p>
                        <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10" 
                            onClick={() => blockedRoom && window.open(blockedRoom.url, '_blank')}
                        >
                            <ExternalLink className="w-4 h-4" />
                            Clique aqui para abrir manualmente
                        </Button>
                        
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                            <Button variant="outline" className="w-full text-xs" onClick={copyFallbackInfo}>
                                <Copy className="w-3 h-3 mr-2" />
                                Copiar Link e Senha
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setBlockedRoom(null)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default PatientConsultations;