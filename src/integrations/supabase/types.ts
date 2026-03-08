export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      analytics_logs: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_published: boolean | null
          priority: string | null
          published_at: string | null
          target_audience: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          published_at?: string | null
          target_audience?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          published_at?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      careers: {
        Row: {
          created_at: string
          description: string | null
          field: string | null
          id: string
          is_active: boolean | null
          job_outlook: string | null
          name: string
          salary_range: string | null
          skills_required: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          field?: string | null
          id?: string
          is_active?: boolean | null
          job_outlook?: string | null
          name: string
          salary_range?: string | null
          skills_required?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          field?: string | null
          id?: string
          is_active?: boolean | null
          job_outlook?: string | null
          name?: string
          salary_range?: string | null
          skills_required?: string[] | null
        }
        Relationships: []
      }
      deadlines: {
        Row: {
          created_at: string
          deadline_date: string
          deadline_type: string
          description: string | null
          id: string
          is_active: boolean | null
          level: string | null
          title: string
          university_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline_date: string
          deadline_type?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          title: string
          university_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline_date?: string
          deadline_type?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          title?: string
          university_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      diplomas: {
        Row: {
          created_at: string
          description: string | null
          duration_years: number | null
          field: string | null
          id: string
          institution: string | null
          is_active: boolean
          level: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_years?: number | null
          field?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean
          level?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_years?: number | null
          field?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean
          level?: string
          name?: string
        }
        Relationships: []
      }
      favourite_programs: {
        Row: {
          created_at: string
          id: string
          match_percentage: number | null
          program_id: string
          program_name: string | null
          university_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_percentage?: number | null
          program_id: string
          program_name?: string | null
          university_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_percentage?: number | null
          program_id?: string
          program_name?: string | null
          university_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourite_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_structures: {
        Row: {
          created_at: string
          grades: Json
          id: string
          is_active: boolean | null
          level: string
          name: string
          pass_threshold: string | null
        }
        Insert: {
          created_at?: string
          grades?: Json
          id?: string
          is_active?: boolean | null
          level: string
          name: string
          pass_threshold?: string | null
        }
        Update: {
          created_at?: string
          grades?: Json
          id?: string
          is_active?: boolean | null
          level?: string
          name?: string
          pass_threshold?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_correlator: string
          created_at: string
          currency: string
          ecocash_reference: string | null
          id: string
          phone_number: string
          reference_code: string
          refund_notes: string | null
          refund_status: string | null
          refunded_at: string | null
          refunded_by: string | null
          status: string
          student_level: string | null
          transaction_data: Json | null
          university_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          client_correlator: string
          created_at?: string
          currency?: string
          ecocash_reference?: string | null
          id?: string
          phone_number: string
          reference_code: string
          refund_notes?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          status?: string
          student_level?: string | null
          transaction_data?: Json | null
          university_count: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_correlator?: string
          created_at?: string
          currency?: string
          ecocash_reference?: string | null
          id?: string
          phone_number?: string
          reference_code?: string
          refund_notes?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          status?: string
          student_level?: string | null
          transaction_data?: Json | null
          university_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_active_at: string | null
          phone: string | null
          recommendation_viewed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          phone?: string | null
          recommendation_viewed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          phone?: string | null
          recommendation_viewed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_careers: {
        Row: {
          career_id: string
          id: string
          program_id: string
        }
        Insert: {
          career_id: string
          id?: string
          program_id: string
        }
        Update: {
          career_id?: string
          id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_careers_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_careers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_diplomas: {
        Row: {
          diploma_id: string
          id: string
          is_required: boolean
          minimum_classification: string | null
          program_id: string
        }
        Insert: {
          diploma_id: string
          id?: string
          is_required?: boolean
          minimum_classification?: string | null
          program_id: string
        }
        Update: {
          diploma_id?: string
          id?: string
          is_required?: boolean
          minimum_classification?: string | null
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_diplomas_diploma_id_fkey"
            columns: ["diploma_id"]
            isOneToOne: false
            referencedRelation: "diplomas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_diplomas_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_subjects: {
        Row: {
          id: string
          is_required: boolean | null
          minimum_grade: string | null
          program_id: string
          subject_id: string
        }
        Insert: {
          id?: string
          is_required?: boolean | null
          minimum_grade?: string | null
          program_id: string
          subject_id: string
        }
        Update: {
          id?: string
          is_required?: boolean | null
          minimum_grade?: string | null
          program_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_subjects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          condition_logic: string | null
          created_at: string
          degree_type: string | null
          description: string | null
          duration_years: number | null
          entry_requirements: string | null
          entry_type: string | null
          faculty: string | null
          id: string
          is_active: boolean | null
          name: string
          structured_requirements: Json | null
          university_id: string
          updated_at: string
        }
        Insert: {
          condition_logic?: string | null
          created_at?: string
          degree_type?: string | null
          description?: string | null
          duration_years?: number | null
          entry_requirements?: string | null
          entry_type?: string | null
          faculty?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          structured_requirements?: Json | null
          university_id: string
          updated_at?: string
        }
        Update: {
          condition_logic?: string | null
          created_at?: string
          degree_type?: string | null
          description?: string | null
          duration_years?: number | null
          entry_requirements?: string | null
          entry_type?: string | null
          faculty?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          structured_requirements?: Json | null
          university_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          notification_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          notification_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      student_queries: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          is_read_by_student: boolean
          query_text: string
          responded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          is_read_by_student?: boolean
          query_text: string
          responded_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          is_read_by_student?: boolean
          query_text?: string
          responded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      student_subjects: {
        Row: {
          created_at: string
          grade: string | null
          id: string
          level: string
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grade?: string | null
          id?: string
          level: string
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          grade?: string | null
          id?: string
          level?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_combinations: {
        Row: {
          career_paths: string[] | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          level: string
          name: string
          subjects: Json
          updated_at: string
        }
        Insert: {
          career_paths?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: string
          name: string
          subjects?: Json
          updated_at?: string
        }
        Update: {
          career_paths?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: string
          name?: string
          subjects?: Json
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          category: string | null
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          level: string
          name: string
        }
        Insert: {
          category?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level: string
          name: string
        }
        Update: {
          category?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: string
          name?: string
        }
        Relationships: []
      }
      system_ratings: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          rating_type: string
          star_rating: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          rating_type: string
          star_rating?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          rating_type?: string
          star_rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      universities: {
        Row: {
          accreditation: string | null
          admission_requirements: Json | null
          contact_info: Json | null
          created_at: string
          description: string | null
          established_year: number | null
          faculties: Json | null
          id: string
          is_active: boolean | null
          location: string | null
          logo_url: string | null
          name: string
          programs_count: number | null
          short_name: string | null
          type: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          accreditation?: string | null
          admission_requirements?: Json | null
          contact_info?: Json | null
          created_at?: string
          description?: string | null
          established_year?: number | null
          faculties?: Json | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          logo_url?: string | null
          name: string
          programs_count?: number | null
          short_name?: string | null
          type?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          accreditation?: string | null
          admission_requirements?: Json | null
          contact_info?: Json | null
          created_at?: string
          description?: string | null
          established_year?: number | null
          faculties?: Json | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          logo_url?: string | null
          name?: string
          programs_count?: number | null
          short_name?: string | null
          type?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      university_images: {
        Row: {
          created_at: string
          extracted_info: Json | null
          id: string
          image_type: string | null
          image_url: string
          title: string | null
          university_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_info?: Json | null
          id?: string
          image_type?: string | null
          image_url: string
          title?: string | null
          university_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_info?: Json | null
          id?: string
          image_type?: string | null
          image_url?: string
          title?: string | null
          university_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_images_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student" | "counselor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student", "counselor"],
    },
  },
} as const
