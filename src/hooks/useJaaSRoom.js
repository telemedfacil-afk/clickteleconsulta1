import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { generateJaaSToken } from '@/utils/telemedicineUtils';

/**
 * useJaaSRoom — Hook para gerenciar o ciclo de vida de uma sala JaaS (8x8.vc).
 *
 * Obtém o JWT assinado via Edge Function (chave privada nunca exposta ao frontend).
 *
 * @returns {{ jaasState, initRoom, closeRoom }}
 *
 * jaasState: { isOpen, token, roomName, appId, loading, error }
 * initRoom(appointment, userRole, session, profile): async — busca token e abre sala
 * closeRoom(): reseta estado
 */
export const useJaaSRoom = () => {
  const [jaasState, setJaasState] = useState({
    isOpen: false,
    token: null,
    roomName: null,
    appId: null,
    loading: false,
    error: null,
  });

  const initRoom = useCallback(async (appointment, userRole, session, profile) => {
    setJaasState((s) => ({ ...s, loading: true, error: null }));

    try {
      const isModerator = userRole === 'doctor';

      const displayName = isModerator
        ? `Dr(a). ${appointment.medico_nome || profile?.full_name || 'Médico'}`
        : (profile?.full_name || session?.user?.user_metadata?.full_name || 'Paciente');

      const { token, roomName, appId } = await generateJaaSToken(supabase, {
        appointmentId: appointment.id,
        userId: session.user.id,
        displayName,
        email: session.user.email,
        isModerator,
      });

      setJaasState({
        isOpen: true,
        token,
        roomName,
        appId,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('useJaaSRoom.initRoom error:', err);
      setJaasState((s) => ({
        ...s,
        loading: false,
        error: err.message || 'Erro ao gerar credenciais da sala',
      }));
    }
  }, []);

  const closeRoom = useCallback(() => {
    setJaasState({
      isOpen: false,
      token: null,
      roomName: null,
      appId: null,
      loading: false,
      error: null,
    });
  }, []);

  return { jaasState, initRoom, closeRoom };
};
