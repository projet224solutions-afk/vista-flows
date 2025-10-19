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
          agent_code: string
          commission_rate: number | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          pdg_id: string
          permissions: Json | null
          phone: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_code: string
          commission_rate?: number | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          pdg_id: string
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_code?: string
          commission_rate?: number | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          pdg_id?: string
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      bureaus: {
        Row: {
          bureau_code: string
          commune: string
          created_at: string | null
          full_location: string | null
          id: string
          last_activity: string | null
          prefecture: string
          president_email: string | null
          president_name: string | null
          president_phone: string | null
          status: string | null
          total_cotisations: number | null
          total_members: number | null
          total_vehicles: number | null
          validated_at: string | null
        }
        Insert: {
          bureau_code: string
          commune: string
          created_at?: string | null
          full_location?: string | null
          id?: string
          last_activity?: string | null
          prefecture: string
          president_email?: string | null
          president_name?: string | null
          president_phone?: string | null
          status?: string | null
          total_cotisations?: number | null
          total_members?: number | null
          total_vehicles?: number | null
          validated_at?: string | null
        }
        Update: {
          bureau_code?: string
          commune?: string
          created_at?: string | null
          full_location?: string | null
          id?: string
          last_activity?: string | null
          prefecture?: string
          president_email?: string | null
          president_name?: string | null
          president_phone?: string | null
          status?: string | null
          total_cotisations?: number | null
          total_members?: number | null
          total_vehicles?: number | null
          validated_at?: string | null
        }
        Relationships: []
      }
      calls: {
        Row: {
          call_type: string
          caller_id: string
          ended_at: string | null
          id: string
          receiver_id: string
          started_at: string
          status: Database["public"]["Enums"]["call_status_type"]
        }
        Insert: {
          call_type?: string
          caller_id: string
          ended_at?: string | null
          id?: string
          receiver_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["call_status_type"]
        }
        Update: {
          call_type?: string
          caller_id?: string
          ended_at?: string | null
          id?: string
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
          updated_at: string | null
          user_id: string
        }
        Insert: {
          addresses?: Json | null
          created_at?: string | null
          id?: string
          payment_methods?: Json | null
          preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          addresses?: Json | null
          created_at?: string | null
          id?: string
          payment_methods?: Json | null
          preferences?: Json | null
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
        ]
      }
      deliveries: {
        Row: {
          actual_delivery_time: string | null
          actual_pickup_time: string | null
          created_at: string | null
          customer_rating: number | null
          delivery_address: Json
          delivery_fee: number | null
          distance_km: number | null
          driver_id: string | null
          driver_notes: string | null
          estimated_delivery_time: string | null
          estimated_pickup_time: string | null
          id: string
          order_id: string
          pickup_address: Json
          status: Database["public"]["Enums"]["delivery_status"] | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_time?: string | null
          actual_pickup_time?: string | null
          created_at?: string | null
          customer_rating?: number | null
          delivery_address: Json
          delivery_fee?: number | null
          distance_km?: number | null
          driver_id?: string | null
          driver_notes?: string | null
          estimated_delivery_time?: string | null
          estimated_pickup_time?: string | null
          id?: string
          order_id: string
          pickup_address: Json
          status?: Database["public"]["Enums"]["delivery_status"] | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_time?: string | null
          actual_pickup_time?: string | null
          created_at?: string | null
          customer_rating?: number | null
          delivery_address?: Json
          delivery_fee?: number | null
          distance_km?: number | null
          driver_id?: string | null
          driver_notes?: string | null
          estimated_delivery_time?: string | null
          estimated_pickup_time?: string | null
          id?: string
          order_id?: string
          pickup_address?: Json
          status?: Database["public"]["Enums"]["delivery_status"] | null
          updated_at?: string | null
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
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string | null
          current_location: unknown | null
          id: string
          is_online: boolean | null
          is_verified: boolean | null
          license_number: string
          rating: number | null
          total_deliveries: number | null
          updated_at: string | null
          user_id: string
          vehicle_info: Json | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          created_at?: string | null
          current_location?: unknown | null
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          license_number: string
          rating?: number | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_info?: Json | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          created_at?: string | null
          current_location?: unknown | null
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          license_number?: string
          rating?: number | null
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
        ]
      }
      enhanced_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          custom_id: string
          id: string
          metadata: Json | null
          method: string
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
          id?: string
          metadata?: Json | null
          method?: string
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
          id?: string
          metadata?: Json | null
          method?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
            isOneToOne: false
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
          email: string | null
          id: string
          join_date: string | null
          last_cotisation_date: string | null
          license_number: string | null
          name: string
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
          email?: string | null
          id?: string
          join_date?: string | null
          last_cotisation_date?: string | null
          license_number?: string | null
          name: string
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
          email?: string | null
          id?: string
          join_date?: string | null
          last_cotisation_date?: string | null
          license_number?: string | null
          name?: string
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
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          file_url: string | null
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          type: Database["public"]["Enums"]["message_type"] | null
        }
        Insert: {
          content: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          type?: Database["public"]["Enums"]["message_type"] | null
        }
        Update: {
          content?: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          shipping_address: Json
          shipping_amount: number | null
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
          notes?: string | null
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          shipping_address: Json
          shipping_amount?: number | null
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
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          shipping_address?: Json
          shipping_amount?: number | null
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
      pos_settings: {
        Row: {
          auto_print_receipt: boolean | null
          company_name: string | null
          created_at: string
          currency: string
          id: string
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
          receipt_footer?: string | null
          tax_enabled?: boolean
          tax_rate?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
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
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          compare_price: number | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          dimensions: Json | null
          id: string
          images: string[] | null
          is_active: boolean | null
          low_stock_threshold: number | null
          name: string
          price: number
          seo_description: string | null
          seo_title: string | null
          sku: string | null
          stock_quantity: number | null
          tags: string[] | null
          updated_at: string | null
          vendor_id: string
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          compare_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name: string
          price: number
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          updated_at?: string | null
          vendor_id: string
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          compare_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name?: string
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
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
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
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
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
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
      sos_alerts: {
        Row: {
          address: string | null
          alert_type: string | null
          bureau_id: string | null
          created_at: string | null
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          member_name: string | null
          severity: string | null
          status: string | null
          vehicle_serial: string | null
        }
        Insert: {
          address?: string | null
          alert_type?: string | null
          bureau_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          member_name?: string | null
          severity?: string | null
          status?: string | null
          vehicle_serial?: string | null
        }
        Update: {
          address?: string | null
          alert_type?: string | null
          bureau_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          member_name?: string | null
          severity?: string | null
          status?: string | null
          vehicle_serial?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_alerts_bureau_id_fkey"
            columns: ["bureau_id"]
            isOneToOne: false
            referencedRelation: "bureaus"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
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
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          priority: string | null
          product_id: string | null
          resolution: string | null
          status: string | null
          subject: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          priority?: string | null
          product_id?: string | null
          resolution?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          priority?: string | null
          product_id?: string | null
          resolution?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "vendor_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
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
          created_at: string | null
          id: string
          is_online: boolean | null
          rating: number | null
          total_earnings: number | null
          total_rides: number | null
          updated_at: string | null
          user_id: string
          vehicle: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_online?: boolean | null
          rating?: number | null
          total_earnings?: number | null
          total_rides?: number | null
          updated_at?: string | null
          user_id: string
          vehicle?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_online?: boolean | null
          rating?: number | null
          total_earnings?: number | null
          total_rides?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle?: Json | null
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
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          bureau_id: string | null
          created_at: string | null
          id: string
          insurance_expiry: string | null
          last_inspection: string | null
          model: string | null
          owner_member_id: string | null
          serial_number: string | null
          status: string | null
          type: string | null
          year: number | null
        }
        Insert: {
          brand?: string | null
          bureau_id?: string | null
          created_at?: string | null
          id?: string
          insurance_expiry?: string | null
          last_inspection?: string | null
          model?: string | null
          owner_member_id?: string | null
          serial_number?: string | null
          status?: string | null
          type?: string | null
          year?: number | null
        }
        Update: {
          brand?: string | null
          bureau_id?: string | null
          created_at?: string | null
          id?: string
          insurance_expiry?: string | null
          last_inspection?: string | null
          model?: string | null
          owner_member_id?: string | null
          serial_number?: string | null
          status?: string | null
          type?: string | null
          year?: number | null
        }
        Relationships: [
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
            referencedRelation: "members"
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
      vendors: {
        Row: {
          address: string | null
          business_name: string
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          phone: string | null
          rating: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          business_name: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          phone?: string | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          business_name?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          phone?: string | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_cards: {
        Row: {
          card_number: string
          created_at: string
          cvv: string
          expiry_date: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          card_number: string
          created_at?: string
          cvv: string
          expiry_date: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          card_number?: string
          created_at?: string
          cvv?: string
          expiry_date?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
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
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          name?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_commission: {
        Args: {
          p_amount: number
          p_service_name: string
          p_transaction_type: string
        }
        Returns: number
      }
      calculate_expense_stats: {
        Args: { p_end_date: string; p_start_date: string; p_vendor_id: string }
        Returns: Json
      }
      create_default_expense_categories: {
        Args: { p_vendor_id: string }
        Returns: undefined
      }
      credit_wallet: {
        Args: { credit_amount: number; receiver_user_id: string }
        Returns: undefined
      }
      detect_expense_anomalies: {
        Args: { p_vendor_id: string }
        Returns: Json
      }
      detect_fraud: {
        Args: {
          p_amount: number
          p_transaction_type: string
          p_user_id: string
        }
        Returns: Json
      }
      generate_card_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_custom_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_transaction_custom_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_transaction_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_inventory_stats: {
        Args: { p_vendor_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_wallet_transaction: {
        Args: {
          p_amount: number
          p_currency?: string
          p_description?: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: string
      }
    }
    Enums: {
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
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "in_transit"
        | "delivered"
        | "cancelled"
      payment_method: "mobile_money" | "card" | "cash" | "bank_transfer"
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
      vehicle_type: "moto" | "car" | "bicycle" | "truck"
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
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      payment_method: ["mobile_money", "card", "cash", "bank_transfer"],
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
      ],
      vehicle_type: ["moto", "car", "bicycle", "truck"],
    },
  },
} as const
