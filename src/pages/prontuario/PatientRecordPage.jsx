
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ProntuarioSidebar from '@/components/prontuario/ProntuarioSidebar';
import ClinicalEpisode from '@/components/prontuario/ClinicalEpisode';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, FileText, CalendarCheck, CreditCard, UserCog, Clock, ChevronRight, AlertCircle, Calendar, Copy, Link as LinkIcon, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2pdf from 'html2pdf.js';

// Components for tabs content
const EmptyState = ({ message, subMessage, action }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-64 h-64 mb-6 relative flex items-center justify-center">
             <div className="bg-blue-50 rounded-full p-8 animate-pulse">
                <FileText className="w-16 h-16 text-blue-200" />
             </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{message}</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">{subMessage}</p>
        {action}
    </div>
);

const DocumentsTab = ({ patientId, doctorId }) => (
    <div className="p-6">
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-800">Documentos do Paciente</h3>
            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50"><Plus className="w-4 h-4 mr-2"/>Upload</Button>
        </div>
        <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center bg-gray-50/50">
            <p className="text-gray-500 text-sm">Nenhum documento anexado ainda.</p>
        </div>
    </div>
);

const PaymentsTab = ({ patientId }) => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPayments = async () => {
             const { data } = await supabase
                .from('agendamentos')
                .select('*')
                .eq('patient_id', patientId)
                .not('price_in_cents', 'is', null)
                .order('created_at', { ascending: false });
            setPayments(data || []);
            setLoading(false);
        };
        fetchPayments();
    }, [patientId]);

    if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin w-6 h-6 mx-auto text-blue-400"/></div>;

    return (
        <div className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Histórico de Pagamentos</h3>
            {payments.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center bg-gray-50/50">
                    <p className="text-gray-500 text-sm">Nenhum pagamento registrado.</p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 font-medium text-gray-600">Data</th>
                                <th className="p-3 font-medium text-gray-600">Serviço</th>
                                <th className="p-3 font-medium text-gray-600">Valor</th>
                                <th className="p-3 font-medium text-gray-600">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50/50">
                                    <td className="p-3">{format(new Date(p.created_at), 'dd/MM/yyyy')}</td>
                                    <td className="p-3">Consulta</td>
                                    <td className="p-3">R$ {(p.price_in_cents / 100).toFixed(2)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            p.pagamento_status === 'pago' ? 'bg-blue-100 text-blue-700' : 
                                            p.pagamento_status === 'pendente' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {p.pagamento_status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const PatientDataTab = ({ patient }) => (
    <div className="p-6 max-w-3xl">
        <h3 className="font-semibold text-gray-800 mb-6">Dados Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 mt-1 text-sm">{patient.full_name}</div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">CPF</label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 mt-1 text-sm">{patient.cpf || 'Não informado'}</div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 mt-1 text-sm">{patient.email}</div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Telefone</label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 mt-1 text-sm">{patient.whatsapp || 'Não informado'}</div>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Data de Nascimento</label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 mt-1 text-sm">
                    {patient.data_nasc ? format(new Date(patient.data_nasc), 'dd/MM/yyyy') : 'Não informada'}
                </div>
            </div>
        </div>
    </div>
);

const PatientRecordPage = () => {
    const { patientId } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [patient, setPatient] = useState(null);
    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState([]);
    const [activeEpisode, setActiveEpisode] = useState(null);
    const [activeTab, setActiveTab] = useState('evolution');
    const [guestTokens, setGuestTokens] = useState({});
    const [patientNotes, setPatientNotes] = useState('');
    
    // State for Appointment Detail View (PDF/Print)
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || !patientId) return;

            try {
                const { data: docData } = await supabase.from('medicos').select('*').eq('user_id', user.id).single();
                setDoctor(docData);

                const { data: patData, error: patError } = await supabase.from('perfis_usuarios').select('*').eq('id', patientId).single();
                if (patError) throw patError;
                setPatient(patData);

                if (docData) {
                    // Fetch appointments AND linked clinical episodes
                    const { data: apptData, error: apptError } = await supabase
                        .from('agendamentos')
                        .select(`
                            *,
                            clinical_episodes(*)
                        `)
                        .eq('patient_id', patientId)
                        .eq('medico_id', docData.id)
                        .order('appointment_date', { ascending: false })
                        .order('appointment_time', { ascending: false });

                    if (apptError) throw apptError;
                    setAppointments(apptData || []);

                    // Fetch guest tokens for these appointments if any
                    if (apptData && apptData.length > 0) {
                        const apptIds = apptData.map(a => a.id);
                        const { data: tokens, error: tokenError } = await supabase
                            .from('guest_access_tokens')
                            .select('appointment_id, token')
                            .in('appointment_id', apptIds);
                        
                        if (!tokenError && tokens) {
                            const tokenMap = {};
                            tokens.forEach(t => {
                                tokenMap[t.appointment_id] = t.token;
                            });
                            setGuestTokens(tokenMap);
                        }
                    }

                    // Fetch patient notes
                    const { data: notesData } = await supabase
                        .from('patient_notes')
                        .select('content')
                        .eq('patient_id', patientId)
                        .eq('doctor_id', docData.id)
                        .maybeSingle();
                    if (notesData) {
                        setPatientNotes(notesData.content || '');
                    }
                }

            } catch (error) {
                console.error("Error loading patient data:", error);
                toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar prontuário." });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [patientId, user, toast]);

    const handleStartEpisode = async (targetAppointment) => {
        if (!doctor || !patient || !targetAppointment) return;
        
        // Check if episode already exists for this appointment
        const existingEpisode = targetAppointment.clinical_episodes && targetAppointment.clinical_episodes.length > 0 
            ? targetAppointment.clinical_episodes[0] 
            : null;

        if (existingEpisode) {
            setActiveEpisode(existingEpisode);
            setActiveTab('evolution');
            toast({ title: "Prontuário aberto", description: "Continuando atendimento existente." });
            return;
        }
        
        // Create new episode linked to appointment
        try {
            const { data, error } = await supabase.from('clinical_episodes').insert({
                doctor_id: doctor.id,
                patient_id: patient.id,
                appointment_id: targetAppointment.id,
                status: 'in_progress',
                started_at: new Date().toISOString()
            }).select().single();

            if (error) throw error;
            
            // Update local state to reflect new episode
            const updatedAppointments = appointments.map(appt => {
                if (appt.id === targetAppointment.id) {
                    return { ...appt, clinical_episodes: [data] };
                }
                return appt;
            });
            setAppointments(updatedAppointments);
            
            setActiveEpisode(data);
            setActiveTab('evolution');
            toast({ title: "Atendimento iniciado", variant: "default", className: "bg-blue-600 text-white border-none" });

        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: error.message });
        }
    };

    const handleUpdateEpisode = async (episodeId, data) => {
        try {
            const { error } = await supabase.from('clinical_episodes').update(data).eq('id', episodeId);
            if (error) throw error;
            
            // Update local state
            setActiveEpisode(prev => ({ ...prev, ...data }));
            
            // Per requirement: Switch to Consultas tab after saving
            setActiveEpisode(null);
            // Also update the appointments list with the new data
            setAppointments(prev => prev.map(appt => {
                if (appt.clinical_episodes?.some(ep => ep.id === episodeId)) {
                    return {
                        ...appt,
                        clinical_episodes: appt.clinical_episodes.map(ep => ep.id === episodeId ? { ...ep, ...data } : ep)
                    };
                }
                return appt;
            }));

            setActiveTab('consultas');
            toast({ title: "Prontuário salvo com sucesso" });

        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
        }
    };

    const handleConcludeEpisode = async (episodeId, data) => {
        try {
            const { error } = await supabase.from('clinical_episodes').update({
                ...data,
                status: 'completed',
                ended_at: new Date().toISOString()
            }).eq('id', episodeId);
            
            if (error) throw error;

            const updatedData = { ...data, status: 'completed' };

            setAppointments(prev => prev.map(appt => {
                if (appt.clinical_episodes?.some(ep => ep.id === episodeId)) {
                    return {
                        ...appt,
                        clinical_episodes: appt.clinical_episodes.map(ep => ep.id === episodeId ? { ...ep, ...updatedData } : ep)
                    };
                }
                return appt;
            }));

            setActiveEpisode(null);
            setActiveTab('consultas');
            toast({ title: "Atendimento concluído!", variant: "default", className: "bg-blue-600 text-white border-none" });
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao concluir", description: error.message });
        }
    };

    const handleReturn = () => {
        setActiveEpisode(null);
    };

    const handleCopyToken = (token) => {
        const link = `${window.location.origin}/paciente/guest?token=${token}`;
        navigator.clipboard.writeText(link);
        toast({ title: "Link copiado!", description: "URL de acesso copiada para a área de transferência." });
    };

    const generateHtmlForSinglePrint = (appt) => {
        const docName = doctor?.public_name || doctor?.name || 'Médico';
        const docCRM = doctor?.crm ? `${doctor.crm} - ${doctor.uf || ''}` : 'Não informado';
        const docSpecialty = doctor?.specialty || '';
        const patName = patient?.full_name || 'Paciente';
        const patDOB = patient?.data_nasc ? new Date(patient.data_nasc).toLocaleDateString('pt-BR') : 'Não informada';
        const patCPF = patient?.cpf || 'Não informado';
        const patContact = patient?.whatsapp || patient?.email || 'Não informado';
        const generatedAt = `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;

        const dateStr = new Date(appt.appointment_date + 'T' + appt.appointment_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        
        let episodesHtml = '<p style="font-size: 14px; color: #666;">Nenhum registro clínico para esta consulta.</p>';
        
        if (appt.clinical_episodes && appt.clinical_episodes.length > 0) {
            episodesHtml = appt.clinical_episodes.map(ep => `
                <div style="margin-bottom: 25px;">
                    ${ep.queixa_principal ? `<div style="margin-bottom: 12px;"><h4 style="font-size: 14px; margin: 0 0 4px 0; color: #333;">Queixa Principal:</h4><p style="font-size: 14px; margin: 0; color: #000;">${ep.queixa_principal}</p></div>` : ''}
                    ${ep.hda ? `<div style="margin-bottom: 12px;"><h4 style="font-size: 14px; margin: 0 0 4px 0; color: #333;">HDA (História da Doença Atual):</h4><p style="font-size: 14px; margin: 0; color: #000;">${ep.hda}</p></div>` : ''}
                    ${ep.exame_fisico ? `<div style="margin-bottom: 12px;"><h4 style="font-size: 14px; margin: 0 0 4px 0; color: #333;">Exame Físico:</h4><p style="font-size: 14px; margin: 0; color: #000;">${ep.exame_fisico}</p></div>` : ''}
                    ${ep.hipoteses_diagnosticas ? `<div style="margin-bottom: 12px;"><h4 style="font-size: 14px; margin: 0 0 4px 0; color: #333;">Hipóteses Diagnósticas:</h4><p style="font-size: 14px; margin: 0; color: #000;">${ep.hipoteses_diagnosticas}</p></div>` : ''}
                    ${ep.conduta ? `<div style="margin-bottom: 12px;"><h4 style="font-size: 14px; margin: 0 0 4px 0; color: #333;">Conduta / Plano de Tratamento:</h4><p style="font-size: 14px; margin: 0; color: #000;">${ep.conduta}</p></div>` : ''}
                    ${ep.observacoes ? `<div style="margin-bottom: 12px;"><h4 style="font-size: 14px; margin: 0 0 4px 0; color: #333;">Observações:</h4><p style="font-size: 14px; margin: 0; color: #000; white-space: pre-wrap;">${ep.observacoes}</p></div>` : ''}
                    ${!ep.queixa_principal && !ep.hda && !ep.exame_fisico && !ep.hipoteses_diagnosticas && !ep.conduta && !ep.observacoes ? `<p style="font-size: 14px; color: #666; font-style: italic;">Prontuário em branco ou apenas com status iniciado.</p>` : ''}
                </div>
            `).join('');
        }

        return `
            <div style="padding: 40px; max-width: 800px; margin: 0 auto; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; background: #fff;">
                <!-- Header -->
                <div style="border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <h1 style="margin: 0 0 5px 0; font-size: 24px; color: #1e3a8a;">${docName}</h1>
                        <p style="margin: 0 0 5px 0; font-size: 14px; color: #4b5563; font-weight: 500;">${docSpecialty}</p>
                        <p style="margin: 0; font-size: 14px; color: #4b5563;">CRM: ${docCRM}</p>
                    </div>
                    <div style="text-align: right; font-size: 12px; color: #6b7280;">
                        Gerado em<br/>${generatedAt}
                    </div>
                </div>

                <!-- Patient Info -->
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0;">
                    <h2 style="font-size: 16px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #cbd5e1; color: #1e293b;">Dados do Paciente</h2>
                    <table style="width: 100%; font-size: 14px; color: #334155;">
                        <tr>
                            <td style="padding: 6px 0; width: 50%;"><strong>Nome:</strong> ${patName}</td>
                            <td style="padding: 6px 0; width: 50%;"><strong>Data de Nascimento:</strong> ${patDOB}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0;"><strong>CPF:</strong> ${patCPF}</td>
                            <td style="padding: 6px 0;"><strong>Contato:</strong> ${patContact}</td>
                        </tr>
                    </table>
                </div>

                <!-- Appointment Details -->
                <div style="margin-bottom: 30px;">
                    <h2 style="font-size: 18px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #cbd5e1; color: #1e293b;">Detalhes do Atendimento</h2>
                    <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">
                        <strong>Data e Hora:</strong> ${dateStr}<br/>
                        <strong>Tipo de Consulta:</strong> Telemedicina
                    </p>
                    
                    <div style="background: #fff; padding: 0;">
                        ${episodesHtml}
                    </div>
                </div>

                <!-- Footer / Signature -->
                <div style="margin-top: 80px; text-align: center; page-break-inside: avoid;">
                    <div style="width: 300px; border-top: 1px solid #000; margin: 0 auto 10px auto;"></div>
                    <p style="margin: 0 0 5px 0; font-weight: bold; color: #1e293b;">${docName}</p>
                    <p style="margin: 0; font-size: 12px; color: #4b5563;">CRM: ${docCRM}</p>
                </div>
            </div>
        `;
    };

    const handlePrintSingle = (appt) => {
        if (!appt) return;
        const content = generateHtmlForSinglePrint(appt);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Prontuário - Consulta ${format(new Date(appt.appointment_date), 'dd/MM/yyyy')} - ${patient?.full_name || 'Paciente'}</title>
                    <style>
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
                            @page { margin: 1.5cm; }
                        }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const handleGeneratePDFSingle = async (appt) => {
        if (!appt) return;
        setIsGeneratingPDF(true);
        try {
            const content = generateHtmlForSinglePrint(appt);
            
            // Create a temporary element to hold the HTML for html2pdf
            const container = document.createElement('div');
            container.innerHTML = content;
            document.body.appendChild(container);
            
            // Wait for any potential font loading
            await new Promise(resolve => setTimeout(resolve, 100));

            const dateFormatted = format(new Date(appt.appointment_date), 'yyyy-MM-dd');
            const filename = `Prontuario_${(patient?.full_name || 'Paciente').replace(/\s+/g, '_')}_${dateFormatted}.pdf`;
            
            const opt = {
                margin:       10,
                filename:     filename,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().from(container).set(opt).save();
            document.body.removeChild(container);
            
            toast({ title: 'PDF gerado com sucesso!', description: 'O download foi iniciado.', variant: 'success' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast({ title: 'Erro ao gerar PDF', description: 'Não foi possível criar o arquivo. Tente imprimir.', variant: 'destructive' });
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white">
            <ProntuarioSidebar patient={patient} doctorId={doctor?.id} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
                
                {/* Header Actions - PDF/Print removed from here */}
                <div className="border-b border-gray-200 bg-white px-6 py-3 flex justify-between items-center z-10 flex-shrink-0">
                    <h2 className="text-lg font-bold text-gray-800">Prontuário Eletrônico</h2>
                    {/* The general PDF/Print buttons have been moved to the specific appointment detail modal */}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <div className="border-b border-gray-200 bg-white px-6 sticky top-0 z-10 flex-shrink-0">
                        <TabsList className="h-12 w-full justify-start bg-transparent p-0 gap-6">
                            <TabsTrigger 
                                value="evolution" 
                                className="h-full rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 font-medium text-gray-500 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 hover:text-gray-700 bg-transparent shadow-none"
                            >
                                Evolução do paciente
                            </TabsTrigger>
                            <TabsTrigger 
                                value="consultas" 
                                className="h-full rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 font-medium text-gray-500 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 hover:text-gray-700 bg-transparent shadow-none"
                            >
                                Consultas ({appointments.length})
                            </TabsTrigger>
                            <TabsTrigger 
                                value="documents" 
                                className="h-full rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 font-medium text-gray-500 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 hover:text-gray-700 bg-transparent shadow-none"
                            >
                                Documentos
                            </TabsTrigger>
                            <TabsTrigger 
                                value="data" 
                                className="h-full rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 font-medium text-gray-500 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 hover:text-gray-700 bg-transparent shadow-none"
                            >
                                Dados do paciente
                            </TabsTrigger>
                            <TabsTrigger 
                                value="payments" 
                                className="h-full rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 font-medium text-gray-500 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 hover:text-gray-700 bg-transparent shadow-none"
                            >
                                <CreditCard className="w-3.5 h-3.5 mr-2"/>
                                Lista de pagamentos
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                        <TabsContent value="evolution" className="mt-0 space-y-6 h-full">
                            {activeEpisode ? (
                                <ClinicalEpisode 
                                    episode={activeEpisode}
                                    onSave={handleUpdateEpisode}
                                    onConclude={handleConcludeEpisode}
                                    onReturn={handleReturn}
                                />
                            ) : (
                                <div className="space-y-4">
                                     <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Histórico de Atendimentos</h3>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {appointments.map(appt => {
                                            const hasEpisode = appt.clinical_episodes && appt.clinical_episodes.length > 0;
                                            const episode = hasEpisode ? appt.clinical_episodes[0] : null;
                                            
                                            return (
                                                <div 
                                                    key={appt.id} 
                                                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                                                    onClick={() => handleStartEpisode(appt)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-lg transition-colors ${hasEpisode ? 'bg-blue-50' : 'bg-gray-100 group-hover:bg-blue-50'}`}>
                                                            <Calendar className={`w-5 h-5 ${hasEpisode ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'}`} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">
                                                                Consulta {appt.status === 'confirmado' ? 'Confirmada' : appt.status}
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                {format(new Date(appt.appointment_date + 'T' + appt.appointment_time), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                            {hasEpisode ? (
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${episode.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {episode.status === 'completed' ? 'Concluído' : 'Em andamento'}
                                                            </span>
                                                            ) : (
                                                            <Button 
                                                                size="sm" 
                                                                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 font-medium"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleStartEpisode(appt);
                                                                }}
                                                            >
                                                                Iniciar Atendimento
                                                            </Button>
                                                            )}
                                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        
                                        {appointments.length === 0 && (
                                            <div className="text-center py-10 text-gray-400 text-sm">
                                                Nenhum agendamento encontrado para este paciente.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="consultas" className="mt-0">
                             <div className="space-y-4">
                                {appointments.length > 0 ? appointments.map(appt => {
                                    const hasEpisode = appt.clinical_episodes && appt.clinical_episodes.length > 0;
                                    const episode = hasEpisode ? appt.clinical_episodes[0] : null;
                                    const guestToken = guestTokens[appt.id];

                                    return (
                                        <div key={appt.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
                                            <div 
                                                className="p-4 flex justify-between items-center cursor-pointer group"
                                                onClick={() => setSelectedAppointment(appt)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-blue-50 p-2 rounded-full">
                                                        <FileText className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                                                            Consulta - {format(new Date(appt.appointment_date + 'T' + appt.appointment_time), "dd/MM/yyyy", { locale: ptBR })}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            Horário: {appt.appointment_time}
                                                        </p>
                                                        {episode && episode.observacoes && (
                                                            <p className="text-sm text-gray-500 mt-1 line-clamp-1 max-w-md">
                                                                {episode.observacoes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {hasEpisode ? (
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${episode.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                            {episode.status === 'completed' ? 'Concluído' : 'Em andamento'}
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full text-xs font-medium border bg-gray-50 text-gray-500 border-gray-100">
                                                            Pendente
                                                        </span>
                                                    )}
                                                    <Button variant="ghost" size="sm" className="text-gray-500 group-hover:text-blue-600" onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedAppointment(appt);
                                                    }}>
                                                        Ver Detalhes <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </div>
                                            </div>
                                            
                                            {/* GUEST TOKEN SECTION - VISIBLE ONLY IF TOKEN EXISTS */}
                                            {guestToken && (
                                                <div className="bg-amber-50/50 border-t border-amber-100 p-3 px-4 flex flex-col gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-amber-700">
                                                            <LinkIcon className="w-3.5 h-3.5" />
                                                            <span className="text-xs font-semibold uppercase tracking-wide">Link da Consulta (Acesso do Paciente Convidado)</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <code className="flex-1 bg-white border border-amber-200 rounded px-2 py-1.5 text-xs text-amber-800 font-mono truncate">
                                                            {`${window.location.origin}/paciente/guest?token=${guestToken}`}
                                                        </code>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopyToken(guestToken);
                                                            }}
                                                        >
                                                            <Copy className="w-3 h-3 mr-1.5" /> Copiar
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                }) : (
                                    <EmptyState 
                                        message="Sem histórico de consultas"
                                        subMessage="Os atendimentos realizados aparecerão nesta lista."
                                    />
                                )}
                             </div>
                        </TabsContent>

                        <TabsContent value="documents" className="mt-0 bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px]">
                            <DocumentsTab patientId={patientId} doctorId={doctor?.id} />
                        </TabsContent>

                        <TabsContent value="data" className="mt-0 bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px]">
                            <PatientDataTab patient={patient} />
                        </TabsContent>

                        <TabsContent value="payments" className="mt-0 bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px]">
                            <PaymentsTab patientId={patientId} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            {/* Appointment Detail Modal (PDF/Print functionality moved here) */}
            <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-0 rounded-xl">
                    <DialogHeader className="p-6 border-b sticky top-0 bg-white z-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <DialogTitle className="text-xl text-blue-900">Detalhes do Prontuário</DialogTitle>
                                {selectedAppointment && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        Consulta de {format(new Date(selectedAppointment.appointment_date + 'T' + selectedAppointment.appointment_time), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 mr-6">
                                <Button variant="outline" size="sm" onClick={() => handlePrintSingle(selectedAppointment)} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                                    <Printer className="w-4 h-4 mr-2" /> Imprimir
                                </Button>
                                <Button variant="default" size="sm" onClick={() => handleGeneratePDFSingle(selectedAppointment)} disabled={isGeneratingPDF} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {isGeneratingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                    Salvar PDF
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        {selectedAppointment && (
                            <>
                                <div className="grid grid-cols-2 gap-4 text-sm bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                    <div>
                                        <span className="font-semibold text-blue-900">Status da Consulta:</span>
                                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                            {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-blue-900">Tipo de Consulta:</span>
                                        <span className="ml-2 text-gray-700">Telemedicina</span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg border-b pb-2 mb-4 text-gray-800">Registro Clínico</h3>
                                    {selectedAppointment.clinical_episodes && selectedAppointment.clinical_episodes.length > 0 ? (
                                        selectedAppointment.clinical_episodes.map(ep => (
                                            <div key={ep.id} className="space-y-5 bg-white">
                                                {ep.queixa_principal && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Queixa Principal</h4>
                                                        <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">{ep.queixa_principal}</p>
                                                    </div>
                                                )}
                                                {ep.hda && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">HDA (História da Doença Atual)</h4>
                                                        <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">{ep.hda}</p>
                                                    </div>
                                                )}
                                                {ep.exame_fisico && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Exame Físico</h4>
                                                        <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">{ep.exame_fisico}</p>
                                                    </div>
                                                )}
                                                {ep.hipoteses_diagnosticas && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Hipóteses Diagnósticas</h4>
                                                        <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">{ep.hipoteses_diagnosticas}</p>
                                                    </div>
                                                )}
                                                {ep.conduta && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Conduta / Plano de Tratamento</h4>
                                                        <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">{ep.conduta}</p>
                                                    </div>
                                                )}
                                                {ep.observacoes && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Observações</h4>
                                                        <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">{ep.observacoes}</p>
                                                    </div>
                                                )}
                                                {!ep.queixa_principal && !ep.hda && !ep.exame_fisico && !ep.hipoteses_diagnosticas && !ep.conduta && !ep.observacoes && (
                                                    <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                        <p className="text-gray-500 italic">O prontuário deste atendimento está em branco ou apenas com status iniciado.</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                            <p className="text-gray-500 italic">Nenhum registro clínico foi salvo para esta consulta.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PatientRecordPage;
