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
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_type: string | null
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string | null
          setting_value?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string | null
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          channel: string | null
          company: string | null
          created_date: string
          email: string
          id: string
          lifetime_value: number | null
          name: string
          notes: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          channel?: string | null
          company?: string | null
          created_date?: string
          email?: string
          id?: string
          lifetime_value?: number | null
          name: string
          notes?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          channel?: string | null
          company?: string | null
          created_date?: string
          email?: string
          id?: string
          lifetime_value?: number | null
          name?: string
          notes?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean | null
          manager: string | null
          name: string
          type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          manager?: string | null
          name: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          manager?: string | null
          name?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_date: string
          from_location_id: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          sku: string | null
          to_location_id: string | null
        }
        Insert: {
          created_date?: string
          from_location_id?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          sku?: string | null
          to_location_id?: string | null
        }
        Update: {
          created_date?: string
          from_location_id?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          sku?: string | null
          to_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_snapshots: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          location_breakdown: Json | null
          product_id: string
          product_name: string | null
          reorder_point: number | null
          sku: string | null
          snapshot_date: string
          total_stock: number | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: string
          location_breakdown?: Json | null
          product_id: string
          product_name?: string | null
          reorder_point?: number | null
          sku?: string | null
          snapshot_date: string
          total_stock?: number | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: string
          location_breakdown?: Json | null
          product_id?: string
          product_name?: string | null
          reorder_point?: number | null
          sku?: string | null
          snapshot_date?: string
          total_stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_location_stocks: {
        Row: {
          created_at: string
          id: string
          location_id: string
          product_id: string
          quantity: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          product_id: string
          quantity?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          product_id?: string
          quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_location_stocks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_location_stocks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          cost: number | null
          created_at: string
          current_stock: number | null
          description: string | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          name: string
          reorder_point: number | null
          reorder_quantity: number | null
          retail_price: number | null
          sku: string
          supplier: string | null
          updated_at: string
          weight: number | null
          weight_unit: string | null
          wholesale_price: number | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          name: string
          reorder_point?: number | null
          reorder_quantity?: number | null
          retail_price?: number | null
          sku: string
          supplier?: string | null
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
          wholesale_price?: number | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          name?: string
          reorder_point?: number | null
          reorder_quantity?: number | null
          retail_price?: number | null
          sku?: string
          supplier?: string | null
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
          wholesale_price?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sku_mappings: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_sku: string
          id: string
          internal_sku: string
          notes: string | null
          product_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_sku: string
          id?: string
          internal_sku: string
          notes?: string | null
          product_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_sku?: string
          id?: string
          internal_sku?: string
          notes?: string | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sku_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          channel: string | null
          created_at: string
          customer_id: string | null
          date: string
          description: string | null
          id: string
          order_id: string | null
          quantity: number | null
          shipping_cost: number | null
          sku: string | null
          type: string
          unit_shipping_cost: number | null
        }
        Insert: {
          amount?: number
          category?: string | null
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          date?: string
          description?: string | null
          id?: string
          order_id?: string | null
          quantity?: number | null
          shipping_cost?: number | null
          sku?: string | null
          type?: string
          unit_shipping_cost?: number | null
        }
        Update: {
          amount?: number
          category?: string | null
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          date?: string
          description?: string | null
          id?: string
          order_id?: string | null
          quantity?: number | null
          shipping_cost?: number | null
          sku?: string | null
          type?: string
          unit_shipping_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "executive" | "warehouse" | "fulfillment"
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
      app_role: ["admin", "executive", "warehouse", "fulfillment"],
    },
  },
} as const
