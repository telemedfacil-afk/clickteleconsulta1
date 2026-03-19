
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { DoctorScheduleCard } from '@/components/DoctorScheduleCard';
import { Loader2, Frown, Edit, Video, Search, Info, Calendar, DollarSign, Filter, X } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DoctorSchedule from '@/components/doctor/DoctorSchedule';
import { Button } from '@/components/ui/button';
import useAsync from '@/hooks/useAsync';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseISO, getDay, isSameDay } from 'date-fns';

const AppointmentsPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [priceSort, setPriceSort] = useState(''); 
  const [doctorPrices, setDoctorPrices] = useState({});

  const [activeFilters, setActiveFilters] = useState({
    specialty: '',
    date: '',
    priceSort: ''
  });

  const formatPrice = (value) => {
    if (value === undefined || value === null) return null;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const fetchPublicDoctors = useCallback(async () => {
    // Fetch all active doctors along with their procedures to find the main procedure price
    const { data: publicDoctors, error: fetchError } = await supabase
      .from('medicos')
      .select('*, agenda_medico(*), procedimentos(*)')
      .eq('is_public', true)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    
    if (fetchError) {
      console.error('Error fetching doctors:', fetchError);
      throw new Error("Não foi possível buscar os dados dos médicos. Tente novamente.");
    }

    const newDoctorPrices = {};

    // Process doctors to calculate Preço Paciente (with tax)
    const processedDoctors = (publicDoctors || []).map(doc => {
      const taxaPercentual = doc.payment_settings?.platform_fee_percent || 0;
      
      // Find main procedure price or fallback to legacy price_in_cents
      const mainProc = doc.procedimentos?.find(p => p.principal);
      const precoRepasse = mainProc ? Number(mainProc.preco) : (Number(doc.price_in_cents) / 100 || 0);
      
      // Formula: Preço Final = Repasse / (1 - Taxa%)
      const precoFinal = taxaPercentual === 0 ? precoRepasse : precoRepasse / (1 - (taxaPercentual / 100));
      
      // Store this precoFinal in the doctorPrices object
      newDoctorPrices[doc.id] = precoFinal;

      return {
        ...doc,
        price_in_cents: Math.round(precoFinal * 100),
      };
    });

    setDoctorPrices(newDoctorPrices);
    return processedDoctors;
  }, []);

  const fetchSpecialties = useCallback(async () => {
    const { data, error } = await supabase
      .from('medicos')
      .select('specialty')
      .eq('is_active', true)
      .eq('is_public', true);
      
    if (!error && data) {
      const uniqueSpecialties = [...new Set(data.map(d => d.specialty).filter(Boolean))].sort();
      setSpecialties(uniqueSpecialties);
    }
  }, []);

  const { execute: loadData, status, value: doctors, error: loadError } = useAsync(fetchPublicDoctors, true);

  useEffect(() => {
    fetchSpecialties();
    const channel = supabase
      .channel('public:medicos-list-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicos' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, fetchSpecialties]);

  const handleScheduleSave = useCallback(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (doctors && doctors.length > 0 && searchParams.get('edit') === '1' && user) {
      const canEdit = doctors.some(d => d.user_id === user.id);
      setIsEditorOpen(canEdit);
    } else {
      setIsEditorOpen(false);
    }
  }, [searchParams, user, doctors]);

  const handleToggleEditor = () => {
    if (isEditorOpen) {
      navigate('/agendamentos');
    } else {
      navigate('/agendamentos?edit=1');
    }
  };

  const handleSearch = () => {
    setActiveFilters({
      specialty: selectedSpecialty,
      date: selectedDate,
      priceSort: priceSort
    });
    
    let description = "Resultados atualizados.";
    if (selectedDate) description = "Mostrando médicos que atendem nesta data.";
    if (selectedSpecialty) description = `Filtrando por ${selectedSpecialty}.`;
    
    toast({ 
      title: "Filtros aplicados", 
      description: description,
      variant: "default" 
    });
  };

  const handleClearFilters = () => {
    setSelectedSpecialty('');
    setSelectedDate('');
    setPriceSort('');
    setActiveFilters({
      specialty: '',
      date: '',
      priceSort: ''
    });
    toast({ title: "Filtros limpos", description: "Mostrando todos os médicos.", variant: "outline" });
  };

  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];

    let result = [...doctors];

    if (activeFilters.specialty && activeFilters.specialty !== 'all') {
      result = result.filter(doc => doc.specialty === activeFilters.specialty);
    }

    if (activeFilters.date) {
      const dateObj = parseISO(activeFilters.date);
      const dayOfWeek = getDay(dateObj); 

      result = result.filter(doc => {
        return doc.agenda_medico?.some(
          rule => rule.dia_semana === dayOfWeek && rule.status === 'disponivel'
        );
      });
    }

    if (activeFilters.priceSort) {
      result.sort((a, b) => {
        // Use the calculated prices for sorting
        const priceA = doctorPrices[a.id] || 0;
        const priceB = doctorPrices[b.id] || 0;
        
        return activeFilters.priceSort === 'asc' ? priceA - priceB : priceB - priceA;
      });
    }

    return result;
  }, [doctors, activeFilters, doctorPrices]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const renderContent = () => {
    if (status === 'pending' || status === 'idle') {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      );
    }
    
    if (status === 'error') {
      return (
        <div className="text-center py-16 text-muted-foreground bg-card border border-destructive/20 rounded-lg">
          <Frown className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">Erro ao Carregar Médicos</h3>
          <p className="mt-2 text-sm">{loadError.message}</p>
        </div>
      );
    }

    if (status === 'success') {
      if (filteredDoctors.length > 0) {
        const loggedInDoctor = user ? doctors.find(d => d.user_id === user.id) : null;
        const canEdit = !!loggedInDoctor;
        
        return (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4 relative mt-8">
            {canEdit && (
              <div className="absolute -top-12 right-0 z-10">
                <Button onClick={handleToggleEditor} variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  {isEditorOpen ? 'Fechar Editor' : 'Editar Horários'}
                </Button>
              </div>
            )}
            {isEditorOpen && canEdit ? (
              <DoctorSchedule onScheduleSave={handleScheduleSave} />
            ) : (
              filteredDoctors.map(doctor => (
                <DoctorScheduleCard 
                  key={doctor.id} 
                  initialDoctor={doctor} 
                  onScheduleUpdate={handleScheduleSave} 
                  isFallback={doctor.is_fallback} 
                  patientPrice={doctorPrices[doctor.id]}
                  formattedPatientPrice={formatPrice(doctorPrices[doctor.id])}
                />
              ))
            )}
          </motion.div>
        );
      } else {
        return (
          <div className="text-center py-16 text-muted-foreground bg-card border rounded-lg mt-8">
            <Filter className="mx-auto h-12 w-12 text-primary/50" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">Nenhum médico encontrado</h3>
            <p className="mt-2 text-sm">
              {doctors.length === 0 
                ? "Não há médicos ativos no momento." 
                : "Tente ajustar seus filtros de busca para ver mais resultados."}
            </p>
            {doctors.length > 0 && (
               <Button variant="link" onClick={handleClearFilters} className="mt-2 text-primary">
                 Limpar Filtros
               </Button>
            )}
          </div>
        );
      }
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>Agendar Consulta - Click Teleconsulta</title>
        <meta name="description" content="Agende sua teleconsulta com um de nossos especialistas de forma rápida e segura." />
      </Helmet>

      <div className="bg-primary py-4 shadow-sm mb-8 transition-all">
        <div className="container mx-auto px-4">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
               <div className="flex items-center gap-3">
                  <h1 className="text-lg md:text-xl font-bold text-white tracking-tight whitespace-nowrap">
                    Agende sua consulta
                  </h1>
                   <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-white/80 hover:text-white transition-colors p-1 focus:outline-none">
                           <Info size={16} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs text-sm">
                        <p>
                          A <strong>Teleconsulta</strong> permite atendimento médico por videochamada. Seguro e prático.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
               </div>
               
               <div className="md:hidden flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded text-white text-[10px] font-medium border border-white/20">
                  <Video size={10} />
                  <span>Online</span>
               </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-2 w-full xl:w-auto">
               <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto bg-white/10 p-2 rounded-lg border border-white/10">
                   
                   <div className="w-full md:w-48">
                      <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                        <SelectTrigger className="h-9 px-3 bg-white border-0 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-white text-gray-700">
                          <SelectValue placeholder="Especialidade" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="all">Todas Especialidades</SelectItem>
                          {specialties.length > 0 ? (
                            specialties.map((spec) => (
                              <SelectItem key={spec} value={spec} className="cursor-pointer text-sm">{spec}</SelectItem>
                            ))
                          ) : (
                             <div className="p-2 text-xs text-muted-foreground text-center">Carregando...</div>
                          )}
                        </SelectContent>
                      </Select>
                   </div>

                   <div className="w-full md:w-40 relative">
                      <Input 
                        type="date" 
                        className="h-9 px-3 bg-white border-0 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-white text-gray-700 block w-full"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                   </div>

                   <div className="w-full md:w-36">
                       <Select value={priceSort} onValueChange={setPriceSort}>
                        <SelectTrigger className="h-9 px-3 bg-white border-0 rounded-md text-sm shadow-sm focus:ring-1 focus:ring-white text-gray-700">
                          <SelectValue placeholder="Preço" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Menor Preço</SelectItem>
                          <SelectItem value="desc">Maior Preço</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                   
                   <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                       <Button 
                         size="sm"
                         className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md shadow-sm transition-all flex-grow md:flex-grow-0"
                         onClick={handleSearch}
                       >
                          <Search className="md:mr-2 h-4 w-4" />
                          <span className="md:inline">Buscar</span>
                       </Button>

                       {(selectedSpecialty || selectedDate || priceSort) && (
                           <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 w-9 p-0 text-white hover:bg-white/20 hover:text-white"
                                onClick={handleClearFilters}
                                title="Limpar Filtros"
                           >
                               <X className="h-4 w-4" />
                           </Button>
                       )}
                   </div>
               </div>
            </div>

          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-12">
        <div className="max-w-6xl mx-auto">
            {renderContent()}
        </div>
      </div>
    </>
  );
};

export default AppointmentsPage;
