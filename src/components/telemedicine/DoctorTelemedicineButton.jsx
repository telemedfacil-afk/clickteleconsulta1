import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { buildJitsiRoomId } from '@/utils/jitsiRoomId';
import { openJitsiRoom } from '@/utils/telemedicineUtils';

const DoctorTelemedicineButton = ({ appointment }) => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [isStarting, setIsStarting] = useState(false);

  const handleStartConsultation = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Autenticação necessária",
        description: "Você precisa estar logado para iniciar a consulta.",
        variant: "destructive"
      });
      return;
    }

    if (!appointment?.id) {
      toast({
        title: "Erro",
        description: "Informações do agendamento incompletas.",
        variant: "destructive"
      });
      return;
    }

    setIsStarting(true);
    try {
      // 1. Determine Room ID (use existing or generate deterministic one)
      const roomName = appointment.video_room || buildJitsiRoomId(appointment.id);
      
      // 2. Determine Display Name
      const displayName = `Dr(a). ${appointment.medico_nome || 'Médico'}`;

      if (import.meta.env.DEV) {
        console.log("Doctor starting consultation:", { roomName, displayName, appointmentId: appointment.id });
      }

      // 3. Non-blocking DB update
      const updatePromise = supabase
        .from('agendamentos')
        .update({ video_room: roomName })
        .eq('id', appointment.id)
        .then(({ error }) => {
          if (error) console.error("Background update of video_room failed:", error);
          else if (import.meta.env.DEV) console.log("Background update of video_room success");
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
          throw new Error(result.error || "Erro desconhecido ao abrir sala");
        }
      } else {
        toast({
          title: "Consulta Iniciada",
          description: "A sala de teleconsulta foi aberta em uma nova aba.",
          variant: "success"
        });
      }
      
      await updatePromise;

    } catch (err) {
      console.error("Failed to start consultation:", err);
      toast({
        title: "Erro ao iniciar",
        description: "Não foi possível iniciar a videochamada. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Button 
      className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all"
      onClick={handleStartConsultation}
      disabled={isStarting}
    >
      {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
      Iniciar Teleconsulta
    </Button>
  );
};

export default DoctorTelemedicineButton;