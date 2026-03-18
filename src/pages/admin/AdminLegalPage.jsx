import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Eye, CheckCircle2, Trash2, Save, Upload, FileType, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DOC_TYPES = {
    terms_of_service: "Termos de Serviço",
    privacy_policy: "Política de Privacidade (LGPD)"
};

const AdminLegalPage = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [activeTab, setActiveTab] = useState('terms_of_service');
    const [versions, setVersions] = useState([]);
    
    // Upload State
    const [isSaving, setIsSaving] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    
    // Modals State
    const [previewDoc, setPreviewDoc] = useState(null);
    const [deleteDoc, setDeleteDoc] = useState(null);
    const [activateDoc, setActivateDoc] = useState(null);

    useEffect(() => {
        fetchDocumentVersions();
        // Reset upload state on tab change
        setSelectedFile(null);
        setFetchError(null);
    }, [activeTab]);

    const fetchDocumentVersions = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            console.log(`[AdminLegal] Fetching documents for type: ${activeTab}`);
            
            // Using supabase.functions.invoke with GET method (via query params)
            const { data, error } = await supabase.functions.invoke(`manage-documents?type=${activeTab}`, {
                method: 'GET'
            });

            if (error) {
                console.error(`[AdminLegal] Fetch error response:`, error);
                throw new Error(error.message || 'Erro ao buscar documentos');
            }
            
            console.log(`[AdminLegal] Fetched ${data?.length || 0} versions`);
            
            if (!Array.isArray(data)) {
                console.error("Resposta inválida da API (esperado array):", data);
                throw new Error("Formato de resposta inválido da API");
            }
            
            setVersions(data);

        } catch (error) {
            console.error("[AdminLegal] Erro ao buscar documentos:", error);
            setFetchError(error.message);
            setVersions([]);
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao carregar documentos',
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast({ variant: 'destructive', title: 'Formato inválido', description: 'Apenas arquivos PDF são permitidos.' });
            e.target.value = null;
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'O tamanho máximo permitido é 10MB.' });
            e.target.value = null;
            return;
        }

        console.log(`[AdminLegal] File selected: ${file.name} (${file.size} bytes)`);
        setSelectedFile(file);
    };

    const uploadPDF = async (file) => {
        try {
            console.log(`[AdminLegal] Starting upload for: ${file.name}`);
            const timestamp = new Date().getTime();
            const randomString = Math.random().toString(36).substring(7);
            const fileExt = file.name.split('.').pop();
            // Path: type/timestamp-random.pdf
            const filePath = `${activeTab}/${timestamp}-${randomString}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('legal-documents')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: 'application/pdf'
                });

            if (error) throw error;

            console.log(`[AdminLegal] Upload successful, getting public URL...`);
            const { data: publicData } = supabase.storage
                .from('legal-documents')
                .getPublicUrl(filePath);

            return publicData.publicUrl;
        } catch (error) {
            console.error("[AdminLegal] Erro no upload:", error);
            throw new Error(`Falha no upload do arquivo: ${error.message}`);
        }
    };

    const saveNewVersion = async () => {
        setIsSaving(true);
        try {
            if (!selectedFile) {
                throw new Error('Por favor, selecione um arquivo PDF.');
            }

            // 1. Upload PDF
            const finalPdfUrl = await uploadPDF(selectedFile);
            const finalFileName = selectedFile.name;
            console.log(`[AdminLegal] PDF ready at: ${finalPdfUrl}`);

            // 2. Save metadata via API using invoke
            const requestBody = {
                type: activeTab,
                pdf_url: finalPdfUrl,
                pdf_file_name: finalFileName
            };
            
            console.log(`[AdminLegal] Sending API request to create version...`, requestBody);

            const { data, error } = await supabase.functions.invoke('manage-documents', {
                method: 'POST',
                body: requestBody
            });

            if (error) {
                console.error(`[AdminLegal] Create API error response:`, error);
                throw new Error(error.message || 'Erro ao criar versão');
            }

            console.log(`[AdminLegal] Version created successfully:`, data);

            toast({ title: 'Sucesso!', description: 'Nova versão publicada e ativada.', variant: 'success' });
            
            // Reset form
            setSelectedFile(null);
            const fileInput = document.getElementById('pdf-upload');
            if (fileInput) fileInput.value = '';
            
            // Refresh list
            await fetchDocumentVersions();

        } catch (error) {
            console.error("[AdminLegal] Erro crítico ao salvar versão:", error);
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao salvar',
                description: error.message || 'Ocorreu um erro ao criar a nova versão.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetActive = async () => {
        if (!activateDoc) return;
        try {
            const { error } = await supabase.functions.invoke('manage-documents', {
                method: 'PATCH',
                body: { documentId: activateDoc.id }
            });

            if (error) throw new Error(error.message || "Falha ao ativar versão");

            toast({ title: 'Sucesso!', description: 'Versão ativada com sucesso.', variant: 'success' });
            setActivateDoc(null);
            fetchDocumentVersions();
        } catch (error) {
            console.error("[AdminLegal] Erro ao ativar:", error);
            toast({ variant: 'destructive', title: 'Erro ao ativar', description: error.message });
        }
    };

    const handleDelete = async () => {
        if (!deleteDoc) return;
        try {
            const { error } = await supabase.functions.invoke('manage-documents', {
                method: 'DELETE',
                body: { documentId: deleteDoc.id }
            });

            if (error) {
                throw new Error(error.message || "Falha ao excluir");
            }

            toast({ title: 'Sucesso', description: 'Versão excluída.', variant: 'success' });
            setDeleteDoc(null);
            fetchDocumentVersions();
        } catch (error) {
            console.error("[AdminLegal] Erro ao excluir:", error);
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao excluir', 
                description: error.message 
            });
        }
    };

    const activeVersion = versions.find(v => v.is_active);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Documentos Legais</h1>
                <p className="text-gray-500">Gerencie os termos e políticas da plataforma (Apenas PDF).</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[500px]">
                    <TabsTrigger value="terms_of_service">Termos de Serviço</TabsTrigger>
                    <TabsTrigger value="privacy_policy">Política de Privacidade</TabsTrigger>
                </TabsList>

                {fetchError && (
                    <Alert variant="destructive" className="mt-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Erro</AlertTitle>
                        <AlertDescription className="flex flex-col gap-2">
                            <p>{fetchError}</p>
                            <Button variant="outline" size="sm" onClick={fetchDocumentVersions} className="w-fit bg-white text-red-600 hover:bg-red-50 border-red-200">
                                <RefreshCw className="h-3 w-3 mr-2" /> Tentar Novamente
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="mt-6 space-y-6">
                    {/* Section 1: Active Version */}
                    <Card className="border-blue-100 bg-blue-50/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                Versão Ativa
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                                </div>
                            ) : activeVersion ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-white text-gray-700 border-gray-200">
                                                v{activeVersion.version}
                                            </Badge>
                                            <span className="text-sm text-gray-500">
                                                Criado em {format(new Date(activeVersion.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
                                                <FileType className="w-3 h-3 mr-1" /> PDF
                                            </Badge>
                                            <span className="text-xs text-gray-600 truncate max-w-[200px]" title={activeVersion.pdf_file_name}>
                                                {activeVersion.pdf_file_name}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                         <Button size="sm" variant="outline" asChild>
                                            <a href={activeVersion.pdf_url} target="_blank" rel="noopener noreferrer">
                                                <Upload className="w-4 h-4 mr-2 rotate-180" /> Baixar PDF
                                            </a>
                                         </Button>
                                        <Button size="sm" variant="outline" onClick={() => setPreviewDoc(activeVersion)}>
                                            <Eye className="w-4 h-4 mr-2" /> Visualizar
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Nenhuma versão ativa encontrada. Envie um PDF abaixo para publicar.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Section 2: History */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Histórico de Versões</CardTitle>
                            <Button variant="ghost" size="sm" onClick={fetchDocumentVersions} disabled={loading}>
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">Versão</TableHead>
                                            <TableHead>Arquivo</TableHead>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {versions.length > 0 ? (
                                            versions.map((ver) => (
                                                <TableRow key={ver.id}>
                                                    <TableCell className="font-medium">v{ver.version}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1 text-red-600 font-medium text-xs">
                                                                <FileType className="w-3 h-3" /> PDF
                                                            </div>
                                                            <span className="text-xs text-gray-500 truncate block max-w-[250px]" title={ver.pdf_file_name}>
                                                                {ver.pdf_file_name || 'Arquivo sem nome'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-500">{format(new Date(ver.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                                                    <TableCell>
                                                        {ver.is_active ? (
                                                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Ativo</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-gray-500">Inativo</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="icon" variant="ghost" title="Visualizar" onClick={() => setPreviewDoc(ver)}>
                                                                <Eye className="w-4 h-4 text-gray-500" />
                                                            </Button>
                                                            {!ver.is_active && (
                                                                <>
                                                                    <Button size="icon" variant="ghost" title="Ativar" onClick={() => setActivateDoc(ver)}>
                                                                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" title="Excluir" onClick={() => setDeleteDoc(ver)}>
                                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                                                    {loading ? 'Carregando...' : 'Nenhum histórico encontrado.'}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 3: Create New (PDF ONLY) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Enviar Nova Versão</CardTitle>
                            <CardDescription>
                                Faça upload de um PDF. Ele será automaticamente publicado como a versão ativa (v{(versions[0]?.version || 0) + 1}).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                                <Input 
                                    type="file" 
                                    accept=".pdf" 
                                    onChange={handleFileChange}
                                    className="hidden" 
                                    id="pdf-upload"
                                />
                                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center w-full h-full">
                                    <div className="bg-blue-100 p-3 rounded-full mb-3">
                                        <Upload className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {selectedFile ? selectedFile.name : "Clique para selecionar o PDF"}
                                    </span>
                                    <span className="text-xs text-gray-500 mt-1">
                                        {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : "Máximo 10MB. Apenas arquivos .pdf"}
                                    </span>
                                </label>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button onClick={saveNewVersion} disabled={isSaving || !selectedFile} className="w-full sm:w-auto">
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Publicar Versão
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </Tabs>

            {/* Preview Modal */}
            <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
                <DialogContent className="max-w-[900px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-lg">
                    <DialogHeader className="p-4 border-b bg-white">
                        <DialogTitle>Visualizar: {DOC_TYPES[activeTab]} (v{previewDoc?.version})</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto bg-gray-100 relative">
                         <iframe 
                            src={previewDoc?.pdf_url} 
                            className="w-full h-full border-none" 
                            title="PDF Preview"
                        />
                    </div>
                    <DialogFooter className="p-4 border-t bg-white">
                         <Button variant="secondary" asChild className="mr-auto">
                            <a href={previewDoc?.pdf_url} target="_blank" rel="noopener noreferrer">
                                Abrir em nova aba
                            </a>
                         </Button>
                        <Button variant="outline" onClick={() => setPreviewDoc(null)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Versão v{deleteDoc?.version}?</DialogTitle>
                        <DialogDescription>
                            Esta ação removerá permanentemente esta versão do histórico. Não é possível desfazer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDoc(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Activate Confirmation */}
            <Dialog open={!!activateDoc} onOpenChange={(open) => !open && setActivateDoc(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ativar Versão v{activateDoc?.version}?</DialogTitle>
                        <DialogDescription>
                            Esta versão passará a ser a oficial exibida para todos os usuários. A versão anterior será arquivada.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActivateDoc(null)}>Cancelar</Button>
                        <Button onClick={handleSetActive} className="bg-green-600 hover:bg-green-700 text-white">
                            Confirmar Ativação
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminLegalPage;