import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Loader2, FileText, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTelemedicineRoom } from '@/hooks/useTelemedicineRoom';
import TCLEConsentModal from './TCLEConsentModal';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { buildJitsiRoomId } from '@/utils/jitsiRoomId';
import { openJitsiRoom } from '@/utils/telemedicineUtils';

const PatientTelemedicineButton = ({ appointment, onConsentStatusChange }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  
  // Consent State
  const [isCheckingConsent, setIsCheckingConsent] = useState(true);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [paramsError, setParamsError] = useState(false);

  // Jitsi Loading State
  const [isLoadingJitsi, setIsLoadingJitsi] = useState(false);
  const [jitsiError, setJitsiError] = useState(null);
  
  // Keep the hook for status updates (roomName, doctorStarted, etc.)
  const { 
    refetchAppointment 
  } = useTelemedicineRoom(appointment?.id);

  const appointmentId = appointment?.id;
  const consentToken = appointment?.consent_token;
  // Fallback check for payment status - check both pagamento_status and status fields
  const isPaid = appointment?.pagamento_status === 'pago' || appointment?.status === 'confirmado' || appointment?.status === 'confirmado_e_paga';

  // --- LOGGING FOR DEBUGGING ---
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("PatientTelemedicineButton Mounted:", {
        appointment_id: appointmentId,
        status: appointment?.status,
        pagamento_status: appointment?.pagamento_status,
        is_paid: isPaid,
        patient_id: appointment?.patient_id,
        current_user_id: user?.id
      });
    }
  }, [appointmentId, appointment, isPaid, user]);

  // --- 1. Check Consent Status ---
  useEffect(() => {
    const checkStatus = async () => {
      if (!appointmentId || !consentToken) {
        setParamsError(true);
        setIsCheckingConsent(false);
        return;
      }

      // LocalStorage (Fail-Open)
      const localConsent = localStorage.getItem(`consentAccepted:${appointmentId}`);
      if (localConsent === "true") {
        setConsentAccepted(true);
        setIsCheckingConsent(false);
        if (onConsentStatusChange) onConsentStatusChange(true);
        return;
      }

      // API Check
      try {
        const queryString = `?appointment_id=${appointmentId}&consent_token=${consentToken}`;
        const { data, error } = await supabase.functions.invoke(`teleconsult-consent${queryString}`, {
          method: 'GET'
        });

        if (error) throw error;

        if (data?.consent_logged) {
          setConsentAccepted(true);
          localStorage.setItem(`consentAccepted:${appointmentId}`, "true");
          if (onConsentStatusChange) onConsentStatusChange(true);
        }
      } catch (error) {
        console.warn("Error checking consent API, falling back to props:", error);
        // Fallback to existing fields in appointment prop
        if (appointment?.consent_logged_at || appointment?.tcle_accepted) {
            setConsentAccepted(true);
            localStorage.setItem(`consentAccepted:${appointmentId}`, "true");
        }
      } finally {
        setIsCheckingConsent(false);
      }
    };

    checkStatus();
  }, [appointmentId, consentToken, appointment, onConsentStatusChange]);

  const handleConsentSuccess = () => {
    setConsentAccepted(true);
    localStorage.setItem(`consentAccepted:${appointmentId}`, "true");
    if (onConsentStatusChange) onConsentStatusChange(true);
    refetchAppointment();
  };

  // --- 2. Handle Join Call ---
  const handleJoinClick = async () => {
    setJitsiError(null);
    setIsLoadingJitsi(true);

    // Validation
    if (!appointmentId) {
      const msg = "Erro: ID do agendamento não encontrado.";
      console.error(msg);
      setJitsiError(msg);
      toast({ title: "Erro", description: msg, variant: "destructive" });
      setIsLoadingJitsi(false);
      return;
    }

    if (!user?.id) {
       const msg = "Erro: Usuário não autenticado.";
       console.error(msg);
       setJitsiError(msg);
       toast({ title: "Erro de Autenticação", description: "Faça login novamente.", variant: "destructive" });
       setIsLoadingJitsi(false);
       return;
    }

    // Attempt retry of pending consents if any
    const pendingKey = `consentPending:${appointmentId}`;
    const pendingPayload = localStorage.getItem(pendingKey);
    if (pendingPayload) {
      try {
        supabase.functions.invoke('teleconsult-consent', { body: JSON.parse(pendingPayload) })
          .then(({ data }) => { if (data?.ok) localStorage.removeItem(pendingKey); });
      } catch (e) { console.warn("Pending consent retry error", e); }
    }

    try {
      // 1. Determine Room ID
      const roomName = appointment.video_room || buildJitsiRoomId(appointmentId);
      
      // 2. Determine Display Name
      const displayName = user?.user_metadata?.full_name || "Paciente";

      console.log("Patient joining room:", { roomName, displayName });

      // 3. Non-blocking DB update
      const updatePromise = supabase
        .from('agendamentos')
        .update({ video_room: roomName })
        .eq('id', appointmentId)
        .then(({ error }) => {
           if (error) console.error("Background update of video_room failed:", error);
        });

      // 4. Open the room
      const result = openJitsiRoom(roomName, displayName);

      if (!result.ok) {
        if (result.error === "Popup blocked") {
          toast({
            title: "Popup Bloqueado",
            description: "Por favor, permita popups para abrir a videochamada.",
            variant: "warning"
          });
        } else {
          throw new Error(result.error || "Falha ao abrir sala");
        }
      } else {
        toast({
          title: "Sala de Espera",
          description: "Redirecionando para a videochamada segura...",
          variant: "success"
        });
      }

      await updatePromise;

    } catch (err) {
      console.error("Failed to open video room:", err);
      const errMsg = err.message || "Falha desconhecida ao iniciar vídeo.";
      setJitsiError(errMsg);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar à videochamada. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingJitsi(false);
    }
  };


  // --- Render States ---

  if (isCheckingConsent) {
    return (
      <Button disabled variant="ghost" className="w-full sm:w-auto">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Verificando...
      </Button>
    );
  }

  if (paramsError) {
    return (
      <div className="flex flex-col gap-2 w-full sm:w-auto">
         <div className="text-red-500 text-xs font-medium flex items-center gap-1 bg-red-50 p-2 rounded border border-red-100 mb-1">
            <AlertTriangle className="w-3 h-3" />
            Link inválido
         </div>
      </div>
    );
  }

  const isConfirmEnabled = appointmentId && consentToken && isPaid && !consentAccepted;
  const isJoinEnabled = appointmentId && isPaid && consentAccepted;

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      
      {/* 1. Confirm Terms Button */}
      {!consentAccepted && (
          <Button 
            className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            onClick={() => setModalOpen(true)}
            disabled={!isConfirmEnabled}
            title={!isPaid ? "Aguardando pagamento" : "Necessário aceitar termos"}
          >
            <FileText className="w-4 h-4" />
            Confirmar Termos
          </Button>
      )}

      {/* 2. Join Video Button */}
      <Button 
        className={`w-full sm:w-auto gap-2 shadow-md transition-all ${
          isJoinEnabled 
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
        }`}
        onClick={handleJoinClick}
        disabled={!isJoinEnabled || isLoadingJitsi}
      >
        {isLoadingJitsi ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isJoinEnabled ? (
          <Video className="w-4 h-4" />
        ) : (
          <Lock className="w-4 h-4" />
        )}
        Acessar videochamada
      </Button>

      {/* 3. Error Message Display */}
      {jitsiError && (
        <div className="text-red-600 text-[11px] font-medium bg-red-50 p-2 rounded border border-red-100 mt-1 max-w-[200px] leading-tight">
          {jitsiError}
        </div>
      )}

      {/* 4. Status Indicators */}
      {consentAccepted && (
         <div className="flex items-center justify-center gap-1 text-[10px] text-green-600 font-medium mt-1">
             <CheckCircle2 className="w-3 h-3" /> Termos aceitos
         </div>
      )}

      {!isPaid && (
          <div className="text-amber-600 text-[10px] font-medium text-center mt-1">
              Pagamento pendente
          </div>
      )}

      <TCLEConsentModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        onConsentSuccess={handleConsentSuccess}
        appointmentId={appointmentId}
        consentToken={consentToken}
        tcleVersion={appointment?.tcle_version || "1.0"}
      />
    </div>
  );
};

export default PatientTelemedicineButton;