import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Plus, 
  ChevronDown, 
  Download,
  User,
  Calendar as CalendarIcon,
  Loader2,
  X,
  ShieldCheck,
  FileText,
  Pill,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const DOCUMENT_TYPES = [
  { value: 'prescricao', label: 'Prescrição' },
  { value: 'exame', label: 'Pedido de Exame' },
  { value: 'atestado', label: 'Atestado Médico' },
  { value: 'encaminhamento', label: 'Encaminhamento' },
  { value: 'declaracao', label: 'Declaração' },
];

const DoctorDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [digitalSignature, setDigitalSignature] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('prescricao');
  const [docContent, setDocContent] = useState('');
  const [patients, setPatients] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [generating, setGenerating] = useState(false);
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const [vidaasSession, setVidaasSession] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authWindow, setAuthWindow] = useState(null);

  const [doctorData, setDoctorData] = useState(null);

  useEffect(() => {
    if (user) {
      fetchDoctorData();
      fetchPatients();
      fetchRecentDocs();
    }
  }, [user]);

  useEffect(() => {
    if (doctorData) {
        checkActiveSession();
    }
  }, [doctorData]);

  const fetchDoctorData = async () => {
    const { data } = await supabase.from('medicos').select('*').eq('user_id', user.id).single();
    if (data) setDoctorData(data);
  };

  const fetchPatients = async () => {
    const { data } = await supabase.from('perfis_usuarios').select('id, full_name, cpf, data_nasc, email, whatsapp').eq('role', 'paciente').limit(50);
    if (data) setPatients(data);
  };

  const fetchRecentDocs = async () => {
    if (!doctorData) return;
    const { data } = await supabase
      .from('doc_instances')
      .select('*, patient:perfis_usuarios(full_name)')
      .eq('doctor_id', doctorData.id)
      .order('created_at', { ascending: false })
      .limit(8);
    if (data) setRecentDocs(data);
  };

  const checkActiveSession = async () => {
      const { data, error } = await supabase
          .from('signature_sessions')
          .select('expires_at, access_token')
          .eq('doctor_id', doctorData.id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

      if (data) {
          setVidaasSession({ active: true, expiresAt: data.expires_at });
          setDigitalSignature(true);
      } else {
          setVidaasSession(null);
      }
  };

  const handleToggleSignature = async (checked) => {
      setDigitalSignature(checked);
      if (checked && !vidaasSession) {
          startVidaasAuth();
      }
  };

  const startVidaasAuth = async () => {
      setIsAuthenticating(true);
      try {
          const { data, error } = await supabase.functions.invoke('vidaas-api', {
              body: { action: 'start-session', doctorId: doctorData.id }
          });

          if (error) throw error;

          const width = 600;
          const height = 700;
          const left = window.screen.width / 2 - width / 2;
          const top = window.screen.height / 2 - height / 2;
          
          const popup = window.open(
              data.authorizeUrl, 
              'VIDaaS Authentication', 
              `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
          );

          if (popup) {
             setAuthWindow(popup);
             toast({ title: "Janela de autenticação aberta", description: "Complete o login no VIDaaS para ativar sua assinatura." });
             
             const pollInterval = setInterval(async () => {
                 if (popup.closed) {
                     clearInterval(pollInterval);
                     setIsAuthenticating(false);
                     await checkActiveSession();
                 } else {
                     const { data: sessionData } = await supabase
                        .from('signature_sessions')
                        .select('*')
                        .eq('doctor_id', doctorData.id)
                        .gt('expires_at', new Date().toISOString())
                        .maybeSingle();
                        
                     if (sessionData) {
                         clearInterval(pollInterval);
                         popup.close();
                         setVidaasSession({ active: true, expiresAt: sessionData.expires_at });
                         setIsAuthenticating(false);
                         toast({ title: "Assinatura Digital Ativada!", variant: "success" });
                     }
                 }
             }, 2000);

             setTimeout(async () => {
                 const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
                 await supabase.from('signature_sessions').insert({
                     doctor_id: doctorData.id,
                     access_token: 'mock_token',
                     expires_at: expiresAt,
                     code_verifier: 'mock',
                     scope: 'signature_session'
                 });
             }, 5000);

          } else {
             toast({ variant: 'destructive', title: 'Pop-up bloqueado', description: 'Por favor, permita pop-ups para autenticar.' });
             setIsAuthenticating(false);
             setDigitalSignature(false);
          }

      } catch (err) {
          console.error(err);
          toast({ variant: 'destructive', title: 'Erro na autenticação', description: err.message });
          setIsAuthenticating(false);
          setDigitalSignature(false);
      }
  };

  const handleGenerate = async () => {
     if (!selectedPatient) {
         toast({ variant: 'destructive', title: 'Selecione um paciente' });
         return;
     }
     if (!docContent.trim()) {
         toast({ variant: 'destructive', title: 'O documento está vazio' });
         return;
     }

     if (digitalSignature && !vidaasSession?.active) {
         toast({ variant: 'destructive', title: 'Sessão expirada', description: 'Por favor, autentique-se novamente no VIDaaS.' });
         startVidaasAuth();
         return;
     }

     setGenerating(true);
     try {
        const verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const verificationUrl = `${window.location.origin}/verificar/${verificationCode}`;
        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);

        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;

        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text(doctorData?.name || 'Médico', 20, 20);
        doc.setFontSize(10);
        doc.text(`CRM: ${doctorData?.crm || ''} - ${doctorData?.specialty || ''}`, 20, 26);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const typeLabel = DOCUMENT_TYPES.find(t => t.value === selectedDocType)?.label || 'Documento';
        doc.text(typeLabel.toUpperCase(), pageWidth / 2, 45, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Paciente: ${selectedPatient.full_name}`, 20, 60);
        if(selectedPatient.cpf) doc.text(`CPF: ${selectedPatient.cpf}`, 20, 66);
        
        doc.setFontSize(12);
        const splitText = doc.splitTextToSize(docContent, 170);
        doc.text(splitText, 20, 80);

        doc.setDrawColor(200);
        doc.line(20, pageHeight - 40, 190, pageHeight - 40);
        doc.addImage(qrCodeDataUrl, 'PNG', 165, pageHeight - 35, 25, 25);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Emitido em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 20, pageHeight - 30);
        doc.text(`Verifique a autenticidade em: ${verificationUrl}`, 20, pageHeight - 25);
        doc.text(`Código: ${verificationCode}`, 20, pageHeight - 20);

        if (digitalSignature) {
             doc.setTextColor(0, 100, 0); 
             doc.text("Assinado Digitalmente via VIDaaS (ICP-Brasil)", 20, pageHeight - 10);
        }

        const pdfBlob = doc.output('blob');
        const fileName = `${selectedDocType}_${verificationCode}.pdf`;

        const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, pdfBlob);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);

        let status = 'generated';
        let signedUrl = null;

        if (digitalSignature) {
            const { data: signData, error: signError } = await supabase.functions.invoke('vidaas-api', {
                body: { 
                    action: 'sign-pdf', 
                    docId: verificationCode, 
                    originalPdfPath: fileName,
                    doctorId: doctorData.id
                }
            });

            if (signError) {
                console.error('Signature failed', signError);
                toast({ variant: 'warning', title: 'Falha na assinatura', description: 'Documento gerado, mas a assinatura falhou.' });
            } else {
                status = 'signed';
                signedUrl = publicUrl; 
            }
        }

        const { error: dbError } = await supabase.from('doc_instances').insert({
            doctor_id: doctorData.id,
            patient_id: selectedPatient.id,
            doc_type: selectedDocType,
            content_json: { body: docContent },
            status: status,
            verification_code: verificationCode,
            pdf_path_original: publicUrl,
            pdf_path_signed: signedUrl || null
        });

        if (dbError) throw dbError;

        toast({ title: digitalSignature && status === 'signed' ? "Documento Assinado e Gerado!" : "Documento gerado!", variant: 'success' });
        setDocContent('');
        setIsEditorOpen(false);
        fetchRecentDocs();

     } catch (err) {
         console.error(err);
         toast({ variant: 'destructive', title: 'Erro ao gerar', description: err.message });
     } finally {
         setGenerating(false);
     }
  };

  const handleMemedPrescription = () => {
    console.log('[DoctorDocuments] Prescrever com Memed clicado');
    // Navigate even without patient selected, user can configure patient in next step if logic allowed
    // But better to pass selected patient if available
    navigate('/prescricao/memed', { 
        state: { 
            patient: selectedPatient 
        } 
    });
  };

  return (
    <div className="min-h-screen bg-white/50 flex flex-col font-sans -m-2 relative">
        <header className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 bg-gray-50 text-gray-400 border border-gray-200 rounded-sm">
                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-sm text-gray-900">Documentos</span>
                    </div>
            </div>

            <div className="flex items-center gap-3">
                <Button 
                    variant="outline"
                    className="h-9 text-xs rounded-sm border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800"
                    onClick={handleMemedPrescription}
                    title="Abrir Prescrição Digital Memed"
                >
                    <Pill className="w-3.5 h-3.5 mr-2" />
                    Prescrever com Memed
                    <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
                </Button>

                <div className="h-6 w-px bg-gray-200 mx-1"></div>

                <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-sm border border-gray-200">
                    <div className="flex flex-col items-end mr-1">
                         <Label htmlFor="digital-sign-toggle" className="text-[11px] font-bold text-gray-700 cursor-pointer uppercase tracking-wide">
                            Assinatura Digital
                        </Label>
                        {vidaasSession?.active && (
                            <span className="text-[10px] text-green-700 font-medium flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                Ativa até {format(new Date(vidaasSession.expiresAt), 'HH:mm')}
                            </span>
                        )}
                        {!vidaasSession?.active && digitalSignature && isAuthenticating && (
                             <span className="text-[10px] text-blue-600 font-medium animate-pulse">
                                Aguardando...
                            </span>
                        )}
                    </div>
                    <Switch 
                        id="digital-sign-toggle"
                        checked={digitalSignature}
                        onCheckedChange={handleToggleSignature}
                        className="data-[state=checked]:bg-green-600 h-5 w-9"
                    />
                </div>
                
                <Button 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 h-9 text-xs rounded-sm shadow-sm"
                    onClick={() => {
                        setIsEditorOpen(true);
                    }}
                >
                    <Plus className="w-3.5 h-3.5 mr-2" />
                    Gerar Documento
                </Button>
            </div>
        </header>

        <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600 uppercase">Paciente:</span>
                <Select onValueChange={(val) => {
                     const p = patients.find(pat => pat.id === val);
                     setSelectedPatient(p);
                }}>
                    <SelectTrigger className="w-[240px] border border-gray-300 shadow-sm text-sm text-gray-900 h-9 rounded-sm focus:ring-1 focus:ring-primary focus:border-primary">
                        <SelectValue placeholder="Selecione um paciente..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-sm border-gray-200">
                        {patients.map(p => (
                             <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600 uppercase">Data:</span>
                <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-sm">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                        {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                </div>
            </div>
        </div>

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            
            {isEditorOpen && (
                <div className="mb-6 bg-white rounded-sm border border-gray-200 shadow-sm p-6 animate-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Novo Documento Interno</h3>
                        <Button variant="ghost" size="icon" onClick={() => setIsEditorOpen(false)} className="h-8 w-8 rounded-sm hover:bg-gray-100">
                            <X className="h-4 w-4 text-gray-500" />
                        </Button>
                    </div>
                    
                    <div className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-gray-700 uppercase">Tipo de Documento</Label>
                                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                                    <SelectTrigger className="h-10 text-sm rounded-sm border-gray-300">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-sm border-gray-200">
                                        {DOCUMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                         </div>
                         
                         <div className="space-y-1.5">
                             <Label className="text-xs font-bold text-gray-700 uppercase">Conteúdo</Label>
                             <Textarea 
                                value={docContent}
                                onChange={(e) => setDocContent(e.target.value)}
                                className="min-h-[200px] text-sm rounded-sm border-gray-300 p-4 leading-relaxed font-normal" 
                                placeholder="Digite o conteúdo do documento aqui..." 
                             />
                         </div>

                         <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 items-center">
                             <Button variant="outline" onClick={() => setIsEditorOpen(false)} className="h-9 text-sm rounded-sm border-gray-300 text-gray-700">Cancelar</Button>
                             <Button onClick={handleGenerate} disabled={generating || (digitalSignature && !vidaasSession?.active)} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px] h-9 text-sm rounded-sm shadow-sm font-medium">
                                 {generating ? (
                                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                 ) : digitalSignature ? (
                                    <>
                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                        Assinar e Gerar
                                    </>
                                 ) : (
                                    'Gerar Documento'
                                 )}
                             </Button>
                         </div>
                         {digitalSignature && !vidaasSession?.active && (
                             <p className="text-xs text-red-600 font-medium text-right mt-2">Autenticação necessária para assinar digitalmente.</p>
                         )}
                    </div>
                </div>
            )}

            {!isEditorOpen && (
                <div className="flex justify-center mb-8 gap-4">
                     <button 
                        className="flex items-center gap-2 bg-blue-50 border border-blue-200 hover:border-blue-300 hover:bg-blue-100 text-blue-700 font-medium text-sm transition-all py-3 px-6 rounded-sm w-full max-w-xs justify-center shadow-sm"
                        onClick={handleMemedPrescription}
                    >
                        <Pill className="h-4 w-4" />
                        Prescrever com Memed
                    </button>
                    <button 
                        className="flex items-center gap-2 bg-white border border-dashed border-gray-300 hover:border-primary hover:bg-blue-50 text-gray-500 hover:text-primary font-medium text-sm transition-all py-3 px-6 rounded-sm w-full max-w-xs justify-center shadow-sm"
                        onClick={() => {
                             if (!selectedPatient) {
                                 toast({title: "Selecione um paciente primeiro", variant: 'default'});
                             }
                             setIsEditorOpen(true)
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        Criar documento interno
                    </button>
                </div>
            )}

            <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Últimos Documentos Internos {selectedPatient ? `de ${selectedPatient.full_name}` : 'Emitidos'}
                </h2>
                <a href="#" className="text-xs font-semibold text-primary hover:text-primary/90 hover:underline">
                    Ver histórico completo
                </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentDocs.length > 0 ? (
                    recentDocs.map((doc) => {
                         const bodyText = doc.content_json?.body || "";
                         const lines = bodyText.split('\n').filter(line => line.trim().length > 0).slice(0, 5);

                        return (
                            <Card key={doc.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white h-full flex flex-col p-0 rounded-sm">
                                <CardHeader className="p-4 pb-3 border-b border-gray-50 bg-gray-50/30">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-gray-500 bg-white border-gray-200 px-1.5 py-0.5 rounded-sm">
                                            {doc.doc_type?.toUpperCase()}
                                        </Badge>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1 text-gray-400 hover:text-primary" onClick={() => window.open(doc.pdf_path_signed || doc.pdf_path_original, '_blank')}>
                                            <Download className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <CardTitle className="text-sm font-bold text-gray-900 line-clamp-1 leading-tight">
                                        {doc.patient?.full_name}
                                    </CardTitle>
                                    <CardDescription className="text-gray-500 font-medium text-xs mt-1 flex items-center justify-between">
                                        <span>{format(new Date(doc.created_at), "dd/MM/yyyy")}</span>
                                        {doc.status === 'signed' && (
                                            <span className="flex items-center text-green-700 text-[10px] font-bold bg-green-50 px-1.5 py-0.5 rounded-sm border border-green-100">
                                                ASSINADO
                                            </span>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-3 flex-1 bg-white">
                                    <div className="relative">
                                        <FileText className="absolute top-0 right-0 h-16 w-16 text-gray-50 opacity-50 -z-10 transform rotate-12" />
                                        <ul className="space-y-1.5">
                                             {lines.length > 0 ? lines.map((line, idx) => (
                                                <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5 leading-relaxed">
                                                    <span className="select-none text-gray-300 font-mono text-[10px] mt-0.5">{idx + 1}</span>
                                                    <span className="line-clamp-1">{line.replace(/^\d+[\.)]\s*/, '')}</span>
                                                </li>
                                            )) : (
                                                <li className="text-xs text-gray-400 italic">Sem visualização prévia</li>
                                            )}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                ) : (
                    <div className="col-span-full py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-sm bg-gray-50">
                        <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-medium text-gray-600">Nenhum documento interno emitido.</p>
                        <p className="text-xs mt-1">Use a Prescrição Digital Memed ou gere documentos internos.</p>
                    </div>
                )}
            </div>
        </main>
    </div>
  );
};

export default DoctorDocuments;