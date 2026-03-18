// This file is no longer used but cannot be deleted as per system constraints.
// Its content remains the same as it is not part of the active navigation or routing.
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const TaxManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({ platform_fee_percent: 10, fixed_fee_cents: 0 });
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_site')
        .select('*')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.settings) {
        setSettings({
            platform_fee_percent: data.settings.platform_fee_percent || 0,
            fixed_fee_cents: data.settings.fixed_fee_cents || 0
        });
      }
    } catch (error) {
      console.error('Error fetching tax settings:', error);
      toast({ variant: 'destructive', title: 'Erro ao carregar', description: 'Não foi possível carregar as taxas atuais.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // First check if a row exists
      const { data: existing } = await supabase.from('configuracoes_site').select('id').limit(1).maybeSingle();
      
      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('configuracoes_site')
          .update({ settings: settings })
          .eq('id', existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('configuracoes_site')
          .insert([{ settings: settings, id: 1 }]); // Assuming id is int/serial or just 1
        error = insertError;
      }

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Taxas atualizadas com sucesso.', className: 'bg-green-500 text-white' });
    } catch (error) {
      console.error('Error saving tax settings:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
      return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Gestão de Taxas</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Taxas da Plataforma</CardTitle>
          <CardDescription>Defina as taxas cobradas sobre os agendamentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Porcentagem (%)</Label>
              <Input 
                type="number" 
                value={settings.platform_fee_percent}
                onChange={(e) => setSettings({...settings, platform_fee_percent: parseFloat(e.target.value)})}
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">Descontado proporcionalmente do valor da consulta.</p>
            </div>
            
            <div className="space-y-2">
              <Label>Taxa Fixa (R$)</Label>
              <Input 
                type="number" 
                value={settings.fixed_fee_cents / 100}
                onChange={(e) => setSettings({...settings, fixed_fee_cents: Math.round(parseFloat(e.target.value) * 100)})}
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">Valor fixo cobrado por agendamento.</p>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving} className="w-32">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaxManagementPage;