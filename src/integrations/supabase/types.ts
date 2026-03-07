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
      address_history: {
        Row: {
          address: string
          created_at: string
          id: string
          last_used_at: string
          used_count: number
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          last_used_at?: string
          used_count?: number
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          last_used_at?: string
          used_count?: number
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      delivery_request_status_history: {
        Row: {
          attachments: Json | null
          changed_at: string | null
          changed_by: string | null
          delivery_request_id: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          attachments?: Json | null
          changed_at?: string | null
          changed_by?: string | null
          delivery_request_id: string
          id?: string
          notes?: string | null
          status: string
        }
        Update: {
          attachments?: Json | null
          changed_at?: string | null
          changed_by?: string | null
          delivery_request_id?: string
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_request_status_history_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_requests: {
        Row: {
          attachments: Json | null
          client_id: string | null
          created_at: string | null
          delivered_at: string | null
          destination_address: string
          destination_company: string | null
          driver_id: string | null
          id: string
          invoice_number: string | null
          material_type_id: string | null
          notes: string | null
          op_number: string | null
          origin_address: string
          origin_company: string | null
          region: string | null
          request_number: number
          requester: string | null
          requester_phone: string | null
          scheduled_date: string | null
          status: string | null
          transport_type: string | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          attachments?: Json | null
          client_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          destination_address: string
          destination_company?: string | null
          driver_id?: string | null
          id?: string
          invoice_number?: string | null
          material_type_id?: string | null
          notes?: string | null
          op_number?: string | null
          origin_address: string
          origin_company?: string | null
          region?: string | null
          request_number?: number
          requester?: string | null
          requester_phone?: string | null
          scheduled_date?: string | null
          status?: string | null
          transport_type?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          attachments?: Json | null
          client_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          destination_address?: string
          destination_company?: string | null
          driver_id?: string | null
          id?: string
          invoice_number?: string | null
          material_type_id?: string | null
          notes?: string | null
          op_number?: string | null
          origin_address?: string
          origin_company?: string | null
          region?: string | null
          request_number?: number
          requester?: string | null
          requester_phone?: string | null
          scheduled_date?: string | null
          status?: string | null
          transport_type?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_material_type_id_fkey"
            columns: ["material_type_id"]
            isOneToOne: false
            referencedRelation: "material_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          delivery_request_id: string | null
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          updated_at: string
        }
        Insert: {
          delivery_request_id?: string | null
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          updated_at?: string
        }
        Update: {
          delivery_request_id?: string | null
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_vehicle_types: {
        Row: {
          created_at: string | null
          driver_id: string
          id: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          id?: string
          vehicle_type: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          id?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_vehicle_types_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_fixed: boolean | null
          license_number: string | null
          name: string
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_fixed?: boolean | null
          license_number?: string | null
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_fixed?: boolean | null
          license_number?: string | null
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_prices: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          price: number
          region: string
          transport_type: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          price: number
          region: string
          transport_type: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          price?: number
          region?: string
          transport_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_prices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          created_at: string | null
          current_km: number
          driver_id: string
          id: string
          maintenance_date: string
          maintenance_type: string
          notes: string | null
          service_cost: number | null
          updated_at: string | null
          vehicle_id: string
          vehicle_plate: string
        }
        Insert: {
          created_at?: string | null
          current_km: number
          driver_id: string
          id?: string
          maintenance_date?: string
          maintenance_type: string
          notes?: string | null
          service_cost?: number | null
          updated_at?: string | null
          vehicle_id: string
          vehicle_plate: string
        }
        Update: {
          created_at?: string | null
          current_km?: number
          driver_id?: string
          id?: string
          maintenance_date?: string
          maintenance_type?: string
          notes?: string | null
          service_cost?: number | null
          updated_at?: string | null
          vehicle_id?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          requires_special_handling: boolean | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          requires_special_handling?: boolean | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          requires_special_handling?: boolean | null
        }
        Relationships: []
      }
      oil_change_records: {
        Row: {
          change_date: string
          created_at: string | null
          driver_id: string
          id: string
          km_at_change: number
          next_change_km: number
          notes: string | null
          oil_type: string | null
          service_cost: number | null
          vehicle_id: string
          vehicle_plate: string | null
        }
        Insert: {
          change_date?: string
          created_at?: string | null
          driver_id: string
          id?: string
          km_at_change: number
          next_change_km: number
          notes?: string | null
          oil_type?: string | null
          service_cost?: number | null
          vehicle_id: string
          vehicle_plate?: string | null
        }
        Update: {
          change_date?: string
          created_at?: string | null
          driver_id?: string
          id?: string
          km_at_change?: number
          next_change_km?: number
          notes?: string | null
          oil_type?: string | null
          service_cost?: number | null
          vehicle_id?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oil_change_records_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_change_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_id: string
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vehicle_logs: {
        Row: {
          created_at: string | null
          driver_id: string
          fuel_price: number | null
          fuel_type: string
          id: string
          km_final: number
          km_initial: number
          km_total: number | null
          liters: number | null
          log_date: string
          notes: string | null
          total_cost: number | null
          updated_at: string | null
          vehicle_id: string
          vehicle_plate: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          fuel_price?: number | null
          fuel_type?: string
          id?: string
          km_final?: number
          km_initial?: number
          km_total?: number | null
          liters?: number | null
          log_date?: string
          notes?: string | null
          total_cost?: number | null
          updated_at?: string | null
          vehicle_id: string
          vehicle_plate?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          fuel_price?: number | null
          fuel_type?: string
          id?: string
          km_final?: number
          km_initial?: number
          km_total?: number | null
          liters?: number | null
          log_date?: string
          notes?: string | null
          total_cost?: number | null
          updated_at?: string | null
          vehicle_id?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          capacity: number | null
          created_at: string | null
          height: number | null
          id: string
          length: number | null
          model: string | null
          plate: string
          status: string | null
          type: string
          updated_at: string | null
          width: number | null
          year: number | null
        }
        Insert: {
          brand?: string | null
          capacity?: number | null
          created_at?: string | null
          height?: number | null
          id?: string
          length?: number | null
          model?: string | null
          plate: string
          status?: string | null
          type: string
          updated_at?: string | null
          width?: number | null
          year?: number | null
        }
        Update: {
          brand?: string | null
          capacity?: number | null
          created_at?: string | null
          height?: number | null
          id?: string
          length?: number | null
          model?: string | null
          plate?: string
          status?: string | null
          type?: string
          updated_at?: string | null
          width?: number | null
          year?: number | null
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
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_gestor: { Args: never; Returns: boolean }
      user_roles_count: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "gestor" | "motorista" | "cliente"
      driver_type: "fixo" | "agregado"
      user_role: "admin" | "gestor" | "motorista" | "cliente"
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
      app_role: ["admin", "gestor", "motorista", "cliente"],
      driver_type: ["fixo", "agregado"],
      user_role: ["admin", "gestor", "motorista", "cliente"],
    },
  },
} as const
