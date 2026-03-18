
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Video, Star, User, ChevronLeft, ChevronRight, CalendarOff, ChevronDown, Award, Asterisk, HeartHandshake, Info, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, addDays, startOfToday, isToday, addMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { utcToZonedTime } from 'date-fns-tz';
import { supabase } from '@/lib/customSupabaseClient';
import { Skeleton } from './ui/skeleton';

const generateTimeSlotsFromAgenda = (agenda, day) => {
  const dayOfWeek = day.getDay();
  const relevantBlocks = agenda.filter(block => block.dia_semana === dayOfWeek && block.status === 'disponivel');
  const slots = [];
  const timeZone = 'America/Sao_Paulo';
  const nowInBrasilia = utcToZonedTime(new Date(), timeZone);
  const timeLimit = addMinutes(nowInBrasilia, 20);
  
  relevantBlocks.forEach(block => {
    const startDateTimeUTC = parseISO(block.hora_inicio);
    const endDateTimeUTC = parseISO(block.hora_fim);
    const zonedStartTime = utcToZonedTime(startDateTimeUTC, timeZone);
    const zonedEndTime = utcToZonedTime(endDateTimeUTC, timeZone);
    let currentSlotTime = new Date(day);
    currentSlotTime.setHours(zonedStartTime.getHours(), zonedStartTime.getMinutes(), 0, 0);
    const endBlockTime = new Date(day);
    endBlockTime.setHours(zonedEndTime.getHours(), zonedEndTime.getMinutes(), 0, 0);
    
    while (currentSlotTime < endBlockTime) {
      const slotInBrasilia = utcToZonedTime(currentSlotTime, timeZone);
      if (slotInBrasilia > timeLimit) {
        slots.push(format(slotInBrasilia, 'HH:mm'));
      }
      currentSlotTime = addMinutes(currentSlotTime, block.intervalo_em_minutos);
    }
  });
  return [...new Set(slots)].sort();
};

const ScheduleSkeleton = () => (
  <div className="flex-grow flex flex-col">
    <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-3 w-1/3 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white p-2 text-center space-y-1 min-h-[150px]">
                <Skeleton className="h-3 w-12 mx-auto rounded-md" />
                <Skeleton className="h-3 w-8 mx-auto rounded-md" />
                <div className="space-y-1 mt-3">
                    {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-8 w-full rounded-md" />)}
                </div>
            </div>
        ))}
    </div>
  </div>
);

