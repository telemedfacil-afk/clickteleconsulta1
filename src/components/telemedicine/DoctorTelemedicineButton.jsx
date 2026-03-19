import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Video, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { buildJitsiRoomId } from '@/utils/jitsiRoomId';

const DoctorTelemedicineButton = ({ appointment }) => {
  const { toast } = useToast();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);

  const handleStartConsultation = async () => {
    if (!session?.user?.id) {
      toast({
        title: 'Autenticação necessária',
        description: 'Você precisa estar logado para iniciar a consulta.',
        variant: 'destructive',
      });
      return;
    }

    if (!appointment?.id) {
      toast({
        title: 'Erro',
        description: 'Informações do agendamento incompletas.',
        variant: 'destructive',
      });
      return;
    }

    setIsStarting(true);
    try {
      // Determinar roomName determinístico para salvar no banco
      const roomName = appointment.video_room || buildJitsiRoomId(appointment.id);

      if (import.meta.env.DEV) {
        console.log('Doctor starting consultation:', {
          roomName,
          appointmentId: appointment.id,
        });
      }

      // Salvar video_room no banco (non-blocking) antes de navegar
      supabase
        .from('agendamentos')
        .update({ video_room: roomName })
        .eq('id', appointment.id)
        .then(({ error }) => {
          if (error) console.error('Background update of video_room failed:', error);
          else if (import.meta.env.DEV) console.log('Background update of video_room success');
        });

      // Navegar para a página de videochamada (JaaS embed inline)
      navigate(`/consulta/${appointment.id}`);
    } catch (err) {
      console.error('Failed to start consultation:', err);
      toast({
        title: 'Erro ao iniciar',
        description: 'Não foi possível iniciar a videochamada. Tente novamente.',
        variant: 'destructive',
      });
      setIsStarting(false);
    }
  };

  return (
    <Button
      className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all"
      onClick={handleStartConsultation}
      disabled={isStarting}
    >
      {isStarting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Video className="w-4 h-4" />
      )}
      Iniciar Teleconsulta
    </Button>
  );
};

export default DoctorTelemedicineButton;
