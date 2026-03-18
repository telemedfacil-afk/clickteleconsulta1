import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, PlusCircle, Trash2, CalendarOff } from 'lucide-react';

const weekDays = [
    { id: '1', name: 'Seg' }, { id: '2', name: 'Ter' }, { id: '3', name: 'Qua' },
    { id: '4', name: 'Qui' }, { id: '5', name: 'Sex' }, { id: '6', name: 'Sáb' }, { id: '0', name: 'Dom' }
];

const defaultAgenda = {
    granularity: 10,
    "1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "0": [],
};

const QuickScheduleEditor = ({ doctorProfile, onSave }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const savedAgenda = doctorProfile.agenda_padrao || defaultAgenda;
    const formattedSchedule = weekDays.map(day => ({
        day: day.id,
        name: day.name,
        blocks: savedAgenda[day.id] || []
    }));
    
    const { register, control, handleSubmit, watch, setError, clearErrors, formState: { errors } } = useForm({
        defaultValues: {
            schedule: formattedSchedule
        }
    });

    const { fields, update } = useFieldArray({ control, name: "schedule" });
    const scheduleValues = watch("schedule");

    const validateBlocks = (schedule) => {
        let isValid = true;
        clearErrors();
        schedule.forEach((day, dayIndex) => {
            const sortedBlocks = [...(day.blocks || [])].filter(b => b.start && b.end).sort((a,b) => a.start.localeCompare(b.start));

            for (let i = 0; i < sortedBlocks.length; i++) {
                const currentBlock = sortedBlocks[i];
                if (currentBlock.start >= currentBlock.end) {
                    setError(`schedule.${dayIndex}.blocks.${i}.end`, { type: 'manual', message: 'Fim > Início' });
                    isValid = false;
                }
                if (i + 1 < sortedBlocks.length) {
                    const nextBlock = sortedBlocks[i+1];
                    if (currentBlock.end > nextBlock.start) {
                        setError(`schedule.${dayIndex}.blocks.${i+1}.start`, { type: 'manual', message: 'Sobreposição' });
                        isValid = false;
                    }
                }
            }
        });
        return isValid;
    }

    const onSubmit = async (formData) => {
        if (!validateBlocks(formData.schedule)) {
            toast({ variant: "destructive", title: "Erro de validação", description: "Verifique os blocos de horário." });
            return;
        }

        setIsSaving(true);
        const agendaToSave = {
            ...savedAgenda, // preserve granularity and other settings
            granularity: 10, // fixed for this editor
        };
        formData.schedule.forEach(day => {
            const sortedBlocks = (day.blocks || []).filter(b => b.start && b.end).sort((a,b) => a.start.localeCompare(b.start));
            agendaToSave[day.day] = sortedBlocks.map(b => ({start: b.start, end: b.end}));
        });

        try {
            const { error } = await supabase
                .from('medicos')
                .update({ agenda_padrao: agendaToSave })
                .eq('user_id', user.id);
            if (error) throw error;
            toast({ title: "Sucesso!", description: "Sua agenda foi atualizada." });
            if (onSave) onSave();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao salvar agenda", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const DaySchedule = ({ dayIndex }) => {
        const { fields, append, remove } = useFieldArray({
            control,
            name: `schedule.${dayIndex}.blocks`
        });

        return (
            <div className="space-y-4">
                {fields.map((item, k) => (
                    <div key={item.id} className="flex items-center gap-2">
                        <div className="flex-1">
                            <Input type="time" {...register(`schedule.${dayIndex}.blocks.${k}.start`)} className="w-full" />
                            {errors?.schedule?.[dayIndex]?.blocks?.[k]?.start && <p className="text-xs text-destructive mt-1">{errors.schedule[dayIndex].blocks[k].start.message}</p>}
                        </div>
                        <span>-</span>
                         <div className="flex-1">
                            <Input type="time" {...register(`schedule.${dayIndex}.blocks.${k}.end`)} className="w-full" />
                            {errors?.schedule?.[dayIndex]?.blocks?.[k]?.end && <p className="text-xs text-destructive mt-1">{errors.schedule[dayIndex].blocks[k].end.message}</p>}
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(k)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ start: '08:00', end: '12:00' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Bloco
                </Button>
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>Editor Rápido de Horários</CardTitle>
                    <CardDescription>Defina seus blocos de atendimento. A duração de cada consulta está fixada em 10 minutos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="1" className="w-full">
                        <TabsList className="grid w-full grid-cols-7">
                            {fields.map((field) => (
                                <TabsTrigger key={field.id} value={field.day}>{field.name}</TabsTrigger>
                            ))}
                        </TabsList>
                        {fields.map((field, index) => (
                            <TabsContent key={field.id} value={field.day} className="mt-4">
                                {(scheduleValues[index]?.blocks || []).length > 0 ? (
                                    <DaySchedule dayIndex={index} />
                                ) : (
                                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                                        <CalendarOff className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="mt-2 text-sm font-medium text-foreground">Dia inativo</h3>
                                        <div className="mt-6">
                                            <Button type="button" variant="outline" onClick={() => {
                                                const newSchedule = [...scheduleValues];
                                                if (!newSchedule[index].blocks) {
                                                    newSchedule[index].blocks = [];
                                                }
                                                newSchedule[index].blocks.push({ start: '08:00', end: '12:00' });
                                                update(index, newSchedule[index]);
                                            }}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Ativar dia
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar e Atualizar Horários'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
};

export default QuickScheduleEditor;