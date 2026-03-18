import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, AlertCircle, FileText, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Helmet } from 'react-helmet';

const DOC_TITLES = {
    terms_of_service: "Termos de Serviço",
    privacy_policy: "Política de Privacidade (LGPD)"
};

const LegalPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const docType = searchParams.get('doc');
    
    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDocument = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!docType) throw new Error("Tipo de documento não especificado.");

            const { data, error } = await supabase.functions.invoke(`get-documents?type=${docType}`, {
                method: 'GET'
            });

            if (error) {
                console.error("API Error:", error);
                throw new Error(error.message || "Erro ao carregar documento da API");
            }
            
            // The API returns an array (ordered by version DESC)
            const activeDocs = Array.isArray(data) ? data : [];
            const targetDoc = activeDocs[0]; // Get the latest version

            if (targetDoc) {
                setDocument(targetDoc);
            } else {
                throw new Error("Documento não encontrado ou indisponível no momento.");
            }

        } catch (err) {
            console.error("Error fetching document:", err);
            setError(err.message || "Não foi possível carregar o documento. Tente novamente mais tarde.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!docType || !DOC_TITLES[docType]) {
            setError("Tipo de documento inválido ou não especificado.");
            setLoading(false);
            return;
        }

        fetchDocument();
    }, [docType]);

    // Format date safely
    const formattedDate = document?.updated_at 
        ? format(new Date(document.updated_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
        : document?.created_at 
            ? format(new Date(document.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
            : '';

    const pageTitle = DOC_TITLES[docType] || 'Documento Legal';
    const metaDescription = `Consulte os ${pageTitle} da plataforma Click Teleconsulta. Versão atualizada em ${formattedDate}.`;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
            <Helmet>
                <title>{pageTitle} | Click Teleconsulta</title>
                <meta name="description" content={metaDescription} />
            </Helmet>
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => navigate(-1)}
                            className="hover:bg-gray-100 -ml-2 rounded-full"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </Button>
                        <nav className="flex items-center text-sm font-medium text-gray-500">
                            <Link to="/" className="hover:text-blue-600 transition-colors">Início</Link>
                            <span className="mx-2 text-gray-300">/</span>
                            <span className="text-gray-900 font-semibold">{pageTitle}</span>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
                <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 flex-1">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                            <p className="text-gray-500 font-medium">Carregando documento...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center mt-8 shadow-sm">
                            <div className="bg-white p-3 rounded-full w-fit mx-auto mb-4 border border-red-100 shadow-sm">
                                <AlertCircle className="h-8 w-8 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-red-900 mb-2">Não foi possível acessar o documento</h2>
                            <p className="text-red-700 mb-8 max-w-md mx-auto">{error}</p>
                            <div className="flex justify-center gap-3">
                                <Button onClick={() => navigate('/')} variant="outline" className="bg-white border-gray-200 hover:bg-gray-50 text-gray-700">
                                    Voltar para o Início
                                </Button>
                                <Button onClick={fetchDocument} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                                    <RefreshCw className="h-4 w-4 mr-2" /> Tentar Novamente
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col flex-1 animate-in fade-in duration-500">
                            <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded-lg">
                                                <FileText className="h-6 w-6 text-blue-700" />
                                            </div>
                                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{document?.title}</h1>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 pl-1">
                                            <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-100 text-xs uppercase tracking-wide">
                                                Versão {document?.version}
                                            </span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span>
                                                Atualizado em {formattedDate}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <Button asChild className="bg-gray-900 text-white hover:bg-gray-800 shadow-md gap-2 rounded-lg h-11 px-6">
                                        <a href={document?.pdf_url} target="_blank" rel="noopener noreferrer" download={document?.pdf_file_name || 'documento.pdf'}>
                                            <Download className="w-4 h-4" /> Baixar PDF
                                        </a>
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="flex-1 bg-gray-100 relative min-h-[600px] md:h-[800px]">
                                <div className="absolute inset-0 w-full h-full flex flex-col">
                                    {document?.pdf_url ? (
                                        <>
                                            {/* Desktop: Embed PDF directly */}
                                            <div className="hidden md:block w-full h-full">
                                                <object 
                                                    data={document.pdf_url} 
                                                    type="application/pdf" 
                                                    width="100%" 
                                                    height="100%" 
                                                    className="w-full h-full border-none"
                                                    aria-label={`Visualizador PDF de ${document.title}`}
                                                >
                                                    <embed 
                                                        src={document.pdf_url} 
                                                        type="application/pdf" 
                                                        width="100%" 
                                                        height="100%" 
                                                        className="w-full h-full border-none" 
                                                        title={`Visualizador PDF de ${document.title}`}
                                                    />
                                                    {/* Fallback for browsers that don't support embed/object */}
                                                    <p className="p-8 text-center text-gray-500">
                                                        Seu navegador não suporta a visualização direta de PDFs. 
                                                        Você pode <a href={document.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">baixar o documento aqui</a>.
                                                    </p>
                                                </object>
                                            </div>

                                            {/* Mobile View: Show button to open PDF externally for better experience */}
                                            <div className="md:hidden flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
                                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                                    <FileText className="w-16 h-16 text-blue-200 mx-auto mb-4" />
                                                    <h3 className="text-lg font-bold text-gray-900">Visualização de PDF</h3>
                                                    <p className="text-sm text-gray-500 mt-2 mb-6">
                                                        Para uma melhor experiência de leitura em dispositivos móveis, recomendamos abrir o documento externamente.
                                                    </p>
                                                    <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base">
                                                        <a href={document.pdf_url} target="_blank" rel="noopener noreferrer">
                                                            Abrir PDF <ExternalLink className="w-4 h-4 ml-2" />
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400 font-medium">
                                            Arquivo PDF indisponível para visualização.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-gray-500 mb-2">&copy; {new Date().getFullYear()} Click Teleconsulta. Todos os direitos reservados.</p>
                    <p className="text-xs text-gray-400">Este documento é parte integrante dos termos legais da plataforma.</p>
                </div>
            </footer>
        </div>
    );
};

export default LegalPage;