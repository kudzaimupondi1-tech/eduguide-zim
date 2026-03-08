import { useState } from "react";
import { Send, MessageSquare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_WORDS = 20;

export const StudentQueryForm = ({ userId }: { userId: string }) => {
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const wordCount = query.trim() ? query.trim().split(/\s+/).length : 0;
  const isOverLimit = wordCount > MAX_WORDS;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    if (submitted) setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!query.trim() || isOverLimit) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("student_queries" as any).insert({
        user_id: userId,
        query_text: query.trim(),
      } as any);

      if (error) throw error;
      setQuery("");
      setSubmitted(true);
      toast.success("Query submitted successfully!");
    } catch (error) {
      console.error("Error submitting query:", error);
      toast.error("Failed to submit query. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border border-border shadow-sm rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Have a question?</h3>
            <p className="text-[11px] text-muted-foreground">Send a short query to the admin team (max 20 words)</p>
          </div>
        </div>

        {submitted ? (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">Query submitted! The admin will review it shortly.</p>
          </div>
        ) : (
          <>
            <Textarea
              placeholder="Type your question here..."
              value={query}
              onChange={handleChange}
              rows={2}
              className="resize-none rounded-xl text-sm mb-2"
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                {wordCount}/{MAX_WORDS} words
              </span>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!query.trim() || isOverLimit || submitting}
                className="rounded-xl gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? "Sending..." : "Submit"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
