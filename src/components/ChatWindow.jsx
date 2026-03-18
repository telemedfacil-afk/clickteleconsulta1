import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useAppointmentAccess } from '@/hooks/useAppointmentAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, AlertTriangle, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

const ChatWindow = ({ conversationId, patientId, doctorId, otherUserName, otherUserType }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Validate access control before allowing chat interaction
  const { hasAccess, loading: accessLoading } = useAppointmentAccess(patientId, doctorId);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(true);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Mark messages as read when opening/viewing
  const markMessagesAsRead = async (msgs) => {
    const unreadIds = msgs
      .filter(m => !m.is_read && m.sender_id !== user.id)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIds);
    }
  };

  // Initial fetch and Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    let channel;

    const setupChat = async () => {
      setFetchingMessages(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        const sortedMessages = data || [];
        setMessages(sortedMessages);
        
        markMessagesAsRead(sortedMessages);
        setTimeout(scrollToBottom, 200);

        channel = supabase
          .channel(`conversation:${conversationId}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `conversation_id=eq.${conversationId}` 
          }, async (payload) => {
            const newMsg = payload.new;
            
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            if (newMsg.sender_id !== user.id) {
               await supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
            }

            setTimeout(scrollToBottom, 100);
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          }, (payload) => {
             setMessages(prev => prev.map(msg => 
                msg.id === payload.new.id ? payload.new : msg
             ));
          })
          .subscribe();

      } catch (err) {
        console.error('Error fetching messages:', err);
        toast({
          variant: "destructive",
          title: "Erro ao carregar mensagens",
          description: "Não foi possível carregar o histórico."
        });
      } finally {
        setFetchingMessages(false);
      }
    };

    if (hasAccess) {
        setupChat();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [conversationId, hasAccess, user.id, toast]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !conversationId) return;

    const messageContent = newMessage.trim();
    setSending(true);
    
    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const tempMsg = {
          id: tempId,
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent,
          created_at: new Date().toISOString(),
          is_read: false
      };
      
      setMessages(prev => [...prev, tempMsg]);
      setNewMessage('');
      setTimeout(scrollToBottom, 50);

      // Insert message - database trigger will handle notification creation
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: otherUserType === 'medico' ? 'patient' : 'doctor',
          content: messageContent,
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => prev.map(m => m.id === tempId ? data : m));

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date() })
        .eq('id', conversationId);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: "Tente novamente."
      });
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-red-50 rounded-lg">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-700">Acesso Negado</h3>
        <p className="text-sm text-red-600 max-w-sm">
          Você só pode enviar mensagens para usuários com quem tem um agendamento confirmado ou realizado.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{otherUserName}</h3>
          <p className="text-xs text-gray-500 capitalize">{otherUserType === 'medico' ? 'Médico' : 'Paciente'}</p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 bg-gray-50/30">
        {fetchingMessages ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-sm">Inicie a conversa!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isMe = msg.sender_id === user.id;
              return (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex flex-col max-w-[80%]",
                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div 
                    className={cn(
                      "px-4 py-2 rounded-2xl text-sm shadow-sm relative",
                      isMe 
                        ? "bg-blue-600 text-white rounded-br-none" 
                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                    )}
                  >
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-1 mt-1 px-1">
                      <span className="text-[10px] text-gray-400">
                        {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                      {isMe && !msg.id.startsWith('temp-') && (
                        msg.is_read ? 
                          <CheckCheck className="w-3 h-3 text-blue-600" /> : 
                          <Check className="w-3 h-3 text-gray-400" />
                      )}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1"
          disabled={sending}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!newMessage.trim() || sending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
};

export default ChatWindow;