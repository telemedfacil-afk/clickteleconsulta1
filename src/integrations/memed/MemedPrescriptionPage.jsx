import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { getMemedToken } from './memedService';
import { Loader2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * MEMED INTEGRATION
 * Page component that renders the Memed prescription module.
 */
const MemedPrescriptionPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [patient, setPatient] = useState(null);
  const [patientsList, setPatientsList] = useState([]);
  
  const scriptRef = useRef(null);
  const containerRef = useRef(null);

  // Parse query params for pre-filling patient data
  const patientIdParam = searchParams.get('patientId');

  useEffect(() => {
    const initialize = async () => {
      if (!user || !profile) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Patients List for selector (if no patientId provided)
        if (!patientIdParam) {
            // Simplified query to get recent patients for the doctor
            const { data: recentAppointments } = await supabase
                .from('agendamentos')
                .select('patient_id, perfis_usuarios(id, full_name, cpf, data_nasc, whatsapp, email)')
                .eq('medico_id', profile.id) // Assuming profile.id is doctor ID
                .order('appointment_date', { ascending: false })
                .limit(50);
            
            // Deduplicate patients
            const uniquePatients = [];
            const seenIds = new Set();
            
            recentAppointments?.forEach(appt => {
                if (appt.perfis_usuarios && !seenIds.has(appt.patient_id)) {
                    seenIds.add(appt.patient_id);
                    uniquePatients.push(appt.perfis_usuarios);
                }
            });
            
            setPatientsList(uniquePatients);
        } else {
            // Fetch specific patient data
            const { data: patientData, error: patError } = await supabase
                .from('perfis_usuarios')
                .select('*')
                .eq('id', patientIdParam)
                .single();
            
            if (patError) throw patError;
            setPatient(patientData);
        }

        // 2. Get Memed Token
        const memedToken = await getMemedToken(user.id);
        if (!memedToken) throw new Error('Token de prescrição inválido.');
        setToken(memedToken);

      } catch (err) {
        console.error("Memed Init Error:", err);
        setError("Integração de prescrição indisponível no momento. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [user, profile, patientIdParam]);

  // Effect to inject script when token is ready
  useEffect(() => {
    if (!token) return;

    // Cleanup previous script if exists
    const existingScript = document.getElementById('memed-script');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.id = 'memed-script';
    script.src = 'https://sandbox.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js';
    script.setAttribute('data-token', token);
    script.setAttribute('data-color', '#2563eb'); // Blue-600 to match theme
    script.setAttribute('data-container', 'memed-prescricao-root');
    
    script.onload = () => {
        // Initialize Memed after script load if needed
        if (window.MdHub) {
            const mdHub = window.MdHub.module;
            if (patient) {
                // Pre-fill patient logic would go here using Memed commands
                // mdHub.command.send('plataforma.prescricao', 'setPaciente', { ... });
                console.log("Setting patient in Memed:", patient.full_name);
                
                // Example structure for Memed patient object
                /*
                mdHub.command.send('plataforma.prescricao', 'setPaciente', {
                    nome: patient.full_name,
                    cpf: patient.cpf,
                    data_nascimento: patient.data_nasc, // Format DD/MM/YYYY
                    telefone: patient.whatsapp,
                    id: patient.id
                });
                */
            }
        }
    };

    scriptRef.current = script;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (scriptRef.current) {
        scriptRef.current.remove();
      }
    };
  }, [token, patient]);

  const handlePatientSelect = (patientId) => {
      const selected = patientsList.find(p => p.id === patientId);
      if (selected) {
          setPatient(selected);
          // In a real implementation, we would trigger the Memed command to update the patient here
          // window.MdHub.command.send('plataforma.prescricao', 'setPaciente', { ... });
      }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] w-full bg-white">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <h3 className="text-lg font-medium text-gray-700">Carregando prescrição...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] w-full p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="mt-4" 
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-[calc(100vh-64px)] bg-gray-50">
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
            <div>
                <h1 className="text-lg font-bold text-gray-800">Prescrição Digital</h1>
                <p className="text-xs text-gray-500">Integrado com Memed (Homologação)</p>
            </div>
        </div>

        {!patientIdParam && (
             <div className="w-[300px]">
                <Select onValueChange={handlePatientSelect}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um paciente..." />
                    </SelectTrigger>
                    <SelectContent>
                        {patientsList.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative bg-white">
         <div 
            id="memed-prescricao-root" 
            ref={containerRef}
            className="w-full h-full"
            style={{ minHeight: '600px' }}
         >
             {/* Memed iframe will be injected here */}
         </div>
      </div>
    </div>
  );
};

export default MemedPrescriptionPage;