import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const DoctorSignUpPage = () => {
  const { signUp, loading, user, profile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    crm: '',
    specialty: '',
    whatsapp: '',
  });

  useEffect(() => {
    if (user && profile) {
      navigate('/area-medico');
    }
  }, [user, profile, navigate]);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await signUp(formData.email, formData.password, {
      full_name: formData.full_name,
      crm: formData.crm,
      specialty: formData.specialty,
      whatsapp: formData.whatsapp,
    }, 'doctor');
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
     <>
      <Helmet>
        <title>Cadastro de Médico - Click Teleconsulta</title>
      </Helmet>
      <div className="w-full flex justify-center items-center py-12">
        <motion.div 
            className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg border border-border shadow-sm"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">Cadastro de Médico</h1>
            <p className="text-muted-foreground">Crie sua conta profissional para atender na Click Teleconsulta.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-1">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input id="full_name" value={formData.full_name} onChange={handleChange} required placeholder="Seu nome completo"/>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="crm">CRM</Label>
                    <Input id="crm" value={formData.crm} onChange={handleChange} required placeholder="CRM/SP 123456"/>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="specialty">Especialidade</Label>
                    <Input id="specialty" value={formData.specialty} onChange={handleChange} required placeholder="Ex: Cardiologia"/>
                </div>
             </div>
             <div className="space-y-1">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={formData.email} onChange={handleChange} required placeholder="seu@email.com" />
             </div>
             <div className="space-y-1">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={formData.password} onChange={handleChange} required placeholder="Mínimo 6 caracteres" />
             </div>
             <div className="space-y-1">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" type="tel" value={formData.whatsapp} onChange={handleChange} placeholder="(00) 00000-0000"/>
            </div>
            <Button type="submit" className="w-full" disabled={loading} id="doctor-signup-button">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar como Médico'}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
                Já tem conta?{' '}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Faça login aqui.
                </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default DoctorSignUpPage;