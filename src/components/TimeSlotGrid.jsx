import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAppointments } from '@/hooks/useAppointments';

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30'
];

const getNextFourDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 4; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }
  return days;
};

const formatDate = (date) => date.toLocaleDateString('pt-BR');
const formatDayOfWeek = (date) => date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
const formatDayOfMonth = (date) => date.getDate();

export function TimeSlotGrid({ doctor, onTimeSelect }) {
  const { isTimeSlotAvailable } = useAppointments();
  const days = getNextFourDays();

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-5 gap-2 min-w-[450px]">
        {/* Header Vazio para alinhar */}
        <div className="font-bold text-center text-muted-foreground text-sm flex items-center justify-center">Horário</div>
        {/* Headers de Data */}
        {days.map((day) => (
          <div key={day.toISOString()} className="text-center font-bold p-2 bg-secondary rounded-t-lg">
            <div className="text-xs capitalize">{formatDayOfWeek(day)}</div>
            <div className="text-lg">{formatDayOfMonth(day)}</div>
          </div>
        ))}
        
        {/* Linhas de Horários */}
        {timeSlots.map(time => (
          <React.Fragment key={time}>
            <div className="font-semibold text-xs text-muted-foreground flex items-center justify-center p-2">
              {time}
            </div>
            {days.map((day, dayIndex) => {
              const dateString = formatDate(day);
              const isAvailable = isTimeSlotAvailable(dateString, time, doctor.id);
              return (
                <motion.div
                  key={`${dateString}-${time}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: dayIndex * 0.05 }}
                >
                  <Button
                    onClick={() => isAvailable && onTimeSelect(dateString, time)}
                    variant={isAvailable ? "outline" : "secondary"}
                    disabled={!isAvailable}
                    className={`w-full h-9 time-slot rounded-lg font-semibold text-sm
                      ${isAvailable 
                        ? 'bg-card border-2 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary cursor-pointer' 
                        : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed opacity-70'
                      }`}
                  >
                    {isAvailable ? time : 'Indis.'}
                  </Button>
                </motion.div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}