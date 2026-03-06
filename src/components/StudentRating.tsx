import { useState, useEffect } from "react";
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
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleRate("like")}
        disabled={loading}
        className={`group flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
          currentRating === "like"
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-2 ring-green-300 dark:ring-green-700"
            : "bg-muted hover:bg-green-50 dark:hover:bg-green-950/20 text-muted-foreground hover:text-green-600 dark:hover:text-green-400"
        }`}
      >
        <ThumbsUp className={`w-4 h-4 transition-transform ${currentRating === "like" ? "scale-110" : "group-hover:scale-110"}`} />
        <span>Like</span>
      </button>
      <button
        onClick={() => handleRate("dislike")}
        disabled={loading}
        className={`group flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
          currentRating === "dislike"
            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-2 ring-red-300 dark:ring-red-700"
            : "bg-muted hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
        }`}
      >
        <ThumbsDown className={`w-4 h-4 transition-transform ${currentRating === "dislike" ? "scale-110" : "group-hover:scale-110"}`} />
        <span>Dislike</span>
      </button>
    </div>
  );
};
