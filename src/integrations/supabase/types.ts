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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_clients: {
        Row: {
          billing_cycle_start: string
          company_name: string
          contact_email: string
          created_at: string
          id: string
          plan_tier: Database["public"]["Enums"]["api_plan_tier"]
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle_start?: string
          company_name: string
          contact_email: string
          created_at?: string
          id?: string
          plan_tier?: Database["public"]["Enums"]["api_plan_tier"]
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle_start?: string
          company_name?: string
          contact_email?: string
          created_at?: string
          id?: string
          plan_tier?: Database["public"]["Enums"]["api_plan_tier"]
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      api_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          monthly_scan_limit: number
          name: string
          overage_price_cents: number
          price_cents: number
          rate_limit_per_minute: number
          tier: Database["public"]["Enums"]["api_plan_tier"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          monthly_scan_limit: number
          name: string
          overage_price_cents?: number
          price_cents: number
          rate_limit_per_minute?: number
          tier: Database["public"]["Enums"]["api_plan_tier"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          monthly_scan_limit?: number
          name?: string
          overage_price_cents?: number
          price_cents?: number
          rate_limit_per_minute?: number
          tier?: Database["public"]["Enums"]["api_plan_tier"]
        }
        Relationships: []
      }
      api_rate_limit_windows: {
        Row: {
          api_key_id: string
          created_at: string
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          api_key_id: string
          created_at?: string
          id?: string
          request_count?: number
          window_start: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limit_windows_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_rate_limit_windows_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          api_key_id: string
          billed: boolean
          billed_at: string | null
          billing_period: string
          client_id: string
          created_at: string
          id: string
          overage_count: number
          scan_count: number
          stripe_invoice_item_id: string | null
          updated_at: string
        }
        Insert: {
          api_key_id: string
          billed?: boolean
          billed_at?: string | null
          billing_period?: string
          client_id: string
          created_at?: string
          id?: string
          overage_count?: number
          scan_count?: number
          stripe_invoice_item_id?: string | null
          updated_at?: string
        }
        Update: {
          api_key_id?: string
          billed?: boolean
          billed_at?: string | null
          billing_period?: string
          client_id?: string
          created_at?: string
          id?: string
          overage_count?: number
          scan_count?: number
          stripe_invoice_item_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      autoseo_posts: {
        Row: {
          autoseo_id: number
          content_html: string | null
          content_markdown: string | null
          created_at: string
          faq_schema: Json | null
          hero_image_alt: string | null
          hero_image_source_url: string | null
          hero_image_url: string | null
          id: string
          infographic_image_source_url: string | null
          infographic_image_url: string | null
          keywords: Json
          language_code: string
          meta_description: string | null
          meta_keywords: string | null
          published_at: string | null
          slug: string
          source_article_id: number | null
          source_created_at: string | null
          source_updated_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          autoseo_id: number
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string
          faq_schema?: Json | null
          hero_image_alt?: string | null
          hero_image_source_url?: string | null
          hero_image_url?: string | null
          id?: string
          infographic_image_source_url?: string | null
          infographic_image_url?: string | null
          keywords?: Json
          language_code?: string
          meta_description?: string | null
          meta_keywords?: string | null
          published_at?: string | null
          slug: string
          source_article_id?: number | null
          source_created_at?: string | null
          source_updated_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          autoseo_id?: number
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string
          faq_schema?: Json | null
          hero_image_alt?: string | null
          hero_image_source_url?: string | null
          hero_image_url?: string | null
          id?: string
          infographic_image_source_url?: string | null
          infographic_image_url?: string | null
          keywords?: Json
          language_code?: string
          meta_description?: string | null
          meta_keywords?: string | null
          published_at?: string | null
          slug?: string
          source_article_id?: number | null
          source_created_at?: string | null
          source_updated_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      free_scan_usage: {
        Row: {
          identifier: string
          scan_count: number
          scan_date: string
          updated_at: string
        }
        Insert: {
          identifier: string
          scan_count?: number
          scan_date?: string
          updated_at?: string
        }
        Update: {
          identifier?: string
          scan_count?: number
          scan_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      ocr_analytics: {
        Row: {
          addresses_found: number
          addresses_validated: number
          cer: number | null
          char_count: number | null
          confidence: number | null
          created_at: string
          error_message: string | null
          error_type: string | null
          exact_match: boolean | null
          extracted_address: string | null
          fix_applied: boolean
          ground_truth_address: string | null
          id: string
          image_size_bytes: number | null
          method: string
          processing_time_ms: number
          raw_text_length: number | null
          tesseract_attempted: boolean
          tesseract_succeeded: boolean
          vlm_attempted: boolean
          vlm_succeeded: boolean
          wer: number | null
        }
        Insert: {
          addresses_found?: number
          addresses_validated?: number
          cer?: number | null
          char_count?: number | null
          confidence?: number | null
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          exact_match?: boolean | null
          extracted_address?: string | null
          fix_applied?: boolean
          ground_truth_address?: string | null
          id?: string
          image_size_bytes?: number | null
          method: string
          processing_time_ms?: number
          raw_text_length?: number | null
          tesseract_attempted?: boolean
          tesseract_succeeded?: boolean
          vlm_attempted?: boolean
          vlm_succeeded?: boolean
          wer?: number | null
        }
        Update: {
          addresses_found?: number
          addresses_validated?: number
          cer?: number | null
          char_count?: number | null
          confidence?: number | null
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          exact_match?: boolean | null
          extracted_address?: string | null
          fix_applied?: boolean
          ground_truth_address?: string | null
          id?: string
          image_size_bytes?: number | null
          method?: string
          processing_time_ms?: number
          raw_text_length?: number | null
          tesseract_attempted?: boolean
          tesseract_succeeded?: boolean
          vlm_attempted?: boolean
          vlm_succeeded?: boolean
          wer?: number | null
        }
        Relationships: []
      }
      partnerships: {
        Row: {
          clicks: number | null
          conversions: number | null
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          partner_name: string
          partnership_type: string
          payout_terms: string | null
          placement: string | null
          revenue_usd: number | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          partner_name: string
          partnership_type: string
          payout_terms?: string | null
          placement?: string | null
          revenue_usd?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          partner_name?: string
          partnership_type?: string
          payout_terms?: string | null
          placement?: string | null
          revenue_usd?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      passkey_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          purpose: string
          user_id: string
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          purpose: string
          user_id: string
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          purpose?: string
          user_id?: string
        }
        Relationships: []
      }
      passkey_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_type: string | null
          id: string
          last_used_at: string | null
          public_key: string
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_orders: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          expires_at: string
          id: string
          invoice_payload: string
          status: string
          telegram_user_id: number
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          invoice_payload: string
          status?: string
          telegram_user_id: number
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          invoice_payload?: string
          status?: string
          telegram_user_id?: number
        }
        Relationships: []
      }
      premium_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          provider_payment_charge_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          telegram_payment_charge_id: string | null
          telegram_user_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider_payment_charge_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          telegram_payment_charge_id?: string | null
          telegram_user_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider_payment_charge_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          telegram_payment_charge_id?: string | null
          telegram_user_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      scan_limits: {
        Row: {
          scan_count: number
          scan_count_reset_at: string
          subscription_tier: string
          user_id: string
        }
        Insert: {
          scan_count?: number
          scan_count_reset_at?: string
          subscription_tier?: string
          user_id: string
        }
        Update: {
          scan_count?: number
          scan_count_reset_at?: string
          subscription_tier?: string
          user_id?: string
        }
        Relationships: []
      }
      scan_usage: {
        Row: {
          created_at: string
          id: string
          scan_count: number
          scan_date: string
          telegram_user_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          scan_count?: number
          scan_date?: string
          telegram_user_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          scan_count?: number
          scan_date?: string
          telegram_user_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      seo_snapshots: {
        Row: {
          avg_position: number | null
          clicks: number | null
          created_at: string
          ctr: number | null
          id: string
          impressions: number | null
          indexed_pages: number | null
          notes: string | null
          snapshot_date: string
          top_query: string | null
          total_sitemap_pages: number | null
        }
        Insert: {
          avg_position?: number | null
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          indexed_pages?: number | null
          notes?: string | null
          snapshot_date: string
          top_query?: string | null
          total_sitemap_pages?: number | null
        }
        Update: {
          avg_position?: number | null
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          indexed_pages?: number | null
          notes?: string | null
          snapshot_date?: string
          top_query?: string | null
          total_sitemap_pages?: number | null
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      watchlist_tokens: {
        Row: {
          added_at: string
          address: string
          id: string
          name: string
          network: string
          risk_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          added_at?: string
          address: string
          id?: string
          name: string
          network: string
          risk_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          added_at?: string
          address?: string
          id?: string
          name?: string
          network?: string
          risk_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whale_subscriptions: {
        Row: {
          created_at: string
          id: number
          status: string | null
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          status?: string | null
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          status?: string | null
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      api_keys_safe: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          key_prefix: string | null
          last_used_at: string | null
          name: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          key_prefix?: string | null
          last_used_at?: string | null
          name?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          key_prefix?: string | null
          last_used_at?: string | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_and_increment_free_scan: {
        Args: { p_daily_limit?: number; p_identifier: string }
        Returns: {
          allowed: boolean
          remaining: number
        }[]
      }
      check_and_increment_scan: {
        Args: { p_free_limit?: number; p_user_id: string }
        Returns: {
          allowed: boolean
          is_pro: boolean
          remaining: number
        }[]
      }
      get_remaining_free_scans: {
        Args: { p_daily_limit?: number; p_identifier: string }
        Returns: {
          remaining: number
        }[]
      }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_api_rate_limit: {
        Args: { p_api_key_id: string; p_window_start: string }
        Returns: number
      }
    }
    Enums: {
      api_plan_tier: "starter" | "growth" | "enterprise"
      app_role: "admin" | "user"
      subscription_status: "active" | "expired" | "cancelled" | "pending"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      api_plan_tier: ["starter", "growth", "enterprise"],
      app_role: ["admin", "user"],
      subscription_status: ["active", "expired", "cancelled", "pending"],
    },
  },
} as const
