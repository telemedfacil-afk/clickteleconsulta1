import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import ChatContactsList from '@/components/ChatContactsList';
import ChatWindow from '@/components/ChatWindow';
import { Loader2, MessageSquare } from 'lucide-react';

const MessagesPageWrapper = () => {
    const { user, profile } = useAuth();
    const [currentDoctorId, setCurrentDoctorId] = useState(null);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        if (profile?.role === 'medico' && user?.id) {
            supabase.from('medicos').select('id').eq('user_id', user.id).single()
                .then(({ data }) => {
                    if (data) setCurrentDoctorId(data.id);
                    setInitializing(false);
                });
        } else {
            setInitializing(false);
        }
    }, [profile, user]);

    if (initializing) {
         return <div className="flex justify-center p-10 h-screen items-center"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    }

    return <MessagesPageInternal currentDoctorId={currentDoctorId} />;
};

const MessagesPageInternal = ({ currentDoctorId }) => {
    const { user, profile } = useAuth();
    const [selectedContact, setSelectedContact] = useState(null);
    const [conversationId, setConversationId] = useState(null);
    const [loadingConversation, setLoadingConversation] = useState(false);
    
    const userRole = profile?.role;
  
    const handleSelectContact = async (contact) => {
        setSelectedContact(contact);
        setLoadingConversation(true);
        setConversationId(null);

        try {
            let patientId, doctorId;

            if (userRole === 'medico') {
                doctorId = currentDoctorId;
                patientId = contact.id; 
            } else {
                patientId = user.id;
                doctorId = contact.roleId; 
            }
            
            if (!patientId || !doctorId) {
                console.error("Missing IDs for conversation");
                setLoadingConversation(false);
                return;
            }

            const { data: existingConv } = await supabase
                .from('conversations')
                .select('id')
                .eq('patient_id', patientId)
                .eq('doctor_id', doctorId)
                .maybeSingle();

            if (existingConv) {
                setConversationId(existingConv.id);
            } else {
                const { data: newConv, error } = await supabase
                    .from('conversations')
                    .insert({ patient_id: patientId, doctor_id: doctorId })
                    .select('id')
                    .single();
                
                if (error) throw error;
                setConversationId(newConv.id);
            }
        } catch (err) {
            console.error("Error creating/fetching conversation", err);
        } finally {
            setLoadingConversation(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`w-full md:w-80 border-r border-gray-200 h-full ${selectedContact ? 'hidden md:block' : 'block'}`}>
                <ChatContactsList 
                    onSelectContact={handleSelectContact}
                    selectedContactId={selectedContact?.id}
                    userRole={userRole}
                    currentDoctorId={currentDoctorId}
                />
            </div>
            <div className={`flex-1 flex-col h-full bg-gray-50/30 relative ${selectedContact ? 'flex' : 'hidden md:flex'}`}>
                {selectedContact ? (
                     loadingConversation ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                            <p className="text-gray-500 text-sm">Carregando conversa...</p>
                        </div>
                     ) : (
                         <div className="flex flex-col h-full">
                             <div className="md:hidden p-2 bg-white border-b flex items-center">
                                 <button onClick={() => setSelectedContact(null)} className="text-sm text-blue-600 font-medium px-2">
                                     &larr; Voltar
                                 </button>
                             </div>
                             <ChatWindow 
                                conversationId={conversationId}
                                patientId={userRole === 'medico' ? selectedContact.id : user.id}
                                doctorId={userRole === 'medico' ? currentDoctorId : selectedContact.roleId}
                                otherUserName={selectedContact.name}
                                otherUserType={selectedContact.type}
                            />
                         </div>
                     )
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                        <p>Selecione um contato para conversar</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesPageWrapper;