import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Camera, User as UserIcon, Save, ExternalLink, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import useAsync from '@/hooks/useAsync';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ProfileSkeleton = () => (
    <div className="space-y-4">
        <Card className="rounded-sm border-gray-200 shadow-sm">
            <CardHeader>
                <CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle>
                <CardDescription><Skeleton className="h-4 w-2/3" /></CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-6 mb-6">
                     <Skeleton className="w-20 h-20 rounded-full" />
                     <div className="space-y-2 w-full pt-2">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-1/4" />
                     </div>
                </div>
                 <div className="space-y-4">
                    <Skeleton className="h-10 w-full rounded-sm" />
                    <Skeleton className="h-10 w-full rounded-sm" />
                    <Skeleton className="h-24 w-full rounded-sm" />
                 </div>
            </CardContent>
        </Card>
    </div>
);

const specialtiesList = [
    "Clínico Geral"
];

const DoctorProfile = () => {
    const { user, reloadProfile } = useAuth();
    const { register, handleSubmit, formState: { errors, isDirty }, reset, control } = useForm();
    const [uploading, setUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef(null);

    const fetchDoctorProfile = useCallback(async () => {
        if (!user?.id) throw new Error("Usuário não autenticado.");
        
        const { data, error } = await supabase
            .from('medicos')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw new Error(`Erro ao buscar perfil: ${error.message}`);
        
        return data || {};
    }, [user?.id]);
    
    const { retry: retryLoad, status, value: doctorData, error: loadError, setValue: setDoctorData } = useAsync(fetchDoctorProfile, true);

    useEffect(() => {
        if (doctorData) {
            const formData = {
                ...doctorData,
                instructions: doctorData.instructions || '',
                specialty: doctorData.specialty || "Clínico Geral",
                phone_number: doctorData.phone_number || ''
            };
            reset(formData);
        }
    }, [doctorData, reset]);

    const handleAvatarClick = () => {
        fileInputRef.current.click();
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !doctorData) return;

        setUploading(true);
        try {
            const fileName = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            const { data: updatedData, error: updateError } = await supabase
                .from('medicos')
                .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .select()
                .single();

            if (updateError) throw updateError;

            toast({ title: 'Foto de perfil atualizada!' });
            setDoctorData(updatedData);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro no Upload', description: error.message });
        } finally {
            setUploading(false);
        }
    };

    const onSubmit = async (formData) => {
        setIsSaving(true);
        try {
            const updates = {
                public_name: formData.public_name,
                specialty: formData.specialty,
                crm: formData.crm,
                uf: formData.uf,
                phone_number: formData.phone_number,
                bio: formData.bio,
                instructions: formData.instructions,
                updated_at: new Date().toISOString(), 
            };

            const { data, error } = await supabase.from("medicos").update(updates).eq("user_id", user.id).select().single();
            if (error) throw error;
        
            toast({ title: "Perfil Salvo!", description: `Seus dados foram atualizados.`, variant: "default" });
            setDoctorData(data);
            
            reset({
                ...data,
                instructions: data.instructions || '',
                phone_number: data.phone_number || ''
            }); 
            reloadProfile().catch(console.error);
        } catch (err) {
            toast({ variant: "destructive", title: "Erro ao atualizar", description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (status === 'pending' || status === 'idle') return <ProfileSkeleton />;
    if (status === 'error') return <div className="p-4 text-center text-sm"><p className="text-red-600 mb-2">{loadError.message}</p><Button onClick={retryLoad} size="sm" className="rounded-sm">Tentar novamente</Button></div>;

    return (
        <div className="space-y-4 max-w-5xl mx-auto pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">Meu Perfil</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500">Gerencie suas informações profissionais.</p>
                        {isDirty && <span className="text-xs text-amber-600 font-medium animate-pulse">• Alterações não salvas</span>}
                    </div>
                </div>
                {doctorData?.id && (
                    <Button asChild variant="outline" size="sm" className="gap-2 shadow-sm border-gray-300 font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 h-9 rounded-sm">
                        <Link to={`/medico/${doctorData.id}`} target="_blank">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Ver Perfil Público
                        </Link>
                    </Button>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Card className="dashboard-card rounded-sm mb-4">
                    <CardHeader className="px-6 pt-6 pb-2">
                        <CardTitle className="dashboard-title text-lg">Dados Profissionais</CardTitle>
                        <CardDescription className="dashboard-subtitle text-sm">Informações visíveis para seus pacientes.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-4">
                        <div className="flex flex-col sm:flex-row gap-6 p-4 bg-gray-50/50 rounded-sm border border-gray-200 mb-6">
                            <div className="relative group shrink-0 mx-auto sm:mx-0">
                                <Avatar className="w-24 h-24 border-4 border-white shadow-sm rounded-full">
                                    <AvatarImage src={doctorData?.image_url} className="object-cover" />
                                    <AvatarFallback className="bg-gray-200 text-gray-500"><UserIcon size={36}/></AvatarFallback>
                                </Avatar>
                                <label className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer ${uploading ? 'opacity-100' : ''}`}>
                                    {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                                    <Input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} ref={fileInputRef} />
                                </label>
                            </div>
                            <div className="flex-1 space-y-2 text-center sm:text-left pt-2">
                                <h3 className="font-semibold text-gray-900 text-base">Foto de Perfil</h3>
                                <p className="text-sm font-normal text-gray-500 max-w-sm">Uma boa foto aumenta a confiança dos pacientes. Prefira fundos neutros e iluminação adequada.</p>
                            </div>
                        </div>

                        <div className="grid gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="public_name" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Nome de Exibição</Label>
                                    <Input id="public_name" placeholder="Dr. Nome Sobrenome" {...register('public_name', { required: true })} className="bg-white border-gray-300 focus:border-primary focus:ring-primary transition-colors h-10 text-sm rounded-sm shadow-sm" />
                                    {errors.public_name && <p className="text-xs text-red-600 font-medium mt-1">Obrigatório</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="specialty" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Especialidade</Label>
                                    <Controller
                                        name="specialty"
                                        control={control}
                                        rules={{ required: true }}
                                        render={({ field }) => (
                                            <Select 
                                                onValueChange={field.onChange} 
                                                defaultValue={field.value}
                                                value={field.value}
                                            >
                                                <SelectTrigger className="bg-white border-gray-300 focus:border-primary focus:ring-primary transition-colors h-10 text-sm rounded-sm shadow-sm">
                                                    <SelectValue placeholder="Selecione a especialidade" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-sm border-gray-200">
                                                    {specialtiesList.map((spec) => (
                                                        <SelectItem key={spec} value={spec}>
                                                            {spec}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="crm" className="text-xs font-bold text-gray-700 uppercase tracking-wide">CRM</Label>
                                    <Input id="crm" placeholder="000000" {...register('crm', { required: true })} className="bg-white border-gray-300 focus:border-primary focus:ring-primary transition-colors h-10 text-sm rounded-sm shadow-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="uf" className="text-xs font-bold text-gray-700 uppercase tracking-wide">UF</Label>
                                    <Input id="uf" placeholder="SP" maxLength={2} className="uppercase bg-white border-gray-300 focus:border-primary focus:ring-primary transition-colors h-10 text-sm rounded-sm shadow-sm" {...register('uf', { required: true })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="phone_number" className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" /> Telefone Público
                                    </Label>
                                    <Input id="phone_number" placeholder="(00) 00000-0000" {...register('phone_number')} className="bg-white border-gray-300 focus:border-primary focus:ring-primary transition-colors h-10 text-sm rounded-sm shadow-sm" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="bio" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Biografia</Label>
                                <Textarea id="bio" {...register('bio')} rows={4} className="resize-none bg-white border-gray-300 focus:border-primary focus:ring-primary text-sm rounded-sm shadow-sm p-3" placeholder="Fale sobre sua experiência, formação e abordagem..." />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="instructions" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Instruções ao Paciente</Label>
                                <Textarea id="instructions" {...register('instructions')} rows={3} className="resize-none bg-white border-gray-300 focus:border-primary focus:ring-primary text-sm rounded-sm shadow-sm p-3" placeholder="Ex: Chegue 5 minutos antes para conexão. Tenha em mãos seus exames recentes." />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <div className="flex items-center justify-end pt-4 border-t border-gray-200 gap-3">
                        <Button type="button" variant="ghost" onClick={() => reset(doctorData)} disabled={!isDirty || isSaving} className="text-gray-600 hover:text-gray-900 h-9 text-sm rounded-sm">Cancelar</Button>
                    <Button type="submit" disabled={isSaving} className="min-w-[120px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm h-9 text-sm rounded-sm">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default DoctorProfile;