export function DoctorScheduleCard({
  initialDoctor,
  onScheduleUpdate,
  isFallback = false,
  patientPrice,
  formattedPatientPrice
}) {
  const { session } = useAuth();
  const { getBookedSlots } = useAppointments();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [doctor, setDoctor] = useState(initialDoctor);
  const [loadingSlots, setLoadingSlots] = useState(!isFallback);
  const [dayOffset, setDayOffset] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [doctorAgenda, setDoctorAgenda] = useState([]);
  const [bookedSlots, setBookedSlots] = useState(new Map());
  const [isFavorite, setIsFavorite] = useState(false);
  
  const today = startOfToday();
  const visibleDays = useMemo(() => Array.from({ length: 5 }).map((_, i) => addDays(today, i + dayOffset)), [today, dayOffset]);

  const fetchAllData = useCallback(async () => {
    if (isFallback || !doctor?.id) {
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
    
    try {
      const [agendaResult, bookedSlotsResult] = await Promise.all([
        supabase.from('agenda_medico').select('*').eq('medico_id', doctor.id).eq('status', 'disponivel'),
        getBookedSlots(doctor.id)
      ]);
      
      if (agendaResult.error) throw agendaResult.error;
      
      setDoctorAgenda(agendaResult.data || []);
      setBookedSlots(bookedSlotsResult);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar dados',
        description: 'Não foi possível carregar a agenda do médico.'
      });
      setDoctorAgenda([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [doctor?.id, toast, isFallback, getBookedSlots]);

  useEffect(() => {
    if (!isFallback && doctor?.id) {
      fetchAllData();
    }
  }, [doctor?.id, isFallback, fetchAllData]);

  useEffect(() => {
    if (isFallback || !doctor?.id) return;
    
    const doctorChannel = supabase.channel(`public:medicos:id=eq.${doctor.id}`).on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'medicos', filter: `id=eq.${doctor.id}`
    }, payload => {
      setDoctor(prev => JSON.stringify(prev) !== JSON.stringify(payload.new) ? payload.new : prev);
    }).subscribe();
    
    const appointmentsChannel = supabase.channel(`realtime-agendamentos-doctor-${doctor.id}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'agendamentos', filter: `medico_id=eq.${doctor.id}`
    }, () => fetchAllData()).subscribe();
    
    const scheduleChannel = supabase.channel(`public:agenda_medico:medico_id=eq.${doctor.id}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'agenda_medico', filter: `medico_id=eq.${doctor.id}`
    }, () => fetchAllData()).subscribe();

    return () => {
      supabase.removeChannel(doctorChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(scheduleChannel);
    };
  }, [doctor?.id, isFallback, fetchAllData]);

  const scheduleByDay = useMemo(() => {
    if (!doctorAgenda || isFallback) return visibleDays.map(day => ({
      date: day,
      dayName: isToday(day) ? 'HOJE' : format(day, 'EEEE', { locale: ptBR }).split('-')[0].toUpperCase(),
      dateFormatted: format(day, 'dd/MM'),
      slots: []
    }));
    return visibleDays.map(day => {
      const allSlots = generateTimeSlotsFromAgenda(doctorAgenda, day);
      return {
        date: day,
        dayName: isToday(day) ? 'HOJE' : format(day, 'EEEE', { locale: ptBR }).split('-')[0].toUpperCase(),
        dateFormatted: format(day, 'dd/MM'),
        slots: allSlots
      };
    });
  }, [doctorAgenda, visibleDays, isFallback]);

  const handleBooking = async (day, time) => {
    if (isFallback) {
      toast({
        variant: 'destructive',
        title: 'Não é possível agendar',
        description: 'A agenda do médico não pôde ser carregada. Tente novamente mais tarde.'
      });
      return;
    }

    if (!session) {
      navigate('/acesso-paciente');
      return;
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentDate = new Date(day);
    appointmentDate.setHours(hours, minutes, 0, 0);
    
    // Ensure we use the exact patient price calculated in the parent component
    const priceToUse = typeof patientPrice === 'number' 
      ? Math.round(patientPrice * 100) 
      : (doctor.price_in_cents || 0);
    
    const appointmentDetails = {
      medico_id: doctor.id,
      doctor_name: doctor.public_name || doctor.name,
      specialty: doctor.specialty,
      appointment_date: format(appointmentDate, 'yyyy-MM-dd'),
      appointment_time: time,
      horario_inicio: appointmentDate.toISOString(),
      horario_fim: addMinutes(appointmentDate, 30).toISOString(),
      price_in_cents: priceToUse
    };

    navigate('/agendamento/revisao', { state: { appointmentDetails } });
  };

  const handleFavorite = e => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: "🚧 Esta funcionalidade não está implementada ainda",
      description: "Você pode solicitá-la em seu próximo prompt! 🚀",
      variant: "default"
    });
  };

  const isScheduleAvailable = scheduleByDay.some(d => d.slots.length > 0);

  // Directly use the formatted price passed from the parent which already includes the tax
  const displayPrice = formattedPatientPrice ? formattedPatientPrice : 'Consultar';
  
  if (typeof patientPrice === 'number') {
    console.log(`Rendering DoctorScheduleCard price for ${doctor?.name}:`, formattedPatientPrice);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-card rounded-xl border border-border/60 shadow-lg flex flex-col relative overflow-hidden my-3"
    >
      <div className="flex flex-col md:flex-row">
          <div className="p-3 md:p-4 flex flex-col gap-2 w-full md:w-[235px] border-b md:border-b-0 md:border-r border-border/30 bg-gray-50/50">
              <div className="flex items-start gap-2">
                  <Avatar className="w-12 h-12 border-2 border-primary/20 shadow-md shrink-0">
                      <AvatarImage src={doctor?.image_url} alt={`Foto de ${doctor?.public_name || 'médico'}`} />
                      <AvatarFallback className="bg-primary/10 text-primary"><User size={24} /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                          <Link to={!isFallback ? `/medico/${doctor.id}` : '#'} className={cn("block", !isFallback && "hover:underline")}>
                              <h3 className="text-base font-bold text-foreground overflow-hidden text-ellipsis whitespace-nowrap" title={doctor?.public_name || doctor?.name}>
                                  {doctor?.public_name || doctor?.name}
                              </h3>
                          </Link>
                          <button onClick={handleFavorite} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 pt-0.5 focus:outline-none" aria-label="Adicionar aos favoritos">
                              <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-red-500 text-red-500")} />
                          </button>
                      </div>
                      
                      <div className="flex items-center gap-1 text-amber-500 mt-0.5">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="font-bold text-xs text-foreground/80">5.0</span>
                          {doctor?.doctoralia_reviews_url && <a href={doctor.doctoralia_reviews_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs ml-0.5 font-semibold">
                                  (Opiniões)
                              </a>}
                      </div>
                  </div>
              </div>
              
              <div className="text-xs text-muted-foreground mt-1">
                  <p className="text-xs overflow-hidden text-ellipsis whitespace-nowrap" title={`${doctor?.specialty} ${doctor?.crm ? `CRM ${doctor.crm}/${doctor.uf}` : ''}`}>
                      {doctor?.specialty} {doctor?.crm && `CRM ${doctor.crm}/${doctor.uf}`}
                  </p>
              </div>

              <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                      <Award className="w-3 h-3 text-primary" />
                      <span className="text-xs">Certificado</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <Asterisk className="w-3 h-3 text-primary" />
                      <span className="text-xs">Atendimentos em telemedicina</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <HeartHandshake className="w-3 h-3 text-primary" />
                      <span className="text-xs">Pacientes fiéis</span>
                      <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Info className="w-2.5 h-2.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                  <p>Pacientes retornam para outras consultas.</p>
                              </TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                  </div>
              </div>
              <div className="flex flex-wrap gap-1.5 items-center mt-auto pt-2">
                  <Badge variant="custom" className="bg-blue-100 text-primary font-bold py-0.5 px-2 rounded-md text-xs">
                      {displayPrice}
                  </Badge>
                  <Badge variant="custom" className="bg-green-100 text-green-800 font-semibold py-0.5 px-2 rounded-md flex items-center gap-1 text-xs">
                      <Video className="w-3 h-3" />
                      <span>Teleconsulta</span>
                  </Badge>
              </div>
          </div>
          
          <div className="p-3 md:p-4 flex-1 flex flex-col min-h-[300px]">
              {loadingSlots ? <ScheduleSkeleton /> : !isScheduleAvailable ? <div className="flex-grow flex flex-col justify-center items-center text-center text-muted-foreground py-6">
                      <CalendarOff className="w-7 h-7 mb-1" />
                      <p className="font-semibold text-foreground text-sm">Sem horários disponíveis</p>
                      <p className="text-xs">{isFallback ? 'A agenda do médico não pôde ser carregada.' : 'Este médico está ajustando seus horários. Volte mais tarde.'}</p>
                  </div> : <>
                      <div className="flex items-center justify-between mb-3 px-1">
                           <Button variant="ghost" size="icon" onClick={() => setDayOffset(d => Math.max(0, d - 5))} disabled={dayOffset === 0} className="w-8 h-8 hover:bg-gray-100 text-gray-500">
                              <ChevronLeft className="w-5 h-5" />
                          </Button>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:block">Selecione um horário</span>
                          <Button variant="ghost" size="icon" onClick={() => setDayOffset(d => d + 5)} className="w-8 h-8 hover:bg-gray-100 text-gray-500">
                             <ChevronRight className="w-5 h-5" />
                          </Button>
                      </div>
                      
                      <TooltipProvider delayDuration={100}>
                          <motion.div className="flex-1 flex flex-col">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 bg-gray-200 border border-gray-200 rounded-xl overflow-hidden gap-[1px] shadow-sm">
                                  {scheduleByDay.map(daySchedule => {
              const isDayToday = isToday(daySchedule.date);
              const hasSlots = daySchedule.slots.length > 0;
              return <div key={daySchedule.dateFormatted} className="bg-white flex flex-col min-h-[220px]">
                                              <div className={cn("py-3 px-1 text-center border-b border-gray-100 transition-colors h-[68px] flex flex-col justify-center", isDayToday ? "bg-blue-50/70" : "bg-white")}>
                                                  <div className={cn("text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-0.5", isDayToday ? "text-blue-700" : "text-gray-500")}>
                                                      {daySchedule.dayName}
                                                  </div>
                                                  <div className={cn("text-xs sm:text-sm font-bold", isDayToday ? "text-blue-700" : "text-gray-700")}>
                                                      {daySchedule.dateFormatted}
                                                  </div>
                                              </div>

                                              <div className="p-2 flex flex-col gap-2 flex-grow bg-white">
                                                  {(isExpanded ? daySchedule.slots : daySchedule.slots.slice(0, 4)).map(time => {
                    const slotDate = new Date(daySchedule.date);
                    const [hours, minutes] = time.split(':').map(Number);
                    slotDate.setHours(hours, minutes, 0, 0);
                    const slotIdentifier = `${format(utcToZonedTime(slotDate, 'America/Sao_Paulo'), 'yyyy-MM-dd')}T${format(utcToZonedTime(slotDate, 'America/Sao_Paulo'), 'HH:mm:ss')}`;
                    const isBooked = !!bookedSlots.get(slotIdentifier);
                    return <Tooltip key={time} disableHoverableContent={!isBooked}>
                                                              <TooltipTrigger asChild>
                                                                  <div className="w-full">
                                                                      <Button variant="outline" disabled={isBooked} onClick={() => handleBooking(daySchedule.date, time)} className={cn("w-full h-9 rounded-lg border text-sm font-semibold transition-all shadow-sm px-1", isBooked ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed decoration-gray-400" : "bg-white text-blue-700 border-blue-100 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md hover:text-blue-800")} aria-disabled={isBooked}>
                                                                          {time}
                                                                      </Button>
                                                                  </div>
                                                              </TooltipTrigger>
                                                              {isBooked && <TooltipContent>
                                                                      <p>Horário indisponível</p>
                                                                  </TooltipContent>}
                                                          </Tooltip>;
                  })}
                                                  {!hasSlots && <div className="flex-1 flex flex-col items-center justify-center opacity-30 py-4">
                                                          <div className="w-8 h-0.5 bg-gray-300 rounded-full mb-1"></div>
                                                      </div>}
                                              </div>
                                          </div>;
            })}
                              </div>
                              
                              {scheduleByDay.some(d => d.slots.length > 4) && <div className="mt-3 flex justify-end md:justify-end justify-center">
                                      <button onClick={() => setIsExpanded(!isExpanded)} className="text-[13px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-md hover:bg-blue-50 group">
                                          {isExpanded ? "Ver menos horários" : "Mostrar mais horários"}
                                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                                      </button>
                                  </div>}
                          </motion.div>
                      </TooltipProvider>
                  </>}
          </div>
      </div>
    </motion.div>
  );
}
