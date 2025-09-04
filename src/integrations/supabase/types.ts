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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      entrega_fotos: {
        Row: {
          created_at: string
          entrega_id: string
          foto_url: string
          id: string
          tipo_foto: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entrega_id: string
          foto_url: string
          id?: string
          tipo_foto: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entrega_id?: string
          foto_url?: string
          id?: string
          tipo_foto?: string
          updated_at?: string
        }
        Relationships: []
      }
      entregas: {
        Row: {
          created_at: string
          geolocalizacao_validada: boolean | null
          id: string
          latitude: number | null
          longitude: number | null
          lote_codigo: string | null
          observacoes: string | null
          peso: number
          qualidade_residuo: number | null
          updated_at: string
          user_id: string | null
          voluntario_id: string
        }
        Insert: {
          created_at?: string
          geolocalizacao_validada?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lote_codigo?: string | null
          observacoes?: string | null
          peso: number
          qualidade_residuo?: number | null
          updated_at?: string
          user_id?: string | null
          voluntario_id: string
        }
        Update: {
          created_at?: string
          geolocalizacao_validada?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lote_codigo?: string | null
          observacoes?: string | null
          peso?: number
          qualidade_residuo?: number | null
          updated_at?: string
          user_id?: string | null
          voluntario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_voluntario_id_fkey"
            columns: ["voluntario_id"]
            isOneToOne: false
            referencedRelation: "voluntarios"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          caixa_atual: number
          codigo: string
          created_at: string | null
          criado_por: string
          criado_por_nome: string
          data_encerramento: string | null
          data_inicio: string
          data_proxima_transferencia: string | null
          hash_integridade: string | null
          id: string
          latitude: number | null
          linha_producao: string
          longitude: number | null
          peso_atual: number | null
          peso_inicial: number | null
          semana_atual: number
          status: string
          unidade: string
          updated_at: string | null
        }
        Insert: {
          caixa_atual?: number
          codigo: string
          created_at?: string | null
          criado_por: string
          criado_por_nome: string
          data_encerramento?: string | null
          data_inicio?: string
          data_proxima_transferencia?: string | null
          hash_integridade?: string | null
          id?: string
          latitude?: number | null
          linha_producao?: string
          longitude?: number | null
          peso_atual?: number | null
          peso_inicial?: number | null
          semana_atual?: number
          status?: string
          unidade?: string
          updated_at?: string | null
        }
        Update: {
          caixa_atual?: number
          codigo?: string
          created_at?: string | null
          criado_por?: string
          criado_por_nome?: string
          data_encerramento?: string | null
          data_inicio?: string
          data_proxima_transferencia?: string | null
          hash_integridade?: string | null
          id?: string
          latitude?: number | null
          linha_producao?: string
          longitude?: number | null
          peso_atual?: number | null
          peso_inicial?: number | null
          semana_atual?: number
          status?: string
          unidade?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      manejo_semanal: {
        Row: {
          caixa_destino: number | null
          caixa_origem: number
          created_at: string
          foto_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          lote_id: string
          observacoes: string | null
          peso_antes: number
          peso_depois: number
          updated_at: string
          user_id: string
        }
        Insert: {
          caixa_destino?: number | null
          caixa_origem: number
          created_at?: string
          foto_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lote_id: string
          observacoes?: string | null
          peso_antes: number
          peso_depois: number
          updated_at?: string
          user_id: string
        }
        Update: {
          caixa_destino?: number | null
          caixa_origem?: number
          created_at?: string
          foto_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lote_id?: string
          observacoes?: string | null
          peso_antes?: number
          peso_depois?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          authorized_units: string[] | null
          created_at: string
          full_name: string | null
          id: string
          organization_code: string
          role: string
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
          user_id: string
          user_role: Database["public"]["Enums"]["user_role_enum"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          authorized_units?: string[] | null
          created_at?: string
          full_name?: string | null
          id?: string
          organization_code?: string
          role?: string
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id: string
          user_role?: Database["public"]["Enums"]["user_role_enum"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          authorized_units?: string[] | null
          created_at?: string
          full_name?: string | null
          id?: string
          organization_code?: string
          role?: string
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id?: string
          user_role?: Database["public"]["Enums"]["user_role_enum"]
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action_description: string
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          record_id: string | null
          table_affected: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_description: string
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_affected?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_affected?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      voluntarios: {
        Row: {
          ativo: boolean | null
          cpf: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          endereco: string | null
          foto_url: string | null
          id: string
          nome: string | null
          numero_balde: number | null
          telefone: string | null
          unidade: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome?: string | null
          numero_balde?: number | null
          telefone?: string | null
          unidade?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome?: string | null
          numero_balde?: number | null
          telefone?: string | null
          unidade?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_modify_data: {
        Args: { user_id?: string }
        Returns: boolean
      }
      has_unit_access: {
        Args: { unit_code: string; user_id?: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      log_user_activity: {
        Args: {
          p_action_description: string
          p_action_type: string
          p_record_id?: string
          p_table_affected?: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      user_role_enum: "super_admin" | "local_admin" | "auditor"
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
      approval_status: ["pending", "approved", "rejected"],
      user_role_enum: ["super_admin", "local_admin", "auditor"],
    },
  },
} as const
