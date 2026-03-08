import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const StudentRating = () => {
  const [currentRating, setCurrentRating] = useState<"up" | "down" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRating();
  }, []);

  const normalizeRating = (value?: string | null): "up" | "down" | null => {
    if (!value) return null;
    if (["thumbs-up", "like", "up"].includes(value)) return "up";
    if (["thumbs-down", "dislike", "down"].includes(value)) return "down";
    return null;
  };

  const fetchRating = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("system_ratings")
      .select("rating_type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Fetch rating error:", error);
      return;
    }

    setCurrentRating(normalizeRating(data?.rating_type));
  };

  const handleRate = async (type: "up" | "down") => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to rate");
        return;
      }

      const ratingType = type === "up" ? "like" : "dislike";

      const { error } = await supabase
        .from("system_ratings")
        .upsert(
          {
            user_id: user.id,
            rating_type: ratingType,
            star_rating: type === "up" ? 10 : 1,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      setCurrentRating(type);
      toast.success(type === "up" ? "Thanks for the positive feedback! 🎉" : "Thanks for your feedback. We'll work to improve!");
    } catch (error: any) {
      console.error("Rating error:", error);
      toast.error(error?.message ? `Failed to submit rating: ${error.message}` : "Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleRate("up")}
        disabled={loading}
        className={`p-2 rounded-xl transition-all ${
          currentRating === "up"
            ? "bg-primary/15 text-primary scale-110"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        } disabled:opacity-50`}
      >
        <ThumbsUp className="w-5 h-5" />
      </button>
      <button
        onClick={() => handleRate("down")}
        disabled={loading}
        className={`p-2 rounded-xl transition-all ${
          currentRating === "down"
            ? "bg-destructive/15 text-destructive scale-110"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        } disabled:opacity-50`}
      >
        <ThumbsDown className="w-5 h-5" />
      </button>
    </div>
  );
};
