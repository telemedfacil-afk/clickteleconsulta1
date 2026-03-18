
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Frown, Star, MapPin, Shield, Edit, Save, Info } from 'lucide-react';
import useAsync from '@/hooks/useAsync';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ReviewsSection = ({ doctorId, reviews }) => {
  const averageRating = reviews?.length ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) : null;
  
  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          Avaliações
        </h3>
        {averageRating && <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold">
          ★ {averageRating}
        </Badge>}
      </div>

      {reviews && reviews.length > 0 ? (
        <div className="grid gap-3">
          {reviews.map(review => (
            <div key={review.id} className="bg-muted/30 p-3 rounded-md border border-border/50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="font-medium text-xs">Paciente Verificado</div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("w-3 h-3", i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                  ))}
                </div>
              </div>
              {review.comentario && <p className="text-xs text-foreground/80 mt-1 italic">"{review.comentario}"</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-muted/20 rounded-md border border-dashed">
          <p className="text-muted-foreground text-sm">Este especialista ainda não possui avaliações visíveis.</p>
        </div>
      )}
    </div>
  );
};

const DoctorEditorDialog = ({ doctor, isOpen, onOpenChange, onSave }) => {
  const [formData, setFormData] = useState({
    bio: doctor.bio || '',
    instructions: doctor.instructions || '',
    specialty: doctor.specialty || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil Público</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="specialty">Especialidade</Label>
            <Input id="specialty" value={formData.specialty} onChange={e => handleChange('specialty', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Descrição Profissional (Bio)</Label>
            <Textarea id="bio" className="min-h-[100px]" value={formData.bio} onChange={e => handleChange('bio', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructions">Instruções de Atendimento</Label>
            <Textarea id="instructions" className="min-h-[100px]" placeholder="Ex: Chegar 5 minutos antes, ter exames em mãos, etc." value={formData.instructions} onChange={e => handleChange('instructions', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DoctorPublicProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const fetchDoctorProfile = useCallback(async () => {
    if (!id) throw new Error("ID do médico não fornecido.");
    
    const { data: doctorData, error: doctorError } = await supabase
      .from('medicos')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (doctorError || !doctorData) {
      throw new Error("Médico não encontrado ou não está disponível publicamente.");
    }
    
    return { 
      doctor: doctorData
    };
  }, [id]);

  const fetchReviews = useCallback(async () => {
    const { data: doctorData } = await supabase.from('medicos').select('user_id').eq('id', id).single();
    
    if (doctorData?.user_id) {
        const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('medico_id', doctorData.user_id)
        .eq('status', 'publicada')
        .order('created_at', { ascending: false });

        if (!error) {
           setReviews(data || []);
        }
    }
  }, [id]);

  const { execute: loadProfile, status, value: profileData, error: loadError, setValue: setProfileData } = useAsync(fetchDoctorProfile, true);

  useEffect(() => {
    if (status === 'success') {
      fetchReviews();
    }
  }, [status, fetchReviews]);

  const handleUpdateProfile = async (updatedData) => {
    if (!profileData?.doctor) return;
    const { error } = await supabase
      .from('medicos')
      .update(updatedData)
      .eq('id', profileData.doctor.id)
      .eq('user_id', user.id);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message });
      throw error;
    }
    toast({ title: "Sucesso", description: "Perfil atualizado com sucesso!" });
    setProfileData(prev => ({ 
      ...prev, 
      doctor: { ...prev.doctor, ...updatedData } 
    }));
  };

  const isOwner = user && profileData?.doctor && user.id === profileData.doctor.user_id;
  const doctor = profileData?.doctor;

  const renderContent = () => {
    if (status === 'pending' || status === 'idle') {
      return (
        <div className="flex justify-center items-center h-96">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="text-center py-12 text-muted-foreground bg-card border border-destructive/20 rounded-lg">
          <Frown className="mx-auto h-10 w-10 text-destructive" />
          <h3 className="mt-3 text-lg font-semibold text-foreground">Erro ao Carregar Perfil</h3>
          <p className="mt-1 text-sm">{loadError?.message || "Não foi possível encontrar o médico solicitado."}</p>
        </div>
      );
    }

    if (status === 'success' && doctor) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="h-20 bg-gradient-to-r from-primary/10 to-primary/5 w-full"></div>
                <div className="px-5 pb-5 relative">
                    <div className="flex justify-between items-end -mt-10 mb-3">
                        <Avatar className="w-24 h-24 border-3 border-background shadow-md bg-white">
                            <AvatarImage src={doctor.image_url} alt={doctor.public_name} className="object-cover" />
                            <AvatarFallback className="text-2xl">{doctor.public_name?.[0] || 'M'}</AvatarFallback>
                        </Avatar>
                        {isOwner && (
                            <Button onClick={() => setIsEditorOpen(true)} variant="outline" size="sm" className="gap-2 h-8 text-xs">
                                <Edit className="w-3 h-3" /> Editar Perfil
                            </Button>
                        )}
                    </div>
                    
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-foreground">{doctor.public_name || doctor.name}</h1>
                        <p className="text-base text-primary font-medium mt-0.5">{doctor.specialty}</p>
                        
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-xs text-muted-foreground">
                            {doctor.crm && (
                                <div className="flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    <span>CRM: {doctor.crm} / {doctor.uf || 'BR'}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>Telemedicina (Online)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
                <h2 className="text-base font-semibold text-foreground">Sobre o Especialista</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground text-sm">
                    {doctor.bio ? doctor.bio.split('\n').map((paragraph, idx) => <p key={idx}>{paragraph}</p>) : <p className="italic">O médico ainda não adicionou uma descrição profissional.</p>}
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
                <h2 className="text-base font-semibold text-foreground">Instruções para Atendimento</h2>
                <div className="bg-blue-50/50 dark:bg-blue-950/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/20">
                    <div className="prose prose-sm max-w-none text-foreground/80 text-sm">
                        {doctor.instructions ? doctor.instructions.split('\n').map((paragraph, idx) => <p key={idx}>{paragraph}</p>) : (
                            <ul className="list-disc list-inside space-y-0.5">
                                <li>Conecte-se 5 minutos antes do horário agendado.</li>
                                <li>Certifique-se de estar em um local silencioso e iluminado.</li>
                                <li>Tenha seus documentos e exames anteriores em mãos, se necessário.</li>
                                <li>A tolerância de atraso é de 10 minutos.</li>
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <ReviewsSection doctorId={doctor.id} reviews={reviews} />

          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col gap-4">
                  <h3 className="font-bold text-lg text-foreground">Agendar Consulta</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                      Clique no botão abaixo para ver os horários disponíveis e realizar seu agendamento online de forma rápida e segura.
                  </p>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90 font-bold py-6">
                      <Link to="/agendamentos">
                          Ver Horários Disponíveis
                      </Link>
                  </Button>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg mt-2">
                    <Shield className="w-3 h-3" />
                    <span>Pagamento seguro e dados protegidos</span>
                  </div>
              </div>

              <div className="bg-muted/10 rounded-xl border border-dashed border-border p-5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Info className="w-3 h-3" /> Suporte
                  </h4>
                  <p className="text-xs text-muted-foreground">
                      Dúvidas sobre o agendamento? Entre em contato com nossa equipe através do <Link to="/suporte" className="text-primary hover:underline font-semibold">canal de suporte</Link>.
                  </p>
              </div>
            </div>
          </div>

          {isOwner && (
            <DoctorEditorDialog
              doctor={doctor}
              isOpen={isEditorOpen}
              onOpenChange={setIsEditorOpen}
              onSave={handleUpdateProfile}
            />
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>{doctor ? `${doctor.public_name || doctor.name}` : 'Perfil do Médico'} - Click Teleconsulta</title>
        <meta name="description" content={doctor ? `Agende uma consulta com ${doctor.public_name || doctor.name}, especialista em ${doctor.specialty}.` : "Veja o perfil do médico e agende sua consulta."} />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6 md:py-8 min-h-screen">
        <div className="mb-5">
          <Button variant="ghost" className="pl-0 hover:pl-1 transition-all text-sm" onClick={() => navigate('/agendamentos')}>
            &larr; Voltar para lista de médicos
          </Button>
        </div>

        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </>
  );
};

export default DoctorPublicProfilePage;
