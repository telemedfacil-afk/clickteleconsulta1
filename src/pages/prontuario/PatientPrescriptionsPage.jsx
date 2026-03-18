import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  Bell, 
  User,
  Plus,
  ChevronDown,
  ChevronLeft,
  Loader2,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Helmet } from 'react-helmet';

const PatientPrescriptionsPage = () => {
    const { patientId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [patient, setPatient] = useState(null);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [digitalSignature, setDigitalSignature] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!patientId) return;

            try {
                // Fetch Patient
                const { data: patData, error: patError } = await supabase
                    .from('perfis_usuarios')
                    .select('*')
                    .eq('id', patientId)
                    .single();
                
                if (patError) throw patError;
                setPatient(patData);

                // Fetch Prescriptions (doc_instances with type 'prescricao')
                const { data: presData, error: presError } = await supabase
                    .from('doc_instances')
                    .select('*')
                    .eq('patient_id', patientId)
                    .eq('doc_type', 'prescricao')
                    .order('created_at', { ascending: false });
                
                if (presError) throw presError;
                setPrescriptions(presData || []);

            } catch (error) {
                console.error("Error loading prescription data:", error);
                toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar dados." });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [patientId, toast]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!patient) {
        return (
             <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 gap-4">
                <h1 className="text-xl font-bold">Paciente não encontrado</h1>
                <Button onClick={() => navigate(-1)}>Voltar</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
            <Helmet>
                <title>Prescrições - {patient.full_name}</title>
            </Helmet>

            {/* Top Navigation Bar */}
            <header className="flex items-center justify-between bg-white border-b px-6 py-3 sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-6">
                     <div className="flex items-center gap-2">
                         <Avatar className="h-8 w-8 bg-slate-100 text-slate-500 border border-slate-200">
                             <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                         </Avatar>
                     </div>
                     
                     <nav className="flex items-center gap-6">
                         <button className="text-sm font-medium text-slate-900">Arquivo</button>
                         <button className="text-sm font-medium text-slate-600 hover:text-slate-900">Modelos</button>
                         <button className="text-sm font-medium text-slate-600 hover:text-slate-900 relative">
                             Ajuda
                             <span className="absolute -top-0.5 -right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white box-content" />
                         </button>
                     </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="digital-sign-toggle" className="text-sm font-medium text-slate-900 cursor-pointer">
                            Assinatura Digital
                        </Label>
                        <Switch 
                            id="digital-sign-toggle"
                            checked={digitalSignature}
                            onCheckedChange={setDigitalSignature}
                        />
                    </div>
                    
                    <Button variant="ghost" size="icon" className="text-slate-500">
                        <Bell className="h-5 w-5" />
                    </Button>

                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6" onClick={() => navigate('/medico/dashboard/prescricoes')}>
                        Gerar Prescrição
                    </Button>
                </div>
            </header>

            {/* Patient & Date Filter Bar */}
            <div className="bg-white border-b px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">Nome:</span>
                    <div className="flex items-center gap-2 cursor-pointer group">
                        <span className="text-base text-slate-600 group-hover:text-slate-900 transition-colors">
                            {patient.full_name}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">Data:</span>
                    <div className="flex items-center gap-2 cursor-pointer group">
                        <span className="text-base text-slate-600 group-hover:text-slate-900 transition-colors capitalize">
                            {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
                {/* Add Button */}
                <div className="flex justify-center mb-12">
                    <button 
                        className="flex items-center gap-2 text-blue-500 hover:text-blue-600 font-medium text-lg transition-colors"
                        onClick={() => navigate('/medico/dashboard/prescricoes')}
                    >
                        <Plus className="h-5 w-5" />
                        Adicionar à prescrição
                    </button>
                </div>

                {/* Section Header */}
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                        ÚLTIMAS PRESCRIÇÕES DE {patient.full_name.toUpperCase()}
                    </h2>
                    <a href="#" className="text-sm font-medium text-blue-500 hover:text-blue-600 hover:underline">
                        Ver mais
                    </a>
                </div>

                {/* Grid */}
                {prescriptions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {prescriptions.map((doc) => {
                            // Extract body and try to format as list
                            const bodyText = doc.content_json?.body || "";
                            // Simple heuristic: split by newlines, filter empty, take top 4
                            const lines = bodyText.split('\n').filter(line => line.trim().length > 0).slice(0, 4);

                            return (
                                <Card key={doc.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                                    <CardHeader className="p-5 pb-2">
                                        <CardTitle className="text-base font-medium text-slate-900 line-clamp-1">
                                            {patient.full_name}
                                        </CardTitle>
                                        <CardDescription className="text-blue-500 font-medium text-xs mt-1">
                                            Emitida em {format(new Date(doc.created_at), "dd/MM/yyyy")}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-5 pt-3">
                                        <ul className="space-y-1">
                                            {lines.length > 0 ? lines.map((line, idx) => (
                                                <li key={idx} className="text-sm text-slate-500 flex items-start gap-1">
                                                    <span className="select-none text-slate-400">{idx + 1}.</span>
                                                    <span className="line-clamp-1">{line.replace(/^\d+[\.)]\s*/, '')}</span>
                                                </li>
                                            )) : (
                                                <li className="text-sm text-slate-400 italic">Sem itens listados</li>
                                            )}
                                            {bodyText.split('\n').filter(l => l.trim()).length > 4 && (
                                                <li className="text-xs text-slate-400 mt-2 pt-1 border-t border-slate-100">
                                                    + {bodyText.split('\n').filter(l => l.trim()).length - 4} itens
                                                </li>
                                            )}
                                        </ul>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-slate-400 bg-white">
                        <p>Nenhuma prescrição encontrada para este paciente.</p>
                        <Button variant="link" onClick={() => navigate('/medico/dashboard/prescricoes')}>
                            Criar primeira prescrição
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PatientPrescriptionsPage;