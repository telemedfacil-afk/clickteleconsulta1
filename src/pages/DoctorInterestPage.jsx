import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Send } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
const interestSchema = z.object({
  full_name: z.string().min(3, 'Nome completo é obrigatório.'),
  crm: z.string().min(5, 'CRM/UF é obrigatório (ex: 123456/SP).'),
  specialty: z.string().min(3, 'Especialidade é obrigatória.'),
  city_state: z.string().min(3, 'Cidade/UF é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  whatsapp: z.string().optional(),
  message: z.string().optional()
});
const DoctorInterestPage = () => {
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: {
      errors
    },
    reset
  } = useForm({
    resolver: zodResolver(interestSchema)
  });
  const onSubmit = async data => {
    setLoading(true);
    try {
      const {
        error
      } = await supabase.functions.invoke('submit-doctor-interest', {
        body: data
      });
      if (error) {
        throw new Error(error.message);
      }
      toast({
        title: 'Sucesso!',
        description: 'Seu interesse foi registrado. Nossa equipe entrará em contato em breve.',
        className: 'bg-green-100 text-green-800'
      });
      reset();
    } catch (error) {
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Não foi possível registrar seu interesse. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  return <>
      <Helmet>
        <title>Seja um Médico Parceiro - Click Teleconsulta</title>
        <meta name="description" content="Junte-se à nossa plataforma e ofereça teleconsultas para pacientes de todo o Brasil." />
      </Helmet>
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.5
    }} className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">Cadastro Médico</h1>
          <p className="text-lg text-muted-foreground">
            Faça parte da nossa rede de especialistas e leve saúde de qualidade a mais pessoas. Preencha o formulário abaixo para iniciar sua jornada conosco.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card p-8 rounded-xl shadow-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input id="full_name" {...register('full_name')} placeholder="Seu nome como no CRM" />
              {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de Contato</Label>
              <Input id="email" type="email" {...register('email')} placeholder="seu.melhor@email.com" />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="crm">CRM / UF</Label>
              <Input id="crm" {...register('crm')} placeholder="123456/SP" />
              {errors.crm && <p className="text-sm text-destructive">{errors.crm.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade Principal</Label>
              <Input id="specialty" {...register('specialty')} placeholder="Ex: Clínica Geral" />
              {errors.specialty && <p className="text-sm text-destructive">{errors.specialty.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city_state">Sua Cidade / UF</Label>
              <Input id="city_state" {...register('city_state')} placeholder="São Paulo/SP" />
              {errors.city_state && <p className="text-sm text-destructive">{errors.city_state.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp (Opcional)</Label>
            <Input id="whatsapp" {...register('whatsapp')} placeholder="(11) 99999-9999" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem (Opcional)</Label>
            <Textarea id="message" {...register('message')} placeholder="Conte-nos um pouco sobre você ou suas dúvidas." />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading} size="lg">
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
              Enviar Interesse
            </Button>
          </div>
        </form>
      </motion.div>
    </>;
};
export default DoctorInterestPage;