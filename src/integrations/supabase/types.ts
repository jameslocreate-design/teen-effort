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
      bucket_list: {
        Row: {
          added_by: string
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          partner_link_id: string
          title: string
        }
        Insert: {
          added_by: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          partner_link_id: string
          title: string
        }
        Update: {
          added_by?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          partner_link_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_list_partner_link_id_fkey"
            columns: ["partner_link_id"]
            isOneToOne: false
            referencedRelation: "partner_links"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_entries: {
        Row: {
          added_by: string
          created_at: string
          date: string
          description: string | null
          duration: string | null
          estimated_cost: string | null
          id: string
          partner_link_id: string
          title: string
          vibe: string | null
        }
        Insert: {
          added_by: string
          created_at?: string
          date: string
          description?: string | null
          duration?: string | null
          estimated_cost?: string | null
          id?: string
          partner_link_id: string
          title: string
          vibe?: string | null
        }
        Update: {
          added_by?: string
          created_at?: string
          date?: string
          description?: string | null
          duration?: string | null
          estimated_cost?: string | null
          id?: string
          partner_link_id?: string
          title?: string
          vibe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_entries_partner_link_id_fkey"
            columns: ["partner_link_id"]
            isOneToOne: false
            referencedRelation: "partner_links"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_links: {
        Row: {
          created_at: string
          id: string
          status: string
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string
          gender: string | null
          id: string
          name: string
          partner_code: string | null
          updated_at: string
          user_id: string
          zipcode: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          gender?: string | null
          id?: string
          name?: string
          partner_code?: string | null
          updated_at?: string
          user_id: string
          zipcode?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string
          gender?: string | null
          id?: string
          name?: string
          partner_code?: string | null
          updated_at?: string
          user_id?: string
          zipcode?: string | null
        }
        Relationships: []
      }
      saved_gifts: {
        Row: {
          created_at: string
          description: string | null
          estimated_cost: string | null
          id: string
          personalization_tip: string | null
          title: string
          user_id: string
          vibe: string | null
          where_to_buy: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_cost?: string | null
          id?: string
          personalization_tip?: string | null
          title: string
          user_id: string
          vibe?: string | null
          where_to_buy?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_cost?: string | null
          id?: string
          personalization_tip?: string | null
          title?: string
          user_id?: string
          vibe?: string | null
          where_to_buy?: string | null
        }
        Relationships: []
      }
      special_events: {
        Row: {
          added_by: string
          created_at: string
          event_date: string
          event_type: string
          id: string
          partner_link_id: string
          recurring: boolean
          title: string
        }
        Insert: {
          added_by: string
          created_at?: string
          event_date: string
          event_type?: string
          id?: string
          partner_link_id: string
          recurring?: boolean
          title: string
        }
        Update: {
          added_by?: string
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          partner_link_id?: string
          recurring?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_events_partner_link_id_fkey"
            columns: ["partner_link_id"]
            isOneToOne: false
            referencedRelation: "partner_links"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_accepted_partner_link_id: {
        Args: { _user_id: string }
        Returns: string
      }
      get_partner_user_id: { Args: { _user_id: string }; Returns: string }
      lookup_user_by_partner_code: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
