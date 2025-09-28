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
          expiry_date: string | null
          id: string
          last_updated: string | null
          lot_number: string | null
          minimum_stock: number | null
          product_id: string
          quantity: number
          reserved_quantity: number | null
          variant_id: string | null
          warehouse_id: string | null
          warehouse_location: string | null
        }
        Insert: {
          expiry_date?: string | null
          id?: string
          last_updated?: string | null
          lot_number?: string | null
          minimum_stock?: number | null
          product_id: string
          quantity?: number
          reserved_quantity?: number | null
          variant_id?: string | null
          warehouse_id?: string | null
          warehouse_location?: string | null
        }
        Update: {
          expiry_date?: string | null
          id?: string
          last_updated?: string | null
          lot_number?: string | null
          minimum_stock?: number | null
          product_id?: string
          quantity?: number
          reserved_quantity?: number | null
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
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
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
      warehouses: {
        Row: {
          address: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          vendor_id: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          vendor_id: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          contact_phone?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      delivery_status:
        | "pending"
        | "assigned"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "cancelled"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "in_transit"
        | "delivered"
        | "cancelled"
      payment_method: "mobile_money" | "card" | "cash" | "bank_transfer"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      ride_status:
        | "requested"
        | "accepted"
        | "in_progress"
        | "completed"
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
      delivery_status: [
        "pending",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "cancelled",
      ],
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
      payment_status: ["pending", "paid", "failed", "refunded"],
      ride_status: [
        "requested",
        "accepted",
        "in_progress",
        "completed",
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
