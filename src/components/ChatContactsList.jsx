import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ChatContactsList = ({ onSelectContact, selectedContactId, userRole, currentDoctorId }) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchContacts = async () => {
    if (!user) return;
    
    try {
      let uniqueContacts = [];
      let appointments = [];
      let conversations = [];

      // 1. Fetch Conversations first (so we can show last message info)
      if (userRole === 'medico' && currentDoctorId) {
          const { data } = await supabase.from('conversations')
            .select(`
                id, last_message_at,
                patient:patient_id(id, full_name, email)
            `)
            .eq('doctor_id', currentDoctorId);
          conversations = data || [];
      } else {
          const { data } = await supabase.from('conversations')
            .select(`
                id, last_message_at,
                doctor:doctor_id(id, name, specialty, image_url, user_id)
            `)
            .eq('patient_id', user.id);
          conversations = data || [];
      }

      // 2. Fetch Appointments to find potential contacts not yet in conversations
      if (userRole === 'medico' && currentDoctorId) {
          const { data } = await supabase
            .from('agendamentos')
            .select(`
              patient_id,
              patient:patient_id (id, full_name, email, whatsapp)
            `)
            .eq('medico_id', currentDoctorId)
            .not('patient_id', 'is', null);
          appointments = data || [];
      } else {
          const { data } = await supabase
            .from('agendamentos')
            .select(`
              medico_id,
              medico:medico_id (id, name, specialty, image_url, user_id)
            `)
            .eq('patient_id', user.id);
          appointments = data || [];
      }

      // 3. Process and Merge
      const contactsMap = new Map();

      // Process existing conversations first
      conversations.forEach(conv => {
          let contactData = {};
          if (userRole === 'medico') {
              contactData = {
                  id: conv.patient?.id, // User UUID
                  name: conv.patient?.full_name,
                  email: conv.patient?.email,
                  type: 'paciente',
                  roleId: conv.patient?.id,
                  lastMessageAt: conv.last_message_at,
                  hasConversation: true
              };
          } else {
              contactData = {
                  id: conv.doctor?.user_id, // User UUID for socket/auth
                  name: conv.doctor?.name,
                  email: conv.doctor?.specialty, 
                  image: conv.doctor?.image_url,
                  type: 'medico',
                  roleId: conv.doctor?.id, // Doctor ID table
                  lastMessageAt: conv.last_message_at,
                  hasConversation: true
              };
          }
          if (contactData.id) contactsMap.set(contactData.id, contactData);
      });

      // Process appointments to add new contacts
      appointments.forEach(appt => {
          let id, contactData;
          if (userRole === 'medico') {
              if (appt.patient) {
                  id = appt.patient.id;
                  if (!contactsMap.has(id)) {
                      contactsMap.set(id, {
                          id: appt.patient.id,
                          name: appt.patient.full_name,
                          email: appt.patient.email,
                          type: 'paciente',
                          roleId: appt.patient.id,
                          hasConversation: false
                      });
                  }
              }
          } else {
              if (appt.medico) {
                  id = appt.medico.user_id; // Use user_id for uniqueness in map
                  if (!contactsMap.has(id)) {
                      contactsMap.set(id, {
                          id: appt.medico.user_id,
                          name: appt.medico.name,
                          email: appt.medico.specialty,
                          image: appt.medico.image_url,
                          type: 'medico',
                          roleId: appt.medico.id,
                          hasConversation: false
                      });
                  }
              }
          }
      });

      // Sort: Active conversations first (by date), then others
      uniqueContacts = Array.from(contactsMap.values()).sort((a, b) => {
          if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
          if (a.lastMessageAt) return -1;
          if (b.lastMessageAt) return 1;
          return a.name?.localeCompare(b.name);
      });

      setContacts(uniqueContacts);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();

    // Subscribe to conversations updates (last_message_at)
    const channel = supabase
      .channel('contacts-refresh')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, () => {
        fetchContacts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole, currentDoctorId]);

  const filteredContacts = contacts.filter(contact => 
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Mensagens</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar conversa..." 
            className="pl-9 bg-gray-50 border-0 focus-visible:ring-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredContacts.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            {searchTerm ? 'Nenhum contato encontrado.' : 'Nenhum contato disponível.'}
          </div>
        ) : (
          <div className="flex flex-col p-2 gap-1">
            {filteredContacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg text-left transition-all hover:bg-gray-50 w-full",
                  selectedContactId === contact.id ? "bg-blue-50 hover:bg-blue-50 border-l-4 border-blue-600 pl-2" : "border-l-4 border-transparent"
                )}
              >
                <Avatar className="h-10 w-10 border border-gray-100">
                  <AvatarImage src={contact.image} />
                  <AvatarFallback className={cn(selectedContactId === contact.id ? "bg-blue-200 text-blue-700" : "bg-gray-100")}>
                    {contact.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                      <p className={cn("font-medium truncate", selectedContactId === contact.id ? "text-blue-900" : "text-gray-900")}>
                        {contact.name}
                      </p>
                      {contact.lastMessageAt && (
                          <span className="text-[10px] text-gray-400">
                              {formatDistanceToNow(new Date(contact.lastMessageAt), { addSuffix: false, locale: ptBR })}
                          </span>
                      )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {contact.email}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ChatContactsList;