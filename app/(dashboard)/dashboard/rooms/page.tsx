"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/supabase/client";
import { Send, Users, Hash, Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = { 
  id: string; 
  room_id: string; 
  content: string; 
  created_at: string; 
  author_email: string;
  isPending?: boolean;
};
type Room = { id: string; name: string; topic: string };
type Profile = { email: string; full_name: string; username: string };

export default function RoomsPage() {
  const supabase = createClient();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [typing, setTyping] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const roomChannelRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to handle incoming realtime messages
  const handleIncomingMessage = (payload: any) => {
    const newMessage = payload.new as Message;
    setMessages((currentMessages) => {
      // Check if this message (by real ID) already exists
      if (currentMessages.some(m => m.id === newMessage.id)) {
        return currentMessages;
      }

      // Filter out any matching optimistic message
      const filtered = currentMessages.filter(m => 
        !(m.isPending && 
          m.author_email === newMessage.author_email && 
          m.content === newMessage.content)
      );

      return [...filtered, newMessage];
    });
    
    // Auto-scroll on new message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const activeRoom = useMemo(() => rooms.find((room) => room.id === activeRoomId), [rooms, activeRoomId]);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setCurrentUserEmail(user.email);

      // Fetch profiles to map emails to names (ignores error if table doesn't exist yet)
      const { data: profilesData } = await supabase.from("profiles").select("email, full_name, username");
      if (profilesData) {
        const map: Record<string, Profile> = {};
        profilesData.forEach((p: any) => {
          if (p.email) map[p.email] = p;
        });
        setProfiles(map);
      }

      const { data, error } = await supabase.from("study_rooms").select("id,name,topic").order("created_at");
      if (error) {
        toast.error(error.message);
        return;
      }
      setRooms((data || []) as Room[]);
      if (data?.[0]) setActiveRoomId(data[0].id);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!activeRoomId) return;
    void (async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("room_id", activeRoomId).order("created_at");
      if (error) {
        toast.error(error.message);
        return;
      }
      setMessages((data || []) as Message[]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    })();

    const channel = supabase
      .channel(`chat:${activeRoomId}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "messages", 
          filter: `room_id=eq.${activeRoomId}` 
        },
        handleIncomingMessage
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        setTyping(Boolean(payload?.typing));
        setTimeout(() => setTyping(false), 3000);
      })
      .subscribe();
      
    roomChannelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, activeRoomId, currentUserEmail]);

  async function sendMessage(formData: FormData) {
    if (!activeRoomId) return;
    const content = String(formData.get("content") || "").trim();
    if (!content) return;

    // Reset input immediately for snappy UX
    const form = document.getElementById('chat-form') as HTMLFormElement;
    if (form) form.reset();

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      room_id: activeRoomId,
      content,
      author_email: currentUserEmail || "anonymous",
      created_at: new Date().toISOString(),
      isPending: true,
    };

    // Update UI optimistically
    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const { error } = await supabase.from("messages").insert({
      room_id: activeRoomId,
      content,
      author_email: currentUserEmail || "anonymous",
    });

    if (error) {
      toast.error("Failed to send message: " + error.message);
      // Remove the optimistic message if it failed
      setMessages((prev) => prev.filter(m => m.id !== optimisticMessage.id));
      return;
    }
  }

  async function createRoom(formData: FormData) {
    const name = String(formData.get("name") || "");
    const topic = String(formData.get("topic") || "");
    const { data, error } = await supabase.from("study_rooms").insert({ name, topic }).select("id,name,topic").single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setRooms((old) => [...old, data as Room]);
    setActiveRoomId(data.id);
    setIsCreating(false);
    toast.success("Room created!");
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 animate-fade-in">
      {/* Sidebar: Rooms List */}
      <section className="glass rounded-3xl w-full md:w-[320px] shrink-0 flex flex-col overflow-hidden shadow-sm">
        <div className="p-5 flex items-center justify-between border-b border-border/40 bg-card/30">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Study Rooms
          </h2>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all hover:scale-105 active:scale-95"
            title="Create Room"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {isCreating && (
          <form action={createRoom} className="p-4 border-b border-border/40 bg-muted/20 space-y-3 animate-in slide-in-from-top-2">
            <input name="name" required placeholder="Room name" className="w-full rounded-xl border border-border/50 bg-background/80 px-3 py-2.5 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all" />
            <input name="topic" required placeholder="Topic" className="w-full rounded-xl border border-border/50 bg-background/80 px-3 py-2.5 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all" />
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setIsCreating(false)} className="flex-1 rounded-xl border border-border/50 py-2.5 text-xs font-medium hover:bg-muted transition-colors">Cancel</button>
              <button className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-medium text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all">Create</button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {rooms.map((room) => (
            <button 
              key={room.id} 
              onClick={() => setActiveRoomId(room.id)} 
              className={cn(
                "w-full rounded-2xl p-3.5 text-left transition-all group flex flex-col gap-1.5 border",
                activeRoomId === room.id 
                  ? "bg-primary text-primary-foreground border-transparent shadow-md shadow-primary/20" 
                  : "bg-transparent border-transparent hover:bg-muted/60 hover:border-border/50"
              )}
            >
              <div className="flex items-center gap-2 font-medium">
                <Hash className={cn("h-4 w-4 shrink-0 transition-colors", activeRoomId === room.id ? "text-primary-foreground/80" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="truncate">{room.name}</span>
              </div>
              <p className={cn(
                "text-xs truncate ml-6 transition-colors",
                activeRoomId === room.id ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {room.topic}
              </p>
            </button>
          ))}
          {rooms.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No rooms available.<br/>Create one to get started.
            </div>
          )}
        </div>
      </section>

      {/* Main Area: Chat */}
      <section className="glass rounded-3xl flex-1 flex flex-col overflow-hidden relative shadow-sm">
        {activeRoom ? (
          <>
            <div className="px-6 py-5 border-b border-border/40 flex flex-col bg-card/40 backdrop-blur-xl z-10 shadow-sm">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary" /> {activeRoom.name}
              </h3>
              <p className="text-sm text-muted-foreground ml-7">{activeRoom.topic}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-background/30 to-background/5">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-500">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-primary/60" />
                  </div>
                  <p className="font-medium text-foreground">No messages yet</p>
                  <p className="text-sm mt-1">Be the first to break the ice!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.author_email === currentUserEmail;
                  const showHeader = i === 0 || messages[i - 1].author_email !== msg.author_email;
                  const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  const authorProfile = profiles[msg.author_email];
                  const displayName = isMe 
                    ? "You" 
                    : (authorProfile?.full_name || authorProfile?.username || "Student");
                  
                  return (
                    <div key={msg.id} className={cn(
                      "flex flex-col max-w-[85%] md:max-w-[70%] group transition-all duration-300", 
                      isMe ? "ml-auto items-end" : "mr-auto items-start",
                      msg.isPending && "opacity-70"
                    )}>
                      {showHeader && (
                        <div className={cn("flex items-baseline gap-2 mb-1.5", isMe ? "mr-1" : "ml-1")}>
                          <span className={cn("text-[11px] font-bold tracking-tight uppercase", isMe ? "text-primary/70" : "text-muted-foreground/80")}>
                            {displayName}
                          </span>
                          <span className="text-[10px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">{timeStr}</span>
                        </div>
                      )}
                      <div className="relative flex items-end gap-2">
                        <div className={cn(
                          "px-4 py-3 text-[14px] leading-relaxed shadow-sm transition-all duration-300",
                          isMe 
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none shadow-primary/10 hover:shadow-primary/20" 
                            : "bg-background border border-border/60 text-foreground rounded-2xl rounded-tl-none hover:border-border",
                          msg.isPending && "italic"
                        )}>
                          {msg.content}
                          {msg.isPending && (
                            <span className="ml-2 inline-block animate-pulse">...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {typing && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse ml-2 bg-muted/30 w-fit px-3 py-2 rounded-full border border-border/20">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                  Someone is typing...
                </div>
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            <div className="p-4 bg-card/60 backdrop-blur-xl border-t border-border/40 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
              <form id="chat-form" action={sendMessage} className="relative flex items-center">
                <input
                  name="content"
                  autoComplete="off"
                  onChange={async () => {
                    if (!roomChannelRef.current) return;
                    await roomChannelRef.current.send({ type: "broadcast", event: "typing", payload: { typing: true } });
                  }}
                  placeholder={`Message #${activeRoom.name}`}
                  className="w-full rounded-2xl border border-border/60 bg-background/80 py-3.5 pl-5 pr-14 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground shadow-sm hover:border-border"
                />
                <button className="absolute right-2 p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-sm">
                  <Send className="h-4 w-4 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-b from-background/30 to-background/5">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6 border border-border/50 shadow-sm">
              <Hash className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">Select a study room</p>
            <p className="text-sm">Choose a room from the sidebar to start collaborating</p>
          </div>
        )}
      </section>
    </div>
  );
}
