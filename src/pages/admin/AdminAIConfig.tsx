import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, Sliders, Save, RefreshCw } from "lucide-react";

interface AIConfig {
  recommendation_weights: {
    grades: number;
    subject_match: number;
    interests: number;
  };
  combination_rules: {
    min_subjects: number;
    max_subjects: number;
    require_pass: boolean;
  };
  matching_threshold: {
    minimum_match: number;
    high_match: number;
  };
}

export default function AdminAIConfig() {
  const [config, setConfig] = useState<AIConfig>({
    recommendation_weights: { grades: 0.4, subject_match: 0.35, interests: 0.25 },
    combination_rules: { min_subjects: 3, max_subjects: 4, require_pass: true },
    matching_threshold: { minimum_match: 0.5, high_match: 0.8 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_config")
        .select("*");

      if (error) throw error;

      const configMap: Record<string, any> = {};
      data?.forEach((item: any) => {
        configMap[item.config_key] = item.config_value;
      });

      setConfig({
        recommendation_weights: configMap.recommendation_weights || config.recommendation_weights,
        combination_rules: configMap.combination_rules || config.combination_rules,
        matching_threshold: configMap.matching_threshold || config.matching_threshold,
      });
    } catch (error) {
      console.error("Error fetching AI config:", error);
      toast.error("Failed to load AI configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { config_key: "recommendation_weights", config_value: config.recommendation_weights },
        { config_key: "combination_rules", config_value: config.combination_rules },
        { config_key: "matching_threshold", config_value: config.matching_threshold },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("ai_config")
          .update({ config_value: update.config_value, updated_at: new Date().toISOString() })
          .eq("config_key", update.config_key);

        if (error) throw error;
      }

      toast.success("AI configuration saved successfully");
    } catch (error) {
      console.error("Error saving AI config:", error);
      toast.error("Failed to save AI configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const updateWeight = (key: keyof typeof config.recommendation_weights, value: number) => {
    const newWeights = { ...config.recommendation_weights, [key]: value };
    // Normalize weights to sum to 1
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    const normalized = Object.fromEntries(
      Object.entries(newWeights).map(([k, v]) => [k, Math.round((v / total) * 100) / 100])
    ) as typeof config.recommendation_weights;
    
    setConfig({ ...config, recommendation_weights: normalized });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">AI Configuration</h1>
            <p className="text-muted-foreground mt-1">
              Configure recommendation algorithms and matching rules
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recommendation Weights */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <CardTitle>Recommendation Weights</CardTitle>
              </div>
              <CardDescription>
                Adjust how different factors influence recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Grades Weight</Label>
                  <span className="text-sm font-medium text-primary">
                    {Math.round(config.recommendation_weights.grades * 100)}%
                  </span>
                </div>
                <Slider
                  value={[config.recommendation_weights.grades * 100]}
                  onValueChange={([v]) => updateWeight("grades", v / 100)}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Subject Match Weight</Label>
                  <span className="text-sm font-medium text-primary">
                    {Math.round(config.recommendation_weights.subject_match * 100)}%
                  </span>
                </div>
                <Slider
                  value={[config.recommendation_weights.subject_match * 100]}
                  onValueChange={([v]) => updateWeight("subject_match", v / 100)}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Interests Weight</Label>
                  <span className="text-sm font-medium text-primary">
                    {Math.round(config.recommendation_weights.interests * 100)}%
                  </span>
                </div>
                <Slider
                  value={[config.recommendation_weights.interests * 100]}
                  onValueChange={([v]) => updateWeight("interests", v / 100)}
                  max={100}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Matching Thresholds */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-secondary" />
                <CardTitle>Matching Thresholds</CardTitle>
              </div>
              <CardDescription>
                Set minimum and high match percentages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Minimum Match %</Label>
                  <span className="text-sm font-medium text-secondary">
                    {Math.round(config.matching_threshold.minimum_match * 100)}%
                  </span>
                </div>
                <Slider
                  value={[config.matching_threshold.minimum_match * 100]}
                  onValueChange={([v]) => setConfig({
                    ...config,
                    matching_threshold: { ...config.matching_threshold, minimum_match: v / 100 }
                  })}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Programs below this threshold won't be shown
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>High Match %</Label>
                  <span className="text-sm font-medium text-accent">
                    {Math.round(config.matching_threshold.high_match * 100)}%
                  </span>
                </div>
                <Slider
                  value={[config.matching_threshold.high_match * 100]}
                  onValueChange={([v]) => setConfig({
                    ...config,
                    matching_threshold: { ...config.matching_threshold, high_match: v / 100 }
                  })}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Programs above this are marked as "Best Match"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Combination Rules */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Subject Combination Rules</CardTitle>
              <CardDescription>
                Configure rules for A-Level subject combinations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Minimum Subjects</Label>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={config.combination_rules.min_subjects}
                    onChange={(e) => setConfig({
                      ...config,
                      combination_rules: { ...config.combination_rules, min_subjects: parseInt(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Maximum Subjects</Label>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={config.combination_rules.max_subjects}
                    onChange={(e) => setConfig({
                      ...config,
                      combination_rules: { ...config.combination_rules, max_subjects: parseInt(e.target.value) }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>Require Pass Grade</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only count subjects with passing grades
                    </p>
                  </div>
                  <Switch
                    checked={config.combination_rules.require_pass}
                    onCheckedChange={(checked) => setConfig({
                      ...config,
                      combination_rules: { ...config.combination_rules, require_pass: checked }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
