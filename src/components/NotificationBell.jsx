import React, { useState, useRef, useEffect } from 'react';
import { Bell, Loader2, Check, Clock, Trash2, Calendar, MessageCircle, Info } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';

const NotificationBell = () => {
  const { 
    unreadNotifications, 
    historyNotifications, 
    loading, 
    markAsRead, 
    markAllAsRead,
    clearHistory 
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'message': return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'appointment': return <Calendar className="h-5 w-5 text-green-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderNotificationItem = (notif, isHistory = false) => (
    <div 
      key={notif.id}
      className={cn(
        "p-4 hover:bg-gray-50 transition-colors relative group border-b border-gray-50 last:border-0",
        !isHistory ? "bg-white" : "bg-gray-50/50 opacity-75 hover:opacity-100"
      )}
    >
      <div className="flex gap-3 items-start">
        <div className="shrink-0 mt-1 p-2 bg-gray-100 rounded-full">
          {getIcon(notif.type)}
        </div>
        <div className="flex-1 min-w-0">
          <Link 
             to={notif.link || '#'} 
             onClick={() => {
                 if (!isHistory) markAsRead(notif.id);
                 setIsOpen(false);
             }}
             className="block"
          >
            <p className={cn("text-sm text-gray-900 leading-snug mb-1", !isHistory ? "font-semibold" : "font-medium")}>
              {notif.title}
            </p>
            <p className="text-sm text-gray-600 mb-1 line-clamp-2">
              {notif.message || notif.body}
            </p>
            <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-2">
              <Clock className="h-3 w-3" />
              {format(new Date(notif.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
            </p>
          </Link>
        </div>
        
        {!isHistory && (
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2">
             <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full"
                onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notif.id);
                }}
                title="Marcar como lida"
             >
                <Check className="h-4 w-4" />
             </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-gray-500 hover:text-primary hover:bg-gray-100 rounded-full w-10 h-10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadNotifications.length > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-white shadow-sm transform translate-x-1 -translate-y-1">
            {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
          <Tabs defaultValue="unread" className="w-full">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-900">Notificações</h3>
              <TabsList className="h-8 bg-gray-200/50">
                <TabsTrigger value="unread" className="h-6 text-xs px-2">Não lidas ({unreadNotifications.length})</TabsTrigger>
                <TabsTrigger value="history" className="h-6 text-xs px-2">Histórico</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="unread" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
                <div className="bg-white border-b border-gray-100 px-4 py-2 flex justify-end">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={markAllAsRead}
                        disabled={unreadNotifications.length === 0}
                    >
                        <Check className="h-3 w-3 mr-1" /> Marcar todas como lidas
                    </Button>
                </div>
                <ScrollArea className="h-[350px]">
                    {loading && unreadNotifications.length === 0 ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                    ) : unreadNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <Bell className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Tudo limpo!</p>
                        <p className="text-xs text-gray-500 mt-1">Você não tem novas notificações.</p>
                    </div>
                    ) : (
                    <div className="flex flex-col">
                        {unreadNotifications.map(n => renderNotificationItem(n, false))}
                    </div>
                    )}
                </ScrollArea>
            </TabsContent>

            <TabsContent value="history" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
                 <div className="bg-white border-b border-gray-100 px-4 py-2 flex justify-end">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-6 px-2 text-gray-500 hover:text-red-600 hover:bg-red-50"
                        onClick={clearHistory}
                        disabled={historyNotifications.length === 0}
                    >
                        <Trash2 className="h-3 w-3 mr-1" /> Limpar histórico
                    </Button>
                </div>
                <ScrollArea className="h-[350px]">
                     {historyNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <p className="text-sm">Histórico vazio.</p>
                        </div>
                     ) : (
                        <div className="flex flex-col bg-gray-50/30">
                            {historyNotifications.map(n => renderNotificationItem(n, true))}
                        </div>
                     )}
                </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;