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
          camera_type: string | null
          capture_timestamp: string | null
          created_at: string
          deleted_at: string | null
          device_info: Json | null
          device_orientation: string | null
          entrega_id: string
          foto_url: string
          gps_coords: unknown | null
          id: string
          image_quality: number | null
          metadata: Json | null
          tipo_foto: string
          updated_at: string
        }
        Insert: {
          camera_type?: string | null
          capture_timestamp?: string | null
          created_at?: string
          deleted_at?: string | null
          device_info?: Json | null
          device_orientation?: string | null
          entrega_id: string
          foto_url: string
          gps_coords?: unknown | null
          id?: string
          image_quality?: number | null
          metadata?: Json | null
          tipo_foto: string
          updated_at?: string
        }
        Update: {
          camera_type?: string | null
          capture_timestamp?: string | null
          created_at?: string
          deleted_at?: string | null
          device_info?: Json | null
          device_orientation?: string | null
          entrega_id?: string
          foto_url?: string
          gps_coords?: unknown | null
          id?: string
          image_quality?: number | null
          metadata?: Json | null
          tipo_foto?: string
          updated_at?: string
        }
        Relationships: []
      }
      entregas: {
        Row: {
          created_at: string
          deleted_at: string | null
          geolocalizacao_validada: boolean | null
          id: string
          latitude: number | null
          longitude: number | null
          lote_codigo: string | null
          lote_id: string | null
          observacoes: string | null
          peso: number
          qualidade_residuo: number | null
          updated_at: string
          user_id: string | null
          voluntario_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          geolocalizacao_validada?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lote_codigo?: string | null
          lote_id?: string | null
          observacoes?: string | null
          peso: number
          qualidade_residuo?: number | null
          updated_at?: string
          user_id?: string | null
          voluntario_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          geolocalizacao_validada?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lote_codigo?: string | null
          lote_id?: string | null
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
      lote_eventos: {
        Row: {
          administrador_id: string | null
          administrador_nome: string
          caixa_destino: number | null
          caixa_origem: number | null
          created_at: string | null
          dados_especificos: Json | null
          data_evento: string
          deleted_at: string | null
          etapa_numero: number
          fotos_compartilhadas: Json | null
          hash_evento: string | null
          id: string
          latitude: number | null
          longitude: number | null
          lote_id: string
          observacoes: string | null
          peso_antes: number | null
          peso_depois: number
          peso_estimado: number | null
          peso_medido: number | null
          sessao_manutencao_id: string | null
          tipo_evento: string
          updated_at: string | null
        }
        Insert: {
          administrador_id?: string | null
          administrador_nome: string
          caixa_destino?: number | null
          caixa_origem?: number | null
          created_at?: string | null
          dados_especificos?: Json | null
          data_evento?: string
          deleted_at?: string | null
          etapa_numero: number
          fotos_compartilhadas?: Json | null
          hash_evento?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lote_id: string
          observacoes?: string | null
          peso_antes?: number | null
          peso_depois: number
          peso_estimado?: number | null
          peso_medido?: number | null
          sessao_manutencao_id?: string | null
          tipo_evento: string
          updated_at?: string | null
        }
        Update: {
          administrador_id?: string | null
          administrador_nome?: string
          caixa_destino?: number | null
          caixa_origem?: number | null
          created_at?: string | null
          dados_especificos?: Json | null
          data_evento?: string
          deleted_at?: string | null
          etapa_numero?: number
          fotos_compartilhadas?: Json | null
          hash_evento?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lote_id?: string
          observacoes?: string | null
          peso_antes?: number | null
          peso_depois?: number
          peso_estimado?: number | null
          peso_medido?: number | null
          sessao_manutencao_id?: string | null
          tipo_evento?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_eventos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_eventos_sessao_manutencao_fkey"
            columns: ["sessao_manutencao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_manutencao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_eventos_sessao_manutencao_id_fkey"
            columns: ["sessao_manutencao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_manutencao"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_fotos: {
        Row: {
          created_at: string
          deleted_at: string | null
          entrega_id: string | null
          foto_url: string
          id: string
          lote_id: string
          manejo_id: string | null
          ordem_foto: number | null
          tipo_foto: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          entrega_id?: string | null
          foto_url: string
          id?: string
          lote_id: string
          manejo_id?: string | null
          ordem_foto?: number | null
          tipo_foto: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          entrega_id?: string | null
          foto_url?: string
          id?: string
          lote_id?: string
          manejo_id?: string | null
          ordem_foto?: number | null
          tipo_foto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lote_fotos_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_fotos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_fotos_manejo_id_fkey"
            columns: ["manejo_id"]
            isOneToOne: false
            referencedRelation: "manejo_semanal"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          caixa_atual: number
          co2eq_evitado: number | null
          codigo: string
          codigo_unico: string | null
          created_at: string | null
          creditos_cau: number | null
          criado_por: string
          criado_por_nome: string
          data_encerramento: string | null
          data_finalizacao: string | null
          data_hash_criacao: string | null
          data_inicio: string
          data_proxima_transferencia: string | null
          deleted_at: string | null
          hash_anterior: string | null
          hash_integridade: string | null
          hash_rastreabilidade: string | null
          id: string
          indice_cadeia: number | null
          iot_data: Json | null
          latitude: number | null
          linha_producao: string
          longitude: number | null
          peso_atual: number | null
          peso_final: number | null
          peso_inicial: number | null
          qr_code_url: string | null
          regra_decaimento: number | null
          semana_atual: number
          status: string
          unidade: string
          unidade_id: string | null
          updated_at: string | null
        }
        Insert: {
          caixa_atual?: number
          co2eq_evitado?: number | null
          codigo: string
          codigo_unico?: string | null
          created_at?: string | null
          creditos_cau?: number | null
          criado_por: string
          criado_por_nome: string
          data_encerramento?: string | null
          data_finalizacao?: string | null
          data_hash_criacao?: string | null
          data_inicio?: string
          data_proxima_transferencia?: string | null
          deleted_at?: string | null
          hash_anterior?: string | null
          hash_integridade?: string | null
          hash_rastreabilidade?: string | null
          id?: string
          indice_cadeia?: number | null
          iot_data?: Json | null
          latitude?: number | null
          linha_producao?: string
          longitude?: number | null
          peso_atual?: number | null
          peso_final?: number | null
          peso_inicial?: number | null
          qr_code_url?: string | null
          regra_decaimento?: number | null
          semana_atual?: number
          status?: string
          unidade?: string
          unidade_id?: string | null
          updated_at?: string | null
        }
        Update: {
          caixa_atual?: number
          co2eq_evitado?: number | null
          codigo?: string
          codigo_unico?: string | null
          created_at?: string | null
          creditos_cau?: number | null
          criado_por?: string
          criado_por_nome?: string
          data_encerramento?: string | null
          data_finalizacao?: string | null
          data_hash_criacao?: string | null
          data_inicio?: string
          data_proxima_transferencia?: string | null
          deleted_at?: string | null
          hash_anterior?: string | null
          hash_integridade?: string | null
          hash_rastreabilidade?: string | null
          id?: string
          indice_cadeia?: number | null
          iot_data?: Json | null
          latitude?: number | null
          linha_producao?: string
          longitude?: number | null
          peso_atual?: number | null
          peso_final?: number | null
          peso_inicial?: number | null
          qr_code_url?: string | null
          regra_decaimento?: number | null
          semana_atual?: number
          status?: string
          unidade?: string
          unidade_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lotes_unidade"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      manejo_semanal: {
        Row: {
          caixa_destino: number | null
          caixa_origem: number
          created_at: string
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      sessoes_manutencao: {
        Row: {
          administrador_id: string | null
          administrador_nome: string
          created_at: string
          data_sessao: string
          deleted_at: string | null
          fotos_gerais: Json | null
          id: string
          latitude: number | null
          longitude: number | null
          observacoes_gerais: string | null
          unidade_codigo: string
          updated_at: string
        }
        Insert: {
          administrador_id?: string | null
          administrador_nome: string
          created_at?: string
          data_sessao?: string
          deleted_at?: string | null
          fotos_gerais?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacoes_gerais?: string | null
          unidade_codigo: string
          updated_at?: string
        }
        Update: {
          administrador_id?: string | null
          administrador_nome?: string
          created_at?: string
          data_sessao?: string
          deleted_at?: string | null
          fotos_gerais?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacoes_gerais?: string | null
          unidade_codigo?: string
          updated_at?: string
        }
        Relationships: []
      }
      unidades: {
        Row: {
          codigo_unidade: string
          created_at: string
          id: string
          localizacao: string
          nome: string
        }
        Insert: {
          codigo_unidade: string
          created_at?: string
          id?: string
          localizacao: string
          nome: string
        }
        Update: {
          codigo_unidade?: string
          created_at?: string
          id?: string
          localizacao?: string
          nome?: string
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
      associar_entregas_lotes_finalizados: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      associar_sessao_aos_lotes_ativos: {
        Args: { p_data_sessao?: string; p_sessao_id: string }
        Returns: {
          evento_id: string
          lote_id: string
          sucesso: boolean
        }[]
      }
      buscar_lotes_finalizados: {
        Args:
          | {
              data_fim?: string
              data_inicio?: string
              pagina?: number
              termo_busca?: string
              unidade_filter?: string
              validador_filter?: string
            }
          | { pagina?: number; termo_busca?: string }
        Returns: {
          co2eq_evitado: number
          codigo: string
          codigo_unico: string
          data_finalizacao: string
          hash_integridade: string
          id: string
          peso_final: number
          peso_inicial: number
          total_count: number
          unidade_codigo: string
          unidade_nome: string
        }[]
      }
      buscar_lotes_por_status: {
        Args: {
          data_fim?: string
          data_inicio?: string
          pagina?: number
          status_filter?: string
          termo_busca?: string
          unidade_filter?: string
          validador_filter?: string
        }
        Returns: {
          caixa_atual: number
          co2eq_evitado: number
          codigo: string
          codigo_unico: string
          criado_por_nome: string
          data_finalizacao: string
          data_inicio: string
          hash_integridade: string
          id: string
          peso_atual: number
          peso_final: number
          peso_inicial: number
          progresso_percent: number
          semana_atual: number
          status: string
          total_count: number
          total_entregas: number
          total_fotos: number
          total_manutencoes: number
          unidade_codigo: string
          unidade_nome: string
        }[]
      }
      buscar_lotes_por_status_debug: {
        Args: { status_filter?: string }
        Returns: {
          codigo: string
          id: string
          status: string
          total_count: number
          unidade_nome: string
        }[]
      }
      calcular_impacto_lote: {
        Args: { lote_id_param: string }
        Returns: {
          co2eq_evitado_calc: number
          creditos_cau_calc: number
        }[]
      }
      calcular_peso_com_decaimento: {
        Args: { peso_anterior: number; taxa_decaimento?: number }
        Returns: number
      }
      can_modify_data: {
        Args: { user_id?: string }
        Returns: boolean
      }
      generate_missing_hashes: {
        Args: Record<PropertyKey, never>
        Returns: {
          hash_generated: string
          lote_codigo: string
          lote_id: string
        }[]
      }
      get_last_chain_hash: {
        Args: { unit_code: string }
        Returns: string
      }
      get_lotes_ativos_na_data: {
        Args: { data_ref: string }
        Returns: {
          caixa_atual: number
          codigo: string
          lote_id: string
          peso_atual: number
        }[]
      }
      get_next_chain_index: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_todas_unidades: {
        Args: Record<PropertyKey, never>
        Returns: {
          codigo_unidade: string
          id: string
          localizacao: string
          lotes_ativos: number
          lotes_finalizados: number
          nome: string
          total_lotes: number
        }[]
      }
      get_users_with_emails: {
        Args: { status_filter: string }
        Returns: {
          approved_at: string
          approved_by: string
          authorized_units: string[]
          created_at: string
          email: string
          full_name: string
          id: string
          organization_code: string
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
          user_id: string
          user_role: Database["public"]["Enums"]["user_role_enum"]
        }[]
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
      lote_tem_7_manutencoes: {
        Args: { lote_id_param: string }
        Returns: boolean
      }
      migrar_fotos_manejo_para_lote_fotos: {
        Args: Record<PropertyKey, never>
        Returns: {
          ja_existentes: number
          migradas: number
          total_processadas: number
        }[]
      }
      recalc_peso_lote_by_codigo: {
        Args: { lote_codigo_param: string }
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
