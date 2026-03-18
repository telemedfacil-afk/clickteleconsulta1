import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, KeyRound, Mail, Phone, Pencil, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DoctorSecurity = () => {
    const { user, profile, reloadProfile } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

    useEffect(() => {
        if (profile?.whatsapp) {
            setNewPhone(profile.whatsapp);
        }
    }, [profile?.whatsapp]);

    const handleEmailUpdate = async (e) => {
        e.preventDefault();
        if (!newEmail || newEmail === user.email) {
             toast({ title: "E-mail inválido", description: "O novo e-mail deve ser diferente do atual.", variant: "destructive" });
             return;
        }
        
        setIsUpdatingEmail(true);
        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;

            toast({
                title: "Confirmação necessária",
                description: `Um link de confirmação foi enviado para ${newEmail}. Verifique sua caixa de entrada.`,
                variant: "default"
            });
            setIsEmailModalOpen(false);
            setNewEmail('');
        } catch (error) {
            toast({
                title: "Erro ao atualizar e-mail",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const handlePhoneUpdate = async (e) => {
        e.preventDefault();
        if (!newPhone || newPhone.length < 10) {
            toast({ title: "Número inválido", description: "Por favor insira um número válido (com DDD).", variant: "destructive" });
            return;
        }

        setIsUpdatingPhone(true);
        try {
            const { error } = await supabase
                .from('perfis_usuarios')
                .update({ whatsapp: newPhone })
                .eq('id', user.id);

            if (error) throw error;

            toast({
                title: "Contato atualizado",
                description: "Seu número de WhatsApp foi atualizado com sucesso.",
                variant: "default"
            });
            
            await reloadProfile();
            setIsPhoneModalOpen(false);
        } catch (error) {
            toast({
                title: "Erro ao atualizar telefone",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsUpdatingPhone(false);
        }
    };

    return (
        <div className="space-y-4 max-w-5xl mx-auto pb-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold tracking-tight text-gray-900">Segurança e Acesso</h1>
                <p className="text-sm text-gray-500">Gerencie suas credenciais de login e métodos de recuperação.</p>
            </div>

            <Card className="dashboard-card rounded-sm shadow-sm border-gray-200">
                <CardHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                     <CardTitle className="dashboard-title text-lg flex items-center gap-2 font-semibold">
                        <ShieldCheck className="w-5 h-5 text-gray-700"/> Credenciais e Contato
                     </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 rounded-sm border border-gray-200 bg-gray-50 hover:bg-gray-50/80 transition-colors">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">E-mail de Acesso</Label>
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                     <Mail className="w-4 h-4 text-gray-400" />
                                     <span className="truncate max-w-[200px]">{user?.email}</span>
                                </div>
                            </div>
                            <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-primary hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-sm shadow-sm">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md p-6 rounded-sm border-gray-200">
                                    <DialogHeader className="p-0 pb-4">
                                        <DialogTitle className="text-base font-semibold text-gray-900">Alterar E-mail</DialogTitle>
                                        <DialogDescription className="text-xs text-gray-500">
                                            Insira seu novo endereço de e-mail.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleEmailUpdate} className="space-y-4 py-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="newEmail" className="text-xs font-bold text-gray-700">Novo E-mail</Label>
                                            <Input 
                                                id="newEmail"
                                                type="email" 
                                                required 
                                                placeholder="novo@email.com" 
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                                className="h-9 text-sm rounded-sm border-gray-300"
                                            />
                                        </div>
                                        <DialogFooter className="p-0 pt-2">
                                            <Button type="button" variant="ghost" onClick={() => setIsEmailModalOpen(false)} className="h-9 text-xs rounded-sm">Cancelar</Button>
                                            <Button type="submit" disabled={isUpdatingEmail} className="h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm">
                                                {isUpdatingEmail && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                                Atualizar
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-sm border border-gray-200 bg-gray-50 hover:bg-gray-50/80 transition-colors">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">WhatsApp / Contato</Label>
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                     <Phone className="w-4 h-4 text-gray-400" />
                                     <span>{profile?.whatsapp || 'Não cadastrado'}</span>
                                </div>
                            </div>
                            <Dialog open={isPhoneModalOpen} onOpenChange={setIsPhoneModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-primary hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-sm shadow-sm">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md p-6 rounded-sm border-gray-200">
                                    <DialogHeader className="p-0 pb-4">
                                        <DialogTitle className="text-base font-semibold text-gray-900">Alterar Contato</DialogTitle>
                                        <DialogDescription className="text-xs text-gray-500">
                                            Atualize seu número de WhatsApp.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handlePhoneUpdate} className="space-y-4 py-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="newPhone" className="text-xs font-bold text-gray-700">Novo Telefone</Label>
                                            <Input 
                                                id="newPhone"
                                                type="text" 
                                                required 
                                                placeholder="(00) 00000-0000" 
                                                value={newPhone}
                                                onChange={(e) => setNewPhone(e.target.value)}
                                                className="h-9 text-sm rounded-sm border-gray-300"
                                            />
                                        </div>
                                        <DialogFooter className="p-0 pt-2">
                                            <Button type="button" variant="ghost" onClick={() => setIsPhoneModalOpen(false)} className="h-9 text-xs rounded-sm">Cancelar</Button>
                                            <Button type="submit" disabled={isUpdatingPhone} className="h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm">
                                                {isUpdatingPhone && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                                Salvar
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100">
                         <Button onClick={() => navigate('/conta/alterar-senha')} variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50 h-9 text-xs px-4 rounded-sm font-medium shadow-sm">
                            <KeyRound className="mr-2 h-3.5 w-3.5 text-gray-500" />
                            Alterar Senha de Acesso
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DoctorSecurity;