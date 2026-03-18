import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { Loader2, Stethoscope, Star, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
];

const getNextSevenDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }
  return days;
};

const DoctorProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { addAppointment, getBookedSlots } = useAppointments();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [selectedDay, setSelectedDay] = useState(getNextSevenDays()[0]);

  useEffect(() => {
    const fetchDoctor = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('medicos').select('*').eq('id', id).single();
      if (error || !data) {
        toast({ variant: 'destructive', title: 'Médico não encontrado' });
        navigate('/medicos');
      } else {
        setDoctor(data);
        const slots = await getBookedSlots(data.id);
        setBookedSlots(slots);
      }
      setLoading(false);
    };
    fetchDoctor();
  }, [id, navigate, toast, getBookedSlots]);

  const handleBooking = async (time) => {
    if (!user) {
      toast({ title: 'Login Necessário', description: 'Você precisa fazer login para agendar uma consulta.' });
      navigate('/login');
      return;
    }
    
    const appointmentData = {
        medico_id: doctor.id,
        patient_id: user.id,
        appointment_date: selectedDay.toISOString().split('T')[0],
        appointment_time: time,
        price_in_cents: doctor.price_in_cents
    };

    const newAppointment = await addAppointment(appointmentData);
    if(newAppointment) {
        navigate('/checkout', { state: { appointmentId: newAppointment.id } });
    }
  };

  const days = getNextSevenDays();
  const selectedDateString = selectedDay.toISOString().split('T')[0];

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  if (!doctor) return null;

  return (
    <>
      <Helmet>
        <title>{doctor.name} - Click Teleconsulta</title>
      </Helmet>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-border rounded-lg shadow-sm p-8 flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0 text-center md:text-left">
            <img src={doctor.image_url} alt={doctor.name} className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-accent" />
            <h1 className="text-2xl font-bold mt-4">{doctor.name}</h1>
            <p className="text-primary font-semibold flex items-center justify-center md:justify-start gap-2 mt-1"><Stethoscope size={16} />{doctor.specialty}</p>
            <p className="text-lg font-bold mt-2 text-gray-700">R$ {(doctor.price_in_cents / 100).toFixed(2)}</p>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Sobre</h2>
            <p className="text-muted-foreground">{doctor.bio}</p>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg shadow-sm p-8 mt-8">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4"><Calendar size={20} /> Agenda de Horários</h2>
            
            <div className="flex space-x-2 overflow-x-auto pb-4 mb-4">
                {days.map(day => (
                    <Button 
                        key={day.toISOString()} 
                        variant={selectedDay.toDateString() === day.toDateString() ? "default" : "outline"}
                        onClick={() => setSelectedDay(day)}
                        className="flex-shrink-0"
                    >
                        <div className="flex flex-col items-center">
                            <span className="text-xs">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                            <span className="font-bold text-lg">{day.getDate()}</span>
                        </div>
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {timeSlots.map(time => {
                    const isBooked = bookedSlots.includes(`${selectedDateString}T${time}:00`);
                    return (
                        <Button 
                            key={time} 
                            disabled={isBooked}
                            onClick={() => handleBooking(time)}
                        >
                            {time}
                        </Button>
                    );
                })}
            </div>
        </div>
      </div>
    </>
  );
};

export default DoctorProfilePage;