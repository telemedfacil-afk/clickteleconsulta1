import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function DoctorCard({ doctor }) {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMainProcedure() {
      if (!doctor?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('procedimentos')
          .select('preco')
          .eq('medico_id', doctor.id)
          .eq('principal', true)
          .maybeSingle();
          
        if (!error && data) {
          setPrice(data.preco);
        }
      } catch (err) {
        console.error('Error fetching procedure:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMainProcedure();
  }, [doctor?.id]);

  return (
    <Card className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="p-0">
        <div className="h-48 bg-gray-100 relative overflow-hidden">
          {doctor.image_url ? (
            <img 
              src={doctor.image_url} 
              alt={doctor.public_name || doctor.name} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
              <Stethoscope size={48} opacity={0.5} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-5">
        <CardTitle className="text-xl line-clamp-1" title={doctor.public_name || doctor.name}>
          {doctor.public_name || doctor.name}
        </CardTitle>
        <p className="text-primary font-medium flex items-center gap-1.5 mt-1.5 text-sm">
          <Stethoscope size={14} />
          {doctor.specialty}
        </p>
        <p className="text-sm text-muted-foreground mt-3 line-clamp-2" title={doctor.bio}>
          {doctor.bio || 'Especialista em telemedicina.'}
        </p>
      </CardContent>
      <CardFooter className="p-5 pt-0 flex flex-col gap-4">
        <div className="w-full pt-4 border-t border-gray-100 flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
            Preço da Consulta
          </span>
          <div className="text-center min-h-[40px] flex items-center justify-center">
            {loading ? (
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando preço...
              </span>
            ) : price !== null ? (
              <span className="text-3xl font-bold text-blue-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
              </span>
            ) : (
              <span className="text-sm font-medium text-gray-500">Preço não configurado</span>
            )}
          </div>
        </div>
        <Button asChild className="w-full">
          <Link to={`/medico/${doctor.id}`}>Ver Perfil e Horários</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default DoctorCard;