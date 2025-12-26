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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      advanced_carts: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          price_at_add: number
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
          variant_id: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          price_at_add: number
          product_id: string
          quantity: number
          updated_at?: string | null
          user_id: string
          variant_id?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          price_at_add?: number
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
          variant_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advanced_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advanced_carts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advanced_carts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "advanced_carts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "advanced_carts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_commissions_log: {
        Row: {
          agent_id: string
          amount: number
          created_at: string | null
          description: string | null
          id: string
          related_user_id: string | null
          source_type: string
          transaction_id: string | null
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          related_user_id?: string | null
          source_type: string
          transaction_id?: string | null
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          related_user_id?: string | null
          source_type?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_commissions_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_management"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_created_users: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          user_id: string
          user_role: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          user_id: string
          user_role: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_created_users_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_management"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_invitations: {
        Row: {
          accepted_at: string | null
          agent_id: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string
          pdg_id: string
          phone: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          agent_id: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invitation_token: string
          pdg_id: string
          phone?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          agent_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          pdg_id?: string
          phone?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_invitations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_management"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_invitations_pdg_id_fkey"
            columns: ["pdg_id"]
            isOneToOne: false
            referencedRelation: "pdg_management"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_permissions: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          permission_key: string
          permission_value: boolean | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          permission_key: string
          permission_value?: boolean | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          permission_key?: string
          permission_value?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_permissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_management"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_wallets: {
        Row: {
          agent_id: string
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          updated_at: string | null
          wallet_status: string | null
        }
        Insert: {
          agent_id: string
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          wallet_status?: string | null
        }
        Update: {
          agent_id?: string
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          wallet_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_wallets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents_management"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          created_at: string
          id: string
          role_id: string
          seller_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          seller_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          seller_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      agents_management: {
        Row: {
          access_token: string | null
          agent_code: string
          can_create_sub_agent: boolean
          commission_agent_principal: number | null
          commission_rate: number | null
          commission_sous_agent: number | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          locked_until: string | null
          login_attempts: number | null
          name: string
          parent_agent_id: string | null
          password_hash: string | null
          pdg_id: string
          permissions: Json | null
          phone: string | null
          role: string | null
          type_agent: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          agent_code: string
          can_create_sub_agent?: boolean
          commission_agent_principal?: number | null
          commission_rate?: number | null
          commission_sous_agent?: number | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          name: string
          parent_agent_id?: string | null
          password_hash?: string | null
          pdg_id: string
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          type_agent?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          agent_code?: string
          can_create_sub_agent?: boolean
          commission_agent_principal?: number | null
          commission_rate?: number | null
          commission_sous_agent?: number | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          name?: string
          parent_agent_id?: string | null
          password_hash?: string | null
          pdg_id?: string
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          type_agent?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_management_parent_agent_id_fkey"
            columns: ["parent_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_management"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_management_pdg_id_fkey"
            columns: ["pdg_id"]
            isOneToOne: false
            referencedRelation: "pdg_management"
            referencedColumns: ["id"]
          },
        ]
      }
      api_alerts: {
        Row: {
          alert_type: string
          api_connection_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          api_connection_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          alert_type?: string
          api_connection_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_alerts_api_connection_id_fkey"
            columns: ["api_connection_id"]
            isOneToOne: false
            referencedRelation: "api_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      api_connections: {
        Row: {
          api_key_encrypted: string
          api_name: string
          api_provider: string
          api_secret_encrypted: string | null
          api_type: string
          base_url: string | null
          created_at: string | null
          created_by: string | null
          encryption_iv: string
          expires_at: string | null
          id: string
          last_request_at: string | null
          metadata: Json | null
          status: string
          tokens_limit: number | null
          tokens_remaining: number | null
          tokens_used: number | null
          updated_at: string | null
        }
        Insert: {
          api_key_encrypted: string
          api_name: string
          api_provider: string
          api_secret_encrypted?: string | null
          api_type: string
          base_url?: string | null
          created_at?: string | null
          created_by?: string | null
          encryption_iv: string
          expires_at?: string | null
          id?: string
          last_request_at?: string | null
          metadata?: Json | null
          status?: string
          tokens_limit?: number | null
          tokens_remaining?: number | null
          tokens_used?: number | null
          updated_at?: string | null
        }
        Update: {
          api_key_encrypted?: string
          api_name?: string
          api_provider?: string
          api_secret_encrypted?: string | null
          api_type?: string
          base_url?: string | null
          created_at?: string | null
          created_by?: string | null
          encryption_iv?: string
          expires_at?: string | null
          id?: string
          last_request_at?: string | null
          metadata?: Json | null
          status?: string
          tokens_limit?: number | null
          tokens_remaining?: number | null
          tokens_used?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          allowed_domains: Json | null
          allowed_ips: Json | null
          api_key: string
          api_secret: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_name: string
          last_used_at: string | null
          permissions: Json | null
          plan_tier: string
          rate_limit_per_day: number
          rate_limit_per_minute: number
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          allowed_domains?: Json | null
          allowed_ips?: Json | null
          api_key: string
          api_secret?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          last_used_at?: string | null
          permissions?: Json | null
          plan_tier: string
          rate_limit_per_day?: number
          rate_limit_per_minute?: number
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          allowed_domains?: Json | null
          allowed_ips?: Json | null
          api_key?: string
          api_secret?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          last_used_at?: string | null
          permissions?: Json | null
          plan_tier?: string
          rate_limit_per_day?: number
          rate_limit_per_minute?: number
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          method: string
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_connection_id: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          method: string
          request_metadata: Json | null
          response_time_ms: number | null
          status_code: number | null
          tokens_consumed: number | null
        }
        Insert: {
          api_connection_id?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          method: string
          request_metadata?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          tokens_consumed?: number | null
        }
        Update: {
          api_connection_id?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          method?: string
          request_metadata?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          tokens_consumed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_connection_id_fkey"
            columns: ["api_connection_id"]
            isOneToOne: false
            referencedRelation: "api_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          data_json: Json | null
          hash: string | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          data_json?: Json | null
          hash?: string | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          data_json?: Json | null
          hash?: string | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      auth_attempts_log: {
        Row: {
          attempted_at: string | null
          id: string
          identifier: string
          ip_address: string | null
          role: string | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string | null
          id?: string
          identifier: string
          ip_address?: string | null
          role?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string | null
          id?: string
          identifier?: string
          ip_address?: string | null
          role?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      auto_fixes: {
        Row: {
          created_at: string | null
          error_pattern: string
          fix_code: string | null
          fix_description: string
          fix_type: string
          id: string
          is_active: boolean | null
          success_rate: number | null
          times_applied: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_pattern: string
          fix_code?: string | null
          fix_description: string
          fix_type: string
          id?: string
          is_active?: boolean | null
          success_rate?: number | null
          times_applied?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_pattern?: string
          fix_code?: string | null
          fix_description?: string
          fix_type?: string
          id?: string
          is_active?: boolean | null
          success_rate?: number | null
          times_applied?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          bureau_id: string | null
          created_at: string | null
          created_by: string | null
          file_path: string
          first_name: string
          gilet_number: string | null
          id: string
          member_id: string | null
          name: string
          phone: string | null
          plate: string | null
          public_url: string | null
          serial_number: string | null
          updated_at: string | null
        }
        Insert: {
          bureau_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_path: string
          first_name: string
          gilet_number?: string | null
          id?: string
          member_id?: string | null
          name: string
          phone?: string | null
          plate?: string | null
          public_url?: string | null
          serial_number?: string | null
          updated_at?: string | null
        }
        Update: {
          bureau_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_path?: string
          first_name?: string
          gilet_number?: string | null
          id?: string
          member_id?: string | null
          name?: string
          phone?: string | null
          plate?: string | null
          public_url?: string | null
          serial_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badges_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "badges_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "badges_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_reconciliation: {
        Row: {
          calculated_balance: number
          created_at: string | null
          difference: number
          id: string
          is_reconciled: boolean | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_action: string | null
          stored_balance: number
          wallet_id: string
          wallet_type: string
        }
        Insert: {
          calculated_balance: number
          created_at?: string | null
          difference: number
          id?: string
          is_reconciled?: boolean | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_action?: string | null
          stored_balance: number
          wallet_id: string
          wallet_type: string
        }
        Update: {
          calculated_balance?: number
          created_at?: string | null
          difference?: number
          id?: string
          is_reconciled?: boolean | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_action?: string | null
          stored_balance?: number
          wallet_id?: string
          wallet_type?: string
        }
        Relationships: []
      }
      beauty_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          beauty_service_id: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          professional_service_id: string
          staff_id: string | null
          status: string | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          beauty_service_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          professional_service_id: string
          staff_id?: string | null
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          beauty_service_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          professional_service_id?: string
          staff_id?: string | null
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beauty_appointments_beauty_service_id_fkey"
            columns: ["beauty_service_id"]
            isOneToOne: false
            referencedRelation: "beauty_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beauty_appointments_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beauty_appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "beauty_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      beauty_services: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          professional_service_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          professional_service_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          professional_service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beauty_services_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      beauty_staff: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          professional_service_id: string
          schedule: Json | null
          specialties: string[] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          professional_service_id: string
          schedule?: Json | null
          specialties?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          professional_service_id?: string
          schedule?: Json | null
          specialties?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beauty_staff_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_ips: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          expires_at: string | null
          id: string
          incident_id: string | null
          ip_address: unknown
          is_active: boolean | null
          reason: string
          unblocked_at: string | null
          unblocked_by: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          incident_id?: string | null
          ip_address: unknown
          is_active?: boolean | null
          reason: string
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          incident_id?: string | null
          ip_address?: unknown
          is_active?: boolean | null
          reason?: string
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_ips_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "security_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_bounty_hall_of_fame: {
        Row: {
          created_at: string
          highest_severity: string | null
          id: string
          rank: number | null
          reporter_github: string | null
          reporter_name: string
          total_bugs_found: number
          total_rewards: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          highest_severity?: string | null
          id?: string
          rank?: number | null
          reporter_github?: string | null
          reporter_name: string
          total_bugs_found?: number
          total_rewards?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          highest_severity?: string | null
          id?: string
          rank?: number | null
          reporter_github?: string | null
          reporter_name?: string
          total_bugs_found?: number
          total_rewards?: number
          updated_at?: string
        }
        Relationships: []
      }
      bug_bounty_rewards: {
        Row: {
          amount: number
          bug_report_id: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string
        }
        Insert: {
          amount: number
          bug_report_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
        }
        Update: {
          amount?: number
          bug_report_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_bounty_rewards_bug_report_id_fkey"
            columns: ["bug_report_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          description: string
          id: string
          impact: string
          proof_of_concept: string | null
          reporter_email: string
          reporter_github: string | null
          reporter_name: string
          resolved_at: string | null
          reward_amount: number | null
          severity: string
          status: string
          steps_to_reproduce: string
          suggested_fix: string | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          impact: string
          proof_of_concept?: string | null
          reporter_email: string
          reporter_github?: string | null
          reporter_name: string
          resolved_at?: string | null
          reward_amount?: number | null
          severity: string
          status?: string
          steps_to_reproduce: string
          suggested_fix?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          impact?: string
          proof_of_concept?: string | null
          reporter_email?: string
          reporter_github?: string | null
          reporter_name?: string
          resolved_at?: string | null
          reward_amount?: number | null
          severity?: string
          status?: string
          steps_to_reproduce?: string
          suggested_fix?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bureau_access_logs: {
        Row: {
          access_type: string
          bureau_id: string
          error_message: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          success: boolean | null
          timestamp: string | null
          token_used: string | null
          user_agent: string | null
        }
        Insert: {
          access_type: string
          bureau_id: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean | null
          timestamp?: string | null
          token_used?: string | null
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          bureau_id?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean | null
          timestamp?: string | null
          token_used?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bureau_access_logs_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "bureau_access_logs_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "bureau_access_logs_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_feature_assignments: {
        Row: {
          assigned_at: string | null
          bureau_id: string | null
          enabled: boolean | null
          feature_id: string | null
          id: string
        }
        Insert: {
          assigned_at?: string | null
          bureau_id?: string | null
          enabled?: boolean | null
          feature_id?: string | null
          id?: string
        }
        Update: {
          assigned_at?: string | null
          bureau_id?: string | null
          enabled?: boolean | null
          feature_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bureau_feature_assignments_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "bureau_feature_assignments_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "bureau_feature_assignments_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bureau_feature_assignments_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "bureau_features"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_features: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          feature_code: string
          feature_name: string
          id: string
          is_active: boolean | null
          updated_at: string | null
          version: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          feature_code: string
          feature_name: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          version?: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          feature_code?: string
          feature_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      bureau_transactions: {
        Row: {
          amount: number
          bureau_id: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          member_id: string | null
          status: string | null
          type: string
        }
        Insert: {
          amount: number
          bureau_id?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          member_id?: string | null
          status?: string | null
          type: string
        }
        Update: {
          amount?: number
          bureau_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          member_id?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bureau_transactions_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "bureau_transactions_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "bureau_transactions_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bureau_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_wallets: {
        Row: {
          balance: number
          bureau_id: string
          created_at: string | null
          currency: string
          id: string
          updated_at: string | null
          wallet_status: string
        }
        Insert: {
          balance?: number
          bureau_id: string
          created_at?: string | null
          currency?: string
          id?: string
          updated_at?: string | null
          wallet_status?: string
        }
        Update: {
          balance?: number
          bureau_id?: string
          created_at?: string | null
          currency?: string
          id?: string
          updated_at?: string | null
          wallet_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bureau_wallets_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: true
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "bureau_wallets_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: true
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "bureau_wallets_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: true
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
        ]
      }
      bureaus: {
        Row: {
          access_token: string | null
          bureau_code: string
          commune: string
          created_at: string | null
          full_location: string | null
          id: string
          interface_url: string | null
          last_activity: string | null
          last_login_at: string | null
          locked_until: string | null
          login_attempts: number | null
          password_hash: string | null
          prefecture: string
          president_email: string | null
          president_name: string | null
          president_phone: string | null
          status: string | null
          total_cotisations: number | null
          total_members: number | null
          total_vehicles: number | null
          user_id: string | null
          validated_at: string | null
        }
        Insert: {
          access_token?: string | null
          bureau_code: string
          commune: string
          created_at?: string | null
          full_location?: string | null
          id?: string
          interface_url?: string | null
          last_activity?: string | null
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          password_hash?: string | null
          prefecture: string
          president_email?: string | null
          president_name?: string | null
          president_phone?: string | null
          status?: string | null
          total_cotisations?: number | null
          total_members?: number | null
          total_vehicles?: number | null
          user_id?: string | null
          validated_at?: string | null
        }
        Update: {
          access_token?: string | null
          bureau_code?: string
          commune?: string
          created_at?: string | null
          full_location?: string | null
          id?: string
          interface_url?: string | null
          last_activity?: string | null
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          password_hash?: string | null
          prefecture?: string
          president_email?: string | null
          president_name?: string | null
          president_phone?: string | null
          status?: string | null
          total_cotisations?: number | null
          total_members?: number | null
          total_vehicles?: number | null
          user_id?: string | null
          validated_at?: string | null
        }
        Relationships: []
      }
      calls: {
        Row: {
          call_type: string
          caller_id: string
          duration: number | null
          ended_at: string | null
          id: string
          metadata: Json | null
          quality_rating: number | null
          receiver_id: string
          started_at: string
          status: Database["public"]["Enums"]["call_status_type"]
        }
        Insert: {
          call_type?: string
          caller_id: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          quality_rating?: number | null
          receiver_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["call_status_type"]
        }
        Update: {
          call_type?: string
          caller_id?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          quality_rating?: number | null
          receiver_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["call_status_type"]
        }
        Relationships: []
      }
      carts: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "clients_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "clients_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_config: {
        Row: {
          commission_type: string
          commission_value: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number | null
          service_name: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          commission_type: string
          commission_value: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          service_name: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          commission_type?: string
          commission_value?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          service_name?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      communication_audit_logs: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          target_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      communication_notifications: {
        Row: {
          body: string
          call_id: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message_id: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          call_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_id?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          call_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_id?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_notifications_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_audits: {
        Row: {
          audit_type: string
          auditor_company: string | null
          auditor_name: string | null
          certification_id: string | null
          completed_date: string | null
          created_at: string | null
          findings: Json | null
          id: string
          next_audit_date: string | null
          non_conformities: number | null
          observations: number | null
          overall_score: number | null
          recommendations: string[] | null
          report_url: string | null
          scheduled_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          audit_type: string
          auditor_company?: string | null
          auditor_name?: string | null
          certification_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          findings?: Json | null
          id?: string
          next_audit_date?: string | null
          non_conformities?: number | null
          observations?: number | null
          overall_score?: number | null
          recommendations?: string[] | null
          report_url?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          audit_type?: string
          auditor_company?: string | null
          auditor_name?: string | null
          certification_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          findings?: Json | null
          id?: string
          next_audit_date?: string | null
          non_conformities?: number | null
          observations?: number | null
          overall_score?: number | null
          recommendations?: string[] | null
          report_url?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_audits_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "security_certifications"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          amount: number | null
          client_email: string | null
          client_id: string | null
          client_info: string | null
          client_name: string
          client_phone: string | null
          client_signature_url: string | null
          contract_content: string
          contract_type: string
          created_at: string | null
          custom_fields: Json | null
          id: string
          pdf_url: string | null
          signed_at: string | null
          status: string
          updated_at: string | null
          vendor_id: string
          vendor_logo_url: string | null
          vendor_signature_url: string | null
        }
        Insert: {
          amount?: number | null
          client_email?: string | null
          client_id?: string | null
          client_info?: string | null
          client_name: string
          client_phone?: string | null
          client_signature_url?: string | null
          contract_content: string
          contract_type: string
          created_at?: string | null
          custom_fields?: Json | null
          id?: string
          pdf_url?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string | null
          vendor_id: string
          vendor_logo_url?: string | null
          vendor_signature_url?: string | null
        }
        Update: {
          amount?: number | null
          client_email?: string | null
          client_id?: string | null
          client_info?: string | null
          client_name?: string
          client_phone?: string | null
          client_signature_url?: string | null
          contract_content?: string
          contract_type?: string
          created_at?: string | null
          custom_fields?: Json | null
          id?: string
          pdf_url?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string | null
          vendor_id?: string
          vendor_logo_url?: string | null
          vendor_signature_url?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agora_channel: string | null
          created_at: string | null
          creator_id: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          last_message_preview: string | null
          name: string | null
          public_id: string | null
          type: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          agora_channel?: string | null
          created_at?: string | null
          creator_id?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          name?: string | null
          public_id?: string | null
          type?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          agora_channel?: string | null
          created_at?: string | null
          creator_id?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          name?: string | null
          public_id?: string | null
          type?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      copilot_conversations: {
        Row: {
          actions: Json | null
          created_at: string
          executed: boolean
          id: string
          message_in: string
          message_out: string
          mfa_verified: boolean
          pdg_user_id: string
        }
        Insert: {
          actions?: Json | null
          created_at?: string
          executed?: boolean
          id?: string
          message_in: string
          message_out: string
          mfa_verified?: boolean
          pdg_user_id: string
        }
        Update: {
          actions?: Json | null
          created_at?: string
          executed?: boolean
          id?: string
          message_in?: string
          message_out?: string
          mfa_verified?: boolean
          pdg_user_id?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          created_at: string | null
          decimal_places: number | null
          id: string
          is_active: boolean | null
          name: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string | null
          decimal_places?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string | null
          decimal_places?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      custom_report_templates: {
        Row: {
          chart_config: Json | null
          columns: Json
          created_at: string | null
          data_sources: Json
          description: string | null
          filters: Json | null
          id: string
          is_public: boolean | null
          name: string
          report_type: string
          schedule: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chart_config?: Json | null
          columns: Json
          created_at?: string | null
          data_sources?: Json
          description?: string | null
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          name: string
          report_type: string
          schedule?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chart_config?: Json | null
          columns?: Json
          created_at?: string | null
          data_sources?: Json
          description?: string | null
          filters?: Json | null
          id?: string
          is_public?: boolean | null
          name?: string
          report_type?: string
          schedule?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      customer_credits: {
        Row: {
          created_at: string | null
          credit_limit: number | null
          current_balance: number | null
          customer_id: string
          id: string
          is_blocked: boolean | null
          payment_terms: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          customer_id: string
          id?: string
          is_blocked?: boolean | null
          payment_terms?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          customer_id?: string
          id?: string
          is_blocked?: boolean | null
          payment_terms?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_credits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "customer_credits_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "customer_credits_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          addresses: Json | null
          created_at: string | null
          id: string
          payment_methods: Json | null
          preferences: Json | null
          public_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          addresses?: Json | null
          created_at?: string | null
          id?: string
          payment_methods?: Json | null
          preferences?: Json | null
          public_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          addresses?: Json | null
          created_at?: string | null
          id?: string
          payment_methods?: Json | null
          preferences?: Json | null
          public_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          amount: number
          comment: string | null
          created_at: string
          debt_id: string
          id: string
          paid_by: string | null
          payment_method: string
          recorded_by: string | null
        }
        Insert: {
          amount: number
          comment?: string | null
          created_at?: string
          debt_id: string
          id?: string
          paid_by?: string | null
          payment_method: string
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          comment?: string | null
          created_at?: string
          debt_id?: string
          id?: string
          paid_by?: string | null
          payment_method?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          description: string | null
          due_date: string | null
          id: string
          minimum_installment: number
          paid_amount: number
          remaining_amount: number
          status: string
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          description?: string | null
          due_date?: string | null
          id?: string
          minimum_installment: number
          paid_amount?: number
          remaining_amount: number
          status?: string
          total_amount: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          description?: string | null
          due_date?: string | null
          id?: string
          minimum_installment?: number
          paid_amount?: number
          remaining_amount?: number
          status?: string
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "debts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "debts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          accepted_at: string | null
          actual_delivery_time: string | null
          actual_pickup_time: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          client_id: string | null
          client_signature: string | null
          completed_at: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_rating: number | null
          delivery_address: Json
          delivery_fee: number | null
          distance_km: number | null
          distance_to_vendor: number | null
          distance_vendor_to_client: number | null
          driver_bonus: number | null
          driver_earning: number | null
          driver_id: string | null
          driver_notes: string | null
          driver_payment_method: string | null
          end_time: string | null
          estimated_delivery_time: string | null
          estimated_pickup_time: string | null
          estimated_time_minutes: number | null
          id: string
          order_id: string
          package_description: string | null
          package_type: string | null
          payment_method: string | null
          pickup_address: Json
          price: number | null
          proof_photo_url: string | null
          public_id: string | null
          ready_at: string | null
          ready_for_pickup: boolean | null
          start_time: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["delivery_status"] | null
          total_distance: number | null
          updated_at: string | null
          vendor_id: string | null
          vendor_location: Json | null
          vendor_name: string | null
          vendor_phone: string | null
        }
        Insert: {
          accepted_at?: string | null
          actual_delivery_time?: string | null
          actual_pickup_time?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          client_signature?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_rating?: number | null
          delivery_address: Json
          delivery_fee?: number | null
          distance_km?: number | null
          distance_to_vendor?: number | null
          distance_vendor_to_client?: number | null
          driver_bonus?: number | null
          driver_earning?: number | null
          driver_id?: string | null
          driver_notes?: string | null
          driver_payment_method?: string | null
          end_time?: string | null
          estimated_delivery_time?: string | null
          estimated_pickup_time?: string | null
          estimated_time_minutes?: number | null
          id?: string
          order_id: string
          package_description?: string | null
          package_type?: string | null
          payment_method?: string | null
          pickup_address: Json
          price?: number | null
          proof_photo_url?: string | null
          public_id?: string | null
          ready_at?: string | null
          ready_for_pickup?: boolean | null
          start_time?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          total_distance?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_location?: Json | null
          vendor_name?: string | null
          vendor_phone?: string | null
        }
        Update: {
          accepted_at?: string | null
          actual_delivery_time?: string | null
          actual_pickup_time?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          client_signature?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_rating?: number | null
          delivery_address?: Json
          delivery_fee?: number | null
          distance_km?: number | null
          distance_to_vendor?: number | null
          distance_vendor_to_client?: number | null
          driver_bonus?: number | null
          driver_earning?: number | null
          driver_id?: string | null
          driver_notes?: string | null
          driver_payment_method?: string | null
          end_time?: string | null
          estimated_delivery_time?: string | null
          estimated_pickup_time?: string | null
          estimated_time_minutes?: number | null
          id?: string
          order_id?: string
          package_description?: string | null
          package_type?: string | null
          payment_method?: string | null
          pickup_address?: Json
          price?: number | null
          proof_photo_url?: string | null
          public_id?: string | null
          ready_at?: string | null
          ready_for_pickup?: boolean | null
          start_time?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          total_distance?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_location?: Json | null
          vendor_name?: string | null
          vendor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "deliveries_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "deliveries_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_logs: {
        Row: {
          action: string
          created_at: string
          delivery_id: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          delivery_id: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          delivery_id?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_logs_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_messages: {
        Row: {
          content: string
          created_at: string
          delivery_id: string
          id: string
          is_read: boolean
          message_type: string
          recipient_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          delivery_id: string
          id?: string
          is_read?: boolean
          message_type?: string
          recipient_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          delivery_id?: string
          id?: string
          is_read?: boolean
          message_type?: string
          recipient_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_notifications: {
        Row: {
          created_at: string
          delivery_id: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_id?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_id?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notifications_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_offers: {
        Row: {
          created_at: string | null
          delivery_id: string
          distance_to_vendor: number | null
          driver_id: string
          estimated_earnings: number | null
          expires_at: string | null
          id: string
          offered_at: string | null
          responded_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_id: string
          distance_to_vendor?: number | null
          driver_id: string
          estimated_earnings?: number | null
          expires_at?: string | null
          id?: string
          offered_at?: string | null
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_id?: string
          distance_to_vendor?: number | null
          driver_id?: string
          estimated_earnings?: number | null
          expires_at?: string | null
          id?: string
          offered_at?: string | null
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_offers_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_pricing: {
        Row: {
          base_price: number
          created_at: string | null
          currency: string | null
          delivery_id: string | null
          distance_price: number
          id: string
          pricing_details: Json | null
          service_fee: number | null
          surge_price: number | null
          total_price: number
        }
        Insert: {
          base_price: number
          created_at?: string | null
          currency?: string | null
          delivery_id?: string | null
          distance_price: number
          id?: string
          pricing_details?: Json | null
          service_fee?: number | null
          surge_price?: number | null
          total_price: number
        }
        Update: {
          base_price?: number
          created_at?: string | null
          currency?: string | null
          delivery_id?: string | null
          distance_price?: number
          id?: string
          pricing_details?: Json | null
          service_fee?: number | null
          surge_price?: number | null
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_pricing_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking: {
        Row: {
          accuracy: number | null
          delivery_id: string
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          delivery_id: string
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          delivery_id?: string
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_requests: {
        Row: {
          budget: number | null
          created_at: string | null
          description: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          responded_at: string | null
          response: string | null
          service_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          description: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          responded_at?: string | null
          response?: string | null
          service_type: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          description?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          responded_at?: string | null
          response?: string | null
          service_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      digital_product_purchases: {
        Row: {
          access_expires_at: string | null
          access_granted: boolean | null
          amount: number
          buyer_id: string
          commission_amount: number | null
          created_at: string | null
          download_count: number | null
          id: string
          max_downloads: number | null
          merchant_id: string
          payment_status: string | null
          product_id: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          access_expires_at?: string | null
          access_granted?: boolean | null
          amount: number
          buyer_id: string
          commission_amount?: number | null
          created_at?: string | null
          download_count?: number | null
          id?: string
          max_downloads?: number | null
          merchant_id: string
          payment_status?: string | null
          product_id: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          access_expires_at?: string | null
          access_granted?: boolean | null
          amount?: number
          buyer_id?: string
          commission_amount?: number | null
          created_at?: string | null
          download_count?: number | null
          id?: string
          max_downloads?: number | null
          merchant_id?: string
          payment_status?: string | null
          product_id?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_products: {
        Row: {
          affiliate_platform: string | null
          affiliate_url: string | null
          category: string
          commission_rate: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          file_type: string | null
          file_urls: string[] | null
          id: string
          images: string[] | null
          is_featured: boolean | null
          is_premium: boolean | null
          merchant_id: string
          metadata: Json | null
          original_price: number | null
          price: number
          product_mode: string
          published_at: string | null
          rating: number | null
          reviews_count: number | null
          sales_count: number | null
          short_description: string | null
          source_platform: string | null
          source_url: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          vendor_id: string | null
          views_count: number | null
        }
        Insert: {
          affiliate_platform?: string | null
          affiliate_url?: string | null
          category: string
          commission_rate?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          file_type?: string | null
          file_urls?: string[] | null
          id?: string
          images?: string[] | null
          is_featured?: boolean | null
          is_premium?: boolean | null
          merchant_id: string
          metadata?: Json | null
          original_price?: number | null
          price?: number
          product_mode?: string
          published_at?: string | null
          rating?: number | null
          reviews_count?: number | null
          sales_count?: number | null
          short_description?: string | null
          source_platform?: string | null
          source_url?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          vendor_id?: string | null
          views_count?: number | null
        }
        Update: {
          affiliate_platform?: string | null
          affiliate_url?: string | null
          category?: string
          commission_rate?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          file_type?: string | null
          file_urls?: string[] | null
          id?: string
          images?: string[] | null
          is_featured?: boolean | null
          is_premium?: boolean | null
          merchant_id?: string
          metadata?: Json | null
          original_price?: number | null
          price?: number
          product_mode?: string
          published_at?: string | null
          rating?: number | null
          reviews_count?: number | null
          sales_count?: number | null
          short_description?: string | null
          source_platform?: string | null
          source_url?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          vendor_id?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "digital_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "digital_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_actions: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          dispute_id: string
          id: string
          performed_by: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          dispute_id: string
          id?: string
          performed_by?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          dispute_id?: string
          id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_actions_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          dispute_id: string
          id: string
          message: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          dispute_id: string
          id?: string
          message: string
          sender_id: string
          sender_type: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          dispute_id?: string
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          ai_analysis: Json | null
          ai_confidence: number | null
          ai_decision: string | null
          ai_justification: string | null
          arbitrated_at: string | null
          auto_escalate_at: string | null
          client_id: string
          created_at: string | null
          decision_payload: Json | null
          description: string
          dispute_number: string
          dispute_type: string
          escalated_at: string | null
          escrow_id: string | null
          evidence_urls: Json | null
          id: string
          order_id: string
          request_type: string
          requested_amount: number | null
          resolution: string | null
          resolution_amount: number | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string | null
          vendor_counter_offer: Json | null
          vendor_id: string
          vendor_response: string | null
          vendor_response_date: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_confidence?: number | null
          ai_decision?: string | null
          ai_justification?: string | null
          arbitrated_at?: string | null
          auto_escalate_at?: string | null
          client_id: string
          created_at?: string | null
          decision_payload?: Json | null
          description: string
          dispute_number?: string
          dispute_type: string
          escalated_at?: string | null
          escrow_id?: string | null
          evidence_urls?: Json | null
          id?: string
          order_id: string
          request_type: string
          requested_amount?: number | null
          resolution?: string | null
          resolution_amount?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string | null
          vendor_counter_offer?: Json | null
          vendor_id: string
          vendor_response?: string | null
          vendor_response_date?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_confidence?: number | null
          ai_decision?: string | null
          ai_justification?: string | null
          arbitrated_at?: string | null
          auto_escalate_at?: string | null
          client_id?: string
          created_at?: string | null
          decision_payload?: Json | null
          description?: string
          dispute_number?: string
          dispute_type?: string
          escalated_at?: string | null
          escrow_id?: string | null
          evidence_urls?: Json | null
          id?: string
          order_id?: string
          request_type?: string
          requested_amount?: number | null
          resolution?: string | null
          resolution_amount?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string | null
          vendor_counter_offer?: Json | null
          vendor_id?: string
          vendor_response?: string | null
          vendor_response_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_subscription_config: {
        Row: {
          created_at: string | null
          duration_days: number
          duration_type: string | null
          id: string
          is_active: boolean | null
          price: number
          subscription_type: string
          updated_at: string | null
          updated_by: string | null
          yearly_discount_percentage: number | null
          yearly_price: number | null
        }
        Insert: {
          created_at?: string | null
          duration_days?: number
          duration_type?: string | null
          id?: string
          is_active?: boolean | null
          price: number
          subscription_type: string
          updated_at?: string | null
          updated_by?: string | null
          yearly_discount_percentage?: number | null
          yearly_price?: number | null
        }
        Update: {
          created_at?: string | null
          duration_days?: number
          duration_type?: string | null
          id?: string
          is_active?: boolean | null
          price?: number
          subscription_type?: string
          updated_at?: string | null
          updated_by?: string | null
          yearly_discount_percentage?: number | null
          yearly_price?: number | null
        }
        Relationships: []
      }
      driver_subscription_revenues: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_method: string
          subscription_id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_method: string
          subscription_id: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_method?: string
          subscription_id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_subscription_revenues_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "driver_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string | null
          end_date: string
          id: string
          metadata: Json | null
          payment_method: string
          price: number
          start_date: string
          status: string
          transaction_id: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          metadata?: Json | null
          payment_method: string
          price: number
          start_date?: string
          status?: string
          transaction_id?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          metadata?: Json | null
          payment_method?: string
          price?: number
          start_date?: string
          status?: string
          transaction_id?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          current_location: unknown
          earnings_total: number | null
          email: string | null
          full_name: string | null
          id: string
          is_online: boolean | null
          is_verified: boolean | null
          last_location: unknown
          license_number: string
          phone_number: string | null
          public_id: string | null
          rating: number | null
          status: string | null
          syndic_id: string | null
          total_deliveries: number | null
          updated_at: string | null
          user_id: string
          vehicle_info: Json | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          current_location?: unknown
          earnings_total?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          last_location?: unknown
          license_number: string
          phone_number?: string | null
          public_id?: string | null
          rating?: number | null
          status?: string | null
          syndic_id?: string | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_info?: Json | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          current_location?: unknown
          earnings_total?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          last_location?: unknown
          license_number?: string
          phone_number?: string | null
          public_id?: string | null
          rating?: number | null
          status?: string | null
          syndic_id?: string | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_info?: Json | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      education_courses: {
        Row: {
          category: string | null
          created_at: string | null
          current_students: number | null
          description: string | null
          duration_hours: number | null
          id: string
          image_url: string | null
          instructor_name: string | null
          is_active: boolean | null
          max_students: number | null
          price: number | null
          professional_service_id: string
          schedule: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          current_students?: number | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          image_url?: string | null
          instructor_name?: string | null
          is_active?: boolean | null
          max_students?: number | null
          price?: number | null
          professional_service_id: string
          schedule?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          current_students?: number | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          image_url?: string | null
          instructor_name?: string | null
          is_active?: boolean | null
          max_students?: number | null
          price?: number | null
          professional_service_id?: string
          schedule?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_courses_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      education_enrollments: {
        Row: {
          amount_paid: number | null
          course_id: string
          created_at: string | null
          enrollment_date: string | null
          id: string
          notes: string | null
          payment_status: string | null
          status: string | null
          student_email: string | null
          student_name: string
          student_phone: string | null
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          course_id: string
          created_at?: string | null
          enrollment_date?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          status?: string | null
          student_email?: string | null
          student_name: string
          student_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          course_id?: string
          created_at?: string | null
          enrollment_date?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          status?: string | null
          student_email?: string | null
          student_name?: string
          student_phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "education_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          custom_id: string
          escrow_id: string | null
          id: string
          metadata: Json | null
          method: string
          public_id: string | null
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          custom_id?: string
          escrow_id?: string | null
          id?: string
          metadata?: Json | null
          method?: string
          public_id?: string | null
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          custom_id?: string
          escrow_id?: string | null
          id?: string
          metadata?: Json | null
          method?: string
          public_id?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_transactions_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_transactions_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          category: string
          created_at: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          level?: string
          message: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      escrow_action_logs: {
        Row: {
          action_type: string
          created_at: string | null
          escrow_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          notes: string | null
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          escrow_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          notes?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          escrow_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          notes?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_action_logs_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_action_logs_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_logs: {
        Row: {
          action: string
          created_at: string
          escrow_id: string
          id: string
          metadata: Json | null
          note: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          escrow_id: string
          id?: string
          metadata?: Json | null
          note?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          escrow_id?: string
          id?: string
          metadata?: Json | null
          note?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_logs_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_logs_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_transactions: {
        Row: {
          admin_action: string | null
          admin_id: string | null
          amount: number
          auto_release_enabled: boolean | null
          available_to_release_at: string | null
          buyer_id: string | null
          commission_amount: number | null
          commission_percent: number | null
          created_at: string | null
          currency: string | null
          dispute_reason: string | null
          id: string
          metadata: Json | null
          notes: string | null
          order_id: string | null
          payer_id: string
          receiver_id: string
          refunded_at: string | null
          released_at: string | null
          released_by: string | null
          seller_id: string | null
          status: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          admin_action?: string | null
          admin_id?: string | null
          amount: number
          auto_release_enabled?: boolean | null
          available_to_release_at?: string | null
          buyer_id?: string | null
          commission_amount?: number | null
          commission_percent?: number | null
          created_at?: string | null
          currency?: string | null
          dispute_reason?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          payer_id: string
          receiver_id: string
          refunded_at?: string | null
          released_at?: string | null
          released_by?: string | null
          seller_id?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_action?: string | null
          admin_id?: string | null
          amount?: number
          auto_release_enabled?: boolean | null
          available_to_release_at?: string | null
          buyer_id?: string | null
          commission_amount?: number | null
          commission_percent?: number | null
          created_at?: string | null
          currency?: string | null
          dispute_reason?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          payer_id?: string
          receiver_id?: string
          refunded_at?: string | null
          released_at?: string | null
          released_by?: string | null
          seller_id?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "enhanced_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      escrows: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          dispute_reason: string | null
          id: string
          released_at: string | null
          seller_id: string
          status: Database["public"]["Enums"]["escrow_status_type"]
          transaction_id: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          dispute_reason?: string | null
          id?: string
          released_at?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["escrow_status_type"]
          transaction_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          dispute_reason?: string | null
          id?: string
          released_at?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["escrow_status_type"]
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrows_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string | null
          from_currency: string
          id: string
          is_active: boolean | null
          rate: number
          set_by: string | null
          to_currency: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          from_currency: string
          id?: string
          is_active?: boolean | null
          rate: number
          set_by?: string | null
          to_currency: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          from_currency?: string
          id?: string
          is_active?: boolean | null
          rate?: number
          set_by?: string | null
          to_currency?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_from_currency_fkey"
            columns: ["from_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_to_currency_fkey"
            columns: ["to_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      expense_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          related_expense_id: string | null
          severity: string | null
          title: string
          vendor_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_expense_id?: string | null
          severity?: string | null
          title: string
          vendor_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_expense_id?: string | null
          severity?: string | null
          title?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_alerts_related_expense_id_fkey"
            columns: ["related_expense_id"]
            isOneToOne: false
            referencedRelation: "vendor_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_analytics: {
        Row: {
          analysis_date: string
          category_breakdown: Json | null
          created_at: string | null
          efficiency_score: number | null
          id: string
          recommendations: string[] | null
          total_expenses: number | null
          trends: Json | null
          vendor_id: string
        }
        Insert: {
          analysis_date?: string
          category_breakdown?: Json | null
          created_at?: string | null
          efficiency_score?: number | null
          id?: string
          recommendations?: string[] | null
          total_expenses?: number | null
          trends?: Json | null
          vendor_id: string
        }
        Update: {
          analysis_date?: string
          category_breakdown?: Json | null
          created_at?: string | null
          efficiency_score?: number | null
          id?: string
          recommendations?: string[] | null
          total_expenses?: number | null
          trends?: Json | null
          vendor_id?: string
        }
        Relationships: []
      }
      expense_budgets: {
        Row: {
          budget_limit: number
          category_id: string | null
          created_at: string | null
          id: string
          month: string
          spent_amount: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          budget_limit: number
          category_id?: string | null
          created_at?: string | null
          id?: string
          month: string
          spent_amount?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          budget_limit?: number
          category_id?: string | null
          created_at?: string | null
          id?: string
          month?: string
          spent_amount?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          budget_limit: number | null
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          budget_limit?: number | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          budget_limit?: number | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: []
      }
      expense_receipts: {
        Row: {
          expense_id: string
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_at: string | null
        }
        Insert: {
          expense_id: string
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string | null
        }
        Update: {
          expense_id?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_receipts_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "vendor_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_login_attempts: {
        Row: {
          attempt_count: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          identifier: string
          ip_address: string | null
          last_attempt: string | null
        }
        Insert: {
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier: string
          ip_address?: string | null
          last_attempt?: string | null
        }
        Update: {
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier?: string
          ip_address?: string | null
          last_attempt?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_ledger: {
        Row: {
          actor_id: string
          actor_type: string
          amount: number
          balance_after_credit: number | null
          balance_after_debit: number | null
          balance_before_credit: number | null
          balance_before_debit: number | null
          confirmed_at: string | null
          created_at: string | null
          credit_account: string | null
          currency: string | null
          debit_account: string | null
          description: string | null
          id: string
          is_valid: boolean | null
          ledger_hash: string
          metadata: Json | null
          module_name: string | null
          module_signature: string | null
          previous_hash: string | null
          transaction_id: string
          transaction_type: string
          validation_status: string | null
        }
        Insert: {
          actor_id: string
          actor_type: string
          amount: number
          balance_after_credit?: number | null
          balance_after_debit?: number | null
          balance_before_credit?: number | null
          balance_before_debit?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          credit_account?: string | null
          currency?: string | null
          debit_account?: string | null
          description?: string | null
          id?: string
          is_valid?: boolean | null
          ledger_hash: string
          metadata?: Json | null
          module_name?: string | null
          module_signature?: string | null
          previous_hash?: string | null
          transaction_id: string
          transaction_type: string
          validation_status?: string | null
        }
        Update: {
          actor_id?: string
          actor_type?: string
          amount?: number
          balance_after_credit?: number | null
          balance_after_debit?: number | null
          balance_before_credit?: number | null
          balance_before_debit?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          credit_account?: string | null
          currency?: string | null
          debit_account?: string | null
          description?: string | null
          id?: string
          is_valid?: boolean | null
          ledger_hash?: string
          metadata?: Json | null
          module_name?: string | null
          module_signature?: string | null
          previous_hash?: string | null
          transaction_id?: string
          transaction_type?: string
          validation_status?: string | null
        }
        Relationships: []
      }
      financial_quarantine: {
        Row: {
          actor_id: string
          actor_type: string
          amount: number
          anomaly_details: Json | null
          created_at: string | null
          credit_account: string | null
          debit_account: string | null
          id: string
          original_payload: Json | null
          original_transaction_id: string
          quarantine_reason: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_score: number | null
          rule_violated: string | null
          status: string | null
          transaction_type: string
        }
        Insert: {
          actor_id: string
          actor_type: string
          amount: number
          anomaly_details?: Json | null
          created_at?: string | null
          credit_account?: string | null
          debit_account?: string | null
          id?: string
          original_payload?: Json | null
          original_transaction_id: string
          quarantine_reason: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number | null
          rule_violated?: string | null
          status?: string | null
          transaction_type: string
        }
        Update: {
          actor_id?: string
          actor_type?: string
          amount?: number
          anomaly_details?: Json | null
          created_at?: string | null
          credit_account?: string | null
          debit_account?: string | null
          id?: string
          original_payload?: Json | null
          original_transaction_id?: string
          quarantine_reason?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number | null
          rule_violated?: string | null
          status?: string | null
          transaction_type?: string
        }
        Relationships: []
      }
      financial_rules: {
        Row: {
          applies_to: string[] | null
          created_at: string | null
          id: string
          is_active: boolean | null
          rule_code: string
          rule_description: string | null
          rule_logic: Json
          rule_name: string
          rule_type: string
          severity: string | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          applies_to?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_code: string
          rule_description?: string | null
          rule_logic: Json
          rule_name: string
          rule_type: string
          severity?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          applies_to?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_code?: string
          rule_description?: string | null
          rule_logic?: Json
          rule_name?: string
          rule_type?: string
          severity?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          api_response: Json | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          destination_reference: string | null
          error_message: string | null
          fees: number | null
          id: string
          metadata: Json | null
          source_reference: string | null
          status: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          api_response?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          destination_reference?: string | null
          error_message?: string | null
          fees?: number | null
          id?: string
          metadata?: Json | null
          source_reference?: string | null
          status?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          api_response?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          destination_reference?: string | null
          error_message?: string | null
          fees?: number | null
          id?: string
          metadata?: Json | null
          source_reference?: string | null
          status?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_classes: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          instructor_name: string | null
          is_active: boolean | null
          max_participants: number | null
          name: string
          professional_service_id: string
          schedule: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructor_name?: string | null
          is_active?: boolean | null
          max_participants?: number | null
          name: string
          professional_service_id: string
          schedule?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructor_name?: string | null
          is_active?: boolean | null
          max_participants?: number | null
          name?: string
          professional_service_id?: string
          schedule?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_classes_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_memberships: {
        Row: {
          created_at: string | null
          emergency_contact: Json | null
          end_date: string
          id: string
          member_email: string | null
          member_name: string
          member_phone: string | null
          membership_type: string | null
          photo_url: string | null
          price: number | null
          professional_service_id: string
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          emergency_contact?: Json | null
          end_date: string
          id?: string
          member_email?: string | null
          member_name: string
          member_phone?: string | null
          membership_type?: string | null
          photo_url?: string | null
          price?: number | null
          professional_service_id: string
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          emergency_contact?: Json | null
          end_date?: string
          id?: string
          member_email?: string | null
          member_name?: string
          member_phone?: string | null
          membership_type?: string | null
          photo_url?: string | null
          price?: number | null
          professional_service_id?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_memberships_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      forensic_reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          file_path: string | null
          id: string
          incident_id: string | null
          report_data: Json
          report_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          file_path?: string | null
          id?: string
          incident_id?: string | null
          report_data: Json
          report_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          file_path?: string | null
          id?: string
          incident_id?: string | null
          report_data?: Json
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "forensic_reports_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "security_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_detection_logs: {
        Row: {
          action_taken: string | null
          created_at: string
          flags: Json
          id: string
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string
          risk_score: number
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          flags: Json
          id?: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level: string
          risk_score: number
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          flags?: Json
          id?: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          risk_score?: number
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          expires_at: string | null
          file_url: string | null
          format: string | null
          generated_at: string | null
          id: string
          report_data: Json
          template_id: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          file_url?: string | null
          format?: string | null
          generated_at?: string | null
          id?: string
          report_data: Json
          template_id?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          file_url?: string | null
          format?: string | null
          generated_at?: string | null
          id?: string
          report_data?: Json
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      global_ids: {
        Row: {
          created_at: string | null
          id: number
          last_number: number | null
          prefix: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          last_number?: number | null
          prefix: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          last_number?: number | null
          prefix?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hairdresser_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          professional_service_id: string
          service_id: string | null
          status: string | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          professional_service_id: string
          service_id?: string | null
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          professional_service_id?: string
          service_id?: string | null
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hairdresser_appointments_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hairdresser_appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "hairdresser_services"
            referencedColumns: ["id"]
          },
        ]
      }
      hairdresser_services: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          gender_target: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          professional_service_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          gender_target?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          professional_service_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          gender_target?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          professional_service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hairdresser_services_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      health_check_reports: {
        Row: {
          checks: Json
          checks_failed: number | null
          checks_passed: number | null
          checks_performed: number | null
          id: string
          overall_status: string
          timestamp: string | null
          uptime: number | null
        }
        Insert: {
          checks: Json
          checks_failed?: number | null
          checks_passed?: number | null
          checks_performed?: number | null
          id?: string
          overall_status: string
          timestamp?: string | null
          uptime?: number | null
        }
        Update: {
          checks?: Json
          checks_failed?: number | null
          checks_passed?: number | null
          checks_performed?: number | null
          id?: string
          overall_status?: string
          timestamp?: string | null
          uptime?: number | null
        }
        Relationships: []
      }
      health_consultations: {
        Row: {
          consultation_date: string
          consultation_fee: number | null
          consultation_time: string
          created_at: string | null
          diagnosis: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          patient_id: string | null
          prescription: string | null
          professional_service_id: string
          reason: string | null
          status: string | null
          treatment: string | null
          updated_at: string | null
        }
        Insert: {
          consultation_date: string
          consultation_fee?: number | null
          consultation_time: string
          created_at?: string | null
          diagnosis?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          prescription?: string | null
          professional_service_id: string
          reason?: string | null
          status?: string | null
          treatment?: string | null
          updated_at?: string | null
        }
        Update: {
          consultation_date?: string
          consultation_fee?: number | null
          consultation_time?: string
          created_at?: string | null
          diagnosis?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          prescription?: string | null
          professional_service_id?: string
          reason?: string | null
          status?: string | null
          treatment?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "health_patient_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_consultations_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      health_patient_records: {
        Row: {
          address: string | null
          allergies: string[] | null
          blood_type: string | null
          chronic_conditions: string[] | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact: Json | null
          gender: string | null
          id: string
          notes: string | null
          patient_name: string
          phone: string | null
          professional_service_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: Json | null
          gender?: string | null
          id?: string
          notes?: string | null
          patient_name: string
          phone?: string | null
          professional_service_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: Json | null
          gender?: string | null
          id?: string
          notes?: string | null
          patient_name?: string
          phone?: string | null
          professional_service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_patient_records_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      id_counters: {
        Row: {
          created_at: string
          current_value: number
          description: string | null
          prefix: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          description?: string | null
          prefix: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          description?: string | null
          prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      id_generation_logs: {
        Row: {
          action: string
          created_at: string | null
          created_by: string | null
          id: string
          metadata: Json | null
          public_id: string
          scope: string
        }
        Insert: {
          action?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          public_id: string
          scope: string
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          public_id?: string
          scope?: string
        }
        Relationships: []
      }
      id_migration_map: {
        Row: {
          migrated_at: string
          new_id: string
          old_id: string
          prefix: string
          table_name: string
        }
        Insert: {
          migrated_at?: string
          new_id: string
          old_id: string
          prefix: string
          table_name: string
        }
        Update: {
          migrated_at?: string
          new_id?: string
          old_id?: string
          prefix?: string
          table_name?: string
        }
        Relationships: []
      }
      id_sequences: {
        Row: {
          created_at: string | null
          last_number: number
          prefix: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          last_number?: number
          prefix: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          last_number?: number
          prefix?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ids_reserved: {
        Row: {
          created_at: string | null
          created_by: string | null
          public_id: string
          scope: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          public_id: string
          scope: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          public_id?: string
          scope?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          completed_date: string | null
          content: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          prospect_id: string | null
          scheduled_date: string | null
          subject: string | null
          type: string
          vendor_id: string
        }
        Insert: {
          completed_date?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          prospect_id?: string | null
          scheduled_date?: string | null
          subject?: string | null
          type: string
          vendor_id: string
        }
        Update: {
          completed_date?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          prospect_id?: string | null
          scheduled_date?: string | null
          subject?: string | null
          type?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "interactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "interactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      international_shipments: {
        Row: {
          actual_delivery_date: string | null
          created_at: string | null
          customs_documents: Json | null
          customs_fees: number | null
          customs_status: string | null
          destination_country: string
          estimated_delivery_date: string | null
          id: string
          order_id: string
          origin_country: string
          shipping_cost: number | null
          total_weight_kg: number | null
          tracking_number: string
          transitaire_id: string
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          created_at?: string | null
          customs_documents?: Json | null
          customs_fees?: number | null
          customs_status?: string | null
          destination_country: string
          estimated_delivery_date?: string | null
          id?: string
          order_id: string
          origin_country: string
          shipping_cost?: number | null
          total_weight_kg?: number | null
          tracking_number: string
          transitaire_id: string
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          created_at?: string | null
          customs_documents?: Json | null
          customs_fees?: number | null
          customs_status?: string | null
          destination_country?: string
          estimated_delivery_date?: string | null
          id?: string
          order_id?: string
          origin_country?: string
          shipping_cost?: number | null
          total_weight_kg?: number | null
          tracking_number?: string
          transitaire_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "international_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "international_shipments_transitaire_id_fkey"
            columns: ["transitaire_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "international_shipments_transitaire_id_fkey"
            columns: ["transitaire_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          barcode: string | null
          cost_price: number | null
          expiry_date: string | null
          id: string
          last_updated: string | null
          location_details: string | null
          lot_number: string | null
          minimum_stock: number | null
          notes: string | null
          product_id: string
          quantity: number
          reorder_point: number | null
          reorder_quantity: number | null
          reserved_quantity: number | null
          sku: string | null
          supplier_id: string | null
          variant_id: string | null
          warehouse_id: string | null
          warehouse_location: string | null
        }
        Insert: {
          barcode?: string | null
          cost_price?: number | null
          expiry_date?: string | null
          id?: string
          last_updated?: string | null
          location_details?: string | null
          lot_number?: string | null
          minimum_stock?: number | null
          notes?: string | null
          product_id: string
          quantity?: number
          reorder_point?: number | null
          reorder_quantity?: number | null
          reserved_quantity?: number | null
          sku?: string | null
          supplier_id?: string | null
          variant_id?: string | null
          warehouse_id?: string | null
          warehouse_location?: string | null
        }
        Update: {
          barcode?: string | null
          cost_price?: number | null
          expiry_date?: string | null
          id?: string
          last_updated?: string | null
          location_details?: string | null
          lot_number?: string | null
          minimum_stock?: number | null
          notes?: string | null
          product_id?: string
          quantity?: number
          reorder_point?: number | null
          reorder_quantity?: number | null
          reserved_quantity?: number | null
          sku?: string | null
          supplier_id?: string | null
          variant_id?: string | null
          warehouse_id?: string | null
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          message: string
          product_id: string
          resolved_at: string | null
          severity: string | null
          vendor_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message: string
          product_id: string
          resolved_at?: string | null
          severity?: string | null
          vendor_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string
          product_id?: string
          resolved_at?: string | null
          severity?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "inventory_alerts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "inventory_alerts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_history: {
        Row: {
          created_at: string | null
          id: string
          movement_type: string
          new_quantity: number
          notes: string | null
          order_id: string | null
          previous_quantity: number
          product_id: string
          quantity_change: number
          user_id: string | null
          vendor_id: string
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          movement_type: string
          new_quantity: number
          notes?: string | null
          order_id?: string | null
          previous_quantity: number
          product_id: string
          quantity_change: number
          user_id?: string | null
          vendor_id: string
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          movement_type?: string
          new_quantity?: number
          notes?: string | null
          order_id?: string | null
          previous_quantity?: number
          product_id?: string
          quantity_change?: number
          user_id?: string | null
          vendor_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "inventory_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "inventory_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_history_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_address: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string | null
          discount: number
          due_date: string | null
          id: string
          items: Json
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          pdf_url: string | null
          quote_id: string | null
          ref: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          items: Json
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          quote_id?: string | null
          ref: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          quote_id?: string | null
          ref?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          clicked_count: number | null
          content: Json | null
          created_at: string | null
          id: string
          name: string
          opened_count: number | null
          scheduled_date: string | null
          sent_count: number | null
          status: string | null
          target_audience: Json | null
          type: string
          vendor_id: string
        }
        Insert: {
          clicked_count?: number | null
          content?: Json | null
          created_at?: string | null
          id?: string
          name: string
          opened_count?: number | null
          scheduled_date?: string | null
          sent_count?: number | null
          status?: string | null
          target_audience?: Json | null
          type: string
          vendor_id: string
        }
        Update: {
          clicked_count?: number | null
          content?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          opened_count?: number | null
          scheduled_date?: string | null
          sent_count?: number | null
          status?: string | null
          target_audience?: Json | null
          type?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          bureau_id: string | null
          cotisation_status: string | null
          created_at: string | null
          custom_id: string | null
          email: string | null
          id: string
          join_date: string | null
          last_cotisation_date: string | null
          last_login_at: string | null
          license_number: string | null
          locked_until: string | null
          login_attempts: number | null
          name: string
          password_hash: string | null
          phone: string | null
          status: string | null
          total_cotisations: number | null
          vehicle_serial: string | null
          vehicle_type: string | null
        }
        Insert: {
          bureau_id?: string | null
          cotisation_status?: string | null
          created_at?: string | null
          custom_id?: string | null
          email?: string | null
          id?: string
          join_date?: string | null
          last_cotisation_date?: string | null
          last_login_at?: string | null
          license_number?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          name: string
          password_hash?: string | null
          phone?: string | null
          status?: string | null
          total_cotisations?: number | null
          vehicle_serial?: string | null
          vehicle_type?: string | null
        }
        Update: {
          bureau_id?: string | null
          cotisation_status?: string | null
          created_at?: string | null
          custom_id?: string | null
          email?: string | null
          id?: string
          join_date?: string | null
          last_cotisation_date?: string | null
          last_login_at?: string | null
          license_number?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          name?: string
          password_hash?: string | null
          phone?: string | null
          status?: string | null
          total_cotisations?: number | null
          vehicle_serial?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "members_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "members_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          metadata: Json | null
          public_id: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
          status: string | null
          type: Database["public"]["Enums"]["message_type"] | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          public_id?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
          status?: string | null
          type?: Database["public"]["Enums"]["message_type"] | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          public_id?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          status?: string | null
          type?: Database["public"]["Enums"]["message_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_verifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          is_verified: boolean | null
          transaction_id: string | null
          user_id: string
          verification_code: string
          verification_method: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          is_verified?: boolean | null
          transaction_id?: string | null
          user_id: string
          verification_code: string
          verification_method: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          is_verified?: boolean | null
          transaction_id?: string | null
          user_id?: string
          verification_code?: string
          verification_method?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      ml_fraud_models: {
        Row: {
          accuracy: number | null
          created_at: string | null
          f1_score: number | null
          false_positives: number | null
          features_used: string[] | null
          id: string
          last_trained_at: string | null
          model_name: string
          model_type: string
          model_version: string
          precision_score: number | null
          recall_score: number | null
          status: string
          total_predictions: number | null
          training_data_size: number | null
          true_positives: number | null
          updated_at: string | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          f1_score?: number | null
          false_positives?: number | null
          features_used?: string[] | null
          id?: string
          last_trained_at?: string | null
          model_name: string
          model_type: string
          model_version: string
          precision_score?: number | null
          recall_score?: number | null
          status?: string
          total_predictions?: number | null
          training_data_size?: number | null
          true_positives?: number | null
          updated_at?: string | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          f1_score?: number | null
          false_positives?: number | null
          features_used?: string[] | null
          id?: string
          last_trained_at?: string | null
          model_name?: string
          model_type?: string
          model_version?: string
          precision_score?: number | null
          recall_score?: number | null
          status?: string
          total_predictions?: number | null
          training_data_size?: number | null
          true_positives?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ml_fraud_patterns: {
        Row: {
          confidence: number
          created_at: string | null
          description: string | null
          detection_rules: Json | null
          id: string
          is_active: boolean | null
          last_detected_at: string | null
          model_id: string | null
          occurrences: number | null
          pattern_name: string
          pattern_type: string
          risk_score: number
        }
        Insert: {
          confidence?: number
          created_at?: string | null
          description?: string | null
          detection_rules?: Json | null
          id?: string
          is_active?: boolean | null
          last_detected_at?: string | null
          model_id?: string | null
          occurrences?: number | null
          pattern_name: string
          pattern_type: string
          risk_score?: number
        }
        Update: {
          confidence?: number
          created_at?: string | null
          description?: string | null
          detection_rules?: Json | null
          id?: string
          is_active?: boolean | null
          last_detected_at?: string | null
          model_id?: string | null
          occurrences?: number | null
          pattern_name?: string
          pattern_type?: string
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ml_fraud_patterns_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_fraud_models"
            referencedColumns: ["id"]
          },
        ]
      }
      module_signatures: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          module_key: string
          module_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          module_key: string
          module_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          module_key?: string
          module_name?: string
        }
        Relationships: []
      }
      moneroo_payments: {
        Row: {
          amount: number
          checkout_url: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          payment_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      moto_security_alerts: {
        Row: {
          brand: string
          created_at: string | null
          description: string | null
          detected_bureau_id: string
          id: string
          model: string
          owner_name: string
          owner_phone: string
          plate_number: string
          reported_bureau_id: string
          reported_bureau_name: string
          reported_location: string
          serial_number: string
          status: string
          updated_at: string | null
        }
        Insert: {
          brand: string
          created_at?: string | null
          description?: string | null
          detected_bureau_id: string
          id?: string
          model: string
          owner_name: string
          owner_phone: string
          plate_number: string
          reported_bureau_id: string
          reported_bureau_name: string
          reported_location: string
          serial_number: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          brand?: string
          created_at?: string | null
          description?: string | null
          detected_bureau_id?: string
          id?: string
          model?: string
          owner_name?: string
          owner_phone?: string
          plate_number?: string
          reported_bureau_id?: string
          reported_bureau_name?: string
          reported_location?: string
          serial_number?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          customer_id: string
          discount_amount: number | null
          id: string
          metadata: Json | null
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          public_id: string | null
          shipping_address: Json
          shipping_amount: number | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          customer_id: string
          discount_amount?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          public_id?: string | null
          shipping_address: Json
          shipping_amount?: number | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          customer_id?: string
          discount_amount?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          public_id?: string | null
          shipping_address?: Json
          shipping_amount?: number | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          receiver_id: string
          sender_id: string
          status: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      pawapay_payments: {
        Row: {
          amount: number
          completed_at: string | null
          correspondent: string
          created_at: string
          currency: string
          deposit_id: string
          description: string | null
          id: string
          metadata: Json | null
          pawapay_response: Json | null
          phone_number: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          correspondent: string
          created_at?: string
          currency?: string
          deposit_id: string
          description?: string | null
          id?: string
          metadata?: Json | null
          pawapay_response?: Json | null
          phone_number: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          correspondent?: string
          created_at?: string
          currency?: string
          deposit_id?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          pawapay_response?: Json | null
          phone_number?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          devise: string
          expires_at: string
          frais: number
          id: string
          metadata: Json | null
          montant: number
          paid_at: string | null
          payment_id: string
          payment_method: string | null
          produit: string
          remise: number | null
          status: string
          total: number
          transaction_id: string | null
          type_remise: string | null
          updated_at: string
          vendeur_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          devise?: string
          expires_at: string
          frais?: number
          id?: string
          metadata?: Json | null
          montant: number
          paid_at?: string | null
          payment_id: string
          payment_method?: string | null
          produit: string
          remise?: number | null
          status?: string
          total: number
          transaction_id?: string | null
          type_remise?: string | null
          updated_at?: string
          vendeur_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          devise?: string
          expires_at?: string
          frais?: number
          id?: string
          metadata?: Json | null
          montant?: number
          paid_at?: string | null
          payment_id?: string
          payment_method?: string | null
          produit?: string
          remise?: number | null
          status?: string
          total?: number
          transaction_id?: string | null
          type_remise?: string | null
          updated_at?: string
          vendeur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_vendeur_id_fkey"
            columns: ["vendeur_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "payment_links_vendeur_id_fkey"
            columns: ["vendeur_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "payment_links_vendeur_id_fkey"
            columns: ["vendeur_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          metadata: Json | null
          method_type: string
          phone_number: string | null
          provider: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          method_type: string
          phone_number?: string | null
          provider?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          method_type?: string
          phone_number?: string | null
          provider?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_schedules: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          order_id: string
          paid_at: string | null
          payment_method: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          order_id: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pdg_financial_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          related_actor_id: string | null
          related_transaction_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          related_actor_id?: string | null
          related_transaction_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          related_actor_id?: string | null
          related_transaction_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      pdg_financial_control: {
        Row: {
          activated_at: string | null
          activated_by: string
          affected_types: string[] | null
          control_type: string
          deactivated_at: string | null
          deactivated_by: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          reason: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by: string
          affected_types?: string[] | null
          control_type: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          reason?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string
          affected_types?: string[] | null
          control_type?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      pdg_financial_stats: {
        Row: {
          created_at: string | null
          failed_transactions: number | null
          id: string
          quarantined_transactions: number | null
          stat_date: string | null
          stat_hour: number | null
          successful_transactions: number | null
          total_fees_collected: number | null
          total_transactions: number | null
          total_volume: number | null
          transactions_by_type: Json | null
          updated_at: string | null
          volume_by_actor_type: Json | null
        }
        Insert: {
          created_at?: string | null
          failed_transactions?: number | null
          id?: string
          quarantined_transactions?: number | null
          stat_date?: string | null
          stat_hour?: number | null
          successful_transactions?: number | null
          total_fees_collected?: number | null
          total_transactions?: number | null
          total_volume?: number | null
          transactions_by_type?: Json | null
          updated_at?: string | null
          volume_by_actor_type?: Json | null
        }
        Update: {
          created_at?: string | null
          failed_transactions?: number | null
          id?: string
          quarantined_transactions?: number | null
          stat_date?: string | null
          stat_hour?: number | null
          successful_transactions?: number | null
          total_fees_collected?: number | null
          total_transactions?: number | null
          total_volume?: number | null
          transactions_by_type?: Json | null
          updated_at?: string | null
          volume_by_actor_type?: Json | null
        }
        Relationships: []
      }
      pdg_management: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          permissions: Json | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          permissions?: Json | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          permissions?: Json | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pdg_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
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
      performance_metrics: {
        Row: {
          endpoint: string | null
          id: string
          method: string | null
          response_time: number | null
          status_code: number | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          endpoint?: string | null
          id?: string
          method?: string | null
          response_time?: number | null
          status_code?: number | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          endpoint?: string | null
          id?: string
          method?: string | null
          response_time?: number | null
          status_code?: number | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          allowed: boolean
          created_at: string
          id: string
          role_id: string
        }
        Insert: {
          action: string
          allowed?: boolean
          created_at?: string
          id?: string
          role_id: string
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string
          id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_price_history: {
        Row: {
          changed_at: string | null
          changed_by: string
          id: string
          new_price: number
          old_price: number
          plan_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          id?: string
          new_price: number
          old_price: number
          plan_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          id?: string
          new_price?: number
          old_price?: number
          plan_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_price_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          analytics_access: boolean | null
          api_access: boolean | null
          created_at: string | null
          custom_branding: boolean | null
          display_name: string
          display_order: number | null
          featured_products: boolean | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_images_per_product: number | null
          max_products: number | null
          monthly_price_gnf: number
          name: string
          priority_support: boolean | null
          updated_at: string | null
          yearly_discount_percentage: number | null
          yearly_price_gnf: number | null
        }
        Insert: {
          analytics_access?: boolean | null
          api_access?: boolean | null
          created_at?: string | null
          custom_branding?: boolean | null
          display_name: string
          display_order?: number | null
          featured_products?: boolean | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_images_per_product?: number | null
          max_products?: number | null
          monthly_price_gnf: number
          name: string
          priority_support?: boolean | null
          updated_at?: string | null
          yearly_discount_percentage?: number | null
          yearly_price_gnf?: number | null
        }
        Update: {
          analytics_access?: boolean | null
          api_access?: boolean | null
          created_at?: string | null
          custom_branding?: boolean | null
          display_name?: string
          display_order?: number | null
          featured_products?: boolean | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_images_per_product?: number | null
          max_products?: number | null
          monthly_price_gnf?: number
          name?: string
          priority_support?: boolean | null
          updated_at?: string | null
          yearly_discount_percentage?: number | null
          yearly_price_gnf?: number | null
        }
        Relationships: []
      }
      platform_revenue: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          metadata: Json | null
          revenue_type: string
          source_transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          revenue_type: string
          source_transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          revenue_type?: string
          source_transaction_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      pos_settings: {
        Row: {
          auto_print_receipt: boolean | null
          company_name: string | null
          created_at: string
          currency: string
          id: string
          logo_url: string | null
          receipt_footer: string | null
          tax_enabled: boolean
          tax_rate: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          auto_print_receipt?: boolean | null
          company_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          receipt_footer?: string | null
          tax_enabled?: boolean
          tax_rate?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          auto_print_receipt?: boolean | null
          company_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          receipt_footer?: string | null
          tax_enabled?: boolean
          tax_rate?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      pricing_zones: {
        Row: {
          base_price: number
          coordinates: unknown
          created_at: string | null
          id: string
          is_active: boolean | null
          price_per_km: number
          surge_multiplier: number | null
          updated_at: string | null
          zone_name: string
        }
        Insert: {
          base_price?: number
          coordinates: unknown
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          price_per_km?: number
          surge_multiplier?: number | null
          updated_at?: string | null
          zone_name: string
        }
        Update: {
          base_price?: number
          coordinates?: unknown
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          price_per_km?: number
          surge_multiplier?: number | null
          updated_at?: string | null
          zone_name?: string
        }
        Relationships: []
      }
      product_recommendations: {
        Row: {
          based_on_product_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          reason: string | null
          recommended_product_id: string
          score: number | null
          user_id: string
        }
        Insert: {
          based_on_product_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          reason?: string | null
          recommended_product_id: string
          score?: number | null
          user_id: string
        }
        Update: {
          based_on_product_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          reason?: string | null
          recommended_product_id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          content: string
          created_at: string | null
          helpful_count: number | null
          id: string
          is_approved: boolean | null
          not_helpful_count: number | null
          order_id: string | null
          photos: Json | null
          product_id: string
          rating: number
          title: string
          updated_at: string | null
          user_id: string
          vendor_response: string | null
          vendor_response_at: string | null
          verified_purchase: boolean | null
        }
        Insert: {
          content: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          not_helpful_count?: number | null
          order_id?: string | null
          photos?: Json | null
          product_id: string
          rating: number
          title: string
          updated_at?: string | null
          user_id: string
          vendor_response?: string | null
          vendor_response_at?: string | null
          verified_purchase?: boolean | null
        }
        Update: {
          content?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          not_helpful_count?: number | null
          order_id?: string | null
          photos?: Json | null
          product_id?: string
          rating?: number
          title?: string
          updated_at?: string | null
          user_id?: string
          vendor_response?: string | null
          vendor_response_at?: string | null
          verified_purchase?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json | null
          created_at: string | null
          id: string
          name: string
          price: number | null
          product_id: string
          sku: string | null
          stock_quantity: number | null
        }
        Insert: {
          attributes?: Json | null
          created_at?: string | null
          id?: string
          name: string
          price?: number | null
          product_id: string
          sku?: string | null
          stock_quantity?: number | null
        }
        Update: {
          attributes?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          id: string
          metadata: Json | null
          product_id: string
          session_id: string | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          metadata?: Json | null
          product_id: string
          session_id?: string | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          metadata?: Json | null
          product_id?: string
          session_id?: string | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          carton_sku: string | null
          category_id: string | null
          compare_price: number | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          dimensions: Json | null
          free_shipping: boolean | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          is_hot: boolean | null
          low_stock_threshold: number | null
          name: string
          price: number
          price_carton: number | null
          public_id: string | null
          rating: number | null
          reviews_count: number | null
          sell_by_carton: boolean | null
          seo_description: string | null
          seo_title: string | null
          sku: string | null
          stock_quantity: number | null
          tags: string[] | null
          units_per_carton: number | null
          updated_at: string | null
          vendor_id: string
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          carton_sku?: string | null
          category_id?: string | null
          compare_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          free_shipping?: boolean | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_hot?: boolean | null
          low_stock_threshold?: number | null
          name: string
          price: number
          price_carton?: number | null
          public_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          sell_by_carton?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          units_per_carton?: number | null
          updated_at?: string | null
          vendor_id: string
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          carton_sku?: string | null
          category_id?: string | null
          compare_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          free_shipping?: boolean | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_hot?: boolean | null
          low_stock_threshold?: number | null
          name?: string
          price?: number
          price_carton?: number | null
          public_id?: string | null
          rating?: number | null
          reviews_count?: number | null
          sell_by_carton?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          units_per_carton?: number | null
          updated_at?: string | null
          vendor_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_services: {
        Row: {
          address: string | null
          business_documents: Json | null
          business_name: string
          city: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          metadata: Json | null
          neighborhood: string | null
          opening_hours: Json | null
          phone: string | null
          rating: number | null
          service_type_id: string
          status: string | null
          total_orders: number | null
          total_revenue: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
          verification_status: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_documents?: Json | null
          business_name: string
          city?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          metadata?: Json | null
          neighborhood?: string | null
          opening_hours?: Json | null
          phone?: string | null
          rating?: number | null
          service_type_id: string
          status?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_documents?: Json | null
          business_name?: string
          city?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          metadata?: Json | null
          neighborhood?: string | null
          opening_hours?: Json | null
          phone?: string | null
          rating?: number | null
          service_type_id?: string
          status?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_services_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string | null
          custom_id: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          public_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          custom_id?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          public_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          custom_id?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          public_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          minimum_order_amount: number | null
          usage_limit: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
          vendor_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          minimum_order_amount?: number | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
          vendor_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          minimum_order_amount?: number | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "promo_codes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "promo_codes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string | null
          description: string | null
          discount_type: string | null
          discount_value: number
          end_date: string
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          name: string
          start_date: string
          updated_at: string | null
          usage_limit: number | null
          used_count: number | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value: number
          end_date: string
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          name: string
          start_date: string
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          name?: string
          start_date?: string
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "promotions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "promotions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          company: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          estimated_value: number | null
          id: string
          name: string
          next_followup_date: string | null
          notes: string | null
          status: string | null
          success_probability: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          company?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          estimated_value?: number | null
          id?: string
          name: string
          next_followup_date?: string | null
          notes?: string | null
          status?: string | null
          success_probability?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          company?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          estimated_value?: number | null
          id?: string
          name?: string
          next_followup_date?: string | null
          notes?: string | null
          status?: string | null
          success_probability?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "prospects_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "prospects_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          is_sent: boolean | null
          priority: string | null
          read_at: string | null
          sent_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          is_sent?: boolean | null
          priority?: string | null
          read_at?: string | null
          sent_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          is_sent?: boolean | null
          priority?: string | null
          read_at?: string | null
          sent_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pwa_installations: {
        Row: {
          bureau_id: string
          created_at: string | null
          id: string
          installed_at: string | null
          ip_address: string | null
          is_mobile: boolean | null
          platform: string | null
          token: string | null
          user_agent: string | null
        }
        Insert: {
          bureau_id: string
          created_at?: string | null
          id?: string
          installed_at?: string | null
          ip_address?: string | null
          is_mobile?: boolean | null
          platform?: string | null
          token?: string | null
          user_agent?: string | null
        }
        Update: {
          bureau_id?: string
          created_at?: string | null
          id?: string
          installed_at?: string | null
          ip_address?: string | null
          is_mobile?: boolean | null
          platform?: string | null
          token?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pwa_installations_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "pwa_installations_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "pwa_installations_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
        ]
      }
      pwa_tokens: {
        Row: {
          bureau_id: string
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          used_at: string | null
        }
        Insert: {
          bureau_id: string
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          used_at?: string | null
        }
        Update: {
          bureau_id?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pwa_tokens_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "pwa_tokens_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "pwa_tokens_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_address: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string | null
          discount: number
          id: string
          items: Json
          notes: string | null
          pdf_url: string | null
          ref: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string | null
          valid_until: string
          vendor_id: string
        }
        Insert: {
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string | null
          discount?: number
          id?: string
          items: Json
          notes?: string | null
          pdf_url?: string | null
          ref: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string | null
          valid_until: string
          vendor_id: string
        }
        Update: {
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          discount?: number
          id?: string
          items?: Json
          notes?: string | null
          pdf_url?: string | null
          ref?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string | null
          valid_until?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "quotes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "quotes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          count: number | null
          created_at: string | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          action: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          action?: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      realestate_properties: {
        Row: {
          address: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string | null
          description: string | null
          features: string[] | null
          id: string
          images: string[] | null
          price: number
          professional_service_id: string
          property_type: string | null
          status: string | null
          surface_area: number | null
          title: string
          transaction_type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          images?: string[] | null
          price: number
          professional_service_id: string
          property_type?: string | null
          status?: string | null
          surface_area?: number | null
          title: string
          transaction_type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          images?: string[] | null
          price?: number
          professional_service_id?: string
          property_type?: string | null
          status?: string | null
          surface_area?: number | null
          title?: string
          transaction_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "realestate_properties_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      realestate_visits: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          property_id: string
          status: string | null
          updated_at: string | null
          visit_date: string
          visit_time: string
          visitor_email: string | null
          visitor_name: string
          visitor_phone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          property_id: string
          status?: string | null
          updated_at?: string | null
          visit_date: string
          visit_time: string
          visitor_email?: string | null
          visitor_name: string
          visitor_phone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          property_id?: string
          status?: string | null
          updated_at?: string | null
          visit_date?: string
          visit_time?: string
          visitor_email?: string | null
          visitor_name?: string
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "realestate_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "realestate_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      registered_motos: {
        Row: {
          brand: string | null
          bureau_id: string | null
          color: string | null
          documents: Json | null
          id: string
          metadata: Json | null
          model: string | null
          owner_name: string | null
          owner_phone: string | null
          photos: Json | null
          plate_number: string | null
          registration_date: string | null
          serial_number: string
          status: string | null
          vest_number: string | null
          worker_id: string | null
          year: number | null
        }
        Insert: {
          brand?: string | null
          bureau_id?: string | null
          color?: string | null
          documents?: Json | null
          id?: string
          metadata?: Json | null
          model?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          photos?: Json | null
          plate_number?: string | null
          registration_date?: string | null
          serial_number: string
          status?: string | null
          vest_number?: string | null
          worker_id?: string | null
          year?: number | null
        }
        Update: {
          brand?: string | null
          bureau_id?: string | null
          color?: string | null
          documents?: Json | null
          id?: string
          metadata?: Json | null
          model?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          photos?: Json | null
          plate_number?: string | null
          registration_date?: string | null
          serial_number?: string
          status?: string | null
          vest_number?: string | null
          worker_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registered_motos_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "registered_motos_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "registered_motos_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registered_motos_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "syndicate_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_orders: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          order_type: string | null
          professional_service_id: string
          status: string | null
          subtotal: number | null
          table_number: string | null
          tax: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_type?: string | null
          professional_service_id: string
          status?: string | null
          subtotal?: number | null
          table_number?: string | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_type?: string | null
          professional_service_id?: string
          status?: string | null
          subtotal?: number | null
          table_number?: string | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_orders_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_reservations: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          party_size: number | null
          professional_service_id: string
          reservation_date: string
          reservation_time: string
          special_requests: string | null
          status: string | null
          table_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          party_size?: number | null
          professional_service_id: string
          reservation_date: string
          reservation_time: string
          special_requests?: string | null
          status?: string | null
          table_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          party_size?: number | null
          professional_service_id?: string
          reservation_date?: string
          reservation_time?: string
          special_requests?: string | null
          status?: string | null
          table_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_reservations_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_staff: {
        Row: {
          created_at: string | null
          email: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          name: string
          phone: string | null
          professional_service_id: string
          role: string
          schedule: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          phone?: string | null
          professional_service_id: string
          role: string
          schedule?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          phone?: string | null
          professional_service_id?: string
          role?: string
          schedule?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_staff_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_stock: {
        Row: {
          category: string | null
          cost_per_unit: number | null
          created_at: string | null
          expiry_date: string | null
          id: string
          is_low_stock: boolean | null
          last_restock_date: string | null
          min_quantity: number | null
          name: string
          professional_service_id: string
          quantity: number
          supplier: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          is_low_stock?: boolean | null
          last_restock_date?: string | null
          min_quantity?: number | null
          name: string
          professional_service_id: string
          quantity?: number
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          is_low_stock?: boolean | null
          last_restock_date?: string | null
          min_quantity?: number | null
          name?: string
          professional_service_id?: string
          quantity?: number
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_stock_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      revenus_pdg: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json | null
          percentage_applied: number
          service_id: string | null
          source_type: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          percentage_applied: number
          service_id?: string | null
          source_type: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          percentage_applied?: number
          service_id?: string | null
          source_type?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string
          driver_id: string | null
          id: string
          images: string[] | null
          is_verified: boolean | null
          product_id: string | null
          rating: number
          title: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id: string
          driver_id?: string | null
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          product_id?: string | null
          rating: number
          title?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string
          driver_id?: string | null
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          product_id?: string | null
          rating?: number
          title?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          actual_fare: number | null
          completion_time: string | null
          created_at: string | null
          customer_id: string
          customer_rating: number | null
          destination_address: Json
          destination_location: unknown
          distance_km: number | null
          driver_id: string | null
          driver_rating: number | null
          duration_minutes: number | null
          estimated_fare: number | null
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          pickup_address: Json
          pickup_location: unknown
          pickup_time: string | null
          scheduled_time: string | null
          status: Database["public"]["Enums"]["ride_status"] | null
          updated_at: string | null
        }
        Insert: {
          actual_fare?: number | null
          completion_time?: string | null
          created_at?: string | null
          customer_id: string
          customer_rating?: number | null
          destination_address: Json
          destination_location: unknown
          distance_km?: number | null
          driver_id?: string | null
          driver_rating?: number | null
          duration_minutes?: number | null
          estimated_fare?: number | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          pickup_address: Json
          pickup_location: unknown
          pickup_time?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["ride_status"] | null
          updated_at?: string | null
        }
        Update: {
          actual_fare?: number | null
          completion_time?: string | null
          created_at?: string | null
          customer_id?: string
          customer_rating?: number | null
          destination_address?: Json
          destination_location?: unknown
          distance_km?: number | null
          driver_id?: string | null
          driver_rating?: number | null
          duration_minutes?: number | null
          estimated_fare?: number | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          pickup_address?: Json
          pickup_location?: unknown
          pickup_time?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["ride_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      secure_logs: {
        Row: {
          category: string
          created_at: string | null
          id: string
          ip_address: string | null
          level: string
          message: string
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          level: string
          message: string
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          level?: string
          message?: string
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          auto_actions: Json | null
          created_at: string | null
          description: string
          id: string
          incident_id: string | null
          severity: string
          source: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          auto_actions?: Json | null
          created_at?: string | null
          description: string
          id?: string
          incident_id?: string | null
          severity: string
          source?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          auto_actions?: Json | null
          created_at?: string | null
          description?: string
          id?: string
          incident_id?: string | null
          severity?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "security_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string | null
          details: Json | null
          id: string
          incident_id: string | null
          ip_address: unknown
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          incident_id?: string | null
          ip_address?: unknown
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          incident_id?: string | null
          ip_address?: unknown
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_logs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "security_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      security_certifications: {
        Row: {
          certificate_url: string | null
          certification_type: string
          created_at: string | null
          description: string | null
          id: string
          issuing_authority: string | null
          metadata: Json | null
          name: string
          progress: number
          status: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          certificate_url?: string | null
          certification_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          issuing_authority?: string | null
          metadata?: Json | null
          name: string
          progress?: number
          status?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          certificate_url?: string | null
          certification_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          issuing_authority?: string | null
          metadata?: Json | null
          name?: string
          progress?: number
          status?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      security_detection_rules: {
        Row: {
          action: string
          conditions: Json
          created_at: string | null
          false_positive_count: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          metadata: Json | null
          name: string
          rule_type: string
          severity: string
          threshold: Json | null
          true_positive_count: number | null
        }
        Insert: {
          action: string
          conditions: Json
          created_at?: string | null
          false_positive_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          metadata?: Json | null
          name: string
          rule_type: string
          severity: string
          threshold?: Json | null
          true_positive_count?: number | null
        }
        Update: {
          action?: string
          conditions?: Json
          created_at?: string | null
          false_positive_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          metadata?: Json | null
          name?: string
          rule_type?: string
          severity?: string
          threshold?: Json | null
          true_positive_count?: number | null
        }
        Relationships: []
      }
      security_incidents: {
        Row: {
          affected_users: string[] | null
          assigned_to: string | null
          contained_at: string | null
          created_at: string | null
          description: string | null
          detected_at: string | null
          id: string
          incident_type: string
          indicators: Json | null
          investigated_at: string | null
          resolved_at: string | null
          severity: string
          source_ip: unknown
          status: string
          title: string
        }
        Insert: {
          affected_users?: string[] | null
          assigned_to?: string | null
          contained_at?: string | null
          created_at?: string | null
          description?: string | null
          detected_at?: string | null
          id?: string
          incident_type: string
          indicators?: Json | null
          investigated_at?: string | null
          resolved_at?: string | null
          severity: string
          source_ip?: unknown
          status?: string
          title: string
        }
        Update: {
          affected_users?: string[] | null
          assigned_to?: string | null
          contained_at?: string | null
          created_at?: string | null
          description?: string | null
          detected_at?: string | null
          id?: string
          incident_type?: string
          indicators?: Json | null
          investigated_at?: string | null
          resolved_at?: string | null
          severity?: string
          source_ip?: unknown
          status?: string
          title?: string
        }
        Relationships: []
      }
      security_keys: {
        Row: {
          compromised_at: string | null
          created_at: string | null
          id: string
          is_compromised: boolean | null
          key_name: string
          key_type: string
          last_rotated_at: string | null
          metadata: Json | null
          next_rotation_at: string | null
          rotation_frequency_days: number | null
          status: string
        }
        Insert: {
          compromised_at?: string | null
          created_at?: string | null
          id?: string
          is_compromised?: boolean | null
          key_name: string
          key_type: string
          last_rotated_at?: string | null
          metadata?: Json | null
          next_rotation_at?: string | null
          rotation_frequency_days?: number | null
          status?: string
        }
        Update: {
          compromised_at?: string | null
          created_at?: string | null
          id?: string
          is_compromised?: boolean | null
          key_name?: string
          key_type?: string
          last_rotated_at?: string | null
          metadata?: Json | null
          next_rotation_at?: string | null
          rotation_frequency_days?: number | null
          status?: string
        }
        Relationships: []
      }
      security_metrics: {
        Row: {
          alerts_count: number | null
          blocked_ips_count: number | null
          created_at: string | null
          false_positives: number | null
          id: string
          incidents_count: number | null
          metadata: Json | null
          metric_date: string
          mttd_minutes: number | null
          mttr_minutes: number | null
          true_positives: number | null
        }
        Insert: {
          alerts_count?: number | null
          blocked_ips_count?: number | null
          created_at?: string | null
          false_positives?: number | null
          id?: string
          incidents_count?: number | null
          metadata?: Json | null
          metric_date: string
          mttd_minutes?: number | null
          mttr_minutes?: number | null
          true_positives?: number | null
        }
        Update: {
          alerts_count?: number | null
          blocked_ips_count?: number | null
          created_at?: string | null
          false_positives?: number | null
          id?: string
          incidents_count?: number | null
          metadata?: Json | null
          metric_date?: string
          mttd_minutes?: number | null
          mttr_minutes?: number | null
          true_positives?: number | null
        }
        Relationships: []
      }
      security_playbooks: {
        Row: {
          auto_execute: boolean | null
          created_at: string | null
          execution_count: number | null
          id: string
          incident_type: string
          is_active: boolean | null
          last_executed_at: string | null
          metadata: Json | null
          name: string
          severity_threshold: string | null
          steps: Json
          updated_at: string | null
        }
        Insert: {
          auto_execute?: boolean | null
          created_at?: string | null
          execution_count?: number | null
          id?: string
          incident_type: string
          is_active?: boolean | null
          last_executed_at?: string | null
          metadata?: Json | null
          name: string
          severity_threshold?: string | null
          steps: Json
          updated_at?: string | null
        }
        Update: {
          auto_execute?: boolean | null
          created_at?: string | null
          execution_count?: number | null
          id?: string
          incident_type?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          metadata?: Json | null
          name?: string
          severity_threshold?: string | null
          steps?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      security_snapshots: {
        Row: {
          created_at: string | null
          id: string
          incident_id: string | null
          metadata: Json | null
          snapshot_hash: string | null
          snapshot_type: string
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          incident_id?: string | null
          metadata?: Json | null
          snapshot_hash?: string | null
          snapshot_type: string
          storage_path: string
        }
        Update: {
          created_at?: string | null
          id?: string
          incident_id?: string | null
          metadata?: Json | null
          snapshot_hash?: string | null
          snapshot_type?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_snapshots_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "security_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          booking_type: string
          client_id: string
          commission_amount: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          payment_status: string | null
          professional_service_id: string
          scheduled_date: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          booking_type: string
          client_id: string
          commission_amount?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_status?: string | null
          professional_service_id: string
          scheduled_date?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          booking_type?: string
          client_id?: string
          commission_amount?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_status?: string | null
          professional_service_id?: string
          scheduled_date?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plan_price_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_price: number
          old_price: number
          plan_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_price: number
          old_price: number
          plan_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_price?: number
          old_price?: number
          plan_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_plan_price_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plans: {
        Row: {
          analytics_access: boolean | null
          api_access: boolean | null
          created_at: string | null
          custom_branding: boolean | null
          description: string | null
          display_name: string
          display_order: number | null
          email_notifications: boolean | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_bookings_per_month: number | null
          max_products: number | null
          max_staff: number | null
          monthly_price_gnf: number
          name: string
          priority_listing: boolean | null
          service_type_id: string | null
          sms_notifications: boolean | null
          updated_at: string | null
          yearly_discount_percentage: number | null
          yearly_price_gnf: number | null
        }
        Insert: {
          analytics_access?: boolean | null
          api_access?: boolean | null
          created_at?: string | null
          custom_branding?: boolean | null
          description?: string | null
          display_name: string
          display_order?: number | null
          email_notifications?: boolean | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_bookings_per_month?: number | null
          max_products?: number | null
          max_staff?: number | null
          monthly_price_gnf?: number
          name: string
          priority_listing?: boolean | null
          service_type_id?: string | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          yearly_discount_percentage?: number | null
          yearly_price_gnf?: number | null
        }
        Update: {
          analytics_access?: boolean | null
          api_access?: boolean | null
          created_at?: string | null
          custom_branding?: boolean | null
          description?: string | null
          display_name?: string
          display_order?: number | null
          email_notifications?: boolean | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_bookings_per_month?: number | null
          max_products?: number | null
          max_staff?: number | null
          monthly_price_gnf?: number
          name?: string
          priority_listing?: boolean | null
          service_type_id?: string | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          yearly_discount_percentage?: number | null
          yearly_price_gnf?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_plans_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_products: {
        Row: {
          category: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string | null
          id: string
          images: Json | null
          is_available: boolean | null
          metadata: Json | null
          name: string
          price: number
          professional_service_id: string
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_available?: boolean | null
          metadata?: Json | null
          name: string
          price: number
          professional_service_id: string
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_available?: boolean | null
          metadata?: Json | null
          name?: string
          price?: number
          professional_service_id?: string
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_products_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          booking_id: string | null
          client_id: string
          comment: string | null
          created_at: string | null
          id: string
          images: Json | null
          is_verified: boolean | null
          professional_service_id: string
          rating: number
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          client_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          images?: Json | null
          is_verified?: boolean | null
          professional_service_id: string
          rating: number
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          client_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          images?: Json | null
          is_verified?: boolean | null
          professional_service_id?: string
          rating?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_subscription_payments: {
        Row: {
          amount_gnf: number
          created_at: string | null
          id: string
          metadata: Json | null
          payment_method: string
          status: string | null
          subscription_id: string
          transaction_reference: string | null
          user_id: string
        }
        Insert: {
          amount_gnf: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_method: string
          status?: string | null
          subscription_id: string
          transaction_reference?: string | null
          user_id: string
        }
        Update: {
          amount_gnf?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string
          status?: string | null
          subscription_id?: string
          transaction_reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "service_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_subscriptions: {
        Row: {
          auto_renew: boolean | null
          billing_cycle: string
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          payment_transaction_id: string | null
          plan_id: string
          price_paid_gnf: number
          professional_service_id: string
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_transaction_id?: string | null
          plan_id: string
          price_paid_gnf?: number
          professional_service_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_transaction_id?: string | null
          plan_id?: string
          price_paid_gnf?: number
          professional_service_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_subscriptions_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          category: string | null
          code: string
          commission_rate: number | null
          created_at: string | null
          description: string | null
          features: Json | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code: string
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shipment_tracking: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          shipment_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          shipment_id: string
          status: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          shipment_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_tracking_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          cash_on_delivery: boolean | null
          cod_amount: number | null
          created_at: string | null
          current_location: string | null
          delivery_date: string | null
          id: string
          insurance: boolean | null
          insurance_amount: number | null
          item_type: string | null
          package_description: string | null
          pickup_date: string | null
          pieces_count: number
          receiver_address: string
          receiver_name: string
          receiver_phone: string
          return_option: boolean | null
          sender_address: string
          sender_name: string
          sender_phone: string
          status: string
          tracking_number: string
          updated_at: string | null
          vendor_id: string
          weight: number
        }
        Insert: {
          cash_on_delivery?: boolean | null
          cod_amount?: number | null
          created_at?: string | null
          current_location?: string | null
          delivery_date?: string | null
          id?: string
          insurance?: boolean | null
          insurance_amount?: number | null
          item_type?: string | null
          package_description?: string | null
          pickup_date?: string | null
          pieces_count?: number
          receiver_address: string
          receiver_name: string
          receiver_phone: string
          return_option?: boolean | null
          sender_address: string
          sender_name: string
          sender_phone: string
          status?: string
          tracking_number: string
          updated_at?: string | null
          vendor_id: string
          weight?: number
        }
        Update: {
          cash_on_delivery?: boolean | null
          cod_amount?: number | null
          created_at?: string | null
          current_location?: string | null
          delivery_date?: string | null
          id?: string
          insurance?: boolean | null
          insurance_amount?: number | null
          item_type?: string | null
          package_description?: string | null
          pickup_date?: string | null
          pieces_count?: number
          receiver_address?: string
          receiver_name?: string
          receiver_phone?: string
          return_option?: boolean | null
          sender_address?: string
          sender_name?: string
          sender_phone?: string
          status?: string
          tracking_number?: string
          updated_at?: string | null
          vendor_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "shipments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "shipments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      soc_analysts: {
        Row: {
          analyst_role: string
          created_at: string | null
          current_cases: number | null
          email: string
          id: string
          is_on_call: boolean | null
          last_activity_at: string | null
          max_cases: number | null
          name: string
          shift_end: string | null
          shift_start: string | null
          specialization: string[] | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analyst_role?: string
          created_at?: string | null
          current_cases?: number | null
          email: string
          id?: string
          is_on_call?: boolean | null
          last_activity_at?: string | null
          max_cases?: number | null
          name: string
          shift_end?: string | null
          shift_start?: string | null
          specialization?: string[] | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analyst_role?: string
          created_at?: string | null
          current_cases?: number | null
          email?: string
          id?: string
          is_on_call?: boolean | null
          last_activity_at?: string | null
          max_cases?: number | null
          name?: string
          shift_end?: string | null
          shift_start?: string | null
          specialization?: string[] | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      soc_investigations: {
        Row: {
          alert_id: string | null
          analyst_id: string | null
          closed_at: string | null
          created_at: string | null
          description: string | null
          escalated_to: string | null
          evidence: Json | null
          findings: string | null
          id: string
          incident_id: string | null
          investigation_type: string
          priority: string
          recommended_actions: string[] | null
          resolution_notes: string | null
          started_at: string | null
          status: string
          time_spent_minutes: number | null
          timeline: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          alert_id?: string | null
          analyst_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          escalated_to?: string | null
          evidence?: Json | null
          findings?: string | null
          id?: string
          incident_id?: string | null
          investigation_type: string
          priority?: string
          recommended_actions?: string[] | null
          resolution_notes?: string | null
          started_at?: string | null
          status?: string
          time_spent_minutes?: number | null
          timeline?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          alert_id?: string | null
          analyst_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          escalated_to?: string | null
          evidence?: Json | null
          findings?: string | null
          id?: string
          incident_id?: string | null
          investigation_type?: string
          priority?: string
          recommended_actions?: string[] | null
          resolution_notes?: string | null
          started_at?: string | null
          status?: string
          time_spent_minutes?: number | null
          timeline?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soc_investigations_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "security_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soc_investigations_analyst_id_fkey"
            columns: ["analyst_id"]
            isOneToOne: false
            referencedRelation: "soc_analysts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soc_investigations_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "security_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_alerts: {
        Row: {
          accuracy: number | null
          address: string | null
          alert_type: string | null
          bureau_id: string | null
          created_at: string | null
          description: string | null
          direction: number | null
          driver_name: string | null
          driver_phone: string | null
          gps_history: Json | null
          id: string
          latitude: number | null
          longitude: number | null
          member_name: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          speed: number | null
          status: string | null
          taxi_driver_id: string | null
          updated_at: string | null
          vehicle_serial: string | null
        }
        Insert: {
          accuracy?: number | null
          address?: string | null
          alert_type?: string | null
          bureau_id?: string | null
          created_at?: string | null
          description?: string | null
          direction?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          gps_history?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          member_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          speed?: number | null
          status?: string | null
          taxi_driver_id?: string | null
          updated_at?: string | null
          vehicle_serial?: string | null
        }
        Update: {
          accuracy?: number | null
          address?: string | null
          alert_type?: string | null
          bureau_id?: string | null
          created_at?: string | null
          description?: string | null
          direction?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          gps_history?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          member_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          speed?: number | null
          status?: string | null
          taxi_driver_id?: string | null
          updated_at?: string | null
          vehicle_serial?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_alerts_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "sos_alerts_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "sos_alerts_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_media: {
        Row: {
          created_at: string | null
          driver_id: string | null
          driver_name: string | null
          duration_seconds: number | null
          file_path: string
          file_url: string
          id: string
          is_viewed: boolean | null
          media_type: string
          sos_alert_id: string
          viewed_at: string | null
          viewed_by: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id?: string | null
          driver_name?: string | null
          duration_seconds?: number | null
          file_path: string
          file_url: string
          id?: string
          is_viewed?: boolean | null
          media_type: string
          sos_alert_id: string
          viewed_at?: string | null
          viewed_by?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string | null
          driver_name?: string | null
          duration_seconds?: number | null
          file_path?: string
          file_url?: string
          id?: string
          is_viewed?: boolean | null
          media_type?: string
          sos_alert_id?: string
          viewed_at?: string | null
          viewed_by?: string | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          from_warehouse_id: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          to_warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          to_warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          to_warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean | null
          billing_cycle: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          payment_transaction_id: string | null
          plan_id: string
          price_paid_gnf: number
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          billing_cycle?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_transaction_id?: string | null
          plan_id: string
          price_paid_gnf: number
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          billing_cycle?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_transaction_id?: string | null
          plan_id?: string
          price_paid_gnf?: number
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          payment_terms: number | null
          phone: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          payment_terms?: number | null
          phone?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          payment_terms?: number | null
          phone?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "suppliers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "suppliers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_internal: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          priority: string
          requester_id: string
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          closed_at?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string
          requester_id: string
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          requester_id?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "support_tickets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "support_tickets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      suspicious_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          severity: string
          vendor_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity: string
          vendor_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suspicious_activities_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspicious_activities_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicat_badges: {
        Row: {
          badge_number: string
          created_at: string | null
          driver_id: string
          expires_date: string | null
          id: string
          is_active: boolean | null
          issued_date: string | null
          qr_code: string
          syndicat_office: string
          updated_at: string | null
          vest_number: string | null
        }
        Insert: {
          badge_number: string
          created_at?: string | null
          driver_id: string
          expires_date?: string | null
          id?: string
          is_active?: boolean | null
          issued_date?: string | null
          qr_code: string
          syndicat_office: string
          updated_at?: string | null
          vest_number?: string | null
        }
        Update: {
          badge_number?: string
          created_at?: string | null
          driver_id?: string
          expires_date?: string | null
          id?: string
          is_active?: boolean | null
          issued_date?: string | null
          qr_code?: string
          syndicat_office?: string
          updated_at?: string | null
          vest_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syndicat_badges_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_alerts: {
        Row: {
          alert_type: string
          bureau_id: string | null
          created_at: string | null
          id: string
          is_critical: boolean | null
          is_read: boolean | null
          message: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          bureau_id?: string | null
          created_at?: string | null
          id?: string
          is_critical?: boolean | null
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          title: string
        }
        Update: {
          alert_type?: string
          bureau_id?: string | null
          created_at?: string | null
          id?: string
          is_critical?: boolean | null
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_alerts_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "syndicate_alerts_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "syndicate_alerts_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_worker_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_key: string
          permission_value: boolean | null
          updated_at: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_key: string
          permission_value?: boolean | null
          updated_at?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_key?: string
          permission_value?: boolean | null
          updated_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_worker_permissions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "syndicate_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_workers: {
        Row: {
          access_level: string
          access_token: string
          bureau_id: string | null
          commission_rate: number | null
          created_at: string | null
          custom_id: string | null
          email: string
          id: string
          interface_url: string
          is_active: boolean | null
          last_login_at: string | null
          locked_until: string | null
          login_attempts: number | null
          nom: string
          permissions: Json | null
          prenom: string | null
          telephone: string | null
          updated_at: string | null
        }
        Insert: {
          access_level?: string
          access_token: string
          bureau_id?: string | null
          commission_rate?: number | null
          created_at?: string | null
          custom_id?: string | null
          email: string
          id?: string
          interface_url: string
          is_active?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          nom: string
          permissions?: Json | null
          prenom?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Update: {
          access_level?: string
          access_token?: string
          bureau_id?: string | null
          commission_rate?: number | null
          created_at?: string | null
          custom_id?: string | null
          email?: string
          id?: string
          interface_url?: string
          is_active?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          nom?: string
          permissions?: Json | null
          prenom?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_workers_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "syndicate_workers_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "syndicate_workers_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          created_by: string | null
          id: string
          message: string
          metadata: Json | null
          module: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          suggested_fix: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          metadata?: Json | null
          module: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          suggested_fix?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          module?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          suggested_fix?: string | null
          title?: string
        }
        Relationships: []
      }
      system_errors: {
        Row: {
          admin_acknowledged_at: string | null
          admin_notified: boolean | null
          created_at: string | null
          error_message: string
          error_type: string | null
          fix_applied: boolean | null
          fix_description: string | null
          fixed_at: string | null
          id: string
          metadata: Json | null
          module: string
          severity: string | null
          stack_trace: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_acknowledged_at?: string | null
          admin_notified?: boolean | null
          created_at?: string | null
          error_message: string
          error_type?: string | null
          fix_applied?: boolean | null
          fix_description?: string | null
          fixed_at?: string | null
          id?: string
          metadata?: Json | null
          module: string
          severity?: string | null
          stack_trace?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_acknowledged_at?: string | null
          admin_notified?: boolean | null
          created_at?: string | null
          error_message?: string
          error_type?: string | null
          fix_applied?: boolean | null
          fix_description?: string | null
          fixed_at?: string | null
          id?: string
          metadata?: Json | null
          module?: string
          severity?: string | null
          stack_trace?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_health: {
        Row: {
          api_response_time: number | null
          cpu_usage: number | null
          db_connections: number | null
          error_rate: number | null
          id: string
          memory_usage: number | null
          metadata: Json | null
          status: string | null
          timestamp: string | null
        }
        Insert: {
          api_response_time?: number | null
          cpu_usage?: number | null
          db_connections?: number | null
          error_rate?: number | null
          id?: string
          memory_usage?: number | null
          metadata?: Json | null
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          api_response_time?: number | null
          cpu_usage?: number | null
          db_connections?: number | null
          error_rate?: number | null
          id?: string
          memory_usage?: number | null
          metadata?: Json | null
          status?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      system_health_logs: {
        Row: {
          active_users: number | null
          api_status: string | null
          critical_errors: number | null
          database_status: string | null
          frontend_status: string | null
          id: string
          overall_status: string
          pending_errors: number | null
          response_time: number | null
          security_status: string | null
          timestamp: string | null
          uptime: number | null
        }
        Insert: {
          active_users?: number | null
          api_status?: string | null
          critical_errors?: number | null
          database_status?: string | null
          frontend_status?: string | null
          id?: string
          overall_status: string
          pending_errors?: number | null
          response_time?: number | null
          security_status?: string | null
          timestamp?: string | null
          uptime?: number | null
        }
        Update: {
          active_users?: number | null
          api_status?: string | null
          critical_errors?: number | null
          database_status?: string | null
          frontend_status?: string | null
          id?: string
          overall_status?: string
          pending_errors?: number | null
          response_time?: number | null
          security_status?: string | null
          timestamp?: string | null
          uptime?: number | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      taxi_api_usage: {
        Row: {
          created_at: string | null
          date: string
          estimated_cost: number | null
          id: string
          request_count: number | null
          service_type: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          estimated_cost?: number | null
          id?: string
          request_count?: number | null
          service_type: string
        }
        Update: {
          created_at?: string | null
          date?: string
          estimated_cost?: number | null
          id?: string
          request_count?: number | null
          service_type?: string
        }
        Relationships: []
      }
      taxi_audit_logs: {
        Row: {
          action_type: string
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      taxi_driver_documents: {
        Row: {
          created_at: string | null
          document_type: string
          document_url: string
          driver_id: string
          id: string
          rejection_reason: string | null
          status: string | null
          uploaded_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          document_url: string
          driver_id: string
          id?: string
          rejection_reason?: string | null
          status?: string | null
          uploaded_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          document_url?: string
          driver_id?: string
          id?: string
          rejection_reason?: string | null
          status?: string | null
          uploaded_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxi_driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "taxi_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      taxi_driver_locations: {
        Row: {
          driver_id: string
          lat: number
          lng: number
          updated_at: string | null
        }
        Insert: {
          driver_id: string
          lat: number
          lng: number
          updated_at?: string | null
        }
        Update: {
          driver_id?: string
          lat?: number
          lng?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxi_driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "taxi_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      taxi_drivers: {
        Row: {
          can_work: boolean | null
          created_at: string | null
          id: string
          is_online: boolean | null
          kyc_verified: boolean | null
          last_heading: number | null
          last_lat: number | null
          last_lng: number | null
          last_seen: string | null
          last_speed: number | null
          rating: number | null
          status: string | null
          total_earnings: number | null
          total_rides: number | null
          updated_at: string | null
          user_id: string
          vehicle: Json | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          can_work?: boolean | null
          created_at?: string | null
          id?: string
          is_online?: boolean | null
          kyc_verified?: boolean | null
          last_heading?: number | null
          last_lat?: number | null
          last_lng?: number | null
          last_seen?: string | null
          last_speed?: number | null
          rating?: number | null
          status?: string | null
          total_earnings?: number | null
          total_rides?: number | null
          updated_at?: string | null
          user_id: string
          vehicle?: Json | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          can_work?: boolean | null
          created_at?: string | null
          id?: string
          is_online?: boolean | null
          kyc_verified?: boolean | null
          last_heading?: number | null
          last_lat?: number | null
          last_lng?: number | null
          last_seen?: string | null
          last_speed?: number | null
          rating?: number | null
          status?: string | null
          total_earnings?: number | null
          total_rides?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle?: Json | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      taxi_locks: {
        Row: {
          expires_at: string
          id: string
          locked_at: string | null
          locked_by: string
          metadata: Json | null
          resource_id: string
          resource_type: string
        }
        Insert: {
          expires_at: string
          id?: string
          locked_at?: string | null
          locked_by: string
          metadata?: Json | null
          resource_id: string
          resource_type: string
        }
        Update: {
          expires_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string
          metadata?: Json | null
          resource_id?: string
          resource_type?: string
        }
        Relationships: []
      }
      taxi_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          recipient_id: string
          ride_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          recipient_id: string
          ride_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          recipient_id?: string
          ride_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      taxi_notifications: {
        Row: {
          created_at: string | null
          driver_id: string | null
          id: string
          payload: Json | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id?: string | null
          id?: string
          payload?: Json | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string | null
          id?: string
          payload?: Json | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxi_notifications_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "taxi_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      taxi_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          method: string
          ride_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          method: string
          ride_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          method?: string
          ride_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxi_payments_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "taxi_rides"
            referencedColumns: ["id"]
          },
        ]
      }
      taxi_pricing_config: {
        Row: {
          base_fare: number | null
          currency: string | null
          driver_commission: number | null
          id: string
          minimum_fare: number | null
          per_km_rate: number | null
          per_minute_rate: number | null
          platform_commission: number | null
          surge_multiplier: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          base_fare?: number | null
          currency?: string | null
          driver_commission?: number | null
          id?: string
          minimum_fare?: number | null
          per_km_rate?: number | null
          per_minute_rate?: number | null
          platform_commission?: number | null
          surge_multiplier?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          base_fare?: number | null
          currency?: string | null
          driver_commission?: number | null
          id?: string
          minimum_fare?: number | null
          per_km_rate?: number | null
          per_minute_rate?: number | null
          platform_commission?: number | null
          surge_multiplier?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      taxi_pricing_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          config_snapshot: Json
          id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          config_snapshot: Json
          id?: string
          reason?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          config_snapshot?: Json
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      taxi_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          driver_id: string
          id: string
          ride_id: string
          stars: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          driver_id: string
          id?: string
          ride_id: string
          stars: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          driver_id?: string
          id?: string
          ride_id?: string
          stars?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxi_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "taxi_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxi_ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "taxi_rides"
            referencedColumns: ["id"]
          },
        ]
      }
      taxi_ride_tracking: {
        Row: {
          driver_id: string | null
          id: string
          latitude: number
          longitude: number
          ride_id: string
          timestamp: string | null
        }
        Insert: {
          driver_id?: string | null
          id?: string
          latitude: number
          longitude: number
          ride_id: string
          timestamp?: string | null
        }
        Update: {
          driver_id?: string | null
          id?: string
          latitude?: number
          longitude?: number
          ride_id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      taxi_rides: {
        Row: {
          commission_rate: number | null
          completed_at: string | null
          created_at: string | null
          distance_km: number | null
          driver_id: string | null
          dropoff: Json
          duration_min: number | null
          id: string
          pickup: Json
          price: number | null
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          commission_rate?: number | null
          completed_at?: string | null
          created_at?: string | null
          distance_km?: number | null
          driver_id?: string | null
          dropoff: Json
          duration_min?: number | null
          id?: string
          pickup: Json
          price?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          commission_rate?: number | null
          completed_at?: string | null
          created_at?: string | null
          distance_km?: number | null
          driver_id?: string | null
          dropoff?: Json
          duration_min?: number | null
          id?: string
          pickup?: Json
          price?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxi_rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "taxi_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      taxi_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          customer_id: string
          driver_id: string | null
          driver_share: number | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          payment_method: string | null
          payment_provider: string | null
          platform_fee: number | null
          provider_tx_id: string | null
          ride_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          customer_id: string
          driver_id?: string | null
          driver_share?: number | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          payment_method?: string | null
          payment_provider?: string | null
          platform_fee?: number | null
          provider_tx_id?: string | null
          ride_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          driver_id?: string | null
          driver_share?: number | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          payment_method?: string | null
          payment_provider?: string | null
          platform_fee?: number | null
          provider_tx_id?: string | null
          ride_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      taxi_trips: {
        Row: {
          accepted_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          customer_id: string
          declined_drivers: string[] | null
          distance_km: number | null
          driver_id: string | null
          driver_share: number | null
          dropoff_address: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          duration_min: number | null
          id: string
          idempotency_key: string | null
          lock_version: number | null
          metadata: Json | null
          payment_method: string | null
          payment_status: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          platform_fee: number | null
          price_total: number | null
          requested_at: string | null
          ride_code: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          customer_id: string
          declined_drivers?: string[] | null
          distance_km?: number | null
          driver_id?: string | null
          driver_share?: number | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          duration_min?: number | null
          id?: string
          idempotency_key?: string | null
          lock_version?: number | null
          metadata?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          platform_fee?: number | null
          price_total?: number | null
          requested_at?: string | null
          ride_code?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          customer_id?: string
          declined_drivers?: string[] | null
          distance_km?: number | null
          driver_id?: string | null
          driver_share?: number | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          duration_min?: number | null
          id?: string
          idempotency_key?: string | null
          lock_version?: number | null
          metadata?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          platform_fee?: number | null
          price_total?: number | null
          requested_at?: string | null
          ride_code?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trackings: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          order_id: string | null
          status: Database["public"]["Enums"]["tracking_status_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          order_id?: string | null
          status?: Database["public"]["Enums"]["tracking_status_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          order_id?: string | null
          status?: Database["public"]["Enums"]["tracking_status_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trackings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_audit_log: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string | null
          error_message: string | null
          expected_balance: number
          fee_amount: number | null
          id: string
          is_valid: boolean | null
          metadata: Json | null
          operation_type: string
          transaction_id: string | null
          user_id: string
          user_type: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string | null
          error_message?: string | null
          expected_balance: number
          fee_amount?: number | null
          id?: string
          is_valid?: boolean | null
          metadata?: Json | null
          operation_type: string
          transaction_id?: string | null
          user_id: string
          user_type?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string | null
          error_message?: string | null
          expected_balance?: number
          fee_amount?: number | null
          id?: string
          is_valid?: boolean | null
          metadata?: Json | null
          operation_type?: string
          transaction_id?: string | null
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method_type"]
          order_id: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["transaction_status_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method_type"]
          order_id?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method_type"]
          order_id?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_rides: {
        Row: {
          actual_fare: number | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          distance_km: number | null
          dropoff_address: string
          dropoff_coordinates: Json | null
          dropoff_time: string | null
          estimated_fare: number | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          pickup_address: string
          pickup_coordinates: Json | null
          pickup_time: string | null
          professional_service_id: string
          rating: number | null
          scheduled_time: string | null
          status: string | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          actual_fare?: number | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          distance_km?: number | null
          dropoff_address: string
          dropoff_coordinates?: Json | null
          dropoff_time?: string | null
          estimated_fare?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_address: string
          pickup_coordinates?: Json | null
          pickup_time?: string | null
          professional_service_id: string
          rating?: number | null
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          actual_fare?: number | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          distance_km?: number | null
          dropoff_address?: string
          dropoff_coordinates?: Json | null
          dropoff_time?: string | null
          estimated_fare?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_address?: string
          pickup_coordinates?: Json | null
          pickup_time?: string | null
          professional_service_id?: string
          rating?: number | null
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_rides_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_rides_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "transport_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_ticket_batches: {
        Row: {
          batch_number: string
          bureau_id: string
          created_at: string | null
          created_by: string | null
          end_number: number
          id: string
          start_number: number
          ticket_config: Json
          tickets_count: number
        }
        Insert: {
          batch_number: string
          bureau_id: string
          created_at?: string | null
          created_by?: string | null
          end_number: number
          id?: string
          start_number: number
          ticket_config: Json
          tickets_count?: number
        }
        Update: {
          batch_number?: string
          bureau_id?: string
          created_at?: string | null
          created_by?: string | null
          end_number?: number
          id?: string
          start_number?: number
          ticket_config?: Json
          tickets_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "transport_ticket_batches_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "transport_ticket_batches_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "transport_ticket_batches_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_vehicles: {
        Row: {
          capacity: number | null
          color: string | null
          created_at: string | null
          current_driver_id: string | null
          id: string
          inspection_expiry: string | null
          insurance_expiry: string | null
          license_plate: string
          make: string
          model: string
          professional_service_id: string
          status: string | null
          updated_at: string | null
          vehicle_type: string | null
          year: number | null
        }
        Insert: {
          capacity?: number | null
          color?: string | null
          created_at?: string | null
          current_driver_id?: string | null
          id?: string
          inspection_expiry?: string | null
          insurance_expiry?: string | null
          license_plate: string
          make: string
          model: string
          professional_service_id: string
          status?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
          year?: number | null
        }
        Update: {
          capacity?: number | null
          color?: string | null
          created_at?: string | null
          current_driver_id?: string | null
          id?: string
          inspection_expiry?: string | null
          insurance_expiry?: string | null
          license_plate?: string
          make?: string
          model?: string
          professional_service_id?: string
          status?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_vehicles_professional_service_id_fkey"
            columns: ["professional_service_id"]
            isOneToOne: false
            referencedRelation: "professional_services"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          city: string
          country: string
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string
          phone: string
          postal_code: string | null
          recipient_name: string
          street: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          city: string
          country?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          phone: string
          postal_code?: string | null
          recipient_name: string
          street: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          phone?: string
          postal_code?: string | null
          recipient_name?: string
          street?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          created_at: string | null
          device_info: Json | null
          event_data: Json | null
          event_type: string
          id: string
          location_data: Json | null
          page_url: string | null
          referrer: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          event_data?: Json | null
          event_type: string
          id?: string
          location_data?: Json | null
          page_url?: string | null
          referrer?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          event_data?: Json | null
          event_type?: string
          id?: string
          location_data?: Json | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ids: {
        Row: {
          created_at: string
          custom_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_product_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_type: string
          interaction_weight: number | null
          metadata: Json | null
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_type: string
          interaction_weight?: number | null
          metadata?: Json | null
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          interaction_weight?: number | null
          metadata?: Json | null
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_product_interactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_fraud_alerts: {
        Row: {
          alert_type: string
          bureau_id: string | null
          created_at: string
          description: string
          detected_latitude: number | null
          detected_longitude: number | null
          id: string
          is_resolved: boolean | null
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          vehicle_id: string
        }
        Insert: {
          alert_type: string
          bureau_id?: string | null
          created_at?: string
          description: string
          detected_latitude?: number | null
          detected_longitude?: number | null
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          vehicle_id: string
        }
        Update: {
          alert_type?: string
          bureau_id?: string | null
          created_at?: string
          description?: string
          detected_latitude?: number | null
          detected_longitude?: number | null
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_fraud_alerts_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "vehicle_fraud_alerts_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "vehicle_fraud_alerts_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fraud_alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_gps_tracking: {
        Row: {
          accuracy: number | null
          altitude: number | null
          created_at: string
          device_id: string | null
          heading: number | null
          id: string
          ip_address: string | null
          is_stolen_vehicle: boolean | null
          latitude: number
          longitude: number
          source: string | null
          speed: number | null
          vehicle_id: string
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          created_at?: string
          device_id?: string | null
          heading?: number | null
          id?: string
          ip_address?: string | null
          is_stolen_vehicle?: boolean | null
          latitude: number
          longitude: number
          source?: string | null
          speed?: number | null
          vehicle_id: string
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          created_at?: string
          device_id?: string | null
          heading?: number | null
          id?: string
          ip_address?: string | null
          is_stolen_vehicle?: boolean | null
          latitude?: number
          longitude?: number
          source?: string | null
          speed?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_gps_tracking_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_security_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          bureau_id: string | null
          created_at: string
          description: string
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          user_agent: string | null
          vehicle_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          bureau_id?: string | null
          created_at?: string
          description: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          user_agent?: string | null
          vehicle_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          bureau_id?: string | null
          created_at?: string
          description?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          user_agent?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_security_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          badge_generated_at: string | null
          badge_title: string | null
          brand: string | null
          bureau_id: string | null
          chassis_number: string | null
          color: string | null
          created_at: string | null
          digital_badge_id: string | null
          driver_date_of_birth: string | null
          driver_photo_url: string | null
          engine_number: string | null
          id: string
          insurance_expiration: string | null
          insurance_expiry: string | null
          is_stolen: boolean | null
          last_inspection: string | null
          last_known_latitude: number | null
          last_known_location_at: string | null
          last_known_longitude: number | null
          license_plate: string | null
          model: string | null
          owner_member_id: string | null
          photo_url: string | null
          qr_code_data: string | null
          recovered_at: string | null
          recovered_by: string | null
          recovery_declared_at: string | null
          recovery_declared_by: string | null
          recovery_location: string | null
          recovery_notes: string | null
          recovery_reason: string | null
          registration_number: string | null
          security_lock_level: number | null
          serial_number: string | null
          status: string | null
          stolen_declared_at: string | null
          stolen_declared_by: string | null
          stolen_location: string | null
          stolen_reason: string | null
          stolen_status: string | null
          tech_control_expiration: string | null
          type: string | null
          updated_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
          year: number | null
        }
        Insert: {
          badge_generated_at?: string | null
          badge_title?: string | null
          brand?: string | null
          bureau_id?: string | null
          chassis_number?: string | null
          color?: string | null
          created_at?: string | null
          digital_badge_id?: string | null
          driver_date_of_birth?: string | null
          driver_photo_url?: string | null
          engine_number?: string | null
          id?: string
          insurance_expiration?: string | null
          insurance_expiry?: string | null
          is_stolen?: boolean | null
          last_inspection?: string | null
          last_known_latitude?: number | null
          last_known_location_at?: string | null
          last_known_longitude?: number | null
          license_plate?: string | null
          model?: string | null
          owner_member_id?: string | null
          photo_url?: string | null
          qr_code_data?: string | null
          recovered_at?: string | null
          recovered_by?: string | null
          recovery_declared_at?: string | null
          recovery_declared_by?: string | null
          recovery_location?: string | null
          recovery_notes?: string | null
          recovery_reason?: string | null
          registration_number?: string | null
          security_lock_level?: number | null
          serial_number?: string | null
          status?: string | null
          stolen_declared_at?: string | null
          stolen_declared_by?: string | null
          stolen_location?: string | null
          stolen_reason?: string | null
          stolen_status?: string | null
          tech_control_expiration?: string | null
          type?: string | null
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          year?: number | null
        }
        Update: {
          badge_generated_at?: string | null
          badge_title?: string | null
          brand?: string | null
          bureau_id?: string | null
          chassis_number?: string | null
          color?: string | null
          created_at?: string | null
          digital_badge_id?: string | null
          driver_date_of_birth?: string | null
          driver_photo_url?: string | null
          engine_number?: string | null
          id?: string
          insurance_expiration?: string | null
          insurance_expiry?: string | null
          is_stolen?: boolean | null
          last_inspection?: string | null
          last_known_latitude?: number | null
          last_known_location_at?: string | null
          last_known_longitude?: number | null
          license_plate?: string | null
          model?: string | null
          owner_member_id?: string | null
          photo_url?: string | null
          qr_code_data?: string | null
          recovered_at?: string | null
          recovered_by?: string | null
          recovery_declared_at?: string | null
          recovery_declared_by?: string | null
          recovery_location?: string | null
          recovery_notes?: string | null
          recovery_reason?: string | null
          registration_number?: string | null
          security_lock_level?: number | null
          serial_number?: string | null
          status?: string | null
          stolen_declared_at?: string | null
          stolen_declared_by?: string | null
          stolen_location?: string | null
          stolen_reason?: string | null
          stolen_status?: string | null
          tech_control_expiration?: string | null
          type?: string | null
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "vehicles_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "vehicles_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "syndicate_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_agents: {
        Row: {
          access_token: string
          agent_code: string
          agent_type: Database["public"]["Enums"]["agent_type_enum"] | null
          can_create_sub_agent: boolean | null
          commission_rate: number | null
          created_at: string | null
          custom_id: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          password_hash: string | null
          permissions: Json | null
          phone: string
          total_commissions_earned: number | null
          total_users_created: number | null
          updated_at: string | null
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          access_token: string
          agent_code: string
          agent_type?: Database["public"]["Enums"]["agent_type_enum"] | null
          can_create_sub_agent?: boolean | null
          commission_rate?: number | null
          created_at?: string | null
          custom_id?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          password_hash?: string | null
          permissions?: Json | null
          phone: string
          total_commissions_earned?: number | null
          total_users_created?: number | null
          updated_at?: string | null
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          access_token?: string
          agent_code?: string
          agent_type?: Database["public"]["Enums"]["agent_type_enum"] | null
          can_create_sub_agent?: boolean | null
          commission_rate?: number | null
          created_at?: string | null
          custom_id?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          password_hash?: string | null
          permissions?: Json | null
          phone?: string
          total_commissions_earned?: number | null
          total_users_created?: number | null
          updated_at?: string | null
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_analytics: {
        Row: {
          conversion_rate: number | null
          created_at: string | null
          date: string
          id: string
          top_product_id: string | null
          total_orders: number | null
          total_sales: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          conversion_rate?: number | null
          created_at?: string | null
          date?: string
          id?: string
          top_product_id?: string | null
          total_orders?: number | null
          total_sales?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          conversion_rate?: number | null
          created_at?: string | null
          date?: string
          id?: string
          top_product_id?: string | null
          total_orders?: number | null
          total_sales?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_analytics_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_analytics_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_employees: {
        Row: {
          created_at: string | null
          hired_date: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          role: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          hired_date?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          hired_date?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_employees_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_employees_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_employees_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          description: string | null
          expense_date: string
          id: string
          payment_method: string | null
          receipt_url: string | null
          status: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_kyc: {
        Row: {
          created_at: string | null
          id: string
          id_document_type: string | null
          id_document_url: string | null
          phone_number: string | null
          phone_verified: boolean | null
          rejection_reason: string | null
          status: string
          updated_at: string | null
          vendor_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          id_document_type?: string | null
          id_document_url?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
          vendor_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          id_document_type?: string | null
          id_document_url?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
          vendor_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_kyc_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_kyc_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_notifications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_notifications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_ratings: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          order_id: string
          rating: number
          updated_at: string
          vendor_id: string
          vendor_response: string | null
          vendor_response_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          rating: number
          updated_at?: string
          vendor_id: string
          vendor_response?: string | null
          vendor_response_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          rating?: number
          updated_at?: string
          vendor_id?: string
          vendor_response?: string | null
          vendor_response_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_ratings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_ratings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "vendor_ratings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_trust_score: {
        Row: {
          account_age_days: number | null
          cancelled_orders: number | null
          created_at: string | null
          disputes: number | null
          id: string
          last_calculated_at: string | null
          response_time_avg: number | null
          score: number | null
          successful_orders: number | null
          total_sales: number | null
          vendor_id: string
        }
        Insert: {
          account_age_days?: number | null
          cancelled_orders?: number | null
          created_at?: string | null
          disputes?: number | null
          id?: string
          last_calculated_at?: string | null
          response_time_avg?: number | null
          score?: number | null
          successful_orders?: number | null
          total_sales?: number | null
          vendor_id: string
        }
        Update: {
          account_age_days?: number | null
          cancelled_orders?: number | null
          created_at?: string | null
          disputes?: number | null
          id?: string
          last_calculated_at?: string | null
          response_time_avg?: number | null
          score?: number | null
          successful_orders?: number | null
          total_sales?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_trust_score_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_trust_score_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          business_name: string
          business_type: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          delivery_base_price: number | null
          delivery_enabled: boolean | null
          delivery_price_per_km: number | null
          delivery_rush_bonus: number | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          neighborhood: string | null
          phone: string | null
          public_id: string | null
          rating: number | null
          service_type: string | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
          vendor_code: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          business_type?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          delivery_base_price?: number | null
          delivery_enabled?: boolean | null
          delivery_price_per_km?: number | null
          delivery_rush_bonus?: number | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          neighborhood?: string | null
          phone?: string | null
          public_id?: string | null
          rating?: number | null
          service_type?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
          vendor_code?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          business_type?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          delivery_base_price?: number | null
          delivery_enabled?: boolean | null
          delivery_price_per_km?: number | null
          delivery_rush_bonus?: number | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          neighborhood?: string | null
          phone?: string | null
          public_id?: string | null
          rating?: number | null
          service_type?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
          vendor_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_cards: {
        Row: {
          card_number: string
          created_at: string
          cvv: string
          daily_limit: number | null
          expiry_date: string
          holder_name: string | null
          id: string
          monthly_limit: number | null
          status: string
          user_id: string
        }
        Insert: {
          card_number: string
          created_at?: string
          cvv: string
          daily_limit?: number | null
          expiry_date: string
          holder_name?: string | null
          id?: string
          monthly_limit?: number | null
          status?: string
          user_id: string
        }
        Update: {
          card_number?: string
          created_at?: string
          cvv?: string
          daily_limit?: number | null
          expiry_date?: string
          holder_name?: string | null
          id?: string
          monthly_limit?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_fees: {
        Row: {
          created_at: string | null
          currency: string | null
          fee_type: string
          fee_value: number
          id: string
          is_active: boolean | null
          max_amount: number | null
          min_amount: number | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          fee_type: string
          fee_value: number
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          fee_type?: string
          fee_value?: number
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wallet_idempotency_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          idempotency_key: string
          operation: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key: string
          operation: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string
          operation?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_logs: {
        Row: {
          action: string
          amount: number | null
          balance_after: number | null
          balance_before: number | null
          created_at: string | null
          currency: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          payment_method: string | null
          status: string | null
          transaction_id: string | null
          user_agent: string | null
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          action: string
          amount?: number | null
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          action?: string
          amount?: number | null
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_logs_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_payment_methods: {
        Row: {
          account_number: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          metadata: Json | null
          method_type: string
          provider: string | null
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          account_number?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          method_type: string
          provider?: string | null
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          account_number?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          method_type?: string
          provider?: string | null
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_payment_methods_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_suspicious_activities: {
        Row: {
          action_taken: string | null
          activity_type: string
          description: string | null
          detected_at: string | null
          id: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          action_taken?: string | null
          activity_type: string
          description?: string | null
          detected_at?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          action_taken?: string | null
          activity_type?: string
          description?: string | null
          detected_at?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_suspicious_activities_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          description: string | null
          device_info: Json | null
          fee: number
          id: string
          metadata: Json | null
          net_amount: number
          receiver_wallet_id: string | null
          sender_wallet_id: string | null
          status: string
          transaction_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          device_info?: Json | null
          fee?: number
          id?: string
          metadata?: Json | null
          net_amount: number
          receiver_wallet_id?: string | null
          sender_wallet_id?: string | null
          status?: string
          transaction_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          device_info?: Json | null
          fee?: number
          id?: string
          metadata?: Json | null
          net_amount?: number
          receiver_wallet_id?: string | null
          sender_wallet_id?: string | null
          status?: string
          transaction_id?: string
          transaction_type?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          currency: string
          daily_limit: number | null
          id: string
          is_blocked: boolean | null
          last_transaction_at: string | null
          monthly_limit: number | null
          pin_hash: string | null
          public_id: string | null
          total_received: number | null
          total_sent: number | null
          two_factor_enabled: boolean | null
          updated_at: string
          user_id: string
          wallet_status: string | null
        }
        Insert: {
          balance?: number
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          currency?: string
          daily_limit?: number | null
          id?: string
          is_blocked?: boolean | null
          last_transaction_at?: string | null
          monthly_limit?: number | null
          pin_hash?: string | null
          public_id?: string | null
          total_received?: number | null
          total_sent?: number | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id: string
          wallet_status?: string | null
        }
        Update: {
          balance?: number
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          currency?: string
          daily_limit?: number | null
          id?: string
          is_blocked?: boolean | null
          last_transaction_at?: string | null
          monthly_limit?: number | null
          pin_hash?: string | null
          public_id?: string | null
          total_received?: number | null
          total_sent?: number | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id?: string
          wallet_status?: string | null
        }
        Relationships: []
      }
      warehouse_permissions: {
        Row: {
          can_edit: boolean | null
          can_manage_stock: boolean | null
          can_transfer: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          warehouse_id: string
        }
        Insert: {
          can_edit?: boolean | null
          can_manage_stock?: boolean | null
          can_transfer?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          warehouse_id: string
        }
        Update: {
          can_edit?: boolean | null
          can_manage_stock?: boolean | null
          can_transfer?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_permissions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_stocks: {
        Row: {
          id: string
          product_id: string
          quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stocks_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          name: string
          vendor_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name: string
          vendor_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "user_search_view"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "warehouses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_performance"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "warehouses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_audit_logs: {
        Row: {
          created_at: string | null
          details: string | null
          event_type: string
          id: string
          payment_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          event_type: string
          id?: string
          payment_id?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          details?: string | null
          event_type?: string
          id?: string
          payment_id?: string | null
          status?: string
        }
        Relationships: []
      }
      webhook_processed_events: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string
          payment_id: string
          processed_at: string
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          payment_id: string
          processed_at: string
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          payment_id?: string
          processed_at?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          notify_on_sale: boolean | null
          priority: number | null
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          notify_on_sale?: boolean | null
          priority?: number | null
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          notify_on_sale?: boolean | null
          priority?: number | null
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_complaints: {
        Row: {
          bureau_id: string
          category: string
          created_at: string | null
          description: string
          id: string
          priority: string | null
          responded_at: string | null
          responded_by: string | null
          response: string | null
          status: string
          title: string
          updated_at: string | null
          worker_id: string
        }
        Insert: {
          bureau_id: string
          category?: string
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string
          title: string
          updated_at?: string | null
          worker_id: string
        }
        Update: {
          bureau_id?: string
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_complaints_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "worker_complaints_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "worker_complaints_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_complaints_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "bureau_pwa_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "worker_complaints_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "bureau_security_stats"
            referencedColumns: ["bureau_id"]
          },
          {
            foreignKeyName: "worker_complaints_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_complaints_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agent_type_statistics: {
        Row: {
          active_agents: number | null
          pdg_id: string | null
          total_agents: number | null
          total_commission_rate: number | null
          type_agent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_management_pdg_id_fkey"
            columns: ["pdg_id"]
            isOneToOne: false
            referencedRelation: "pdg_management"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_pwa_stats: {
        Row: {
          bureau_id: string | null
          commune: string | null
          desktop_installations: number | null
          last_installation: string | null
          mobile_installations: number | null
          prefecture: string | null
          recent_installations: number | null
          tokens_used: number | null
          total_access_attempts: number | null
          total_installations: number | null
          total_tokens_generated: number | null
        }
        Relationships: []
      }
      bureau_security_stats: {
        Row: {
          active_thefts: number | null
          bureau_code: string | null
          bureau_id: string | null
          commune: string | null
          pending_alerts: number | null
          recovered_count: number | null
          security_events_30d: number | null
        }
        Relationships: []
      }
      escrow_dashboard: {
        Row: {
          amount: number | null
          available_to_release_at: string | null
          commission_amount: number | null
          commission_percent: number | null
          created_at: string | null
          currency: string | null
          id: string | null
          log_count: number | null
          order_id: string | null
          payer_email: string | null
          payer_name: string | null
          receiver_email: string | null
          receiver_name: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      interface_status: {
        Row: {
          active_users: number | null
          errors: number | null
          interface: string | null
          performance: number | null
          transactions: number | null
        }
        Relationships: []
      }
      pdg_dashboard_overview: {
        Row: {
          deliveries_24h: number | null
          orders_24h: number | null
          total_agents: number | null
          total_bureaus: number | null
          total_clients: number | null
          total_drivers: number | null
          total_users: number | null
          total_vendors: number | null
          total_wallet_balance: number | null
        }
        Relationships: []
      }
      pdg_interface_stats: {
        Row: {
          interface: string | null
          pending_alerts: number | null
          users: number | null
        }
        Relationships: []
      }
      pdg_vehicle_security_overview: {
        Row: {
          active_alerts: number | null
          total_recovered: number | null
          total_stolen: number | null
        }
        Relationships: []
      }
      security_policy_summary: {
        Row: {
          anon_policies: number | null
          auth_policies: number | null
          policy_count: number | null
          schemaname: unknown
          tablename: unknown
        }
        Relationships: []
      }
      security_stats: {
        Row: {
          blocked_ips: number | null
          total_incidents: number | null
          unacknowledged_alerts: number | null
        }
        Relationships: []
      }
      system_alerts_summary: {
        Row: {
          count: number | null
          severity: string | null
        }
        Relationships: []
      }
      system_dashboard: {
        Row: {
          active_security_alerts: number | null
          pending_errors: number | null
          system_health: number | null
          unread_financial_alerts: number | null
        }
        Relationships: []
      }
      user_search_view: {
        Row: {
          business_name: string | null
          custom_id: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          vendor_id: string | null
        }
        Relationships: []
      }
      vendor_performance: {
        Row: {
          avg_rating: number | null
          business_name: string | null
          total_orders: number | null
          total_products: number | null
          total_revenue: number | null
          user_id: string | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_admin_stats: {
        Row: {
          agent_wallets: number | null
          bureau_wallets: number | null
          total_balance: number | null
          total_wallets: number | null
          transactions_24h: number | null
        }
        Relationships: []
      }
      wallet_summary: {
        Row: {
          avg_balance: number | null
          total_balance: number | null
          total_wallets: number | null
          wallet_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      acquire_taxi_lock:
        | {
            Args: {
              p_locked_by: string
              p_resource_id: string
              p_resource_type: string
              p_ttl_seconds?: number
            }
            Returns: boolean
          }
        | {
            Args: {
              p_locked_by: string
              p_resource_id: string
              p_resource_type: string
              p_timeout_seconds?: number
            }
            Returns: boolean
          }
      activate_panic_mode: {
        Args: { p_pdg_id: string; p_reason: string }
        Returns: Json
      }
      add_syndicate_member_for_vehicle: {
        Args: { p_bureau_id: string; p_nom: string }
        Returns: string
      }
      add_vehicle_for_bureau: {
        Args: {
          p_brand?: string
          p_bureau_id: string
          p_color?: string
          p_driver_date_of_birth?: string
          p_driver_photo_url?: string
          p_license_plate?: string
          p_member_id?: string
          p_model?: string
          p_owner_name?: string
          p_serial_number?: string
          p_vehicle_type?: string
          p_year?: number
        }
        Returns: Json
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      agent_can_create_sub_agents: {
        Args: { _user_id: string }
        Returns: boolean
      }
      auto_escalate_disputes: {
        Args: never
        Returns: {
          escalated_count: number
        }[]
      }
      auto_release_escrows: {
        Args: never
        Returns: {
          escrow_id: string
          message: string
          success: boolean
        }[]
      }
      block_ip_address: {
        Args: {
          p_auto_block?: boolean
          p_duration_hours?: number
          p_ip_address: string
          p_reason: string
        }
        Returns: string
      }
      bureau_exists: { Args: { p_bureau_id: string }; Returns: boolean }
      calculate_agent_commission: {
        Args: {
          p_agent_id: string
          p_amount: number
          p_related_user_id?: string
          p_source_type: string
          p_transaction_id?: string
        }
        Returns: Json
      }
      calculate_commission: {
        Args: {
          p_amount: number
          p_service_name: string
          p_transaction_type: string
        }
        Returns: number
      }
      calculate_commission_from_config: {
        Args: {
          p_amount: number
          p_service_name: string
          p_transaction_type: string
        }
        Returns: {
          commission_amount: number
          commission_rate: number
          config_id: string
          total_amount: number
        }[]
      }
      calculate_delivery_price: {
        Args: {
          p_delivery_lat: number
          p_delivery_lng: number
          p_pickup_lat: number
          p_pickup_lng: number
        }
        Returns: {
          base_price: number
          distance_km: number
          distance_price: number
          surge_multiplier: number
          total_price: number
        }[]
      }
      calculate_distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      calculate_expense_stats: {
        Args: { p_end_date: string; p_start_date: string; p_vendor_id: string }
        Returns: Json
      }
      calculate_recommendation_score: {
        Args: { p_product_id: string; p_user_id: string }
        Returns: number
      }
      calculate_system_health: {
        Args: never
        Returns: {
          critical_count: number
          minor_count: number
          moderate_count: number
          recent_fixes: number
          score: number
          status: string
        }[]
      }
      calculate_taxi_fare: {
        Args: {
          p_distance_km: number
          p_duration_min: number
          p_surge_multiplier?: number
        }
        Returns: Json
      }
      calculate_transaction_fees: {
        Args: { p_amount: number; p_transaction_type: string }
        Returns: number
      }
      calculate_vendor_trust_score: {
        Args: { p_vendor_id: string }
        Returns: number
      }
      can_vendor_view_customer: {
        Args: { _customer_id: string; _vendor_user_id: string }
        Returns: boolean
      }
      can_view_message: {
        Args: { _message_id: string; _user_id: string }
        Returns: boolean
      }
      change_plan_price: {
        Args: {
          p_admin_user_id: string
          p_new_price: number
          p_plan_id: string
          p_reason?: string
        }
        Returns: boolean
      }
      check_agent_permission: {
        Args: { p_agent_id: string; p_permission_key: string }
        Returns: boolean
      }
      check_overdue_debts: { Args: never; Returns: undefined }
      check_product_limit: { Args: { p_user_id: string }; Returns: Json }
      check_rate_limit: {
        Args: {
          p_action: string
          p_identifier: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_security_status: {
        Args: never
        Returns: {
          secured_functions: number
          security_score: number
          tables_with_rls: number
          tables_without_rls: number
        }[]
      }
      check_service_owner: { Args: { service_id: string }; Returns: boolean }
      clean_old_errors: { Args: never; Returns: undefined }
      cleanup_expired_tokens: { Args: never; Returns: undefined }
      cleanup_old_errors: { Args: never; Returns: undefined }
      cleanup_old_product_views: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_system_errors: { Args: never; Returns: Json }
      confirm_delivery_and_release_escrow: {
        Args: { p_customer_id: string; p_escrow_id: string; p_notes?: string }
        Returns: Json
      }
      convert_currency: {
        Args: {
          p_amount: number
          p_from_currency: string
          p_to_currency: string
        }
        Returns: number
      }
      create_agent_wallet: {
        Args: { p_agent_id: string }
        Returns: {
          agent_id: string
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          wallet_status: string
        }[]
      }
      create_communication_notification: {
        Args: {
          p_body: string
          p_call_id?: string
          p_conversation_id?: string
          p_message_id?: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_default_expense_categories: {
        Args: { p_vendor_id: string }
        Returns: undefined
      }
      create_escrow_transaction: {
        Args: {
          p_amount?: number
          p_buyer_id: string
          p_currency?: string
          p_metadata?: Json
          p_order_id?: string
          p_seller_id: string
        }
        Returns: string
      }
      create_online_order: {
        Args: {
          p_items: Json
          p_payment_method?: string
          p_shipping_address?: Json
          p_total_amount: number
          p_user_id: string
          p_vendor_id: string
        }
        Returns: {
          customer_id: string
          order_id: string
          order_number: string
        }[]
      }
      create_security_incident: {
        Args: {
          p_description: string
          p_incident_type: string
          p_indicators?: Json
          p_severity: string
          p_source_ip?: string
          p_target_service?: string
          p_title: string
        }
        Returns: string
      }
      create_syndicate_worker_secure: {
        Args: {
          p_access_level?: string
          p_bureau_id: string
          p_email?: string
          p_nom: string
          p_permissions?: Json
          p_prenom?: string
          p_telephone?: string
        }
        Returns: string
      }
      create_taxi_notification: {
        Args: {
          p_body: string
          p_data?: Json
          p_ride_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_user_complete: {
        Args: { p_role?: string; p_user_id: string }
        Returns: Json
      }
      create_user_with_wallet: {
        Args: {
          p_email: string
          p_full_name: string
          p_password: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: Json
      }
      create_vendor_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_type: string
          p_vendor_id: string
        }
        Returns: string
      }
      credit_wallet:
        | {
            Args: {
              p_amount: number
              p_description?: string
              p_transaction_type?: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: { credit_amount: number; receiver_user_id: string }
            Returns: undefined
          }
      deactivate_panic_mode: { Args: { p_pdg_id: string }; Returns: Json }
      declare_vehicle_recovered:
        | {
            Args: {
              p_bureau_id: string
              p_ip_address?: string
              p_recovered_by: string
              p_recovery_notes?: string
              p_user_agent?: string
              p_vehicle_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_recovered_by: string
              p_recovery_location?: string
              p_recovery_notes?: string
              p_vehicle_id: string
            }
            Returns: Json
          }
      declare_vehicle_stolen:
        | {
            Args: {
              p_bureau_id: string
              p_declared_by: string
              p_ip_address?: string
              p_location?: string
              p_reason: string
              p_user_agent?: string
              p_vehicle_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_declared_by: string
              p_location?: string
              p_reason: string
              p_vehicle_id: string
            }
            Returns: Json
          }
      delete_agent: { Args: { p_agent_id: string }; Returns: Json }
      delete_syndicate_worker_secure: {
        Args: { p_bureau_id: string; p_worker_id: string }
        Returns: undefined
      }
      detect_expense_anomalies: { Args: { p_vendor_id: string }; Returns: Json }
      detect_fraud: {
        Args: {
          p_amount: number
          p_transaction_type: string
          p_user_id: string
        }
        Returns: Json
      }
      disablelongtransactions: { Args: never; Returns: string }
      dispute_escrow: { Args: { p_escrow_id: string }; Returns: boolean }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      ensure_pdg_wallet: { Args: never; Returns: string }
      ensure_wallet: {
        Args: { p_currency?: string; p_user_id: string }
        Returns: string
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      execute_atomic_wallet_transfer: {
        Args: {
          p_amount: number
          p_description: string
          p_receiver_id: string
          p_recipient_balance_before: number
          p_recipient_wallet_id: string
          p_sender_balance_before: number
          p_sender_id: string
          p_sender_wallet_id: string
        }
        Returns: Json
      }
      execute_banking_transaction: {
        Args: {
          p_actor_id: string
          p_actor_type: string
          p_amount: number
          p_credit_account: string
          p_debit_account: string
          p_description?: string
          p_metadata?: Json
          p_module_name?: string
          p_transaction_id: string
          p_transaction_type: string
        }
        Returns: Json
      }
      extract_number: { Args: { p_id: string }; Returns: number }
      extract_prefix: { Args: { p_id: string }; Returns: string }
      find_nearby_taxi_drivers: {
        Args: {
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_km?: number
        }
        Returns: {
          distance_km: number
          driver_id: string
          rating: number
          user_id: string
          vehicle_plate: string
          vehicle_type: string
        }[]
      }
      find_user_by_code: {
        Args: { p_code: string }
        Returns: {
          display_name: string
          identifier: string
          user_id: string
          user_type: string
        }[]
      }
      fix_missing_user_data: {
        Args: never
        Returns: {
          action: string
          custom_id: string
          user_id: string
          wallet_id: string
        }[]
      }
      gen_random_bytes: { Args: { p_size: number }; Returns: string }
      generate_agent_access_token: { Args: never; Returns: string }
      generate_agent_id: { Args: { p_type_agent: string }; Returns: string }
      generate_api_key: { Args: never; Returns: string }
      generate_badge_code: { Args: never; Returns: string }
      generate_card_number: { Args: never; Returns: string }
      generate_custom_id: { Args: never; Returns: string }
      generate_custom_id_original: { Args: never; Returns: string }
      generate_custom_id_with_role: {
        Args: { p_role: string }
        Returns: string
      }
      generate_invitation_token: { Args: never; Returns: string }
      generate_invite_token: { Args: never; Returns: string }
      generate_ledger_hash: {
        Args: {
          p_actor_id: string
          p_amount: number
          p_credit_account: string
          p_debit_account: string
          p_previous_hash?: string
          p_transaction_id: string
        }
        Returns: string
      }
      generate_public_id: { Args: never; Returns: string }
      generate_random_digits: { Args: { length: number }; Returns: string }
      generate_random_letters: { Args: { length: number }; Returns: string }
      generate_random_letters_original: {
        Args: { length: number }
        Returns: string
      }
      generate_recommendations_for_user: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          product_id: string
          reason: string
          score: number
        }[]
      }
      generate_role_based_custom_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      generate_secure_token: { Args: never; Returns: string }
      generate_sequential_id: { Args: { p_prefix: string }; Returns: string }
      generate_standard_id: { Args: { p_prefix: string }; Returns: string }
      generate_tracking_number: { Args: never; Returns: string }
      generate_transaction_custom_id: { Args: never; Returns: string }
      generate_transaction_id: { Args: never; Returns: string }
      generate_unique_agent_code: { Args: never; Returns: string }
      generate_unique_agent_token: { Args: never; Returns: string }
      generate_unique_custom_id: { Args: never; Returns: string }
      generate_unique_invitation_token: { Args: never; Returns: string }
      generate_unique_public_id: { Args: { p_scope: string }; Returns: string }
      generate_user_custom_id: { Args: never; Returns: string }
      generate_vendor_agent_access_token: { Args: never; Returns: string }
      generate_vendor_agent_code: { Args: never; Returns: string }
      generate_vendor_code: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_active_commission_config: {
        Args: {
          p_amount?: number
          p_service_name: string
          p_transaction_type: string
        }
        Returns: {
          commission_type: string
          commission_value: number
          id: string
          max_amount: number
          min_amount: number
          service_name: string
          transaction_type: string
        }[]
      }
      get_active_driver_subscription: {
        Args: { p_user_id: string }
        Returns: {
          days_remaining: number
          end_date: string
          id: string
          payment_method: string
          price: number
          start_date: string
          status: string
          type: string
        }[]
      }
      get_active_subscription: { Args: { p_user_id: string }; Returns: Json }
      get_agent_permissions: { Args: { p_agent_id: string }; Returns: Json }
      get_escrow_stats: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          held_amount: number
          held_count: number
          refunded_amount: number
          refunded_count: number
          released_amount: number
          released_count: number
          total_amount: number
          total_transactions: number
        }[]
      }
      get_finance_stats: { Args: never; Returns: Json }
      get_inventory_stats: { Args: { p_vendor_id: string }; Returns: Json }
      get_or_create_wallet: {
        Args: { p_currency?: string; p_user_id: string }
        Returns: string
      }
      get_order_escrow: {
        Args: { p_order_id: string }
        Returns: {
          amount: number
          created_at: string
          currency: string
          id: string
          status: string
          updated_at: string
        }[]
      }
      get_pdg_dashboard_stats: { Args: never; Returns: Json }
      get_pdg_financial_dashboard: { Args: never; Returns: Json }
      get_pdg_revenue_stats: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          purchase_fees_revenue: number
          purchase_transaction_count: number
          total_revenue: number
          transaction_count: number
          wallet_fees_revenue: number
          wallet_transaction_count: number
        }[]
      }
      get_personalized_recommendations: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          product_id: string
          reason: string
          score: number
        }[]
      }
      get_platform_revenue_stats: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          revenue_type: string
          total_amount: number
          transaction_count: number
        }[]
      }
      get_prefix_for_role: { Args: { p_role: string }; Returns: string }
      get_product_rating: {
        Args: { p_product_id: string }
        Returns: {
          average_rating: number
          total_reviews: number
        }[]
      }
      get_public_setting: { Args: { setting_key: string }; Returns: string }
      get_role_prefix: { Args: { user_role: string }; Returns: string }
      get_service_subscription: {
        Args: { p_service_id: string }
        Returns: {
          analytics_access: boolean
          auto_renew: boolean
          current_period_end: string
          features: Json
          max_bookings: number
          max_products: number
          max_staff: number
          plan_display_name: string
          plan_id: string
          plan_name: string
          price_paid: number
          priority_listing: boolean
          status: string
          subscription_id: string
        }[]
      }
      get_service_subscription_stats: {
        Args: never
        Returns: {
          active_subscriptions: number
          expired_subscriptions: number
          monthly_revenue: number
          subscriptions_by_plan: Json
          subscriptions_by_status: Json
          total_revenue: number
          total_subscriptions: number
        }[]
      }
      get_syndicate_worker_permissions: {
        Args: { p_worker_id: string }
        Returns: Json
      }
      get_system_health_api: { Args: never; Returns: Json }
      get_transfer_fee_percent: { Args: never; Returns: number }
      get_trending_products: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          avg_rating: number
          product_id: string
          review_count: number
          trend_score: number
          view_count: number
          wishlist_count: number
        }[]
      }
      get_user_conversations: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          creator_id: string
          id: string
          last_message_at: string
          last_message_preview: string
          name: string
          participants: Json
          type: string
          unread_count: number
        }[]
      }
      get_user_custom_id: { Args: { p_user_id: string }; Returns: string }
      get_user_direct_message_conversations: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          creator_id: string
          id: string
          last_message_at: string
          last_message_preview: string
          name: string
          other_user_id: string
          participants: Json
          type: string
          unread_count: number
        }[]
      }
      get_vehicle_security_summary: {
        Args: { p_vehicle_id: string }
        Returns: Json
      }
      get_vendor_average_rating: {
        Args: { p_vendor_id: string }
        Returns: Json
      }
      gettransactionid: { Args: never; Returns: unknown }
      has_active_driver_subscription: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      has_active_installation: {
        Args: { bureau_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_driver_earnings: {
        Args: { p_amount: number; p_driver_id: string }
        Returns: undefined
      }
      increment_product_stock: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: undefined
      }
      initialize_user_wallet: { Args: { p_user_id: string }; Returns: Json }
      initiate_escrow:
        | {
            Args: {
              p_amount: number
              p_currency?: string
              p_order_id: string
              p_payer_id: string
              p_receiver_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_auto_release_days?: number
              p_currency?: string
              p_metadata?: Json
              p_order_id: string
              p_payer_id: string
              p_receiver_id: string
            }
            Returns: string
          }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_ceo: { Args: never; Returns: boolean }
      is_agent_in_same_pdg: {
        Args: { _pdg_id: string; _user_id: string }
        Returns: boolean
      }
      is_authenticated: { Args: never; Returns: boolean }
      is_conversation_creator: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_owner: { Args: { resource_user_id: string }; Returns: boolean }
      is_panic_mode_active: { Args: never; Returns: boolean }
      is_payment_link_publicly_accessible: {
        Args: { p_payment_id: string }
        Returns: boolean
      }
      is_payment_link_vendor: {
        Args: { _payment_link_id: string; _vendor_user_id: string }
        Returns: boolean
      }
      is_real_user: { Args: { p_user_id: string }; Returns: boolean }
      is_vehicle_blocked: { Args: { p_vehicle_id: string }; Returns: boolean }
      log_api_usage: {
        Args: { p_cost?: number; p_service_type: string }
        Returns: undefined
      }
      log_escrow_action: {
        Args: {
          p_action: string
          p_escrow_id: string
          p_metadata?: Json
          p_note?: string
          p_performed_by: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_action: string
          p_data?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: string
      }
      log_stolen_vehicle_gps: {
        Args: {
          p_accuracy?: number
          p_device_id?: string
          p_ip_address?: string
          p_latitude: number
          p_longitude: number
          p_speed?: number
          p_vehicle_id: string
        }
        Returns: undefined
      }
      log_taxi_action: {
        Args: {
          p_action_type: string
          p_actor_id: string
          p_actor_type: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: string
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_expired_driver_subscriptions: { Args: never; Returns: number }
      mark_messages_as_read: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      migrate_existing_ids: {
        Args: never
        Returns: {
          new_id: string
          old_id: string
          status: string
          table_name: string
        }[]
      }
      migrate_random_ids_to_sequential: {
        Args: never
        Returns: {
          new_id: string
          old_id: string
          profile_user_id: string
          status: string
        }[]
      }
      migrate_vendors_without_entry: {
        Args: never
        Returns: {
          custom_id: string
          status: string
          user_id: string
          vendor_id: string
        }[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      preview_next_id: { Args: { p_prefix: string }; Returns: string }
      preview_wallet_transfer: {
        Args: { p_amount: number; p_receiver_id: string; p_sender_id: string }
        Returns: Json
      }
      preview_wallet_transfer_by_code: {
        Args: {
          p_amount: number
          p_currency?: string
          p_receiver_code: string
          p_sender_code: string
        }
        Returns: Json
      }
      process_card_to_om: {
        Args: {
          p_amount: number
          p_card_id: string
          p_phone_number: string
          p_user_id: string
        }
        Returns: string
      }
      process_card_to_wallet: {
        Args: { p_amount: number; p_card_id: string; p_user_id: string }
        Returns: string
      }
      process_secure_bureau_transfer: {
        Args: {
          p_amount: number
          p_bureau_id: string
          p_description?: string
          p_fee_percent?: number
          p_receiver_id: string
          p_receiver_type: string
        }
        Returns: Json
      }
      process_secure_wallet_transfer:
        | {
            Args: {
              p_amount: number
              p_currency?: string
              p_description?: string
              p_receiver_id: string
              p_receiver_type?: string
              p_sender_id: string
              p_sender_type?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_description?: string
              p_receiver_id: string
              p_receiver_type?: string
              p_sender_id: string
              p_sender_type?: string
            }
            Returns: Json
          }
      process_wallet_to_card: {
        Args: { p_amount: number; p_card_id: string; p_user_id: string }
        Returns: string
      }
      process_wallet_transaction:
        | {
            Args: {
              p_amount: number
              p_currency?: string
              p_description?: string
              p_receiver_email: string
              p_sender_email: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_currency?: string
              p_description?: string
              p_receiver_id: string
              p_sender_id: string
            }
            Returns: string
          }
      process_wallet_transfer:
        | {
            Args: {
              p_amount: number
              p_currency: string
              p_description?: string
              p_receiver_id: string
              p_sender_id: string
            }
            Returns: {
              message: string
              success: boolean
              transfer_id: string
            }[]
          }
        | {
            Args: {
              p_amount: number
              p_currency?: string
              p_description?: string
              p_receiver_id: string
              p_sender_id: string
            }
            Returns: Json
          }
      process_wallet_transfer_with_fees:
        | {
            Args: {
              p_amount: number
              p_currency?: string
              p_description?: string
              p_receiver_code: string
              p_sender_code: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_description?: string
              p_receiver_id: string
              p_sender_id: string
            }
            Returns: Json
          }
      record_pdg_revenue: {
        Args: {
          p_amount: number
          p_metadata?: Json
          p_percentage: number
          p_service_id?: string
          p_source_type: string
          p_transaction_id?: string
          p_user_id?: string
        }
        Returns: string
      }
      record_platform_revenue: {
        Args: {
          p_amount: number
          p_metadata?: Json
          p_revenue_type: string
          p_source_transaction_id?: string
        }
        Returns: string
      }
      record_service_subscription_payment: {
        Args: {
          p_billing_cycle?: string
          p_payment_method?: string
          p_payment_transaction_id?: string
          p_plan_id: string
          p_price_paid: number
          p_service_id: string
          p_user_id: string
        }
        Returns: string
      }
      record_service_transaction: {
        Args: {
          p_amount: number
          p_description?: string
          p_from_user_id: string
          p_metadata?: Json
          p_service_name: string
          p_to_user_id?: string
          p_transaction_type: string
        }
        Returns: string
      }
      record_subscription_payment: {
        Args: {
          p_billing_cycle?: string
          p_payment_method?: string
          p_payment_transaction_id?: string
          p_plan_id: string
          p_price_paid: number
          p_user_id: string
        }
        Returns: string
      }
      refund_escrow: {
        Args: { p_escrow_id: string; p_reason?: string }
        Returns: boolean
      }
      refund_escrow_funds: {
        Args: { p_admin_id: string; p_escrow_id: string; p_reason?: string }
        Returns: boolean
      }
      release_escrow_funds: {
        Args: { p_admin_id?: string; p_escrow_id: string; p_notes?: string }
        Returns: boolean
      }
      release_taxi_lock:
        | {
            Args: {
              p_locked_by: string
              p_resource_id: string
              p_resource_type: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_locked_by: string
              p_resource_id: string
              p_resource_type: string
            }
            Returns: undefined
          }
      run_daily_wallet_audit: { Args: never; Returns: Json }
      set_agent_permissions: {
        Args: { p_agent_id: string; p_permissions: Json }
        Returns: Json
      }
      set_syndicate_worker_permissions: {
        Args: { p_permissions: Json; p_worker_id: string }
        Returns: boolean
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      subscribe_driver:
        | {
            Args: {
              p_payment_method: string
              p_transaction_id?: string
              p_type: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_billing_cycle?: string
              p_payment_method: string
              p_transaction_id?: string
              p_type: string
              p_user_id: string
            }
            Returns: string
          }
      sync_missing_profiles: {
        Args: never
        Returns: {
          custom_id: string
          status: string
          user_id: string
        }[]
      }
      toggle_agent_status: {
        Args: { p_agent_id: string; p_is_active: boolean }
        Returns: Json
      }
      toggle_syndicate_worker_status_secure: {
        Args: { p_bureau_id: string; p_is_active: boolean; p_worker_id: string }
        Returns: undefined
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_agent: {
        Args: {
          p_agent_id: string
          p_can_create_sub_agent?: boolean
          p_commission_rate?: number
          p_email?: string
          p_name?: string
          p_permissions?: Json
          p_phone?: string
        }
        Returns: Json
      }
      update_syndicate_worker_secure: {
        Args: {
          p_access_level?: string
          p_bureau_id: string
          p_email?: string
          p_is_active?: boolean
          p_nom?: string
          p_permissions?: Json
          p_prenom?: string
          p_telephone?: string
          p_worker_id: string
        }
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      validate_standard_id: { Args: { p_id: string }; Returns: boolean }
      validate_transaction_integrity: {
        Args: { p_transaction_id: string }
        Returns: Json
      }
      verify_ledger_integrity: {
        Args: never
        Returns: {
          invalid_entries: number
          is_valid: boolean
          last_verified_at: string
        }[]
      }
      verify_wallet_exists: {
        Args: { target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agent_type_enum:
        | "commercial"
        | "logistique"
        | "support"
        | "administratif"
        | "manager"
        | "technique"
      call_status_type: "ringing" | "accepted" | "rejected" | "ended" | "missed"
      delivery_status:
        | "pending"
        | "assigned"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "cancelled"
      escrow_status_type: "holding" | "released" | "disputed" | "cancelled"
      message_type: "text" | "image" | "file" | "call" | "location"
      order_source: "online" | "pos"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "in_transit"
        | "delivered"
        | "cancelled"
        | "completed"
        | "processing"
      payment_method:
        | "mobile_money"
        | "card"
        | "cash"
        | "bank_transfer"
        | "wallet"
      payment_method_type:
        | "card"
        | "wallet"
        | "mobile_money"
        | "escrow"
        | "orange_money"
        | "mtn"
        | "wave"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      ride_status:
        | "requested"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
      tracking_status_type:
        | "waiting"
        | "in_progress"
        | "delivered"
        | "cancelled"
      transaction_status_type:
        | "pending"
        | "completed"
        | "failed"
        | "refunded"
        | "cancelled"
      user_role:
        | "admin"
        | "vendeur"
        | "livreur"
        | "taxi"
        | "syndicat"
        | "transitaire"
        | "client"
        | "ceo"
        | "agent"
      vehicle_type: "moto" | "car" | "bicycle" | "truck"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      agent_type_enum: [
        "commercial",
        "logistique",
        "support",
        "administratif",
        "manager",
        "technique",
      ],
      call_status_type: ["ringing", "accepted", "rejected", "ended", "missed"],
      delivery_status: [
        "pending",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      escrow_status_type: ["holding", "released", "disputed", "cancelled"],
      message_type: ["text", "image", "file", "call", "location"],
      order_source: ["online", "pos"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "in_transit",
        "delivered",
        "cancelled",
        "completed",
        "processing",
      ],
      payment_method: [
        "mobile_money",
        "card",
        "cash",
        "bank_transfer",
        "wallet",
      ],
      payment_method_type: [
        "card",
        "wallet",
        "mobile_money",
        "escrow",
        "orange_money",
        "mtn",
        "wave",
      ],
      payment_status: ["pending", "paid", "failed", "refunded"],
      ride_status: [
        "requested",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
      ],
      tracking_status_type: [
        "waiting",
        "in_progress",
        "delivered",
        "cancelled",
      ],
      transaction_status_type: [
        "pending",
        "completed",
        "failed",
        "refunded",
        "cancelled",
      ],
      user_role: [
        "admin",
        "vendeur",
        "livreur",
        "taxi",
        "syndicat",
        "transitaire",
        "client",
        "ceo",
        "agent",
      ],
      vehicle_type: ["moto", "car", "bicycle", "truck"],
    },
  },
} as const
