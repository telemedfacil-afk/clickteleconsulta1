import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import { useNavigate } from 'react-router-dom';
const CpfInput = React.forwardRef(({
  onChange,
  value,
  ...props
}, ref) => <IMaskInput mask="000.000.000-00" radix="." value={value || ''} inputRef={ref} onAccept={val => onChange({
  target: {
    name: props.name,
    value: val
  }
})} overwrite className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="000.000.000-00" disabled={props.disabled} />);
const PatientData = () => {
  const {
    user,
    profile,
    reloadProfile
  } = useAuth();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: {
      errors,
      isDirty
    }
  } = useForm();
  const [loading, setLoading] = useState(false);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    if (profile) {
      setValue('full_name', profile.full_name);
      setValue('cpf', profile.cpf);
      setValue('whatsapp', profile.whatsapp);
      setValue('data_nasc', profile.data_nasc);
    }
  }, [profile, setValue]);
  const onSubmit = async formData => {
    // Only consider whatsapp for dirtiness as other fields are read-only
    if (!isDirty && formData.whatsapp === profile.whatsapp) {
      toast({
        title: "Nenhuma alteração detectada."
      });
      return;
    }
    setLoading(true);
    const {
      error
    } = await supabase.from('perfis_usuarios').update({
      // Only WhatsApp is editable
      whatsapp: formData.whatsapp
    }).eq('id', user.id);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar dados',
        description: error.message
      });
    } else {
      toast({
        title: 'Dados atualizados com sucesso!'
      });
      await reloadProfile();
    }
    setLoading(false);
  };
  return <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Meus Dados</CardTitle>
                    <CardDescription>Mantenha seus dados cadastrais sempre atualizados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="full_name">Nome Completo</Label>
                            <Input id="full_name" {...register('full_name')} disabled /> {/* Made read-only */}
                            <p className="text-xs text-muted-foreground">O nome não pode ser alterado após o cadastro.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="cpf">CPF</Label>
                                <Controller name="cpf" control={control} render={({
                field
              }) => <CpfInput {...field} disabled />} />
                                <p className="text-xs text-muted-foreground">O CPF não pode ser alterado.</p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="data_nasc">Data de Nascimento</Label>
                                <Input id="data_nasc" type="date" {...register('data_nasc')} disabled /> {/* Made read-only */}
                                <p className="text-xs text-muted-foreground">A data de nascimento não pode ser alterada após o cadastro.</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="whatsapp">WhatsApp</Label>
                            <Input id="whatsapp" {...register('whatsapp')} placeholder="(00) 00000-0000" />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={loading || !isDirty}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Segurança da Conta</CardTitle>
                    <CardDescription>Gerencie suas credenciais de acesso.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>E-mail de Acesso</Label>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                    <Button onClick={() => navigate('/conta/alterar-senha')}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Alterar Senha
                    </Button>
                </CardContent>
            </Card>
        </div>;
};
export default PatientData;