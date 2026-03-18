import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Phone, Mail, FileText, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AppointmentForm({ doctor, selectedDate, selectedTime, onSubmit, onCancel }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    symptoms: '',
    date: selectedDate,
    time: selectedTime,
    doctorId: doctor.id,
    specialty: doctor.specialty
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.patientName || !formData.patientEmail) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha seu nome e email.",
        variant: "destructive"
      });
      return;
    }

    onSubmit(formData);
    toast({
      title: "Consulta Agendada!",
      description: `Sua consulta com ${doctor.name} foi marcada para ${formData.date} às ${formData.time}.`
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-2xl mx-auto border-2 border-primary/20 shadow-xl">
        <CardHeader className="text-center bg-primary/5 p-8">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-white shadow-lg">
            <AvatarImage src={doctor.imageUrl} alt={doctor.name} />
            <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
            Agendar com {doctor.name}
          </CardTitle>
          <CardDescription className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {selectedDate}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {selectedTime}
            </div>
            <div className="flex items-center gap-1">
              <Stethoscope className="w-4 h-4" />
              {doctor.specialty}
            </div>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="patientName" className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Nome Completo *
              </Label>
              <Input
                id="patientName"
                value={formData.patientName}
                onChange={(e) => handleChange('patientName', e.target.value)}
                placeholder="Seu nome completo"
                className="transition-all duration-200 focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="patientEmail" className="font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Seu Email *
                </Label>
                <Input
                  id="patientEmail"
                  type="email"
                  value={formData.patientEmail}
                  onChange={(e) => handleChange('patientEmail', e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patientPhone" className="font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Telefone (Opcional)
                </Label>
                <Input
                  id="patientPhone"
                  value={formData.patientPhone}
                  onChange={(e) => handleChange('patientPhone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptoms" className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Motivo da Consulta (Opcional)
              </Label>
              <textarea
                id="symptoms"
                value={formData.symptoms}
                onChange={(e) => handleChange('symptoms', e.target.value)}
                placeholder="Descreva brevemente seus sintomas..."
                className="w-full min-h-[100px] p-3 border border-input rounded-md bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 text-lg py-6 transition-all duration-200 hover:bg-secondary"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 text-lg py-6 bg-primary hover:bg-primary/90 transition-all duration-200 transform hover:scale-105"
              >
                Confirmar Agendamento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}