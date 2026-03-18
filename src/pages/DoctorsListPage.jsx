import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';
import { DoctorCard } from '@/components/DoctorCard';

const DoctorsListPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('medicos')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true);
        
      if (error) {
        console.error('Error fetching doctors:', error);
      } else {
        setDoctors(data || []);
      }
      setLoading(false);
    };
    fetchDoctors();
  }, []);

  return (
    <>
      <Helmet>
        <title>Encontre seu Médico - Click Teleconsulta</title>
      </Helmet>
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Nossos Especialistas</h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
          Escolha o profissional ideal para sua necessidade e agende sua consulta online com facilidade.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-lg">Nenhum especialista disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {doctors.map(doctor => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}
    </>
  );
};

export default DoctorsListPage;