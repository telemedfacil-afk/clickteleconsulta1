import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import JitsiMeetComponent from '@/components/JitsiMeetComponent';
import { useJaaSRoom } from '@/hooks/useJaaSRoom';

const VideoCallPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const { jaasState, initRoom, closeRoom } = useJaaSRoom();

  useEffect(() => {
    // Basic Auth Check — allow time for auth to initialize on page refresh
    if (!session) {
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
        const { data, error: fetchError } = await supabase
          .from('agendamentos')
          .select(`
            *,
            medicos:medico_id (id, name, public_name, user_id),
            perfis_usuarios:patient_id (id, full_name),
            guest_patients:guest_id (name)
          `)
          .eq('id', appointmentId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Agendamento não encontrado.');

        // Autorização: apenas médico ou paciente do agendamento podem entrar
        const isDoctor =
          profile?.role === 'medico' && data.medicos?.user_id === session.user.id;
        const isPatient = data.patient_id === session.user.id;

        if (!isDoctor && !isPatient) {
          setError('Acesso negado. Você não faz parte desta consulta.');
          setLoading(false);
          return;
        }

        setAppointment(data);
        setLoading(false);

        // Inicia sala JaaS — busca token seguro via Edge Function
        await initRoom(data, isDoctor ? 'doctor' : 'patient', session, profile);
      } catch (err) {
        console.error('Error fetching appointment:', err);
        setError('Erro ao carregar os dados da consulta. Verifique se o link está correto.');
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [session, appointmentId, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEndCall = () => {
    closeRoom();
    const redirectPath =
      profile?.role === 'medico' ? '/medico/dashboard' : '/paciente/dashboard';
    navigate(redirectPath);
  };

  // Estado: carregando dados do agendamento
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Preparando ambiente seguro...</h2>
        <p className="text-slate-400 mt-2">Verificando credenciais e conexão.</p>
      </div>
    );
  }

  // Estado: erro de acesso ou carregamento
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
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado: gerando credenciais seguras (chamando Edge Function)
  if (jaasState.loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Gerando credenciais seguras...</h2>
        <p className="text-slate-400 mt-2">Aguarde, conectando à sala protegida.</p>
      </div>
    );
  }

  // Estado: erro ao gerar token JaaS
  if (jaasState.error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700 shadow-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Erro de Conexão</h2>
              <p className="text-slate-400">{jaasState.error}</p>
            </div>
            <Button
              onClick={() => navigate(-1)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
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
      </Helmet>

      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        {jaasState.isOpen && (
          <JitsiMeetComponent
            appointment={appointment}
            userRole={profile?.role === 'medico' ? 'doctor' : 'patient'}
            isOpen={true}
            onClose={handleEndCall}
            jaasToken={jaasState.token}
            roomName={jaasState.roomName}
            appId={jaasState.appId}
          />
        )}
      </div>
    </>
  );
};

export default VideoCallPage;
