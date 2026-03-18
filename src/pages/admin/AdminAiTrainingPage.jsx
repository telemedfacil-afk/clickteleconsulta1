import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Pencil, Trash2, Bot, Search } from 'lucide-react';

const AdminAiTrainingPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ question: '', answer: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRules();

    // Subscribe to realtime updates for the admin panel too
    const channel = supabase
      .channel('admin-ai-training')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_knowledge_base'
        },
        (payload) => {
          // Refresh data on any change
          fetchRules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_knowledge_base')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rules:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar regras da IA.' });
    } else {
      setRules(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (rule = null) => {
    if (rule) {
      setCurrentRule(rule);
      setFormData({ question: rule.question, answer: rule.answer });
    } else {
      setCurrentRule(null);
      setFormData({ question: '', answer: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha a pergunta (gatilho) e a resposta.' });
      return;
    }

    setSaving(true);
    try {
      if (currentRule) {
        const { error } = await supabase
          .from('ai_knowledge_base')
          .update({ 
            question: formData.question.trim(), 
            answer: formData.answer.trim(),
            updated_at: new Date()
          })
          .eq('id', currentRule.id);
        
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Regra atualizada com sucesso.' });
      } else {
        const { error } = await supabase
          .from('ai_knowledge_base')
          .insert([{ 
            question: formData.question.trim(), 
            answer: formData.answer.trim() 
          }]);
        
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Nova regra criada com sucesso.' });
      }
      
      setIsDialogOpen(false);
      // Data will refresh automatically via subscription, but we can also fetch manually to be safe
      fetchRules();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar regra.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from('ai_knowledge_base').delete().eq('id', deleteId);
      if (error) throw error;
      
      toast({ title: 'Excluído', description: 'Regra removida com sucesso.' });
      setDeleteId(null);
      // Data will refresh automatically via subscription
      fetchRules();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao excluir regra.' });
    }
  };

  const filteredRules = rules.filter(rule => 
    (rule.question?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (rule.answer?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-8 h-8 text-primary" /> Treinamento da IA
          </h1>
          <p className="text-muted-foreground">Gerencie as perguntas e respostas do assistente virtual.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Nova Regra
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Base de Conhecimento</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar regras..."
              className="pl-9 max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {rules.length === 0 
                ? "Nenhuma regra encontrada. Crie a primeira para treinar seu assistente!" 
                : "Nenhum resultado encontrado para sua busca."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Gatilho (Palavra-chave)</TableHead>
                    <TableHead className="w-[50%]">Resposta da IA</TableHead>
                    <TableHead className="w-[20%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium align-top pt-4">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono text-slate-700 block">
                          {rule.question}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {rule.question.split(',').length > 1 ? `${rule.question.split(',').length} palavras-chave` : '1 palavra-chave'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm align-top pt-4 whitespace-pre-wrap">
                        {rule.answer}
                      </TableCell>
                      <TableCell className="text-right align-top pt-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rule)}>
                            <Pencil className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(rule.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{currentRule ? 'Editar Regra' : 'Nova Regra de IA'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gatilho / Palavra-chave</label>
              <Input
                placeholder="Ex: preço, valor, quanto custa, pagamento"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Separe múltiplas palavras-chave por vírgula. A IA responderá se encontrar qualquer uma delas.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Resposta da IA</label>
              <Textarea
                placeholder="Digite a resposta completa..."
                className="min-h-[100px]"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Excluir Regra</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir esta regra? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAiTrainingPage;