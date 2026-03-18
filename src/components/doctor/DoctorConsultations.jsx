import React, { useState, useMemo, useEffect } from 'react';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Check, Search, MoreHorizontal, Trash2, CreditCard, CheckCircle2, Eye, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, XCircle, Link as LinkIcon, Clock, Calendar as CalendarIcon, Video, User, Smartphone, Mail, Plus, UserPlus, Copy, Send, Key, CalendarClock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { buildJitsiRoomId } from '@/utils/jitsiRoomId';
import { openJitsiRoom } from '@/utils/telemedicineUtils';

// Constants
const ITEMS_PER_PAGE = 10;
const EMPTY_STATE_ILLUSTRATION_URL = "https://horizons-cdn.hostinger.com/678b5778-a611-4960-82cc-681a679036f7/96e325ac2ebbbb7adca36032e2f749d0.png";

// ... [Keep GuestTokenDialog, RescheduleDialog, NewGuestAppointmentDialog, PatientDetailsDialog EXACTLY as they are in the provided file. I will not repeat them here to save tokens unless necessary, but the instruction says "You must provide the complete file content". So I will include them.]

const GuestTokenDialog = ({ appointment, open, onOpenChange }) => {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open && appointment) {
            setLoading(true);
            const fetchToken = async () => {
                try {
                    const { data, error } = await supabase
                        .from('guest_access_tokens')
                        .select('token')
                        .eq('appointment_id', appointment.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    
                    if (error) throw error;

                    if (data) {
                        setToken(data.token);
                    } else {
                        setToken(null);
                    }
                } catch (e) {
                    console.error("Error fetching token:", e);
                    toast({ title: "Erro", description: "Não foi possível recuperar o token de acesso.", variant: "destructive" });
                } finally {
                    setLoading(false);
                }
            };
            fetchToken();
        } else {
            setToken(null);
        }
    }, [open, appointment, toast]);

    const url = token ? `${window.location.origin}/paciente/guest?token=${token}` : '';

    const copyToClipboard = () => {
         if (!url) return;
         navigator.clipboard.writeText(url);
         toast({ title: "Link copiado!", description: "O link de acesso foi copiado para a área de transferência." });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
           <DialogContent className="sm:max-w-md rounded-xl border-gray-100 shadow-xl">
               <DialogHeader>
                   <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                       <Key className="w-5 h-5 text-blue-600" />
                       Acesso do Paciente
                   </DialogTitle>
                   <DialogDescription>
                       Link de acesso exclusivo para <strong>{appointment?.guest_patients?.name || appointment?.perfis_usuarios?.full_name || 'Paciente Convidado'}</strong>.
                   </DialogDescription>
               </DialogHeader>
               
               <div className="py-4">
                   {loading ? (
                       <div className="flex justify-center py-4">
                           <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                       </div>
                   ) : token ? (
                       <div className="space-y-4">
                           <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                               <Label className="text-xs text-blue-800 font-bold uppercase tracking-wider mb-2 block">
                                   Link da Videochamada
                               </Label>
                               <div className="flex gap-2">
                                   <Input 
                                       value={url} 
                                       readOnly 
                                       className="font-mono text-xs bg-white text-gray-700 h-10 rounded-lg border-gray-200 shadow-sm"
                                   />
                                   <Button onClick={copyToClipboard} size="sm" className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white h-10 rounded-lg shadow-sm font-medium px-4">
                                       <Copy className="w-4 h-4 mr-2" /> 
                                       Copiar
                                   </Button>
                               </div>
                               <p className="text-[11px] text-gray-500 mt-2">
                                   Envie este link para o paciente. Ele poderá acessar a sala de espera diretamente.
                               </p>
                           </div>
                       </div>
                   ) : (
                       <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                           <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                           <p className="text-sm text-gray-700 font-medium">Token não encontrado</p>
                           <p className="text-xs text-gray-500">Não foi possível localizar o token de acesso para este agendamento.</p>
                       </div>
                   )}
               </div>
               
               <DialogFooter>
                   <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-lg text-gray-500 hover:text-gray-900">Fechar</Button>
               </DialogFooter>
           </DialogContent>
        </Dialog>
    )
};

