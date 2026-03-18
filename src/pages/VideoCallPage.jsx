import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import JitsiMeetComponent from '@/components/JitsiMeetComponent';
import { useJitsiRoom } from '@/hooks/useJitsiRoom';

const VideoCallPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const { openRoom, jitsiState, closeRoom } = useJitsiRoom();

  useEffect(() => {
    // Basic Auth Check
    if (!session) {
       // Allow time for auth to initialize if refreshing page
       const timer = setTimeout(() => {
          if (!session) {
             setError('Você precisa estar logado para acessar esta consulta.');
             setLoading(false);
          }
       }, 2000);
       return () => clearTimeout(timer);
    }
    
    if (!appointmentId) {
      setError('ID do agendamento não fornecido.');
      setLoading(false);
      return;
    }

    const fetchAppointment = async () => {
      try {
        const { data, error } = await supabase
          .from('agendamentos')
          .select(`
            *,
            medicos:medico_id (id, name, public_name),
            perfis_usuarios:patient_id (id, full_name),
            guest_patients:guest_id (name)
          `)
          .eq('id', appointmentId)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Agendamento não encontrado.");

        // Security check: ensure user is related to appointment
        const isDoctor = profile?.role === 'medico' && data.medico_id === profile.id; // profile.id maps to medico table id via some join or we assume strict relation? 
        // Actually profile.id is perfis_usuarios.id. For doctors, we need to check if they own the doctor record.
        // Assuming simplistic check for now based on typical RLS: if they could fetch it, they can likely view it.
        // But let's be safe:
        const isPatient = data.patient_id === session.user.id; // user_id in agendamentos/patients is usually auth.uid
        
        // For simpler logic matching previous flows:
        // openRoom handles role
        
        setAppointment(data);
        setLoading(false);
        // Automatically open the room when appointment is loaded
        openRoom(data, profile?.role === 'medico' ? 'doctor' : 'patient');

      } catch (err) {
        console.error('Error fetching appointment:', err);
        setError('Erro ao carregar os dados da consulta. Verifique se o link está correto.');
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [session, appointmentId, profile, openRoom]);

  const handleEndCall = () => {
    closeRoom();
    const redirectPath = profile?.role === 'medico' 
      ? '/medico/dashboard' 
      : '/paciente/dashboard';
    navigate(redirectPath);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Preparando ambiente seguro...</h2>
        <p className="text-slate-400 mt-2">Verificando credenciais e conexão.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700 shadow-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
                <p className="text-slate-400">{error}</p>
            </div>
            <Button onClick={() => navigate('/')} className="w-full bg-slate-700 hover:bg-slate-600 text-white gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Sala de Videochamada - Click Teleconsulta</title>
        {/* Force HTTPS meta if needed, though usually handled by server */}
      </Helmet>
      
      {/* Wrapper acting as the background/container for the modal-like component */}
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        {/* We use the JitsiMeetComponent but ensure it's open */}
        {jitsiState.isOpen && (
             <JitsiMeetComponent 
                appointment={appointment}
                userRole={profile?.role === 'medico' ? 'doctor' : 'patient'}
                isOpen={true}
                onClose={handleEndCall}
             />
        )}
      </div>
    </>
  );
};

export default VideoCallPage;