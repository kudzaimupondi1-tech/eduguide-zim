import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const StudentRating = () => {
  const [currentRating, setCurrentRating] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRating();
  }, []);

  const fetchRating = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("system_ratings")
      .select("rating_type")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setCurrentRating(data.rating_type);
  };

  const handleRate = async (type: "like" | "dislike") => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in to rate"); return; }

      const { error } = await supabase
        .from("system_ratings")
        .upsert({ user_id: user.id, rating_type: type }, { onConflict: "user_id" });

      if (error) throw error;
      setCurrentRating(type);
      toast.success(type === "like" ? "Thanks for the positive feedback! 🎉" : "Thanks for your feedback. We'll work to improve!");
    } catch (error: any) {
      toast.error("Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Rate this system:</span>
      <Button
        variant={currentRating === "like" ? "default" : "outline"}
        size="sm"
        onClick={() => handleRate("like")}
        disabled={loading}
        className={currentRating === "like" ? "bg-accent text-accent-foreground" : ""}
      >
        <ThumbsUp className="w-4 h-4 mr-1" />
        Like
      </Button>
      <Button
        variant={currentRating === "dislike" ? "default" : "outline"}
        size="sm"
        onClick={() => handleRate("dislike")}
        disabled={loading}
        className={currentRating === "dislike" ? "bg-destructive text-destructive-foreground" : ""}
      >
        <ThumbsDown className="w-4 h-4 mr-1" />
        Dislike
      </Button>
    </div>
  );
};
