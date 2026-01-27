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
      api_clients: {
        Row: {
          billing_cycle_start: string
          company_name: string
          contact_email: string
          created_at: string
          id: string
          plan_tier: Database["public"]["Enums"]["api_plan_tier"]
          status: string
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
          tier?: Database["public"]["Enums"]["api_plan_tier"]
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          api_key_id: string
          billing_period: string
          client_id: string
          created_at: string
          id: string
          overage_count: number
          scan_count: number
          updated_at: string
        }
        Insert: {
          api_key_id: string
          billing_period?: string
          client_id: string
          created_at?: string
          id?: string
          overage_count?: number
          scan_count?: number
          updated_at?: string
        }
        Update: {
          api_key_id?: string
          billing_period?: string
          client_id?: string
          created_at?: string
          id?: string
          overage_count?: number
          scan_count?: number
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
          expires_at: string | null
          id: string
          started_at: string | null
          status: string
          telegram_user_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          telegram_user_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          telegram_user_id?: number | null
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
      [_ in never]: never
    }
    Enums: {
      api_plan_tier: "starter" | "growth" | "enterprise"
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
      api_plan_tier: ["starter", "growth", "enterprise"],
      subscription_status: ["active", "expired", "cancelled", "pending"],
    },
  },
} as const
