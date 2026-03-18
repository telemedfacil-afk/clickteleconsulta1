import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, Star, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DoctorReviewsPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [pendingReviews, setPendingReviews] = useState([]);
    const [reportedReviews, setReportedReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Denounce Modal State
    const [isDenounceModalOpen, setIsDenounceModalOpen] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);
    const [denounceReason, setDenounceReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchReviews = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch reviews flatly to avoid PGRST200 relationship errors
            const { data: rawReviews, error: revError } = await supabase
                .from('avaliacoes')
                .select('*')
                .eq('medico_id', user.id)
                .order('created_at', { ascending: false });

            if (revError) throw revError;

            const reviews = rawReviews || [];
            
            if (reviews.length > 0) {
                // Collect unique IDs to fetch related data
                const patientIds = [...new Set(reviews.map(r => r.paciente_id).filter(Boolean))];
                const apptIds = [...new Set(reviews.map(r => r.agendamento_id).filter(Boolean))];

                // Fetch related patients
                let patients = [];
                if (patientIds.length > 0) {
                    const { data: pData } = await supabase
                        .from('perfis_usuarios')
                        .select('id, full_name')
                        .in('id', patientIds);
                    patients = pData || [];
                }

                // Fetch related appointments
                let appointments = [];
                if (apptIds.length > 0) {
                    const { data: aData } = await supabase
                        .from('agendamentos')
                        .select('id, appointment_date, appointment_time')
                        .in('id', apptIds);
                    appointments = aData || [];
                }

                // Map related data back into reviews
                reviews.forEach(review => {
                    review.perfis_usuarios = patients.find(p => p.id === review.paciente_id) || null;
                    review.agendamentos = appointments.find(a => a.id === review.agendamento_id) || null;
                });
            }

            setPendingReviews(reviews.filter(r => r.status === 'pendente' || r.status === 'publicada'));
            setReportedReviews(reviews.filter(r => r.status === 'denunciada'));
        } catch (error) {
            console.error('Error fetching reviews:', error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível carregar as avaliações."
            });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const handleDenounceClick = (review) => {
        setSelectedReview(review);
        setDenounceReason('');
        setIsDenounceModalOpen(true);
    };

    const submitDenounce = async () => {
        if (!denounceReason.trim()) {
            toast({ variant: "destructive", title: "Atenção", description: "Informe o motivo da denúncia." });
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('avaliacoes')
                .update({ 
                    status: 'denunciada', 
                    motivo_denuncia: denounceReason,
                    data_denuncia: new Date().toISOString()
                })
                .eq('id', selectedReview.id)
                .eq('medico_id', user.id);

            if (error) throw error;

            toast({ title: "Sucesso", description: "Avaliação denunciada. Ela será analisada pela administração." });
            setIsDenounceModalOpen(false);
            fetchReviews();
        } catch (error) {
            console.error('Error denouncing review:', error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao enviar denúncia." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStars = (rating) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                        key={star} 
                        className={`w-4 h-4 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} 
                    />
                ))}
            </div>
        );
    };

    const ReviewCard = ({ review, isReported = false }) => {
        const patientName = review.perfis_usuarios?.full_name || 'Paciente';
        const dateStr = review.agendamentos?.appointment_date;
        const timeStr = review.agendamentos?.appointment_time;
        const appointmentDate = dateStr ? format(new Date(`${dateStr}T00:00:00`), "dd/MM/yyyy", { locale: ptBR }) : 'Data indisponível';

        return (
            <Card className="mb-4 overflow-hidden border-gray-200">
                <div className={`h-1 w-full ${isReported ? 'bg-red-500' : 'bg-blue-500'}`} />
                <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-semibold text-gray-900">{patientName}</h3>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                Consulta: {appointmentDate} {timeStr && `às ${timeStr}`}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {renderStars(review.rating)}
                            <span className="text-[10px] text-gray-400">
                                {format(new Date(review.created_at), "dd/MM/yyyy HH:mm")}
                            </span>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 italic border border-gray-100">
                        "{review.comentario || 'Sem comentários adicionais.'}"
                    </div>

                    {isReported && review.motivo_denuncia && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md">
                            <p className="text-xs font-semibold text-red-800 flex items-center gap-1 mb-1">
                                <AlertTriangle className="w-3 h-3" /> Motivo da Denúncia
                            </p>
                            <p className="text-sm text-red-700">{review.motivo_denuncia}</p>
                        </div>
                    )}

                    {!isReported && (
                        <div className="mt-4 flex justify-end">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => handleDenounceClick(review)}
                            >
                                <ShieldAlert className="w-4 h-4 mr-2" /> Denunciar
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Avaliações dos Pacientes</h1>
                <p className="text-gray-500 mt-1">Gerencie as avaliações recebidas após as consultas.</p>
            </div>

            <Tabs defaultValue="pendentes" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="pendentes" className="gap-2">
                        <CheckCircle className="w-4 h-4" /> Recebidas ({pendingReviews.length})
                    </TabsTrigger>
                    <TabsTrigger value="denunciadas" className="gap-2">
                        <AlertTriangle className="w-4 h-4" /> Denunciadas ({reportedReviews.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pendentes">
                    {loading ? (
                        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
                    ) : pendingReviews.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                            <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">Nenhuma avaliação recebida</h3>
                            <p className="text-gray-500 text-sm mt-1">Você ainda não possui avaliações pendentes.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingReviews.map(review => <ReviewCard key={review.id} review={review} />)}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="denunciadas">
                    {loading ? (
                        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
                    ) : reportedReviews.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                            <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">Nenhuma denúncia</h3>
                            <p className="text-gray-500 text-sm mt-1">Você não possui avaliações denunciadas no momento.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reportedReviews.map(review => <ReviewCard key={review.id} review={review} isReported />)}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <Dialog open={isDenounceModalOpen} onOpenChange={setIsDenounceModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Denunciar Avaliação</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason" className="text-sm font-medium">Motivo da denúncia</Label>
                            <Textarea 
                                id="reason" 
                                placeholder="Descreva por que esta avaliação viola os termos de uso ou contém informações falsas/inadequadas..."
                                value={denounceReason}
                                onChange={(e) => setDenounceReason(e.target.value)}
                                className="min-h-[120px]"
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            A avaliação será ocultada temporariamente enquanto nossa equipe analisa a denúncia.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDenounceModalOpen(false)} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={submitDenounce} disabled={isSubmitting || !denounceReason.trim()}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Enviar Denúncia
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DoctorReviewsPage;