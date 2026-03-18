import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Star, Trash2, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminReviewsPage = () => {
    const { toast } = useToast();
    const [reviews, setReviews] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDoctorId, setFilterDoctorId] = useState('all');
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchReviewsAndData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: rawReviews, error: revError } = await supabase
                .from('avaliacoes')
                .select('*')
                .order('created_at', { ascending: false });

            if (revError) throw revError;

            const { data: allDoctors } = await supabase.from('medicos').select('id, user_id, name, specialty');
            const { data: allPatients } = await supabase.from('perfis_usuarios').select('id, full_name');

            setDoctors(allDoctors || []);

            const mappedReviews = (rawReviews || []).map(review => {
                const doctor = (allDoctors || []).find(d => d.user_id === review.medico_id);
                const patient = (allPatients || []).find(p => p.id === review.paciente_id);
                return {
                    ...review,
                    doctor_name: doctor?.name || 'Médico Desconhecido',
                    patient_name: patient?.full_name || 'Paciente Desconhecido',
                    medico_db_id: doctor?.id
                };
            });

            setReviews(mappedReviews);
        } catch (error) {
            console.error('Error fetching reviews:', error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar avaliações." });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchReviewsAndData();
    }, [fetchReviewsAndData]);

    const handleUpdateStatus = async (id, newStatus, clearDenuncia = false) => {
        try {
            const updates = { status: newStatus, updated_at: new Date().toISOString() };
            if (clearDenuncia) {
                updates.motivo_denuncia = null;
                updates.data_denuncia = null;
            }

            const { error } = await supabase.from('avaliacoes').update(updates).eq('id', id);
            if (error) throw error;

            toast({ title: "Sucesso", description: `Status atualizado para ${newStatus}.` });
            fetchReviewsAndData();
        } catch (error) {
            console.error('Error updating review:', error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao atualizar status." });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Tem certeza que deseja excluir permanentemente esta avaliação?")) return;
        
        try {
            const { error } = await supabase.from('avaliacoes').delete().eq('id', id);
            if (error) throw error;

            toast({ title: "Sucesso", description: "Avaliação excluída com sucesso." });
            fetchReviewsAndData();
        } catch (error) {
            console.error('Error deleting review:', error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao excluir avaliação." });
        }
    };

    const renderStars = (rating) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                        key={star} 
                        className={`w-3.5 h-3.5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} 
                    />
                ))}
            </div>
        );
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'publicada': return <Badge className="bg-green-500 hover:bg-green-600">Publicada</Badge>;
            case 'denunciada': return <Badge variant="destructive">Denúncia Pendente</Badge>;
            case 'denuncia_aprovada': return <Badge className="bg-orange-500 hover:bg-orange-600">Ocultada/Aprovada</Badge>;
            default: return <Badge variant="secondary" className="bg-gray-200 text-gray-800 hover:bg-gray-300">Pendente</Badge>;
        }
    };

    const ReviewList = ({ items }) => {
        const filtered = filterDoctorId === 'all' ? items : items.filter(r => r.medico_db_id === filterDoctorId);
        
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(filtered.length / itemsPerPage);

        if (filtered.length === 0) {
            return (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">Nenhuma avaliação encontrada nesta categoria.</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {currentItems.map(review => (
                    <Card key={review.id} className="overflow-hidden shadow-sm border-gray-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-5">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="font-semibold text-gray-900">{review.patient_name}</h3>
                                        <span className="text-gray-400 text-sm">avaliou</span>
                                        <h3 className="font-semibold text-blue-700">{review.doctor_name}</h3>
                                        {getStatusBadge(review.status)}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {renderStars(review.rating)}
                                        <span className="text-xs text-gray-500">
                                            {format(new Date(review.created_at), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md italic border border-gray-100">
                                        "{review.comentario || 'Sem comentários'}"
                                    </p>
                                    
                                    {(review.status === 'denunciada' || review.status === 'denuncia_aprovada') && review.motivo_denuncia && (
                                        <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-md">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-xs font-bold text-red-800 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Motivo da Denúncia:
                                                </p>
                                                {review.data_denuncia && (
                                                    <span className="text-[10px] text-red-600">
                                                        {format(new Date(review.data_denuncia), "dd/MM/yyyy HH:mm")}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-red-700">{review.motivo_denuncia}</p>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0 md:min-w-[160px]">
                                    {review.status === 'denunciada' && (
                                        <>
                                            <Button size="sm" variant="outline" className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                                onClick={() => handleUpdateStatus(review.id, 'pendente', true)}>
                                                <CheckCircle className="w-4 h-4 mr-1" /> Rejeitar Denúncia
                                            </Button>
                                            <Button size="sm" variant="outline" className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                                onClick={() => handleUpdateStatus(review.id, 'denuncia_aprovada', false)}>
                                                <ShieldCheck className="w-4 h-4 mr-1" /> Aprovar Denúncia
                                            </Button>
                                        </>
                                    )}
                                    {review.status !== 'publicada' && (
                                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                            onClick={() => handleUpdateStatus(review.id, 'publicada', true)}>
                                            <CheckCircle className="w-4 h-4 mr-1" /> Publicar
                                        </Button>
                                    )}
                                    <Button size="sm" variant="destructive" className="w-full"
                                        onClick={() => handleDelete(review.id)}>
                                        <Trash2 className="w-4 h-4 mr-1" /> Deletar
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                            Anterior
                        </Button>
                        <span className="text-sm text-gray-600">Página {currentPage} de {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                            Próxima
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Moderação de Avaliações</h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie denúncias e o conteúdo publicado pelos pacientes.</p>
                </div>
                <div className="w-full md:w-64">
                    <Select value={filterDoctorId} onValueChange={(v) => { setFilterDoctorId(v); setCurrentPage(1); }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrar por Médico" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Médicos</SelectItem>
                            {doctors.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
            ) : (
                <Tabs defaultValue="denuncias" className="w-full" onValueChange={() => setCurrentPage(1)}>
                    <TabsList className="mb-6 flex-wrap h-auto gap-2 p-1">
                        <TabsTrigger value="denuncias" className="gap-2 text-red-600 data-[state=active]:text-red-700 data-[state=active]:bg-red-50">
                            <AlertTriangle className="w-4 h-4" /> Denúncias Pendentes ({reviews.filter(r => r.status === 'denunciada').length})
                        </TabsTrigger>
                        <TabsTrigger value="aprovadas" className="gap-2 text-orange-600 data-[state=active]:text-orange-700 data-[state=active]:bg-orange-50">
                            <ShieldCheck className="w-4 h-4" /> Denúncias Aprovadas ({reviews.filter(r => r.status === 'denuncia_aprovada').length})
                        </TabsTrigger>
                        <TabsTrigger value="todas" className="gap-2">
                            Todas as Avaliações ({reviews.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="denuncias">
                        <ReviewList items={reviews.filter(r => r.status === 'denunciada')} />
                    </TabsContent>

                    <TabsContent value="aprovadas">
                        <ReviewList items={reviews.filter(r => r.status === 'denuncia_aprovada')} />
                    </TabsContent>

                    <TabsContent value="todas">
                        <ReviewList items={reviews} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
};

export default AdminReviewsPage;