import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const TermsModal = ({ isOpen, onClose, content, title }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-xl shadow-2xl">
                <DialogHeader className="p-6 pb-2 bg-white border-b border-gray-100">
                    <DialogTitle className="text-xl font-bold text-gray-900">{title || "Termos e Condições"}</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-hidden bg-gray-50/50">
                    <ScrollArea className="h-full max-h-[600px] p-6">
                        <div className="prose prose-sm prose-blue max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {content || "Carregando termos..."}
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="p-4 bg-white border-t border-gray-100">
                    <Button onClick={onClose} className="w-full sm:w-auto bg-gray-900 text-white hover:bg-gray-800">
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TermsModal;