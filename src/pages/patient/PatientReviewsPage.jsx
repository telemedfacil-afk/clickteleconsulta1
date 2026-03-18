import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, Star, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

const PatientReviewsPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [appointments, setAppointments] = useState([]);
    const [reviews, setReviews] = useState({});
    const [loading, setLoading] = useState(true);
    
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch completed appointments directly without nested select for medicos to avoid PGRST200
            const { data: rawAppointments, error: apptError } = await supabase
                .from('agendamentos')
                .select('id, appointment_date, appointment_time, medico_id, status')
                .eq('patient_id', user.id)
                .in('status', ['atendido', 'realizado'])
                .order('appointment_date', { ascending: false });

            if (apptError) throw apptError;
            
            let apptList = rawAppointments || [];
            
            if (apptList.length > 0) {
                // Extract unique doctor IDs
                const docIds = [...new Set(apptList.map(a => a.medico_id).filter(Boolean))];
                
                // Fetch doctors manually
                let doctors = [];
                if (docIds.length > 0) {
                    const { data: docData } = await supabase
                        .from('medicos')
                        .select('id, name, user_id, specialty, image_url')
                        .in('id', docIds);
                    doctors = docData || [];
                }

                // Map doctor data into appointments
                apptList = apptList.map(appt => ({
                    ...appt,
                    medicos: doctors.find(d => d.id === appt.medico_id) || null
                }));
            }

            setAppointments(apptList);

            // Fetch user's reviews flatly
            const { data: revData, error: revError } = await supabase
                .from('avaliacoes')
                .select('*')
                .eq('paciente_id', user.id);

            if (revError) throw revError;

            const reviewsMap = {};
            (revData || []).forEach(rev => {
                reviewsMap[rev.agendamento_id] = rev;
            });
            setReviews(reviewsMap);

        } catch (error) {
            console.error('Error fetching data:', error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível carregar as informações."
            });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenReview = (appointment) => {
        setSelectedAppointment(appointment);
        const existingReview = reviews[appointment.id];
        
        if (existingReview) {
            setRating(existingReview.rating);
            setComment(existingReview.comentario || '');
        } else {
            setRating(0);
            setComment('');
        }
        setHoveredRating(0);
        setIsReviewModalOpen(true);
    };

    const submitReview = async () => {
        if (rating === 0) {
            toast({ variant: "destructive", title: "Atenção", description: "Selecione uma nota de 1 a 5 estrelas." });
            return;
        }

        if (!selectedAppointment?.medicos?.user_id) {
             toast({ variant: "destructive", title: "Erro", description: "Dados do médico incompletos." });
             return;
        }

        setIsSubmitting(true);
        try {
            const existingReview = reviews[selectedAppointment.id];
            
            const reviewData = {
                agendamento_id: selectedAppointment.id,
                paciente_id: user.id,
                medico_id: selectedAppointment.medicos.user_id,
                rating,
                comentario: comment,
                status: 'pendente', // Always goes to pending
                updated_at: new Date().toISOString()
            };

            let error;
            if (existingReview) {
                const { error: updateError } = await supabase
                    .from('avaliacoes')
                    .update(reviewData)
                    .eq('id', existingReview.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('avaliacoes')
                    .insert([reviewData]);
                error = insertError;
            }

            if (error) throw error;

            toast({ title: "Sucesso", description: "Avaliação salva com sucesso!" });
            setIsReviewModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error saving review:', error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar avaliação." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStars = (currentRating, interactive = false) => {
        return (
            <div className={`flex gap-1 ${interactive ? 'cursor-pointer' : ''}`} onMouseLeave={() => interactive && setHoveredRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = interactive ? star <= (hoveredRating || rating) : star <= currentRating;
                    return (
                        <Star 
                            key={star} 
                            className={`w-6 h-6 transition-all ${isFilled ? 'fill-amber-400 text-amber-400 scale-110' : 'text-gray-300'}`} 
                            onMouseEnter={() => interactive && setHoveredRating(star)}
                            onClick={() => interactive && setRating(star)}
                        />
                    );
                })}
            </div>
        );
    };

    const AppointmentCard = ({ appointment }) => {
        const review = reviews[appointment.id];
        const dateStr = appointment.appointment_date;
        const timeStr = appointment.appointment_time;
        const appointmentDate = dateStr ? format(new Date(`${dateStr}T00:00:00`), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Data indisponível';

        return (
            <Card className="mb-4 overflow-hidden border-gray-200">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                            {appointment.medicos?.image_url ? (
                                <img src={appointment.medicos.image_url} alt="Médico" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-blue-600 font-bold">{appointment.medicos?.name?.charAt(0) || 'M'}</span>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{appointment.medicos?.name || 'Médico'}</h3>
                            <p className="text-sm text-gray-500">{appointment.medicos?.specialty || 'Especialidade'}</p>
                            <p className="text-xs text-gray-400 mt-1">Consulta em {appointmentDate} às {timeStr}</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:items-end gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                        {review ? (
                            <>
                                <div className="flex items-center gap-2">
                                    {renderStars(review.rating)}
                                    <Badge variant={review.status === 'denunciada' ? 'destructive' : 'secondary'} className="text-[10px]">
                                        {review.status}
                                    </Badge>
                                </div>
                                {review.comentario && <p className="text-sm text-gray-600 italic line-clamp-1 max-w-xs">"{review.comentario}"</p>}
                                <Button variant="link" size="sm" className="h-auto p-0 text-blue-600" onClick={() => handleOpenReview(appointment)}>
                                    <Edit className="w-3 h-3 mr-1" /> Editar avaliação
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => handleOpenReview(appointment)} className="bg-amber-500 hover:bg-amber-600 text-white">
                                <Star className="w-4 h-4 mr-2" /> Avaliar Consulta
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Minhas Avaliações</h1>
                <p className="text-gray-500 mt-1">Avalie os profissionais e ajude a manter a qualidade dos atendimentos.</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
            ) : appointments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Nenhuma consulta concluída</h3>
                    <p className="text-gray-500 text-sm mt-1">Você poderá avaliar os profissionais após a realização das consultas.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {appointments.map(appt => <AppointmentCard key={appt.id} appointment={appt} />)}
                </div>
            )}

            <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Avaliar Consulta</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 flex flex-col items-center space-y-6">
                        <div className="text-center">
                            <p className="text-sm text-gray-500 mb-2">Como foi seu atendimento com</p>
                            <p className="font-semibold text-lg">{selectedAppointment?.medicos?.name}?</p>
                        </div>
                        
                        <div className="p-4 bg-gray-50 rounded-xl w-full flex justify-center">
                            {renderStars(rating, true)}
                        </div>

                        <div className="w-full space-y-2">
                            <p className="text-sm font-medium text-gray-700">Comentário (opcional)</p>
                            <Textarea 
                                placeholder="Conte um pouco sobre sua experiência..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="min-h-[100px] resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReviewModalOpen(false)} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button onClick={submitReview} disabled={isSubmitting || rating === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Salvar Avaliação
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PatientReviewsPage;