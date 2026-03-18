import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, MessageSquare, Calendar, Wallet, User, MoreHorizontal, 
  Mail, Phone, Pill, Loader2, Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { debounce } from '@/lib/utils';

const ProntuarioSidebar = ({ patient, doctorId }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);

  // Fetch existing notes
  useEffect(() => {
    const fetchNotes = async () => {
      if (!patient?.id || !doctorId) return;
      
      try {
        const { data, error } = await supabase
          .from('patient_notes')
          .select('content')
          .eq('patient_id', patient.id)
          .eq('doctor_id', doctorId)
          .maybeSingle();

        if (data) {
          setNotes(data.content || '');
        }
      } catch (error) {
        console.error('Error fetching notes:', error);
      } finally {
        setLoadingNotes(false);
      }
    };

    fetchNotes();
  }, [patient?.id, doctorId]);

  // Debounced save function
  const saveNotes = async (content) => {
    if (!patient?.id || !doctorId) return;
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('patient_notes')
        .upsert({ 
          patient_id: patient.id,
          doctor_id: doctorId,
          content: content,
          updated_at: new Date().toISOString()
        }, { onConflict: 'patient_id, doctor_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar nota",
        description: "Tente novamente mais tarde."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Create memoized debounced handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce((nextValue) => saveNotes(nextValue), 800),
    [patient?.id, doctorId]
  );

  const handleNoteChange = (e) => {
    const newValue = e.target.value;
    setNotes(newValue);
    debouncedSave(newValue);
  };

  const handlePrescriptionClick = () => {
      if (patient?.id) {
          navigate(`/dashboard/medico/pacientes/${patient.id}/prescricoes`);
      }
  };

  if (!patient) return <div className="w-[300px] border-r bg-white h-full p-4"><Loader2 className="animate-spin" /></div>;

  const initials = patient.full_name 
    ? patient.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'PAC';

  return (
    <div className="w-full md:w-[320px] bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto shrink-0 transition-all duration-300">
      {/* Header Back Button */}
      <div className="p-4">
        <Button 
          variant="ghost" 
          className="gap-2 text-gray-500 hover:text-gray-900 pl-0"
          onClick={() => navigate('/medico/dashboard/consultas')}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Voltar</span>
        </Button>
      </div>

      {/* Patient Profile Header */}
      <div className="px-6 flex flex-col items-center text-center">
        <Avatar className="h-24 w-24 mb-4 border-4 border-blue-50">
          <AvatarImage src={patient.avatar_url} />
          <AvatarFallback className="bg-blue-200 text-blue-700 text-xl font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <h2 className="text-lg font-bold text-gray-900 leading-tight">
          {patient.full_name}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          N.º {patient.id ? patient.id.slice(0, 8).toUpperCase() : '---'}
        </p>

        {/* Quick Actions Row */}
        <div className="flex items-center justify-center gap-2 mt-6 w-full">
          <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50">
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50">
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50">
            <Wallet className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50">
            <User className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-gray-200 text-gray-500 hover:text-gray-900">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Contact Info */}
      <div className="px-6 space-y-4">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Mail className="h-4 w-4 text-gray-400" />
          <span className="truncate">{patient.email || 'Sem e-mail'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Phone className="h-4 w-4 text-gray-400" />
          <span>{patient.whatsapp || 'Sem telefone'}</span>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Prescriptions Link - Custom Internal Page */}
      <div className="px-6">
        <button 
          onClick={handlePrescriptionClick}
          className="flex items-center gap-3 w-full text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50 -ml-2"
        >
          <Pill className="h-4 w-4" />
          Prescrições
        </button>
      </div>

      <Separator className="my-6" />

      {/* Notes Section */}
      <div className="px-6 pb-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">Notas</h3>
          {isSaving && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Salvando...</span>}
          {!isSaving && !loadingNotes && notes && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Save className="h-3 w-3"/> Salvo</span>}
        </div>
        <Textarea 
          placeholder="Adicione suas notas sobre este paciente" 
          className="flex-1 resize-none bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm"
          value={notes}
          onChange={handleNoteChange}
        />
      </div>
    </div>
  );
};

export default ProntuarioSidebar;