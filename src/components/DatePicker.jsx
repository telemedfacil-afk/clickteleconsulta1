import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DatePicker({ selectedDate, onDateSelect }) {
  const today = new Date();
  
  const generateDates = () => {
    const dates = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateDates();
  
  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR');
  };

  const formatDateForDisplay = (date) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return {
      dayName: days[date.getDay()],
      day: date.getDate(),
      month: months[date.getMonth()]
    };
  };

  const isToday = (date) => {
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          Selecione a Data
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-3">
          {dates.map((date, index) => {
            const dateStr = formatDate(date);
            const displayDate = formatDateForDisplay(date);
            const isSelected = selectedDate === dateStr;
            const isTodayDate = isToday(date);
            const isWeekendDate = isWeekend(date);
            
            return (
              <motion.div
                key={dateStr}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
              >
                <Button
                  onClick={() => onDateSelect(dateStr)}
                  variant={isSelected ? "default" : "outline"}
                  className={`
                    w-full h-24 flex flex-col items-center justify-center p-2 transition-all duration-300 rounded-xl
                    ${isSelected 
                      ? 'bg-primary hover:bg-primary/90 text-white shadow-lg transform scale-105' 
                      : isWeekendDate
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-card border hover:bg-primary/10 hover:border-primary'
                    }
                    ${isTodayDate && !isSelected ? 'border-primary' : ''}
                  `}
                  disabled={isWeekendDate}
                >
                  <span className="text-sm font-medium">
                    {displayDate.dayName}
                  </span>
                  <span className="text-2xl font-bold mt-1">
                    {displayDate.day}
                  </span>
                  <span className="text-xs">
                    {displayDate.month}
                  </span>
                </Button>
              </motion.div>
            );
          })}
        </div>
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Consultas disponíveis de Segunda a Sexta.</p>
        </div>
      </CardContent>
    </Card>
  );
}