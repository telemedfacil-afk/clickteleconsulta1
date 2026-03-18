import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, Save, ArrowLeft, Unlock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ClinicalEpisode = ({ episode, onSave, onConclude, onReturn }) => {
  const [notes, setNotes] = useState(episode.observacoes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when episode prop changes
  useEffect(() => {
    setNotes(episode.observacoes || '');
  }, [episode.id, episode.observacoes]);

  const handleSave = async () => {
    setIsSaving(true);
    // We strictly use 'observacoes' for the unified note
    await onSave(episode.id, { observacoes: notes });
    setIsSaving(false);
  };

  const handleConclude = async () => {
    setIsSaving(true);
    await onConclude(episode.id, { observacoes: notes });
    setIsSaving(false);
  };

  const isCompleted = episode.status === 'completed';

  return (
    <Card className="border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 h-full flex flex-col">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onReturn}
                    className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
                >
                    <ArrowLeft className="h-4 w-4 text-gray-600" />
                </Button>
                <div className="flex flex-col">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                        Prontuário de Atendimento
                        {isCompleted && (
                            <span className="inline-flex items-center gap-1 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                <CheckCircle2 className="h-3 w-3" /> Concluído
                            </span>
                        )}
                    </CardTitle>
                    <span className="text-xs text-gray-500">
                        Iniciado em {format(new Date(episode.started_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </span>
                </div>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 flex-1 overflow-y-auto">
        <div className="h-full flex flex-col space-y-2">
           <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Evolução Clínica / Anotações
              </Label>
              {isCompleted && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> Modo de edição reaberto
                  </span>
              )}
           </div>
           <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex-1 min-h-[300px] resize-none bg-yellow-50/30 border-gray-200 focus:border-blue-300 focus:ring-blue-100 text-base leading-relaxed p-4"
              placeholder="Digite aqui toda a evolução clínica, queixa principal, exame físico, hipóteses e conduta..."
            />
        </div>
      </CardContent>

      <CardFooter className="bg-gray-50/50 border-t border-gray-100 py-4 flex justify-end gap-3 flex-shrink-0">
            <Button 
                variant="outline" 
                onClick={handleSave} 
                disabled={isSaving}
                className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                Salvar e Sair
            </Button>
            <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/10" 
                onClick={handleConclude} 
                disabled={isSaving}
            >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {isCompleted ? 'Atualizar Conclusão' : 'Concluir Episódio'}
            </Button>
      </CardFooter>
    </Card>
  );
};

export default ClinicalEpisode;