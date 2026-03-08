import { useState, useEffect, useRef } from "react";
import { Send, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_WORDS = 20;

interface Query {
  id: string;
  query_text: string;
  admin_response: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
}

export const StudentQueryChat = ({ userId, open, onClose, onRead }: { userId: string; open: boolean; onClose: () => void; onRead?: () => void }) => {
  const [queries, setQueries] = useState<Query[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0;
  const isOverLimit = wordCount > MAX_WORDS;

  useEffect(() => {
    if (open) {
      fetchQueries();
      // Clear badge when chat is opened
      onRead?.();
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [queries]);

  const fetchQueries = async () => {
    const { data } = await supabase
      .from("student_queries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    setQueries((data as any[]) || []);
  };

  const handleSend = async () => {
    if (!message.trim() || isOverLimit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("student_queries").insert({
        user_id: userId,
        query_text: message.trim(),
      } as any);
      if (error) throw error;
      setMessage("");
      fetchQueries();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 z-50 w-full sm:w-[360px] sm:max-w-[calc(100vw-2rem)] bg-card border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: "min(480px, 85vh)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <div>
            <p className="font-semibold text-sm">Admin Support</p>
            <p className="text-[10px] opacity-80">Ask a question (max 20 words)</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30">
        {queries.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No messages yet</p>
            <p className="text-xs mt-1">Send a question to the admin team</p>
          </div>
        )}
        {queries.map((q) => (
          <div key={q.id} className="space-y-2">
            {/* Student message - right aligned */}
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3.5 py-2.5">
                <p className="text-sm">{q.query_text}</p>
                <p className="text-[10px] opacity-70 mt-1 text-right">
                  {new Date(q.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            {/* Admin response - left aligned */}
            {q.admin_response && (
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-card border border-border rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <p className="text-[10px] font-medium text-primary mb-0.5">Admin</p>
                  <p className="text-sm text-foreground">{q.admin_response}</p>
                  {q.responded_at && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(q.responded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              placeholder="Type your question..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="resize-none rounded-xl text-sm min-h-[40px] max-h-[80px]"
            />
            <span className={`text-[10px] mt-0.5 block ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {wordCount}/{MAX_WORDS}
            </span>
          </div>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || isOverLimit || submitting}
            className="h-10 w-10 rounded-xl flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
