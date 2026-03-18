
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, User, MoreHorizontal, Plus, Ban, PauseCircle, PlayCircle, Percent, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ProfessionalsPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [proceduresPrices, setProceduresPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    full_name: '',
    email: '',
    password: '',
    specialty: '',
    crm: '',
    uf: '',
    phone: '',
    price: '',
    fee_percent: '10'
  });

  // Edit Fee Modal State
  const [isFeeOpen, setIsFeeOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [newFee, setNewFee] = useState('');
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);

  const fetchMainProceduresPrices = async (docs) => {
    if (!docs || docs.length === 0) return;
    
    const docIds = docs.map(d => d.id);
    
    try {
      const { data, error } = await supabase
        .from('procedimentos')
        .select('medico_id, preco')
        .in('medico_id', docIds)
        .eq('principal', true);

      if (error) throw error;

      if (data) {
        const pricesMap = {};
        data.forEach(p => {
          pricesMap[p.medico_id] = p.preco;
        });
        setProceduresPrices(pricesMap);
      }
    } catch (error) {
      console.error('Error fetching procedures prices:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os preços dos procedimentos principais."
      });
    }
  };

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
        // 1. Fetch Doctors
        const { data: doctorsData, error: doctorsError } = await supabase
          .from('medicos')
          .select('*')
          .order('created_at', { ascending: false });

        if (doctorsError) throw doctorsError;

        if (!doctorsData || doctorsData.length === 0) {
          setDoctors([]);
          setLoading(false);
          return;
        }

        // 2. Fetch Profiles for emails/phones manually
        const userIds = doctorsData.map(d => d.user_id).filter(Boolean);
        
        let profilesMap = {};
        if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
            .from('perfis_usuarios')
            .select('id, email, whatsapp')
            .in('id', userIds);

            if (!profilesError && profilesData) {
                profilesMap = profilesData.reduce((acc, profile) => {
                    acc[profile.id] = profile;
                    return acc;
                }, {});
            }
        }

        // 3. Merge data
        const mergedDoctors = doctorsData.map(doc => ({
            ...doc,
            perfis_usuarios: profilesMap[doc.user_id] || { email: 'Email não encontrado', whatsapp: '' }
        }));

        setDoctors(mergedDoctors);
        
        // 4. Fetch main procedures prices for the loaded doctors
        await fetchMainProceduresPrices(mergedDoctors);

    } catch (error) {
        console.error('Error fetching doctors:', error);
        toast({ 
            variant: "destructive", 
            title: "Erro ao carregar médicos",
            description: "Não foi possível carregar a lista de profissionais."
        });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessionals();
  }, []);

  // Real-time synchronization for procedimentos table
  useEffect(() => {
    if (doctors.length === 0) return;

    const channel = supabase.channel('procedimentos-sync')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'procedimentos' }, 
        () => {
          // Refetch prices when any procedure is created, updated, or deleted
          fetchMainProceduresPrices(doctors);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctors]);

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
        const priceInCents = Math.round(parseFloat(newDoctor.price.replace(',', '.')) * 100);
        
        // 1. Call Edge Function to create user and basic doctor profile
        const { data: result, error } = await supabase.functions.invoke('create-doctor-user', {
            body: {
                ...newDoctor,
                price_in_cents: priceInCents,
                platform_fee_percent: parseFloat(newDoctor.fee_percent)
            }
        });

        if (error) throw error;
        if (result && result.error) throw new Error(result.error);

        // 2. FORCE UPDATE: Ensure the new doctor is active and public
        await new Promise(r => setTimeout(r, 1500)); 

        const { data: profileData } = await supabase
            .from('perfis_usuarios')
            .select('id')
            .eq('email', newDoctor.email)
            .single();

        if (profileData?.id) {
            const { error: updateError } = await supabase
                .from('medicos')
                .update({ 
                    is_active: true, 
                    is_public: true 
                })
                .eq('user_id', profileData.id);
            
            if (updateError) console.warn("Failed to auto-activate doctor:", updateError);
        }

        toast({
            title: "Médico criado com sucesso!",
            description: "O perfil já está ativo e visível na página de agendamentos.",
            variant: "success"
        });
        
        setIsCreateOpen(false);
        setNewDoctor({
            full_name: '', email: '', password: '', specialty: '', crm: '', uf: '', phone: '', price: '', fee_percent: '10'
        });
        fetchProfessionals();

    } catch (error) {
        console.error("Create error:", error);
        toast({
            title: "Erro ao criar médico",
            description: error.message || "Verifique os dados e tente novamente.",
            variant: "destructive"
        });
    } finally {
        setIsCreating(false);
    }
  };

  const updateStatus = async (id, isActive, isPublic, label) => {
      const { error } = await supabase
        .from('medicos')
        .update({ is_active: isActive, is_public: isPublic })
        .eq('id', id);

      if (error) {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
          toast({ title: "Status atualizado", description: `Médico agora está ${label}.`, variant: "success" });
          fetchProfessionals();
      }
  };

  const openFeeModal = (doctor) => {
      setSelectedDoctor(doctor);
      setNewFee(doctor.payment_settings?.platform_fee_percent || 0);
      setIsFeeOpen(true);
  };

  const handleUpdateFee = async () => {
      if (!selectedDoctor) return;
      setIsUpdatingFee(true);
      
      const currentSettings = selectedDoctor.payment_settings || {};
      const updatedSettings = { ...currentSettings, platform_fee_percent: parseFloat(newFee) };

      const { error } = await supabase
        .from('medicos')
        .update({ payment_settings: updatedSettings })
        .eq('id', selectedDoctor.id);

      if (error) {
          toast({ title: "Erro", description: "Falha ao atualizar taxa.", variant: "destructive" });
      } else {
          toast({ title: "Taxa atualizada", description: `Nova taxa de ${newFee}% definida.`, variant: "success" });
          setIsFeeOpen(false);
          fetchProfessionals();
      }
      setIsUpdatingFee(false);
  };

  const getStatusBadge = (doc) => {
      if (!doc.is_active) return <Badge variant="destructive" className="gap-1"><Ban className="w-3 h-3" /> Cancelado</Badge>;
      if (!doc.is_public) return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 gap-1"><PauseCircle className="w-3 h-3" /> Pausado</Badge>;
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 gap-1"><PlayCircle className="w-3 h-3" /> Ativo</Badge>;
  };

  const formatPrice = (price) => {
      if (price === undefined || price === null) return '-';
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  const filteredDoctors = doctors.filter(doc => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const name = (doc.public_name || doc.name || '').toLowerCase();
      const crm = (doc.crm || '').toLowerCase();
      return name.includes(term) || crm.includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Profissionais Cadastrados</h2>
            <p className="text-muted-foreground text-sm">Gerencie contas, taxas e visibilidade dos médicos.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" /> Novo Médico
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Cadastrar Novo Profissional</DialogTitle>
                    <DialogDescription>
                        Crie uma conta para um novo especialista. Ele receberá acesso imediato.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateDoctor} className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input id="name" required value={newDoctor.full_name} onChange={e => setNewDoctor({...newDoctor, full_name: e.target.value})} placeholder="Dr. Nome Sobrenome" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="specialty">Especialidade</Label>
                            <Input id="specialty" required value={newDoctor.specialty} onChange={e => setNewDoctor({...newDoctor, specialty: e.target.value})} placeholder="Ex: Cardiologia" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="crm">CRM (Apenas números)</Label>
                            <Input id="crm" required value={newDoctor.crm} onChange={e => setNewDoctor({...newDoctor, crm: e.target.value})} placeholder="123456" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="uf">UF (Estado)</Label>
                            <Select value={newDoctor.uf} onValueChange={val => setNewDoctor({...newDoctor, uf: val})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {['SP','RJ','MG','RS','PR','SC','BA','DF'].map(uf => (
                                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email de Acesso</Label>
                            <Input id="email" type="email" required value={newDoctor.email} onChange={e => setNewDoctor({...newDoctor, email: e.target.value})} placeholder="medico@clinica.com" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="phone">Telefone/WhatsApp</Label>
                            <Input id="phone" required value={newDoctor.phone} onChange={e => setNewDoctor({...newDoctor, phone: e.target.value})} placeholder="(00) 00000-0000" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha Inicial</Label>
                            <Input id="password" type="text" required value={newDoctor.password} onChange={e => setNewDoctor({...newDoctor, password: e.target.value})} placeholder="Mínimo 6 caracteres" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Valor Consulta (R$)</Label>
                            <Input id="price" required type="number" step="0.01" value={newDoctor.price} onChange={e => setNewDoctor({...newDoctor, price: e.target.value})} placeholder="150.00" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fee">Taxa da Plataforma (%)</Label>
                            <Input id="fee" required type="number" step="0.1" value={newDoctor.fee_percent} onChange={e => setNewDoctor({...newDoctor, fee_percent: e.target.value})} placeholder="10" />
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="submit" disabled={isCreating}>
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Criar Conta
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isFeeOpen} onOpenChange={setIsFeeOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Ajustar Taxa Individual</DialogTitle>
                <DialogDescription>
                    Defina a porcentagem retida pela plataforma para {selectedDoctor?.public_name}.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                 <div className="space-y-2">
                    <Label>Taxa (%)</Label>
                    <div className="relative">
                        <Input type="number" value={newFee} onChange={e => setNewFee(e.target.value)} />
                        <Percent className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">O valor padrão global é usado se este campo for 0 ou nulo, dependendo da lógica do sistema. Aqui você força um valor específico.</p>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleUpdateFee} disabled={isUpdatingFee}>
                    {isUpdatingFee ? <Loader2 className="animate-spin w-4 h-4" /> : "Salvar Taxa"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Lista de Médicos</CardTitle>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input 
              placeholder="Buscar por nome ou CRM..." 
              className="h-8 w-[250px]" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button variant="secondary" size="sm">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
          ) : (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[60px]">Foto</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Contatos</TableHead>
                    <TableHead>Consulta</TableHead>
                    <TableHead>Taxa (%)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredDoctors.map((doc) => (
                    <TableRow key={doc.id}>
                    <TableCell>
                        <Avatar className="w-9 h-9">
                            <AvatarImage src={doc.image_url} />
                            <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium">{doc.public_name || doc.name}</span>
                            <span className="text-xs text-muted-foreground">{doc.specialty} • CRM {doc.crm}/{doc.uf}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col text-xs text-muted-foreground">
                            <span>{doc.perfis_usuarios?.email}</span>
                            <span>{doc.perfis_usuarios?.whatsapp || '-'}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        {formatPrice(proceduresPrices[doc.id])}
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline" className="font-mono">
                            {doc.payment_settings?.platform_fee_percent || 0}%
                        </Badge>
                    </TableCell>
                    <TableCell>
                        {getStatusBadge(doc)}
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openFeeModal(doc)}>
                                    <Percent className="mr-2 h-4 w-4" /> Alterar Taxa
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {doc.is_active && doc.is_public && (
                                    <DropdownMenuItem onClick={() => updateStatus(doc.id, true, false, "pausado (oculto)")}>
                                        <PauseCircle className="mr-2 h-4 w-4" /> Pausar (Ocultar)
                                    </DropdownMenuItem>
                                )}
                                {(doc.is_active === false || doc.is_public === false) && (
                                    <DropdownMenuItem onClick={() => updateStatus(doc.id, true, true, "ativo e visível")}>
                                        <PlayCircle className="mr-2 h-4 w-4" /> Reativar
                                    </DropdownMenuItem>
                                )}
                                {doc.is_active && (
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => updateStatus(doc.id, false, false, "cancelado")}>
                                        <Ban className="mr-2 h-4 w-4" /> Cancelar Conta
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                {filteredDoctors.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                            Nenhum médico encontrado.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfessionalsPage;
