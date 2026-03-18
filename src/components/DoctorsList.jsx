import React from 'react';
import { motion } from 'framer-motion';
import { DoctorCard } from '@/components/DoctorCard';

export const doctors = [
  {
    id: '1',
    name: 'Dr. Lucas Farias',
    specialty: 'Cardiologia',
    bio: 'Especialista em saúde do coração com mais de 15 anos de experiência em hospitais de renome.',
    image_url: null,
  },
  {
    id: '2',
    name: 'Dra. Julia Mendes',
    specialty: 'Dermatologia',
    bio: 'Focada em dermatologia clínica e estética, ajudando pacientes a terem uma pele mais saudável.',
    image_url: null,
  },
  {
    id: '3',
    name: 'Dr. Rafael Costa',
    specialty: 'Pediatria',
    bio: 'Apaixonado por cuidar da saúde das crianças, desde o nascimento até a adolescência.',
    image_url: null,
  },
  {
    id: '4',
    name: 'Dra. Beatriz Almeida',
    specialty: 'Ginecologia',
    bio: 'Comprometida com a saúde da mulher em todas as fases da vida, com um atendimento humanizado.',
    image_url: null,
  }
];

export function DoctorsList() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {doctors.map(doctor => (
        <DoctorCard 
          key={doctor.id} 
          doctor={doctor} 
        />
      ))}
    </motion.div>
  );
}