const RescheduleDialog = ({ appointment, open, onOpenChange }) => {
    const { toast } = useToast();
    const { rescheduleAppointment, currentDoctorId } = useAppointments();
    const [date, setDate] = useState('');
    const [timeSlot, setTimeSlot] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setDate('');
            setTimeSlot('');
            setAvailableSlots([]);
        }
    }, [open]);

    useEffect(() => {
        if (!date || !open || !currentDoctorId) return;

        const fetchSlots = async () => {
            setIsLoadingSlots(true);
            try {
                const timeZone = 'America/Sao_Paulo';
                const startOfDayDate = zonedTimeToUtc(`${date} 00:00:00`, timeZone);
                const endOfDayDate = zonedTimeToUtc(`${date} 23:59:59`, timeZone);
                const spDateObj = utcToZonedTime(startOfDayDate, timeZone);
                const dayOfWeek = spDateObj.getDay();

                const { data: agenda, error: agendaError } = await supabase
                    .from('agenda_medico')
                    .select('*')
                    .eq('medico_id', currentDoctorId)
                    .eq('status', 'disponivel')
                    .eq('dia_semana', dayOfWeek);

                if (agendaError) throw agendaError;

                if (!agenda || agenda.length === 0) {
                    setAvailableSlots([]);
                    setIsLoadingSlots(false);
                    return;
                }

                const slots = [];
                agenda.forEach(rule => {
                    const ruleStartSP = utcToZonedTime(new Date(rule.hora_inicio), timeZone);
                    const ruleEndSP = utcToZonedTime(new Date(rule.hora_fim), timeZone);
                    const startTotalMins = ruleStartSP.getHours() * 60 + ruleStartSP.getMinutes();
                    const endTotalMins = ruleEndSP.getHours() * 60 + ruleEndSP.getMinutes();
                    const interval = rule.intervalo_em_minutos || 30;
                    let currentMins = startTotalMins;

                    while (currentMins < endTotalMins) {
                        const h = Math.floor(currentMins / 60);
                        const m = currentMins % 60;
                        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
                        const slotIso = `${date} ${timeStr}`; 
                        const slotDate = zonedTimeToUtc(slotIso, timeZone);
                        slots.push(slotDate);
                        currentMins += interval;
                    }
                });
                
                slots.sort((a, b) => a.getTime() - b.getTime());

                const { data: existing, error: existError } = await supabase
                    .from('agendamentos')
                    .select('horario_inicio')
                    .eq('medico_id', currentDoctorId)
                    .in('status', ['confirmado', 'pendente', 'reagendado', 'atendido', 'agendado'])
                    .gte('horario_inicio', startOfDayDate.toISOString())
                    .lte('horario_inicio', endOfDayDate.toISOString());

                if (existError) throw existError;

                const bookedTimes = new Set(existing.map(ex => new Date(ex.horario_inicio).toISOString()));
                const freeSlots = slots.filter(slot => !bookedTimes.has(slot.toISOString()));
                setAvailableSlots(freeSlots);

            } catch (err) {
                console.error("Error fetching slots:", err);
                toast({ title: "Erro ao buscar horários", description: "Verifique sua conexão.", variant: "destructive" });
            } finally {
                setIsLoadingSlots(false);
            }
        };

        fetchSlots();
    }, [date, currentDoctorId, open, toast]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!timeSlot || !appointment) return;

        setIsSubmitting(true);
        try {
            const slotDate = new Date(Number(timeSlot));
            const endTime = new Date(slotDate.getTime() + 30 * 60000);

            const { error } = await rescheduleAppointment(appointment.id, {
                horario_inicio: slotDate.toISOString(),
                horario_fim: endTime.toISOString()
            });

            if (error) {
                toast({ title: "Erro ao reagendar", description: error.message, variant: "destructive" });
            } else {
                toast({ title: "Consulta reagendada!", description: "O horário foi atualizado com sucesso.", variant: "success" });
                onOpenChange(false);
            }
        } catch (error) {
             toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-xl shadow-xl border-gray-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <CalendarClock className="w-5 h-5 text-blue-600" />
                        Reagendar Consulta
                    </DialogTitle>
                    <DialogDescription>
                        Selecione a nova data e horário para o atendimento de <strong>{appointment?.perfis_usuarios?.full_name || appointment?.guest_patients?.name}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="reschedule-date" className="text-gray-700 font-medium">Nova Data</Label>
                        <Input 
                            id="reschedule-date" 
                            type="date" 
                            required 
                            min={new Date().toISOString().split('T')[0]}
                            value={date}
                            onChange={e => {
                                setDate(e.target.value);
                                setTimeSlot('');
                            }}
                            className="rounded-lg border-gray-200 h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reschedule-time" className="text-gray-700 font-medium">Novo Horário</Label>
                        <Select 
                            value={timeSlot} 
                            onValueChange={setTimeSlot}
                            disabled={!date || isLoadingSlots}
                        >
                            <SelectTrigger id="reschedule-time" className="rounded-lg border-gray-200 h-10">
                                <SelectValue placeholder={isLoadingSlots ? "Carregando..." : "Selecione um horário"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg shadow-lg border-gray-100">
                                {availableSlots.length > 0 ? (
                                    availableSlots.map((slot) => (
                                        <SelectItem key={slot.toISOString()} value={String(slot.getTime())}>
                                            {format(utcToZonedTime(slot, 'America/Sao_Paulo'), 'HH:mm')}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="none" disabled>
                                        {date ? "Sem horários livres" : "Selecione a data primeiro"}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-lg hover:bg-gray-100">Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting || !timeSlot} className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Reagendamento
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const NewGuestAppointmentDialog = ({ children }) => {
  const { toast } = useToast();
  const { createGuestAppointment, currentDoctorId } = useAppointments();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState('form');
  const [createdData, setCreatedData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    timeSlot: ''
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useEffect(() => {
    if (!formData.date || !isOpen || !currentDoctorId) return;

    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const timeZone = 'America/Sao_Paulo';
        const startOfDayDate = zonedTimeToUtc(`${formData.date} 00:00:00`, timeZone);
        const endOfDayDate = zonedTimeToUtc(`${formData.date} 23:59:59`, timeZone);
        const spDateObj = utcToZonedTime(startOfDayDate, timeZone);
        const dayOfWeek = spDateObj.getDay();

        const { data: agenda, error: agendaError } = await supabase
          .from('agenda_medico')
          .select('*')
          .eq('medico_id', currentDoctorId)
          .eq('status', 'disponivel')
          .eq('dia_semana', dayOfWeek);

        if (agendaError) throw agendaError;

        if (!agenda || agenda.length === 0) {
          setAvailableSlots([]);
          setIsLoadingSlots(false);
          return;
        }

        const slots = [];
        agenda.forEach(rule => {
          const ruleStartSP = utcToZonedTime(new Date(rule.hora_inicio), timeZone);
          const ruleEndSP = utcToZonedTime(new Date(rule.hora_fim), timeZone);
          const startTotalMins = ruleStartSP.getHours() * 60 + ruleStartSP.getMinutes();
          const endTotalMins = ruleEndSP.getHours() * 60 + ruleEndSP.getMinutes();
          const interval = rule.intervalo_em_minutos || 30;
          let currentMins = startTotalMins;

          while (currentMins < endTotalMins) {
            const h = Math.floor(currentMins / 60);
            const m = currentMins % 60;
            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
            const slotIso = `${formData.date} ${timeStr}`; 
            const slotDate = zonedTimeToUtc(slotIso, timeZone);
            slots.push(slotDate);
            currentMins += interval;
          }
        });
        
        slots.sort((a, b) => a.getTime() - b.getTime());

        const { data: existing, error: existError } = await supabase
          .from('agendamentos')
          .select('horario_inicio')
          .eq('medico_id', currentDoctorId)
          .in('status', ['confirmado', 'pendente', 'reagendado', 'atendido', 'agendado'])
          .gte('horario_inicio', startOfDayDate.toISOString())
          .lte('horario_inicio', endOfDayDate.toISOString());

        if (existError) throw existError;

        const bookedTimes = new Set(existing.map(ex => new Date(ex.horario_inicio).toISOString()));
        const freeSlots = slots.filter(slot => !bookedTimes.has(slot.toISOString()));
        setAvailableSlots(freeSlots);

      } catch (err) {
        console.error("Error fetching slots:", err);
        toast({ title: "Erro ao buscar horários", description: "Verifique sua conexão.", variant: "destructive" });
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [formData.date, currentDoctorId, isOpen, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!formData.timeSlot) {
      toast({ title: "Selecione um horário", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const slotDate = new Date(Number(formData.timeSlot));
    const endTime = new Date(slotDate.getTime() + 30 * 60000);

    const appointmentData = {
      horario_inicio: slotDate.toISOString(),
      horario_fim: endTime.toISOString(),
    };

    const { data, error } = await createGuestAppointment({
      name: formData.name,
      email: formData.email,
      phone: formData.phone
    }, appointmentData);

    if (error) {
      toast({ title: "Erro ao criar agendamento", description: error.message, variant: "destructive" });
    } else {
      setCreatedData(data);
      setStep('success');
      toast({ title: "Agendamento criado com sucesso!", variant: "success" });
    }
    setIsSubmitting(false);
  };

  const handleCopyLink = () => {
    if (!createdData) return;
    const link = `${window.location.origin}/paciente/guest?token=${createdData.token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", variant: "default" });
  };

  const handleReset = () => {
    setFormData({ name: '', email: '', phone: '', date: '', timeSlot: '' });
    setStep('form');
    setCreatedData(null);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleReset();
      }
      setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)} className="h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:scale-105 transition-all duration-300 text-white rounded-lg px-6 shadow-md hover:shadow-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Criar Novo Agendamento
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95%] sm:max-w-[400px] p-6 overflow-hidden rounded-xl border-gray-100 shadow-xl">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Novo Agendamento
              </DialogTitle>
              <DialogDescription>
                Crie um agendamento para um paciente sem conta no sistema.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="guest-name" className="text-sm font-semibold text-gray-700">Nome do Paciente</Label>
                <Input 
                  id="guest-name" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: João da Silva"
                  className="rounded-lg border-gray-200 h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guest-email" className="text-sm font-semibold text-gray-700">Email (Opcional)</Label>
                  <Input 
                    id="guest-email" 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="joao@email.com"
                    className="rounded-lg border-gray-200 h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-phone" className="text-sm font-semibold text-gray-700">Telefone (Opcional)</Label>
                  <Input 
                    id="guest-phone" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                    className="rounded-lg border-gray-200 h-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="appt-date" className="text-sm font-semibold text-gray-700">Data</Label>
                  <Input 
                    id="appt-date" 
                    type="date" 
                    required 
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value, timeSlot: ''})}
                    className="rounded-lg border-gray-200 h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appt-time" className="text-sm font-semibold text-gray-700">Horário</Label>
                  <Select 
                    value={formData.timeSlot} 
                    onValueChange={val => setFormData({...formData, timeSlot: val})}
                    disabled={!formData.date || isLoadingSlots}
                  >
                    <SelectTrigger id="appt-time" className="rounded-lg border-gray-200 h-10">
                      <SelectValue placeholder={isLoadingSlots ? "Carregando..." : "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-gray-100 shadow-lg">
                      {availableSlots.length > 0 ? (
                        availableSlots.map((slot) => (
                          <SelectItem key={slot.toISOString()} value={String(slot.getTime())}>
                            {format(utcToZonedTime(slot, 'America/Sao_Paulo'), 'HH:mm')}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          {formData.date ? "Sem horários livres" : "Selecione a data"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={handleReset} className="rounded-lg hover:bg-gray-100">Cancelar</Button>
                <Button type="submit" disabled={isSubmitting || !formData.timeSlot} className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Agendamento
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader className="mb-2">
              <DialogTitle className="text-green-600 flex items-center gap-2 text-xl font-bold">
                <CheckCircle2 className="w-7 h-7" />
                Agendamento Criado!
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                O paciente convidado foi registrado.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2 w-full">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-2 w-full">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Link de Acesso</span>
                <div className="flex items-center bg-white border border-gray-200 rounded-lg p-3 w-full max-w-full">
                  <code className="text-xs text-gray-800 font-mono break-all whitespace-normal">
                    {`${window.location.origin}/paciente/guest?token=${createdData?.token}`}
                  </code>
                </div>
                <p className="text-xs text-gray-400 leading-tight">
                  Compartilhe este link com o paciente para que ele possa acessar a consulta.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 w-full">
                <Button onClick={handleCopyLink} variant="outline" className="flex-1 min-w-[120px] justify-center h-10 text-xs font-medium border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg">
                  <Copy className="w-3.5 h-3.5 mr-2 flex-shrink-0" /> 
                  Copiar Link
                </Button>
                <Button variant="outline" className="flex-1 min-w-[120px] justify-center h-10 text-xs font-medium border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg" onClick={() => toast({ title: "Funcionalidade simulada", description: "Envio via WhatsApp" })}>
                  <Send className="w-3.5 h-3.5 mr-2 flex-shrink-0" /> 
                  Enviar WhatsApp
                </Button>
              </div>
            </div>

            <DialogFooter className="py-2">
              <Button onClick={handleReset} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 rounded-lg shadow-sm">
                Concluir
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const PatientDetailsDialog = ({ patient, guest, children }) => {
  const displayData = patient || guest;
  if (!displayData) return null;
  const isGuest = !!guest;
  
  return <Dialog>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="sm:max-w-md p-6 rounded-xl border-gray-100 shadow-xl">
      <DialogHeader className="p-0 pb-4">
        <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
          Dados do Paciente {isGuest && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-medium uppercase tracking-wide">Convidado</span>}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 text-sm text-gray-600">
        <div className="flex justify-between border-b border-gray-50 pb-2"><span>Nome:</span> <span className="font-semibold text-gray-900">{displayData.full_name || displayData.name || 'Não informado'}</span></div>
        <div className="flex justify-between border-b border-gray-50 pb-2"><span>Email:</span> <span className="font-medium text-gray-900">{displayData.email || 'Não informado'}</span></div>
        <div className="flex justify-between border-b border-gray-50 pb-2"><span>Telefone:</span> <span className="font-medium text-gray-900">{displayData.whatsapp || displayData.phone || 'Não informado'}</span></div>
        {!isGuest && (
          <>
            <div className="flex justify-between border-b border-gray-50 pb-2"><span>CPF:</span> <span className="font-medium text-gray-900">{displayData.cpf || 'Não informado'}</span></div>
            <div className="flex justify-between border-b border-gray-50 pb-2"><span>Nascimento:</span> <span className="font-medium text-gray-900">{displayData.data_nasc ? new Date(displayData.data_nasc + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}</span></div>
          </>
        )}
      </div>
      <DialogFooter className="mt-4 p-0">
        <DialogClose asChild>
          <Button variant="outline" size="sm" className="h-9 text-xs rounded-lg hover:bg-gray-50">Fechar</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};

const DoctorConsultations = () => {
  const {
    appointments,
    loading,
    refetchAppointments,
    confirmAttendance,
    cancelAppointmentByDoctor,
    markAppointmentAsPaidByDoctor,
    resendWhatsapp
  } = useAppointments();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState({});
  const [isResending, setIsResending] = useState({});
  const [isSendingEmail, setIsSendingEmail] = useState({});
  const [localWhatsappSentStatus, setLocalWhatsappSentStatus] = useState({});
  const [localEmailSentStatus, setLocalEmailSentStatus] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [currentPage, setCurrentPage] = useState({ upcoming: 1, history: 1 });

  const [selectedGuestAppt, setSelectedGuestAppt] = useState(null);
  const [selectedRescheduleAppt, setSelectedRescheduleAppt] = useState(null);
  
  // Popup fallback state
  const [blockedRoom, setBlockedRoom] = useState(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchAppointments();
    setLocalWhatsappSentStatus({});
    setLocalEmailSentStatus({});
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  const handleResendWhatsapp = async (appointmentId) => {
    setIsResending(prev => ({ ...prev, [appointmentId]: true }));
    await new Promise(resolve => setTimeout(resolve, 800));
    toast({
      title: "Funcionalidade em fase de testes",
      description: "O envio de WhatsApp está simulado neste ambiente.",
      variant: "default",
    });
    setIsResending(prev => ({ ...prev, [appointmentId]: false }));
    setLocalWhatsappSentStatus(prev => ({ ...prev, [appointmentId]: true }));
  };

  const handleSendEmail = async (appointmentId) => {
    setIsSendingEmail(prev => ({ ...prev, [appointmentId]: true }));
    await new Promise(resolve => setTimeout(resolve, 800));
    toast({
      title: "Funcionalidade em fase de testes",
      description: "O envio de Email está simulado neste ambiente.",
      variant: "default",
    });
    setIsSendingEmail(prev => ({ ...prev, [appointmentId]: false }));
    setLocalEmailSentStatus(prev => ({ ...prev, [appointmentId]: true }));
  };

  const handleOpenVideoCall = async (appointment) => {
    const roomName = appointment.video_room || buildJitsiRoomId(appointment.id);
    const displayName = `Dr(a). ${appointment.medico_nome || 'Médico'}`;

    // Non-blocking save if not already present
    if (!appointment.video_room) {
        supabase.from('agendamentos').update({ video_room: roomName }).eq('id', appointment.id).then(res => {
            if(res.error) console.error("Error saving video_room", res.error);
        });
    }

    const result = openJitsiRoom(roomName, displayName);
    
    if (!result.ok) {
        setBlockedRoom({ url: `https://meet.jit.si/${roomName}` });
    } else {
        toast({
            title: "Abrindo Videochamada",
            description: "A videochamada abrirá em nova aba segura.",
            variant: "default"
        });
    }
  };

  const copyFallbackInfo = () => {
    if(!blockedRoom) return;
    navigator.clipboard.writeText(blockedRoom.url);
    toast({ title: "Copiado!", description: "Link copiado para a área de transferência." });
  };

  const sortedAppointments = useMemo(() => [...appointments].sort((a, b) => new Date(a.horario_inicio) - new Date(b.horario_inicio)), [appointments]);
  const filteredAppointments = useMemo(() => sortedAppointments.filter(a => {
    const patientName = a.perfis_usuarios?.full_name || a.guest_patients?.name || '';
    return patientName.toLowerCase().includes(searchTerm.toLowerCase()) || (a.protocolo || '').toLowerCase().includes(searchTerm.toLowerCase());
  }), [sortedAppointments, searchTerm]);
  
  // UPDATED FILTER LOGIC
  const upcomingAppointments = useMemo(() => filteredAppointments.filter(a => ['confirmado', 'reagendado', 'pendente', 'agendado'].includes(a.status) && a.pagamento_status !== 'cancelado'), [filteredAppointments]);
  const pastAppointments = useMemo(() => filteredAppointments.filter(a => ['atendido', 'concluida', 'cancelado', 'expirado'].includes(a.status) || (!['confirmado', 'reagendado', 'pendente', 'agendado'].includes(a.status))), [filteredAppointments]);
  const pendingCount = useMemo(() => appointments.filter(a => ['confirmado', 'pendente', 'reagendado', 'agendado'].includes(a.status) && a.pagamento_status !== 'cancelado').length, [appointments]);
  const completedCount = useMemo(() => appointments.filter(a => ['atendido', 'concluida'].includes(a.status)).length, [appointments]);
  
  const handleAction = async (id, action, successToast, failureToast) => {
    setIsSubmitting(prev => ({ ...prev, [id]: true }));
    const { error } = await action(id);
    if (error) {
      toast({
        title: failureToast.title || "Erro",
        description: error.message || failureToast.description,
        variant: 'destructive'
      });
    } else {
      if (successToast) toast(successToast);
      refetchAppointments();
    }
    setIsSubmitting(prev => ({ ...prev, [id]: false }));
  };
  const handleConfirmAttendance = id => handleAction(id, () => confirmAttendance(id), { title: 'Check-in Realizado!', description: 'A consulta foi movida para o histórico.', variant: 'success' }, { title: "Falha no Check-in" });
  const handleConfirmPayment = id => handleAction(id, () => markAppointmentAsPaidByDoctor(id), { title: 'Pagamento Confirmado!', description: 'O status foi atualizado para Confirmado.', variant: 'success' }, { title: 'Falha ao Confirmar Pagamento' });
  const handleCancel = id => handleAction(id, () => cancelAppointmentByDoctor(id), null, { title: 'Falha ao Cancelar' });

  // StatusBadge Logic (reused)
  const StatusBadge = ({ status, paymentStatus, reminderSentAt, whatsappStatus, appointmentId }) => {
    let text = status;
    let icon = null;
    let containerClass = "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm";
    
    switch (status) {
      case 'confirmado':
      case 'agendado':
        text = 'Confirmado';
        icon = <CheckCircle2 className="w-3 h-3 mr-1.5" />;
        containerClass += " bg-emerald-50 text-emerald-700 border-emerald-100";
        break;
      case 'pendente':
        text = 'Pendente';
        icon = <AlertTriangle className="w-3 h-3 mr-1.5" />;
        containerClass += " bg-amber-50 text-amber-700 border-amber-100";
        break;
      case 'reagendado':
        text = 'Reagendado';
        icon = <Clock className="w-3 h-3 mr-1.5" />;
        containerClass += " bg-amber-50 text-amber-700 border-amber-100";
        break;
      case 'atendido':
      case 'concluida':
        text = 'Concluído';
        icon = <Check className="w-3 h-3 mr-1.5" />;
        containerClass += " bg-blue-50 text-blue-700 border-blue-100";
        break;
      case 'cancelado':
      case 'expirado':
        text = status === 'cancelado' ? 'Cancelado' : 'Expirado';
        icon = <XCircle className="w-3 h-3 mr-1.5" />;
        containerClass += " bg-red-50 text-red-700 border-red-100";
        break;
      default:
        text = status;
        containerClass += " bg-gray-50 text-gray-600 border-gray-100";
    }

    const isWhatsappSent = localWhatsappSentStatus[appointmentId] || whatsappStatus === 'sent' || !!reminderSentAt;
    const whatsappTooltip = isWhatsappSent ? "Lembrete WhatsApp enviado (Simulado)" : "Enviar lembrete WhatsApp (Simulado)";
    const whatsappIconClass = isWhatsappSent ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-gray-400 bg-gray-50 hover:bg-gray-100";

    const isEmailSent = localEmailSentStatus[appointmentId];
    const emailTooltip = isEmailSent ? "Email enviado (Simulado)" : "Enviar Email (Simulado)";
    const emailIconClass = isEmailSent ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-gray-400 bg-gray-50 hover:bg-gray-100";
    const isLoading = isResending[appointmentId];
    const isEmailLoading = isSendingEmail[appointmentId];
    
    return (
      <div className="flex items-center gap-1.5">
        <span className={containerClass}>{icon}{text}</span>
        {(status === 'confirmado' || status === 'agendado') && (paymentStatus === 'pago' || paymentStatus === 'pendente') && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className={`p-1.5 rounded-full transition-colors border border-transparent hover:border-gray-200 ${whatsappIconClass}`} onClick={(e) => { e.stopPropagation(); handleResendWhatsapp(appointmentId); }} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> : <Smartphone className="w-3 h-3" />}
                </button>
              </TooltipTrigger>
              <TooltipContent className="rounded-lg"><p>{whatsappTooltip}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className={`p-1.5 rounded-full transition-colors border border-transparent hover:border-gray-200 ${emailIconClass}`} onClick={(e) => { e.stopPropagation(); handleSendEmail(appointmentId); }} disabled={isEmailLoading}>
                  {isEmailLoading ? <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> : <Mail className="w-3 h-3" />}
                </button>
              </TooltipTrigger>
              <TooltipContent className="rounded-lg"><p>{emailTooltip}</p></TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    );
  };

  const renderSkeleton = () => <TableBody>{Array.from({ length: 5 }).map((_, index) => <TableRow key={index} className="border-b border-gray-100"><TableCell><Skeleton className="h-4 w-[100px] rounded-full" /></TableCell><TableCell><Skeleton className="h-4 w-[120px] rounded-full" /></TableCell><TableCell><Skeleton className="h-4 w-[180px] rounded-full" /></TableCell><TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell><TableCell className="text-center"><Skeleton className="h-8 w-8 rounded-full mx-auto" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-lg inline-block" /></TableCell></TableRow>)}</TableBody>;

  const handlePageChange = (tab, direction) => {
    setCurrentPage(prev => ({ ...prev, [tab]: prev[tab] + direction }));
  };

  const AppointmentsTable = ({ appointmentsList, tabKey }) => {
    const totalPages = Math.ceil(appointmentsList.length / ITEMS_PER_PAGE);
    const paginatedList = appointmentsList.slice((currentPage[tabKey] - 1) * ITEMS_PER_PAGE, currentPage[tabKey] * ITEMS_PER_PAGE);
    return <>
      <Card className="border-0 shadow-lg rounded-xl overflow-hidden bg-white mt-8">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50 border-b border-gray-100">
                <TableRow className="border-b border-gray-100 hover:bg-transparent h-12">
                  <TableHead className="text-gray-600 font-medium text-sm py-4 px-4 w-[160px]">Data/Hora</TableHead>
                  <TableHead className="text-gray-600 font-medium text-sm py-4 px-4 w-[180px]">Protocolo</TableHead>
                  <TableHead className="text-gray-600 font-medium text-sm py-4 px-4">Paciente</TableHead>
                  <TableHead className="text-gray-600 font-medium text-sm py-4 px-4 w-[200px]">Status</TableHead>
                  <TableHead className="text-center text-gray-600 font-medium text-sm py-4 px-4 w-[120px]">Acesso</TableHead>
                  <TableHead className="text-right text-gray-600 font-medium text-sm py-4 px-4 w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? renderSkeleton() : <AnimatePresence>
                <TableBody>
                  {paginatedList.length > 0 ? paginatedList.map(appt => {
                    const appointmentDateTime = utcToZonedTime(new Date(appt.horario_inicio), 'America/Sao_Paulo');
                    const isActionLoading = isSubmitting[appt.id];
                    const canCheckIn = (appt.pagamento_status === 'pago' || appt.status === 'agendado') && !['atendido', 'concluida'].includes(appt.status);
                    const isCheckinCompleted = ['atendido', 'concluida'].includes(appt.status);
                    const isCancelled = appt.status === 'cancelado' || appt.status === 'expirado';
                    const dateDisplay = isToday(appointmentDateTime) ? 'Hoje' : format(appointmentDateTime, 'dd/MMM', { locale: ptBR }).toUpperCase();
                    const dateSubtext = isToday(appointmentDateTime) ? 'Today' : format(appointmentDateTime, 'EEEE', { locale: ptBR });
                    const timeDisplay = format(appointmentDateTime, 'HH:mm');
                    const patientCpf = appt.perfis_usuarios?.cpf;
                    const displayCpf = patientCpf ? patientCpf.replace(/\D/g, '').slice(0, 3) : null;
                    const patientName = appt.perfis_usuarios?.full_name || appt.guest_patients?.name || 'Paciente desconhecido';
                    const isGuest = !!appt.guest_patients;

                    const canStartCall = canCheckIn && !isCancelled && !isCheckinCompleted;

                    return <motion.tr key={appt.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} className="group hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                      <TableCell className="py-4 px-4 align-middle">
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-gray-900">{dateDisplay}</span>
                            <span className="text-sm font-medium text-gray-500">{timeDisplay}</span>
                          </div>
                          <span className="text-xs text-gray-400 font-medium capitalize mt-0.5">{dateSubtext}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4 align-middle">
                        <PatientDetailsDialog patient={appt.perfis_usuarios} guest={appt.guest_patients}>
                          <div className="flex flex-col cursor-pointer group/proto">
                            <span className="text-sm font-medium text-gray-700 group-hover/proto:text-blue-600 transition-colors">#{appt.protocolo?.split('-')[2] || '---'}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Video className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500 font-medium">Videochamada</span>
                            </div>
                          </div>
                        </PatientDetailsDialog>
                      </TableCell>
                      <TableCell className="py-4 px-4 align-middle">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                             <span onClick={() => { if (appt.patient_id) { navigate(`/dashboard/medico/pacientes/${appt.patient_id}`); } }} className={`text-sm font-semibold text-gray-900 transition-colors truncate max-w-[150px] cursor-pointer hover:text-blue-600`}>
                                {patientName}
                              </span>
                              {isGuest && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedGuestAppt(appt); }} className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors">
                                            <Key className="w-3 h-3" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-lg"><p className="text-xs">Ver Token de Acesso</p></TooltipContent>
                                  </Tooltip>
                              )}
                          </div>
                          {isGuest ? (
                            <span className="text-xs text-blue-700 mt-0.5 font-medium bg-blue-50 w-fit px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-wide">Convidado</span>
                          ) : (
                            patientCpf ? <Tooltip>
                              <TooltipTrigger asChild><span className="text-xs text-gray-400 mt-0.5 font-mono cursor-help w-fit border-b border-dotted border-gray-300">ID: {displayCpf}***</span></TooltipTrigger>
                              <TooltipContent side="right" className="rounded-lg"><p className="font-mono text-xs">CPF: {patientCpf}</p></TooltipContent>
                            </Tooltip> : <span className="text-xs text-gray-400 mt-0.5 font-mono">ID: {appt.perfis_usuarios?.id?.slice(0, 8).toUpperCase() || '...'}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-4 align-middle">
                        <StatusBadge status={appt.status} paymentStatus={appt.pagamento_status} reminderSentAt={appt.reminder_sent_at} whatsappStatus={appt.whatsapp_status} appointmentId={appt.id} />
                      </TableCell>
                      <TableCell className="py-4 px-4 align-middle text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="relative inline-block">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                disabled={!canStartCall}
                                onClick={() => canStartCall && handleOpenVideoCall(appt)}
                                className={`w-9 h-9 rounded-xl transition-all duration-200 relative ${canStartCall ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 border border-emerald-200 shadow-sm" : "bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed"}`}
                              >
                                <Video className="w-4 h-4" /> 
                              </Button>
                              {canStartCall && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-2 border-white"></span>
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="rounded-lg">
                            <p className="text-xs">{canStartCall ? 'Iniciar Consulta (Nova Aba)' : 'Indisponível'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="py-4 px-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="icon" variant={isCheckinCompleted ? 'success' : 'outline'} disabled={isActionLoading || !canCheckIn || isCheckinCompleted || isCancelled} onClick={() => handleConfirmAttendance(appt.id)} className={`h-9 w-9 rounded-lg shadow-sm border ${isCheckinCompleted ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent' : 'border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-gray-400 hover:shadow-md transition-all'}`} title="Check-in">
                            {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="h-9 w-9 rounded-lg p-0 hover:bg-gray-50 border-gray-200 text-gray-500 shadow-sm hover:shadow-md transition-all" disabled={isActionLoading}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-gray-100 min-w-[180px] p-1.5">
                              <DropdownMenuItem onSelect={() => navigate(`/dashboard/medico/pacientes/${appt.patient_id}`)} className="rounded-lg cursor-pointer text-xs font-medium py-2.5 px-3 focus:bg-gray-50">
                                <User className="mr-2 h-4 w-4 text-gray-500" /> Ir para Prontuário
                              </DropdownMenuItem>
                              <PatientDetailsDialog patient={appt.perfis_usuarios} guest={appt.guest_patients}>
                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="rounded-lg cursor-pointer text-xs font-medium py-2.5 px-3 focus:bg-gray-50">
                                  <Eye className="mr-2 h-4 w-4 text-gray-500" /> Ver Dados Rápidos
                                </DropdownMenuItem>
                              </PatientDetailsDialog>
                              {!isCancelled && !isCheckinCompleted && (
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleOpenVideoCall(appt); }} className="rounded-lg cursor-pointer text-xs font-medium py-2.5 px-3 focus:bg-gray-50">
                                  <LinkIcon className="mr-2 h-4 w-4 text-gray-500" /> Iniciar Videochamada
                                </DropdownMenuItem>
                              )}
                              {!isCancelled && !isCheckinCompleted && (
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedRescheduleAppt(appt); }} className="rounded-lg cursor-pointer text-xs font-medium py-2.5 px-3 focus:bg-gray-50">
                                  <CalendarClock className="mr-2 h-4 w-4 text-gray-500" /> Reagendar
                                </DropdownMenuItem>
                              )}
                              {appt.pagamento_status !== 'pago' && !isCancelled && !isGuest && <DropdownMenuItem onSelect={e => { e.preventDefault(); handleConfirmPayment(appt.id); }} className="rounded-lg cursor-pointer text-xs font-medium py-2.5 px-3 focus:bg-gray-50">
                                <CreditCard className="mr-2 h-4 w-4 text-gray-500" />Confirmar Pagamento
                              </DropdownMenuItem>}
                              {!isCancelled && !isCheckinCompleted && <DropdownMenuSeparator className="my-1 bg-gray-100" />}
                              {!isCancelled && !isCheckinCompleted && <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={e => e.preventDefault()} className="rounded-lg text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer text-xs font-medium py-2.5 px-3 mt-0.5">
                                    <Trash2 className="mr-2 h-4 w-4" />Cancelar Consulta
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-xl border-gray-100 shadow-xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-lg font-bold text-gray-900">Cancelar Agendamento?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-sm">Esta ação não pode ser desfeita. O paciente será notificado.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="h-9 text-xs rounded-lg">Voltar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleCancel(appt.id)} className="bg-red-600 hover:bg-red-700 h-9 text-xs rounded-lg">Sim, Cancelar</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </motion.tr>;
                  }) : <TableRow><TableCell colSpan={6} className="h-96 text-center"><div className="flex flex-col items-center justify-center h-full"><img src={EMPTY_STATE_ILLUSTRATION_URL} alt="Nenhum agendamento encontrado" className="w-64 h-64 mb-6 object-contain" /><p className="text-gray-400 text-sm font-normal">Nenhum agendamento encontrado nesta categoria.</p></div></TableCell></TableRow>}
                </TableBody>
              </AnimatePresence>}
            </Table>
          </div>
        </CardContent>
        {totalPages > 1 && <div className="flex items-center justify-between p-4 bg-white border-t border-gray-100"><span className="text-xs text-gray-500 font-medium ml-2">Página {currentPage[tabKey]} de {totalPages}</span><div className="flex items-center space-x-2"><Button variant="outline" size="sm" onClick={() => handlePageChange(tabKey, -1)} disabled={currentPage[tabKey] === 1} className="h-8 text-xs px-4 border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium"><ChevronLeft className="h-3 w-3 mr-1" />Anterior</Button><Button variant="outline" size="sm" onClick={() => handlePageChange(tabKey, 1)} disabled={currentPage[tabKey] === totalPages} className="h-8 text-xs px-4 border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium">Próxima<ChevronRight className="h-3 w-3 ml-1" /></Button></div></div>}
      </Card>
    </>;
  };

  return <div className="space-y-8 pb-12 pt-8 px-6 min-h-screen">
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <div onClick={() => setActiveTab('upcoming')} className={`flex-1 p-3 rounded-xl shadow-sm border cursor-pointer transition-all duration-300 relative overflow-hidden group min-h-[70px] flex items-center ${activeTab === 'upcoming' ? 'bg-white border-b-4 border-b-blue-500 shadow-lg shadow-blue-100/50' : 'bg-white border border-gray-200 hover:shadow-lg'}`}>
          <div className="flex items-center gap-3 z-10"><div className="bg-blue-50 border border-blue-100 p-2 rounded-lg text-blue-600"><CalendarIcon className="w-6 h-6" /></div><div><h3 className="text-base font-semibold text-gray-900">{pendingCount} Pendentes</h3><p className="text-xs font-medium text-gray-500 mt-0">Novos atendimentos</p></div></div>
        </div>
        <div onClick={() => setActiveTab('history')} className={`flex-1 p-3 rounded-xl shadow-sm border cursor-pointer transition-all duration-300 relative overflow-hidden group min-h-[70px] flex items-center ${activeTab === 'history' ? 'bg-white border-b-4 border-b-emerald-500 shadow-lg shadow-emerald-100/50' : 'bg-white border border-gray-200 hover:shadow-lg'}`}>
          <div className="flex items-center gap-3 z-10"><div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg text-emerald-600"><CheckCircle2 className="w-6 h-6" /></div><div><h3 className="text-base font-semibold text-gray-900">{completedCount} Concluídas</h3><p className="text-xs font-medium text-gray-500 mt-0">Ver histórico</p></div></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center mb-8">
        <div className="relative flex-1 w-full flex items-center gap-3">
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input placeholder="Buscar por paciente ou protocolo..." className="pl-10 h-11 bg-white border-gray-200 shadow-sm text-gray-700 placeholder:text-gray-400 rounded-lg w-full focus:ring-2 focus:ring-blue-100 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
        </div>
        <div className="flex gap-4">
             <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="h-11 bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 shadow-sm rounded-lg px-6 font-medium transition-colors">
                {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Atualizar
             </Button>
            <div className="flex-1 md:flex-none">
                <NewGuestAppointmentDialog />
            </div>
        </div>
      </div>

    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="hidden">
        <TabsTrigger value="upcoming">Próximas</TabsTrigger>
        <TabsTrigger value="history">Histórico</TabsTrigger>
      </TabsList>
      <TabsContent value="upcoming" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <AppointmentsTable appointmentsList={upcomingAppointments} tabKey="upcoming" />
      </TabsContent>
      <TabsContent value="history" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <AppointmentsTable appointmentsList={pastAppointments} tabKey="history" />
      </TabsContent>
    </Tabs>

    <GuestTokenDialog appointment={selectedGuestAppt} open={!!selectedGuestAppt} onOpenChange={(open) => !open && setSelectedGuestAppt(null)} />
    <RescheduleDialog appointment={selectedRescheduleAppt} open={!!selectedRescheduleAppt} onOpenChange={(open) => !open && setSelectedRescheduleAppt(null)} />
    
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
                    Utilize o botão abaixo para abrir a sala manualmente ou copie o link de acesso.
                </p>
                <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10" 
                    onClick={() => blockedRoom && window.open(blockedRoom.url, '_blank')}
                >
                    <Video className="w-4 h-4" /> 
                    Clique aqui para abrir manualmente
                </Button>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                    <Button variant="outline" className="w-full text-xs" onClick={copyFallbackInfo}>
                        <Copy className="w-3 h-3 mr-2" />
                        Copiar Link
                    </Button>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setBlockedRoom(null)}>Fechar</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  </div>;
};

export default DoctorConsultations;