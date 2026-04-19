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
      appreciation_prompts: {
        Row: {
          created_at: string
          id: string
          partner_link_id: string
          prompt_text: string
          response_text: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          partner_link_id: string
          prompt_text: string
          response_text: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          partner_link_id?: string
          prompt_text?: string
          response_text?: string
          sender_id?: string
        }
        Relationships: []
      }
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
          event_time: string | null
          id: string
          is_favorite: boolean
          latitude: number | null
          longitude: number | null
          partner_link_id: string
          photo_urls: string[] | null
          title: string
          user_rating: number | null
          vibe: string | null
          yelp_rating: number | null
          yelp_review_count: number | null
          yelp_url: string | null
        }
        Insert: {
          added_by: string
          created_at?: string
          date: string
          description?: string | null
          duration?: string | null
          estimated_cost?: string | null
          event_time?: string | null
          id?: string
          is_favorite?: boolean
          latitude?: number | null
          longitude?: number | null
          partner_link_id: string
          photo_urls?: string[] | null
          title: string
          user_rating?: number | null
          vibe?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
          yelp_url?: string | null
        }
        Update: {
          added_by?: string
          created_at?: string
          date?: string
          description?: string | null
          duration?: string | null
          estimated_cost?: string | null
          event_time?: string | null
          id?: string
          is_favorite?: boolean
          latitude?: number | null
          longitude?: number | null
          partner_link_id?: string
          photo_urls?: string[] | null
          title?: string
          user_rating?: number | null
          vibe?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
          yelp_url?: string | null
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
      date_reviews: {
        Row: {
          cost_range: string | null
          created_at: string
          date_type: string | null
          id: string
          location: string | null
          rating: number
          review_text: string | null
          user_id: string
          venue_name: string
          venue_type: string | null
          would_recommend: boolean | null
        }
        Insert: {
          cost_range?: string | null
          created_at?: string
          date_type?: string | null
          id?: string
          location?: string | null
          rating: number
          review_text?: string | null
          user_id: string
          venue_name: string
          venue_type?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          cost_range?: string | null
          created_at?: string
          date_type?: string | null
          id?: string
          location?: string | null
          rating?: number
          review_text?: string | null
          user_id?: string
          venue_name?: string
          venue_type?: string | null
          would_recommend?: boolean | null
        }
        Relationships: []
      }
      date_votes: {
        Row: {
          created_at: string
          id: string
          idea_data: Json
          idea_hash: string
          partner_link_id: string
          user_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_data: Json
          idea_hash: string
          partner_link_id: string
          user_id: string
          vote: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_data?: Json
          idea_hash?: string
          partner_link_id?: string
          user_id?: string
          vote?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expert_posts: {
        Row: {
          anonymous_name: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          anonymous_name?: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          anonymous_name?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      expert_replies: {
        Row: {
          anonymous_name: string
          content: string
          created_at: string
          id: string
          is_ai: boolean
          post_id: string
          user_id: string | null
        }
        Insert: {
          anonymous_name?: string
          content: string
          created_at?: string
          id?: string
          is_ai?: boolean
          post_id: string
          user_id?: string | null
        }
        Update: {
          anonymous_name?: string
          content?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expert_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "expert_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "expert_posts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      love_letters: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          partner_link_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          partner_link_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          partner_link_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "love_letters_partner_link_id_fkey"
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
          avatar_url: string | null
          birthday: string | null
          created_at: string
          deactivated_at: string | null
          descriptors: string[] | null
          gender: string | null
          id: string
          love_language: string | null
          name: string
          partner_code: string | null
          referral_code: string | null
          updated_at: string
          user_id: string
          zipcode: string | null
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          deactivated_at?: string | null
          descriptors?: string[] | null
          gender?: string | null
          id?: string
          love_language?: string | null
          name?: string
          partner_code?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id: string
          zipcode?: string | null
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          deactivated_at?: string | null
          descriptors?: string[] | null
          gender?: string | null
          id?: string
          love_language?: string | null
          name?: string
          partner_code?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id?: string
          zipcode?: string | null
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          answers: Json
          created_at: string
          id: string
          partner_link_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          partner_link_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          partner_link_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_partner_link_id_fkey"
            columns: ["partner_link_id"]
            isOneToOne: false
            referencedRelation: "partner_links"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      roulette_date_ideas: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          estimated_cost: string | null
          id: string
          title: string
          user_id: string
          vibe: string | null
          yelp_rating: number | null
          yelp_review_count: number | null
          yelp_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          estimated_cost?: string | null
          id?: string
          title: string
          user_id: string
          vibe?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
          yelp_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          estimated_cost?: string | null
          id?: string
          title?: string
          user_id?: string
          vibe?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
          yelp_url?: string | null
        }
        Relationships: []
      }
      saved_date_ideas: {
        Row: {
          created_at: string
          description: string | null
          distance_miles: string | null
          duration: string | null
          estimated_cost: string | null
          id: string
          title: string
          user_id: string
          vibe: string | null
          yelp_rating: number | null
          yelp_review_count: number | null
          yelp_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          distance_miles?: string | null
          duration?: string | null
          estimated_cost?: string | null
          id?: string
          title: string
          user_id: string
          vibe?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
          yelp_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          distance_miles?: string | null
          duration?: string | null
          estimated_cost?: string | null
          id?: string
          title?: string
          user_id?: string
          vibe?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
          yelp_url?: string | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vision_board_pins: {
        Row: {
          added_by: string
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          partner_link_id: string
          title: string
        }
        Insert: {
          added_by: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          partner_link_id: string
          title: string
        }
        Update: {
          added_by?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          partner_link_id?: string
          title?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          partner_link_id: string
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          partner_link_id: string
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          partner_link_id?: string
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_partner_link_id_fkey"
            columns: ["partner_link_id"]
            isOneToOne: false
            referencedRelation: "partner_links"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      expert_posts_public: {
        Row: {
          anonymous_name: string | null
          content: string | null
          created_at: string | null
          id: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_name?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          user_id?: never
        }
        Update: {
          anonymous_name?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          user_id?: never
        }
        Relationships: []
      }
    }
    Functions: {
      admin_export_table: { Args: { _table_name: string }; Returns: Json }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_accepted_partner_link_id: {
        Args: { _user_id: string }
        Returns: string
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_partner_user_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_user_by_partner_code: { Args: { _code: string }; Returns: string }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
