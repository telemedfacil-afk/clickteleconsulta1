import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const MemedPrescricaoPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const patientData = location.state?.patient;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [moduleReady, setModuleReady] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState(null);

  const scriptRef = useRef(null);

  // 1. Fetch Doctor Profile
  useEffect(() => {
    const fetchDoctor = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('medicos')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        setDoctorProfile(data);
      } catch (err) {
        console.error("Error fetching doctor profile:", err);
        setError("Não foi possível carregar os dados do médico.");
        setLoading(false);
      }
    };
    fetchDoctor();
  }, [user]);

  // 2. Get Token and Initialize Memed
  useEffect(() => {
    const initializeMemed = async () => {
      if (!doctorProfile) return;
      
      try {
        setLoading(true);
        setError(null);

        // Prepare input for Edge Function
        const nameParts = (doctorProfile.name || 'Doutor').split(' ');
        const nome = nameParts[0];
        const sobrenome = nameParts.slice(1).join(' ') || '.';
        
        const payload = {
            external_id: doctorProfile.id,
            nome: nome,
            sobrenome: sobrenome,
            cpf: doctorProfile.cpf || user?.user_metadata?.cpf || '00000000000', // Fallback for dev/testing
            board_code: 'CRM',
            board_number: doctorProfile.crm || '00000',
            board_state: doctorProfile.uf || 'SP'
        };

        console.log('[Memed Page] Requesting token with:', payload);

        // Call Edge Function
        const { data, error: funcError } = await supabase.functions.invoke('memed-prescriber-token', {
            body: payload
        });

        if (funcError) throw funcError;
        if (!data?.data?.token) throw new Error("Token not received from server");

        const newToken = data.data.token;
        setToken(newToken);
        console.log('[Memed Page] Token received successfully');

        // Inject Script
        if (!document.getElementById('memed-script')) {
            const script = document.createElement('script');
            script.id = 'memed-script';
            script.src = import.meta.env.VITE_MEMED_SCRIPT_URL;
            script.setAttribute('data-token', newToken);
            script.setAttribute('data-color', '#2563eb'); // Blue-600 to match theme
            script.async = true;
            
            script.onload = () => {
                console.log('[Memed Page] Script loaded');
            };
            
            script.onerror = () => {
                console.error('[Memed Page] Script failed to load');
                setError("Falha ao carregar o sistema de prescrição.");
            };

            document.body.appendChild(script);
            scriptRef.current = script;
        }

        // Setup Event Listeners
        const handleModuleInit = (event) => {
            console.log('[Memed Page] Module Init Event:', event);
            if (event.detail && event.detail.module === 'plataforma.prescricao') {
                setModuleReady(true);
                setLoading(false);
                
                // Show Module
                if (window.MdHub) {
                    window.MdHub.module.show('plataforma.prescricao');
                    
                    // Set Patient if available
                    if (patientData) {
                        const patientPayload = {
                            nome: patientData.full_name,
                            endereco: patientData.address || '',
                            cidade: patientData.city || '',
                            telefone: patientData.whatsapp || patientData.phone || '',
                            external_id: patientData.id
                        };
                        if (patientData.cpf) patientPayload.cpf = patientData.cpf;
                        
                        console.log('[Memed Page] Setting patient:', patientPayload);
                        window.MdHub.command.send('plataforma.prescricao', 'setPaciente', patientPayload);
                    }
                }
            }
        };

        document.addEventListener('core:moduleInit', handleModuleInit);

        // Fallback timeout
        setTimeout(() => {
             if (loading && !moduleReady) {
                 // Try to force show if script loaded but event missed (rare but possible)
                 if (window.MdHub) {
                     window.MdHub.module.show('plataforma.prescricao');
                     setModuleReady(true);
                     setLoading(false);
                 }
             }
        }, 5000);

        return () => {
            document.removeEventListener('core:moduleInit', handleModuleInit);
            // Cleanup script on unmount if needed? Usually better to keep it cached, but for SPA navigation:
            // Keeping it might duplicate listeners if not careful.
            // For now we assume typical user flow.
        };

      } catch (err) {
        console.error('[Memed Page] Initialization error:', err);
        setError(err.message || "Erro ao inicializar Memed");
        setLoading(false);
      }
    };

    initializeMemed();
  }, [doctorProfile]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 h-16">
             <div className="flex items-center gap-3">
                 <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-gray-100">
                     <ArrowLeft className="w-5 h-5 text-gray-600" />
                 </Button>
                 <div>
                     <h1 className="text-lg font-bold text-gray-900 leading-tight">Prescrição Digital</h1>
                     <p className="text-xs text-gray-500">
                        {patientData ? `Paciente: ${patientData.full_name}` : 'Nova Prescrição'}
                     </p>
                 </div>
             </div>
             {loading && (
                 <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span className="font-medium">Carregando Memed...</span>
                 </div>
             )}
        </header>

        <main className="flex-1 relative overflow-hidden">
            {error ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="bg-red-100 p-4 rounded-full mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao carregar prescrição</h2>
                    <p className="text-gray-600 max-w-md mb-6">{error}</p>
                    <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Tentar Novamente
                    </Button>
                </div>
            ) : (
                <div className="memed-container w-full h-full">
                    {/* Memed injects iframe here or attaches to body, usually attaches to body but we want it contained if possible.
                        However, Memed Sinapse usually opens as a layer or within a specific div if configured.
                        By default show() creates a UI layer. 
                        We leave this empty div as a semantic placeholder or for custom container config if supported.
                     */}
                    <div id="memed-root" className="w-full h-full" />
                </div>
            )}
        </main>
    </div>
  );
};

export default MemedPrescricaoPage;