import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const doctorSchema = z.object({
  full_name: z.string().min(3, { message: 'O nome completo é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(8, { message: 'A senha deve ter pelo menos 8 caracteres.' }),
  crm: z.string().min(4, { message: 'O CRM é obrigatório.' }),
  uf: z.string().length(2, { message: 'UF deve ter 2 caracteres.' }).transform(val => val.toUpperCase()),
  specialty: z.string().min(3, { message: 'A especialidade é obrigatória.' }),
});

const CreateDoctorPage = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(doctorSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { data: functionData, error } = await supabase.functions.invoke('create-new-doctor', {
        body: data,
      });

      if (error) {
        throw new Error(error.message);
      }
      
      if(functionData.error){
        throw new Error(functionData.error);
      }

      toast({
        title: 'Sucesso!',
        description: `A conta para ${data.full_name} foi criada e um e-mail de boas-vindas foi enviado.`,
        className: 'bg-green-100 text-green-800',
      });
      reset();
    } catch (error) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message || 'Não foi possível criar a conta do médico. Verifique os dados e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Nova Conta de Médico</CardTitle>
        <CardDescription>Preencha os dados abaixo para cadastrar um novo profissional na plataforma.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input id="full_name" {...register('full_name')} placeholder="Dr(a). Nome Sobrenome" />
            {errors.full_name && <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} placeholder="email@dominio.com" />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha Temporária</Label>
            <Input id="password" type="password" {...register('password')} placeholder="Mínimo 8 caracteres" />
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade</Label>
              <Input id="specialty" {...register('specialty')} placeholder="Clínica Geral" />
              {errors.specialty && <p className="text-sm text-destructive mt-1">{errors.specialty.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm">CRM</Label>
              <Input id="crm" {...register('crm')} placeholder="123456" />
              {errors.crm && <p className="text-sm text-destructive mt-1">{errors.crm.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Input id="uf" {...register('uf')} placeholder="SP" />
              {errors.uf && <p className="text-sm text-destructive mt-1">{errors.uf.message}</p>}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full md:w-auto">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Criar Conta'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateDoctorPage;