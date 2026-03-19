import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from './SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { buildJitsiRoomId } from '@/utils/jitsiRoomId';

const AppointmentsContext = createContext();

export const useAppointments = () => useContext(AppointmentsContext);

export const AppointmentsProvider = ({ children }) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const { session, profile } = useAuth();
    const { toast } = useToast();
    const [currentDoctorId, setCurrentDoctorId] = useState(null);

    useEffect(() => {
        const getDoctorId = async () => {
            if (session && profile?.role === 'medico') {
                 try {
                     const { data, error } = await supabase.from('medicos').select('id').eq('user_id', session.user.id).maybeSingle();
                     if (error) throw error;
                     if (data) setCurrentDoctorId(data.id);
                 } catch (e) {
                     console.error("Error fetching doctor ID:", e);
                 }
            }
        };
        getDoctorId();
    }, [session, profile]);

    const fetchAppointments = useCallback(async () => {
        if (!session || !profile) {
            setLoading(false);
            setAppointments([]);
            return;
        }
        setLoading(true);

        try {
            // Validate client before making request
            if (!supabase) throw new Error("Supabase client not initialized");

            let query = supabase
                .from('agendamentos')
                .select(`
                    *,
                    medicos!inner(id, name,specialty,public_name),
                    perfis_usuarios:perfis_usuarios!agendamentos_patient_id_fkey(full_name, email, cpf, data_nasc, whatsapp),
                    guest_patients:guest_id(name, email, phone),
                    guias:agendamentos_guia_id_fkey!left(id,protocolo)
                `);
            
            if (profile.role === 'paciente') {
                query = query.eq('patient_id', session.user.id);
            } else if (profile.role === 'medico') {
                const { data: doctorData, error: doctorError } = await supabase.from('medicos').select('id').eq('user_id', session.user.id).maybeSingle();
                
                if (doctorError) {
                    if (!doctorError.message?.includes('Failed to fetch')) {
                        console.error("Error fetching doctor profile for appointments:", doctorError);
                    }
                    setAppointments([]);
                    setLoading(false);
                    return;
                }

                if(doctorData?.id){
                     query = query.eq('medico_id', doctorData.id);
                } else {
                    setAppointments([]);
                    setLoading(false);
                    return;
                }
            } else {
                 setAppointments([]);
                 setLoading(false);
                 return;
            }

            const { data, error } = await query.order('horario_inicio', { ascending: false });

            if (error) {
                throw error;
            } else {
                setAppointments(data || []);
            }
        } catch (err) {
            console.error("Exception in fetchAppointments:", err);
            if (!err.message?.includes('Failed to fetch')) {
                toast({ variant: "destructive", title: "Erro ao carregar agendamentos", description: err.message || "Erro de conexão" });
            }
        } finally {
            setLoading(false);
        }
    }, [session, profile, toast]);
    
    const getBookedSlots = useCallback(async (doctorId) => {
        if (!doctorId) {
            return new Map();
        }

        try {
            const { data, error } = await supabase
                .from('agendamentos')
                .select('horario_inicio, status')
                .in('status', ['confirmado', 'atendido', 'reagendado', 'pendente', 'agendado', 'concluida'])
                .eq('medico_id', doctorId);

            if(error) throw error;
            
            const slotsMap = new Map();
            data.forEach(slot => {
                const slotDate = new Date(slot.horario_inicio);
                const slotIdentifier = `${format(slotDate, 'yyyy-MM-dd')}T${format(slotDate, 'HH:mm:ss')}`;
                slotsMap.set(slotIdentifier, { status: slot.status });
            });
            return slotsMap;
        } catch (e) {
            console.error("Exception fetching slots:", e);
            if (!e.message?.includes('Failed to fetch')) {
                toast({ variant: "destructive", title: "Erro ao buscar horários", description: e.message });
            }
            return new Map();
        }
    }, [toast]);

    const clearAppointments = useCallback(() => {
        setAppointments([]);
        setCurrentDoctorId(null);
    }, []);

    // Generate unique video_room for new appointments (Registered Users)
    const generateVideoRoom = () => {
        return `apt_${crypto.randomUUID()}`;
    };

    const createConfirmedAppointment = async (appointmentData) => {
        try {
            if (!session || !profile || profile.role !== 'paciente') {
                toast({ variant: "destructive", title: "Acesso negado", description: "Você precisa estar logado como paciente para agendar." });
                return { data: null, error: new Error("Usuário não autorizado") };
            }
            
            const appointmentDateTime = new Date(appointmentData.horario_inicio);
            
            const { data, error } = await supabase
                .from('agendamentos')
                .insert({ 
                    patient_id: session.user.id,
                    medico_id: appointmentData.medico_id,
                    servico_id: appointmentData.servico_id,
                    appointment_date: format(appointmentDateTime, 'yyyy-MM-dd'),
                    appointment_time: format(appointmentDateTime, 'HH:mm:ss'),
                    horario_inicio: appointmentData.horario_inicio,
                    horario_fim: appointmentData.horario_fim,
                    price_in_cents: appointmentData.price_in_cents,
                    status: 'pendente', 
                    pagamento_status: 'pendente',
                    source: 'site',
                    video_provider: 'jitsi',
                    video_room: generateVideoRoom(),
                    call_open_minutes_after: 30
                })
                .select()
                .single();

            if (error) throw error;
            
            return { data, error: null };
        } catch (error) {
            console.error('appointment_create_error:', error);
            let description = "Não foi possível concluir seu agendamento agora. Tente novamente.";
            if (error.code === '23505' && error.message.includes('agendamentos_confirmados_unicos_idx')) { 
                description = "agendamentos_confirmados_unicos_idx"
            } else {
                toast({ variant: "destructive", title: "Erro no Agendamento", description: description });
            }
            return { data: null, error: new Error(description) };
        }
    };

    const createGuestAppointment = async (guestData, appointmentData) => {
        if (!currentDoctorId) return { error: { message: "Médico não identificado" } };
        
        try {
            // 1. Create or get guest user
            const { data: userData, error: userError } = await supabase.functions.invoke('create-guest-user', {
                body: {
                    name: guestData.name,
                    email: guestData.email, 
                    phone: guestData.phone
                }
            });

            if (userError || !userData?.user?.id) {
                console.error("Error creating guest user:", userError);
                return { error: { message: "Erro ao criar registro do usuário convidado." } };
            }

            const newPatientId = userData.user.id;

            // 2. Update guest profile details
            if (guestData.email) {
                 const { error: updateError } = await supabase
                    .from('perfis_usuarios')
                    .update({ 
                        email: guestData.email,
                        whatsapp: guestData.phone,
                        role: 'guest'
                    })
                    .eq('id', newPatientId);
                 
                 if (updateError) {
                     console.warn("Could not update guest profile email (possibly duplicate):", updateError);
                 }
            }

            // 3. Create guest_patients entry
            const { data: newGuest, error: guestError } = await supabase
                .from('guest_patients')
                .insert({
                    doctor_id: currentDoctorId,
                    name: guestData.name,
                    email: guestData.email || null,
                    phone: guestData.phone || null,
                    is_verified: false
                })
                .select()
                .single();

            if (guestError) throw guestError;

            const appointmentDateTime = new Date(appointmentData.horario_inicio);
            
            // 4. Create appointment
            const { data: appointment, error: appError } = await supabase
                .from('agendamentos')
                .insert({
                    medico_id: currentDoctorId,
                    guest_id: newGuest.id, 
                    patient_id: newPatientId, 
                    patient_type: 'GUEST', // Explicitly marking as guest
                    appointment_date: format(appointmentDateTime, 'yyyy-MM-dd'),
                    appointment_time: format(appointmentDateTime, 'HH:mm:ss'),
                    horario_inicio: appointmentData.horario_inicio,
                    horario_fim: appointmentData.horario_fim,
                    price_in_cents: 0, 
                    status: 'agendado', // ENSURE STATUS IS 'agendado' (NOT 'concluida')
                    pagamento_status: 'pago', // Assuming manual/free for guest
                    source: 'manual_doctor',
                    servico_id: null,
                    video_provider: 'jitsi',
                    video_room: null, // Will be updated
                    call_open_minutes_after: 30
                })
                .select()
                .single();
                
            if (appError) throw appError;

            // 5. Generate standardized room ID and tokens
            const videoRoomId = buildJitsiRoomId(appointment.id);
            const consentToken = crypto.randomUUID();
            
            const array = new Uint8Array(24);
            crypto.getRandomValues(array);
            const guestToken = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');

            // 6. Update appointment with room and consent token
            const { error: updateAppError } = await supabase
                .from('agendamentos')
                .update({ 
                    video_room: videoRoomId,
                    consent_token: consentToken,
                    guest_token: guestToken // Adding this directly to appointment as backup/convenience
                })
                .eq('id', appointment.id);

            if (updateAppError) throw updateAppError;

            // 7. Create guest access token entry
            const { error: tokenError } = await supabase
                .from('guest_access_tokens')
                .insert({
                    guest_patient_id: newGuest.id,
                    doctor_id: currentDoctorId,
                    appointment_id: appointment.id,
                    token: guestToken,
                    expires_at: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString() // 24h expiry
                });
                
            if (tokenError) throw tokenError;
            
            fetchAppointments();
            return { data: { appointment: { ...appointment, video_room: videoRoomId, guest_token: guestToken }, token: guestToken }, error: null };
            
        } catch (err) {
            console.error("Unexpected error in createGuestAppointment:", err);
            return { error: { message: err.message || "Erro inesperado ao criar agendamento." } };
        }
    };

    const rescheduleAppointment = async (appointmentId, newTimeData) => {
        if (!currentDoctorId) return { error: { message: "Médico não identificado" } };
        
        try {
            const appointmentDateTime = new Date(newTimeData.horario_inicio);
            
            const { error: updateError } = await supabase
                .from('agendamentos')
                .update({
                    horario_inicio: newTimeData.horario_inicio,
                    horario_fim: newTimeData.horario_fim,
                    appointment_date: format(appointmentDateTime, 'yyyy-MM-dd'),
                    appointment_time: format(appointmentDateTime, 'HH:mm:ss'),
                    status: 'reagendado'
                })
                .eq('id', appointmentId);

            if (updateError) throw updateError;
            
            fetchAppointments();
            return { error: null };

        } catch (err) {
            console.error("Error rescheduling:", err);
            return { error: err };
        }
    };
    
    const markAppointmentAsPaidByDoctor = async (appointmentId) => {
        try {
            if (!session || profile?.role !== 'medico') {
                return { error: { message: 'Apenas médicos podem confirmar pagamentos.' } };
            }

            const { error } = await supabase
                .from('agendamentos')
                .update({ 
                    pagamento_status: 'pago',
                    status: 'confirmado',
                    pagamento_confirmado_em: new Date().toISOString(),
                    pagamento_confirmado_por: session.user.id,
                })
                .eq('id', appointmentId);

            if (error) throw error;
            return { error: null };
        } catch (err) {
            console.error("Error marking as paid:", err);
            return { error: err };
        }
    };
    
    const confirmAttendance = async (appointmentId) => {
        try {
            const { data, error } = await supabase.rpc('medico_confirmar_atendimento', {
                p_agendamento_id: appointmentId
            });

            if (error) throw error;
            if (data && data[0] && data[0].success === false) {
                throw new Error(data[0].message);
            }
            
            try {
                await supabase.functions.invoke('notify-patient-completion', {
                    body: { appointmentId },
                });
            } catch (e) {
                 console.error('Error invoking notify-patient-completion function:', e);
            }
            
            return { data, error: null };
        } catch (err) {
            console.error("Error confirming attendance:", err);
            return { error: { message: err.message || "Erro ao confirmar atendimento" } };
        }
    };

    const cancelAppointmentByDoctor = async (appointmentId) => {
        try {
            if (profile?.role !== 'medico') {
                return { error: { message: 'Apenas médicos podem cancelar agendamentos.' } };
            }

            const { data, error } = await supabase.rpc('medico_excluir_agendamento', {
                p_agendamento_id: appointmentId,
            });

            if (error) throw error;
            if (data && data[0] && data[0].success === false) {
                throw new Error(data[0].message);
            }

            toast({ title: "Sucesso", description: data[0].message, variant: 'success' });
            return { error: null };
        } catch (err) {
            console.error("Error cancelling appointment:", err);
            toast({ variant: "destructive", title: "Erro ao cancelar", description: err.message });
            return { error: { message: err.message } };
        }
    };

    const saveMeetingLink = async (appointmentId, meetingLink) => {
        try {
            if (profile?.role !== 'medico') {
                return { error: { message: 'Apenas médicos podem adicionar links de consulta.' } };
            }

            const { error } = await supabase
                .from('agendamentos')
                .update({ meeting_link: meetingLink })
                .eq('id', appointmentId);
            
            if (error) throw error;
            return { error: null };
        } catch (err) {
            console.error("Error saving meeting link:", err);
            return { error: err };
        }
    };

    const getGuideById = async (guideId) => {
        try {
            const { data, error } = await supabase
                .from('guias')
                .select('*')
                .eq('id', guideId)
                .single();
            if (error) throw error;
            return { data, error: null };
        } catch (err) {
            console.error("Error fetching guide:", err);
            return { data: null, error: err };
        }
    };

    const updateAppointmentStatus = async (id, status) => {
        try {
            const { error } = await supabase.from('agendamentos').update({ status }).eq('id', id);
            if(error) throw error;
        } catch (err) {
            console.error("Error updating status:", err);
            toast({variant: 'destructive', title: 'Erro', description: err.message});
        }
    };

    const resendWhatsapp = async (appointmentId) => {
        try {
            const { data, error } = await supabase.functions.invoke('whatsapp-resend', {
                body: { appointmentId }
            });

            if (error) {
                console.error("Invoke error:", error);
                if (error.name === 'FunctionsFetchError' || error.message?.includes('Failed to send a request')) {
                     return { ok: false, error: "Erro de conexão com o servidor. Verifique sua internet ou tente novamente mais tarde." };
                }
                return { ok: false, error: error.message || "Erro ao processar solicitação." };
            }
            
            if (data && data.ok) {
                return { ok: true };
            } else {
                return { ok: false, error: data?.error || 'Erro desconhecido ao enviar mensagem.' };
            }
        } catch (e) {
            console.error("Exception invoking whatsapp-resend:", e);
            return { ok: false, error: "Erro inesperado. Tente novamente." };
        }
    };

    useEffect(() => {
        if (session && profile) {
            fetchAppointments();
        } else {
            setLoading(false);
            setAppointments([]); 
        }
    }, [session, profile, fetchAppointments]);

    useEffect(() => {
        if (!session || !profile) return;

        const handleRealtimeUpdate = (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            
            if (eventType === 'DELETE') {
                if (oldRecord && oldRecord.id) {
                    setAppointments(prev => prev.filter(appt => appt.id !== oldRecord.id));
                } else {
                    fetchAppointments();
                }
            } else if (eventType === 'INSERT') {
                fetchAppointments(); 
            } else if (eventType === 'UPDATE') {
                 setAppointments(prev => prev.map(appt => 
                    appt.id === newRecord.id ? { ...appt, ...newRecord } : appt
                ));
            }
        };

        const subscription = supabase
            .channel('public:agendamentos')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'agendamentos'
            }, handleRealtimeUpdate)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [session, profile, fetchAppointments]);
    

    return (
        <AppointmentsContext.Provider value={{ appointments, loading, createConfirmedAppointment, createGuestAppointment, rescheduleAppointment, getBookedSlots, markAppointmentAsPaidByDoctor, confirmAttendance, cancelAppointmentByDoctor, saveMeetingLink, getGuideById, refetchAppointments: fetchAppointments, updateAppointmentStatus, resendWhatsapp, currentDoctorId, clearAppointments }}>
            {children}
        </AppointmentsContext.Provider>
    );
};