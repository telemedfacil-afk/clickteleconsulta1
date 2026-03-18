import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAuthHeaders } from '@/utils/telemedicineUtils';

export const useTelemedicineRoom = (appointmentId) => {
  const { session } = useAuth();
  const [roomName, setRoomName] = useState('');
  const [statusSala, setStatusSala] = useState('pendente');
  const [doctorStarted, setDoctorStarted] = useState(false);
  const [patientTCLEAccepted, setPatientTCLEAccepted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch initial state
  const fetchRoomState = useCallback(async () => {
    if (!appointmentId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('video_room, status_sala, medico_iniciou_em, tcle_aceito')
        .eq('id', appointmentId)
        .single();

      if (error) throw error;

      if (data) {
        setRoomName(data.video_room);
        setStatusSala(data.status_sala || 'pendente');
        setDoctorStarted(data.status_sala === 'medico_iniciou' || !!data.medico_iniciou_em);
        setPatientTCLEAccepted(data.tcle_aceito);
      }
    } catch (err) {
      console.error('Error fetching room state:', err);
      // Handle error gracefully, maybe set default states or retry logic could be added here
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  // Realtime subscription
  useEffect(() => {
    if (!appointmentId) return;

    fetchRoomState();

    const channel = supabase
      .channel(`telemed-room-${appointmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agendamentos',
          filter: `id=eq.${appointmentId}`,
        },
        (payload) => {
          const newData = payload.new;
          if (newData) {
            setRoomName(newData.video_room);
            setStatusSala(newData.status_sala || 'pendente');
            setDoctorStarted(newData.status_sala === 'medico_iniciou' || !!newData.medico_iniciou_em);
            setPatientTCLEAccepted(newData.tcle_aceito);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointmentId, fetchRoomState]);

  // Helper to log actions
  const logAction = async (action, metadata = {}) => {
    if (!session?.user?.id || !appointmentId) return;

    try {
      // Determine actor role based on metadata or default
      const role = metadata.role || 'unknown'; 
      
      await supabase.from('agendamento_logs').insert({
        agendamento_id: appointmentId,
        actor_id: session.user.id,
        actor_role: role, 
        action: action,
        metadata: metadata,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error logging action:', err);
    }
  };

  // Helper to call edge functions with auth
  const callEdgeFunction = async (functionName, body) => {
    // Ensure we have a valid session token
    let currentSession = session;
    
    // If session is missing or token is missing, try to refresh/get it
    if (!currentSession?.access_token) {
      const { data } = await supabase.auth.getSession();
      currentSession = data.session;
    }

    // If still no session, we can't proceed with auth
    if (!currentSession?.access_token) {
      console.error("No active session found for Edge Function call");
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        headers: getAuthHeaders(currentSession)
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`Error calling edge function ${functionName}:`, error);
      return { data: null, error };
    }
  };

  const registerDoctorStart = async () => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('agendamentos')
        .update({
          status_sala: 'medico_iniciou',
          medico_iniciou_em: now
        })
        .eq('id', appointmentId);

      if (error) throw error;

      await logAction('doctor_started_consultation', { role: 'medico', timestamp: now });
      setDoctorStarted(true);
      return { success: true };
    } catch (err) {
      console.error('Error registering doctor start:', err);
      return { success: false, error: err };
    }
  };

  const registerTCLEAcceptance = async (ipAddress, userAgent) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('agendamentos')
        .update({
          tcle_aceito: true,
          data_hora_aceite_tcle: now,
          ip_usuario_tcle: ipAddress,
          user_agent_tcle: userAgent
        })
        .eq('id', appointmentId);

      if (error) throw error;

      await logAction('tcle_accepted', { 
        role: 'paciente', 
        ip: ipAddress, 
        userAgent: userAgent,
        timestamp: now 
      });
      
      setPatientTCLEAccepted(true);
      return { success: true };
    } catch (err) {
      console.error('Error registering TCLE:', err);
      return { success: false, error: err };
    }
  };

  const registerPatientEntry = async () => {
    try {
      const now = new Date().toISOString();
      // Only update if not already set or to refresh timestamp
      const { error } = await supabase
        .from('agendamentos')
        .update({
          paciente_entrou_em: now,
        })
        .eq('id', appointmentId);

      if (error) throw error;

      await logAction('patient_entered_consultation', { role: 'paciente', timestamp: now });
      return { success: true };
    } catch (err) {
      console.error('Error registering patient entry:', err);
      return { success: false, error: err };
    }
  };

  return {
    roomName,
    statusSala,
    doctorStarted,
    patientTCLEAccepted,
    loading,
    registerDoctorStart,
    registerTCLEAcceptance,
    registerPatientEntry,
    callEdgeFunction, // Exposed for components to use authenticated calls
    refetchAppointment: fetchRoomState
  };
};