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
      activity_log: {
        Row: {
          action: string
          action_encrypted: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          is_reverted: boolean
          metadata: Json | null
          metadata_encrypted: string | null
          new_values: Json | null
          old_values: Json | null
          resource_url: string | null
          reverted_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          action: string
          action_encrypted?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          is_reverted?: boolean
          metadata?: Json | null
          metadata_encrypted?: string | null
          new_values?: Json | null
          old_values?: Json | null
          resource_url?: string | null
          reverted_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          action?: string
          action_encrypted?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          is_reverted?: boolean
          metadata?: Json | null
          metadata_encrypted?: string | null
          new_values?: Json | null
          old_values?: Json | null
          resource_url?: string | null
          reverted_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_requests: {
        Row: {
          created_at: string
          draft_product_id: string | null
          error_message: string | null
          id: string
          latency_ms: number | null
          model: string | null
          prompt: string | null
          provider: Database["public"]["Enums"]["ai_provider"] | null
          response: string | null
          status: string | null
          tokens_estimate: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_product_id?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          prompt?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"] | null
          response?: string | null
          status?: string | null
          tokens_estimate?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          draft_product_id?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          prompt?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"] | null
          response?: string | null
          status?: string | null
          tokens_estimate?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_requests_draft_product_id_fkey"
            columns: ["draft_product_id"]
            isOneToOne: false
            referencedRelation: "draft_products"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          brand_dna_json: Json
          brand_name_ar: string | null
          brand_name_en: string | null
          client_id: string | null
          colors_json: Json
          contact_json: Json
          cover_assets_json: Json
          created_at: string
          description: string | null
          id: string
          industry: string | null
          logo_assets_json: Json
          personality_json: Json
          profile_assets_json: Json
          slogan: string | null
          social_links_json: Json
          status: string
          target_audience_json: Json
          template_assets_json: Json
          typography_json: Json
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          brand_dna_json?: Json
          brand_name_ar?: string | null
          brand_name_en?: string | null
          client_id?: string | null
          colors_json?: Json
          contact_json?: Json
          cover_assets_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo_assets_json?: Json
          personality_json?: Json
          profile_assets_json?: Json
          slogan?: string | null
          social_links_json?: Json
          status?: string
          target_audience_json?: Json
          template_assets_json?: Json
          typography_json?: Json
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          brand_dna_json?: Json
          brand_name_ar?: string | null
          brand_name_en?: string | null
          client_id?: string | null
          colors_json?: Json
          contact_json?: Json
          cover_assets_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo_assets_json?: Json
          personality_json?: Json
          profile_assets_json?: Json
          slogan?: string | null
          social_links_json?: Json
          status?: string
          target_audience_json?: Json
          template_assets_json?: Json
          typography_json?: Json
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "branding_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_assets: {
        Row: {
          asset_type: string
          brand_kit_id: string | null
          client_id: string | null
          consistency_report: Json | null
          consistency_score: number | null
          created_at: string
          editable_json: Json
          id: string
          image_url: string | null
          is_favorite: boolean
          metadata_json: Json
          negative_prompt: string | null
          platform: string | null
          prompt: string | null
          provider: string | null
          provider_model: string | null
          score_json: Json
          size_height: number | null
          size_width: number | null
          source_asset_id: string | null
          status: string
          storage_path: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type: string
          brand_kit_id?: string | null
          client_id?: string | null
          consistency_report?: Json | null
          consistency_score?: number | null
          created_at?: string
          editable_json?: Json
          id?: string
          image_url?: string | null
          is_favorite?: boolean
          metadata_json?: Json
          negative_prompt?: string | null
          platform?: string | null
          prompt?: string | null
          provider?: string | null
          provider_model?: string | null
          score_json?: Json
          size_height?: number | null
          size_width?: number | null
          source_asset_id?: string | null
          status?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: string
          brand_kit_id?: string | null
          client_id?: string | null
          consistency_report?: Json | null
          consistency_score?: number | null
          created_at?: string
          editable_json?: Json
          id?: string
          image_url?: string | null
          is_favorite?: boolean
          metadata_json?: Json
          negative_prompt?: string | null
          platform?: string | null
          prompt?: string | null
          provider?: string | null
          provider_model?: string | null
          score_json?: Json
          size_height?: number | null
          size_width?: number | null
          source_asset_id?: string | null
          status?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branding_assets_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branding_assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "branding_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branding_assets_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "branding_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_clients: {
        Row: {
          client_name: string
          client_type: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name: string
          client_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string
          client_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      branding_generation_logs: {
        Row: {
          asset_id: string | null
          brand_kit_id: string | null
          client_id: string | null
          cost_estimate: number | null
          created_at: string
          error_message: string | null
          id: string
          provider: string | null
          request_summary: string | null
          response_summary: string | null
          status: string
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          brand_kit_id?: string | null
          client_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          provider?: string | null
          request_summary?: string | null
          response_summary?: string | null
          status?: string
          user_id: string
        }
        Update: {
          asset_id?: string | null
          brand_kit_id?: string | null
          client_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          provider?: string | null
          request_summary?: string | null
          response_summary?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branding_generation_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "branding_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branding_generation_logs_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branding_generation_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "branding_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_templates: {
        Row: {
          brand_kit_id: string | null
          category: string | null
          client_id: string | null
          created_at: string
          editable_fields_json: Json
          height: number | null
          id: string
          layout_json: Json
          name: string
          platform: string | null
          preview_url: string | null
          prompt: string | null
          status: string
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          brand_kit_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          editable_fields_json?: Json
          height?: number | null
          id?: string
          layout_json?: Json
          name: string
          platform?: string | null
          preview_url?: string | null
          prompt?: string | null
          status?: string
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          brand_kit_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          editable_fields_json?: Json
          height?: number | null
          id?: string
          layout_json?: Json
          name?: string
          platform?: string | null
          preview_url?: string | null
          prompt?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "branding_templates_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branding_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "branding_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      content_brain_executions: {
        Row: {
          approved_count: number | null
          converted_count: number | null
          created_at: string
          details: Json | null
          execution_type: string
          id: string
          items_count: number | null
          plan_id: string
          scheduled_count: number | null
          skipped_count: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          approved_count?: number | null
          converted_count?: number | null
          created_at?: string
          details?: Json | null
          execution_type?: string
          id?: string
          items_count?: number | null
          plan_id: string
          scheduled_count?: number | null
          skipped_count?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          approved_count?: number | null
          converted_count?: number | null
          created_at?: string
          details?: Json | null
          execution_type?: string
          id?: string
          items_count?: number | null
          plan_id?: string
          scheduled_count?: number | null
          skipped_count?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_brain_executions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "content_brain_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      content_brain_item_versions: {
        Row: {
          change_reason: string | null
          created_at: string
          id: string
          item_id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          created_at?: string
          id?: string
          item_id: string
          new_data?: Json | null
          old_data?: Json | null
          user_id: string
          version_number?: number
        }
        Update: {
          change_reason?: string | null
          created_at?: string
          id?: string
          item_id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_brain_item_versions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "content_brain_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_brain_items: {
        Row: {
          ads_metadata: Json
          approval_status: string
          asset_ready: boolean | null
          asset_status: string | null
          asset_urls: Json | null
          content_type: string | null
          created_at: string
          cta: string | null
          day_name: string | null
          design_notes: string | null
          draft_content: string | null
          external_tool_used: string | null
          hashtags: string | null
          hook: string | null
          id: string
          idea: string | null
          image_prompt: string | null
          item_index: number
          linked_post_id: string | null
          media_type: string | null
          needs_carousel: boolean | null
          needs_image: boolean | null
          needs_story: boolean | null
          needs_video: boolean | null
          notes: string | null
          objective: string | null
          pinned: boolean | null
          plan_id: string
          platform: string | null
          priority: string | null
          product_or_service: string | null
          reference_media: Json
          schedule_status: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          updated_at: string
          uploaded_media: Json | null
          user_id: string
          video_prompt: string | null
        }
        Insert: {
          ads_metadata?: Json
          approval_status?: string
          asset_ready?: boolean | null
          asset_status?: string | null
          asset_urls?: Json | null
          content_type?: string | null
          created_at?: string
          cta?: string | null
          day_name?: string | null
          design_notes?: string | null
          draft_content?: string | null
          external_tool_used?: string | null
          hashtags?: string | null
          hook?: string | null
          id?: string
          idea?: string | null
          image_prompt?: string | null
          item_index?: number
          linked_post_id?: string | null
          media_type?: string | null
          needs_carousel?: boolean | null
          needs_image?: boolean | null
          needs_story?: boolean | null
          needs_video?: boolean | null
          notes?: string | null
          objective?: string | null
          pinned?: boolean | null
          plan_id: string
          platform?: string | null
          priority?: string | null
          product_or_service?: string | null
          reference_media?: Json
          schedule_status?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          updated_at?: string
          uploaded_media?: Json | null
          user_id: string
          video_prompt?: string | null
        }
        Update: {
          ads_metadata?: Json
          approval_status?: string
          asset_ready?: boolean | null
          asset_status?: string | null
          asset_urls?: Json | null
          content_type?: string | null
          created_at?: string
          cta?: string | null
          day_name?: string | null
          design_notes?: string | null
          draft_content?: string | null
          external_tool_used?: string | null
          hashtags?: string | null
          hook?: string | null
          id?: string
          idea?: string | null
          image_prompt?: string | null
          item_index?: number
          linked_post_id?: string | null
          media_type?: string | null
          needs_carousel?: boolean | null
          needs_image?: boolean | null
          needs_story?: boolean | null
          needs_video?: boolean | null
          notes?: string | null
          objective?: string | null
          pinned?: boolean | null
          plan_id?: string
          platform?: string | null
          priority?: string | null
          product_or_service?: string | null
          reference_media?: Json
          schedule_status?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          updated_at?: string
          uploaded_media?: Json | null
          user_id?: string
          video_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_brain_items_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_brain_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "content_brain_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      content_brain_plans: {
        Row: {
          ads_strategy: Json
          analysis: Json | null
          brand_kit_id: string | null
          business_description: string | null
          client_id: string | null
          content_preferences: Json
          created_at: string
          deep_scan: Json | null
          duration_days: number | null
          end_date: string | null
          goal: string | null
          id: string
          name: string
          notes: string | null
          plan_type: string
          posting_frequency: string | null
          quantitative_recommendations: Json | null
          scanned_context: Json | null
          selected_platforms: Json
          social_links: Json
          sources: Json
          start_date: string | null
          status: string
          strategy: Json | null
          updated_at: string
          use_social_scan: boolean | null
          use_woocommerce: boolean | null
          user_id: string
          website_url: string | null
          wp_app_password: string | null
          wp_site_url: string | null
          wp_username: string | null
        }
        Insert: {
          ads_strategy?: Json
          analysis?: Json | null
          brand_kit_id?: string | null
          business_description?: string | null
          client_id?: string | null
          content_preferences?: Json
          created_at?: string
          deep_scan?: Json | null
          duration_days?: number | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          notes?: string | null
          plan_type?: string
          posting_frequency?: string | null
          quantitative_recommendations?: Json | null
          scanned_context?: Json | null
          selected_platforms?: Json
          social_links?: Json
          sources?: Json
          start_date?: string | null
          status?: string
          strategy?: Json | null
          updated_at?: string
          use_social_scan?: boolean | null
          use_woocommerce?: boolean | null
          user_id: string
          website_url?: string | null
          wp_app_password?: string | null
          wp_site_url?: string | null
          wp_username?: string | null
        }
        Update: {
          ads_strategy?: Json
          analysis?: Json | null
          brand_kit_id?: string | null
          business_description?: string | null
          client_id?: string | null
          content_preferences?: Json
          created_at?: string
          deep_scan?: Json | null
          duration_days?: number | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          notes?: string | null
          plan_type?: string
          posting_frequency?: string | null
          quantitative_recommendations?: Json | null
          scanned_context?: Json | null
          selected_platforms?: Json
          social_links?: Json
          sources?: Json
          start_date?: string | null
          status?: string
          strategy?: Json | null
          updated_at?: string
          use_social_scan?: boolean | null
          use_woocommerce?: boolean | null
          user_id?: string
          website_url?: string | null
          wp_app_password?: string | null
          wp_site_url?: string | null
          wp_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_brain_plans_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_brain_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "branding_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plan_items: {
        Row: {
          approved_at: string | null
          content_type: string | null
          created_at: string
          cta: string | null
          date: string | null
          draft_content: string | null
          goal: string | null
          hashtags: string | null
          id: string
          idea: string | null
          image_prompt: string | null
          media_requirements: Json | null
          plan_id: string
          platform: string | null
          product_id: string | null
          product_url: string | null
          scheduled_post_id: string | null
          status: string
          time: string | null
          updated_at: string
          user_id: string
          video_prompt: string | null
        }
        Insert: {
          approved_at?: string | null
          content_type?: string | null
          created_at?: string
          cta?: string | null
          date?: string | null
          draft_content?: string | null
          goal?: string | null
          hashtags?: string | null
          id?: string
          idea?: string | null
          image_prompt?: string | null
          media_requirements?: Json | null
          plan_id: string
          platform?: string | null
          product_id?: string | null
          product_url?: string | null
          scheduled_post_id?: string | null
          status?: string
          time?: string | null
          updated_at?: string
          user_id: string
          video_prompt?: string | null
        }
        Update: {
          approved_at?: string | null
          content_type?: string | null
          created_at?: string
          cta?: string | null
          date?: string | null
          draft_content?: string | null
          goal?: string | null
          hashtags?: string | null
          id?: string
          idea?: string | null
          image_prompt?: string | null
          media_requirements?: Json | null
          plan_id?: string
          platform?: string | null
          product_id?: string | null
          product_url?: string | null
          scheduled_post_id?: string | null
          status?: string
          time?: string | null
          updated_at?: string
          user_id?: string
          video_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "content_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plans: {
        Row: {
          created_at: string
          duration: string | null
          goal: string | null
          id: string
          name: string
          platforms: Json | null
          settings: Json | null
          sources: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: string | null
          goal?: string | null
          id?: string
          name: string
          platforms?: Json | null
          settings?: Json | null
          sources?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: string | null
          goal?: string | null
          id?: string
          name?: string
          platforms?: Json | null
          settings?: Json | null
          sources?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      draft_products: {
        Row: {
          ai_processed_data: Json | null
          categories: Json | null
          created_at: string
          currency: string | null
          error_message: string | null
          id: string
          long_description: string | null
          name: string | null
          original_data: Json | null
          price: number | null
          product_type: string | null
          sale_price: number | null
          short_description: string | null
          sku: string | null
          slug: string | null
          status: Database["public"]["Enums"]["draft_product_status"] | null
          tags: Json | null
          telegram_post_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_processed_data?: Json | null
          categories?: Json | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          id?: string
          long_description?: string | null
          name?: string | null
          original_data?: Json | null
          price?: number | null
          product_type?: string | null
          sale_price?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["draft_product_status"] | null
          tags?: Json | null
          telegram_post_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_processed_data?: Json | null
          categories?: Json | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          id?: string
          long_description?: string | null
          name?: string | null
          original_data?: Json | null
          price?: number | null
          product_type?: string | null
          sale_price?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["draft_product_status"] | null
          tags?: Json | null
          telegram_post_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_products_telegram_post_id_fkey"
            columns: ["telegram_post_id"]
            isOneToOne: false
            referencedRelation: "telegram_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_providers: {
        Row: {
          api_key_encrypted: string | null
          api_key_last4: string | null
          base_url: string | null
          created_at: string
          id: string
          is_default: boolean
          last_test_message: string | null
          last_tested_at: string | null
          model_name: string | null
          provider_name: string
          settings_json: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          api_key_last4?: string | null
          base_url?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          last_test_message?: string | null
          last_tested_at?: string | null
          model_name?: string | null
          provider_name: string
          settings_json?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          api_key_last4?: string | null
          base_url?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          last_test_message?: string | null
          last_tested_at?: string | null
          model_name?: string | null
          provider_name?: string
          settings_json?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          level: Database["public"]["Enums"]["notification_level"] | null
          link_url: string | null
          related_id: string | null
          related_type: string | null
          seen_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["notification_level"] | null
          link_url?: string | null
          related_id?: string | null
          related_type?: string | null
          seen_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["notification_level"] | null
          link_url?: string | null
          related_id?: string | null
          related_type?: string | null
          seen_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      product_attributes: {
        Row: {
          created_at: string
          draft_product_id: string
          id: string
          is_variation: boolean | null
          name: string
          values: Json | null
        }
        Insert: {
          created_at?: string
          draft_product_id: string
          id?: string
          is_variation?: boolean | null
          name: string
          values?: Json | null
        }
        Update: {
          created_at?: string
          draft_product_id?: string
          id?: string
          is_variation?: boolean | null
          name?: string
          values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_draft_product_id_fkey"
            columns: ["draft_product_id"]
            isOneToOne: false
            referencedRelation: "draft_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          draft_product_id: string
          id: string
          is_featured: boolean | null
          local_path: string | null
          sort_order: number | null
          source: string | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          draft_product_id: string
          id?: string
          is_featured?: boolean | null
          local_path?: string | null
          sort_order?: number | null
          source?: string | null
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          draft_product_id?: string
          id?: string
          is_featured?: boolean | null
          local_path?: string | null
          sort_order?: number | null
          source?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_draft_product_id_fkey"
            columns: ["draft_product_id"]
            isOneToOne: false
            referencedRelation: "draft_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string
          dialect: string
          draft_product_id: string | null
          id: string
          rating: number
          review_text: string
          reviewer_email: string | null
          reviewer_name: string
          status: string
          updated_at: string
          user_id: string
          verified: boolean | null
          wc_product_id: number | null
          wc_review_id: number | null
        }
        Insert: {
          created_at?: string
          dialect?: string
          draft_product_id?: string | null
          id?: string
          rating: number
          review_text: string
          reviewer_email?: string | null
          reviewer_name: string
          status?: string
          updated_at?: string
          user_id: string
          verified?: boolean | null
          wc_product_id?: number | null
          wc_review_id?: number | null
        }
        Update: {
          created_at?: string
          dialect?: string
          draft_product_id?: string | null
          id?: string
          rating?: number
          review_text?: string
          reviewer_email?: string | null
          reviewer_name?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          wc_product_id?: number | null
          wc_review_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_draft_product_id_fkey"
            columns: ["draft_product_id"]
            isOneToOne: false
            referencedRelation: "draft_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          template_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          template_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          template_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_variations: {
        Row: {
          attributes: Json
          created_at: string
          draft_product_id: string
          id: string
          image_url: string | null
          price: number | null
          sale_price: number | null
          sku: string | null
          stock_quantity: number | null
        }
        Insert: {
          attributes?: Json
          created_at?: string
          draft_product_id: string
          id?: string
          image_url?: string | null
          price?: number | null
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number | null
        }
        Update: {
          attributes?: Json
          created_at?: string
          draft_product_id?: string
          id?: string
          image_url?: string | null
          price?: number | null
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_draft_product_id_fkey"
            columns: ["draft_product_id"]
            isOneToOne: false
            referencedRelation: "draft_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          language: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_products: {
        Row: {
          created_at: string
          draft_product_id: string | null
          error_message: string | null
          id: string
          scheduled_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_product_id?: string | null
          error_message?: string | null
          id?: string
          scheduled_at: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_product_id?: string | null
          error_message?: string | null
          id?: string
          scheduled_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_products_draft_product_id_fkey"
            columns: ["draft_product_id"]
            isOneToOne: false
            referencedRelation: "draft_products"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      social_page_posts_cache: {
        Row: {
          connection_id: string
          created_at: string
          external_post_id: string
          fetched_at: string
          id: string
          payload: Json
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          external_post_id: string
          fetched_at?: string
          id?: string
          payload?: Json
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          external_post_id?: string
          fetched_at?: string
          id?: string
          payload?: Json
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_page_posts_cache_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_platform_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      social_platform_connections: {
        Row: {
          access_token_encrypted: string | null
          account_id: string | null
          account_name: string | null
          created_at: string
          id: string
          last_error: string | null
          last_tested_at: string | null
          page_id: string | null
          page_name: string | null
          platform: string
          refresh_token_encrypted: string | null
          scopes: Json | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_tested_at?: string | null
          page_id?: string | null
          page_name?: string | null
          platform: string
          refresh_token_encrypted?: string | null
          scopes?: Json | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_tested_at?: string | null
          page_id?: string | null
          page_name?: string | null
          platform?: string
          refresh_token_encrypted?: string | null
          scopes?: Json | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_post_platforms: {
        Row: {
          content: string | null
          created_at: string
          id: string
          last_error: string | null
          media: Json | null
          platform: string
          platform_account_id: string | null
          platform_post_id: string | null
          post_id: string
          publish_attempts: number
          published_url: string | null
          recurring_rule: Json | null
          schedule_time: string | null
          status: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          media?: Json | null
          platform: string
          platform_account_id?: string | null
          platform_post_id?: string | null
          post_id: string
          publish_attempts?: number
          published_url?: string | null
          recurring_rule?: Json | null
          schedule_time?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          media?: Json | null
          platform?: string
          platform_account_id?: string | null
          platform_post_id?: string | null
          post_id?: string
          publish_attempts?: number
          published_url?: string | null
          recurring_rule?: Json | null
          schedule_time?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_platforms_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          approval_status: string
          created_at: string
          generated_content: Json | null
          id: string
          media: Json | null
          original_external_post_id: string | null
          product_data: Json | null
          published_at: string | null
          recurring_rule: Json | null
          retry_count: number
          scheduled_at: string | null
          score_data: Json | null
          selected_platforms: Json | null
          source_payload: Json
          source_post_id: string | null
          source_type: string | null
          source_url: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          created_at?: string
          generated_content?: Json | null
          id?: string
          media?: Json | null
          original_external_post_id?: string | null
          product_data?: Json | null
          published_at?: string | null
          recurring_rule?: Json | null
          retry_count?: number
          scheduled_at?: string | null
          score_data?: Json | null
          selected_platforms?: Json | null
          source_payload?: Json
          source_post_id?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          created_at?: string
          generated_content?: Json | null
          id?: string
          media?: Json | null
          original_external_post_id?: string | null
          product_data?: Json | null
          published_at?: string | null
          recurring_rule?: Json | null
          retry_count?: number
          scheduled_at?: string | null
          score_data?: Json | null
          selected_platforms?: Json | null
          source_payload?: Json
          source_post_id?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_product_analyses: {
        Row: {
          analysis: Json | null
          created_at: string
          extracted_data: Json | null
          id: string
          images: Json | null
          source_type: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          extracted_data?: Json | null
          id?: string
          images?: Json | null
          source_type?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          extracted_data?: Json | null
          id?: string
          images?: Json | null
          source_type?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      social_publish_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          platform: string
          platform_post_id: string | null
          post_id: string | null
          published_url: string | null
          request_summary: Json | null
          response_summary: Json | null
          status: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          platform: string
          platform_post_id?: string | null
          post_id?: string | null
          published_url?: string | null
          request_summary?: Json | null
          response_summary?: Json | null
          status: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          platform?: string
          platform_post_id?: string | null
          post_id?: string | null
          published_url?: string | null
          request_summary?: Json | null
          response_summary?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_publish_logs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_schedules: {
        Row: {
          created_at: string
          id: string
          max_occurrences: number | null
          post_id: string
          publish_at: string | null
          recurrence_days: Json | null
          recurrence_ends_at: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          schedule_type: string
          status: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_occurrences?: number | null
          post_id: string
          publish_at?: string | null
          recurrence_days?: Json | null
          recurrence_ends_at?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          schedule_type?: string
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_occurrences?: number | null
          post_id?: string
          publish_at?: string | null
          recurrence_days?: Json | null
          recurrence_ends_at?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          schedule_type?: string
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_schedules_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_size_presets: {
        Row: {
          asset_type: string
          height: number
          id: string
          is_active: boolean
          notes: string | null
          platform: string
          safe_area_json: Json
          updated_at: string
          user_id: string | null
          width: number
        }
        Insert: {
          asset_type: string
          height: number
          id?: string
          is_active?: boolean
          notes?: string | null
          platform: string
          safe_area_json?: Json
          updated_at?: string
          user_id?: string | null
          width: number
        }
        Update: {
          asset_type?: string
          height?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          platform?: string
          safe_area_json?: Json
          updated_at?: string
          user_id?: string | null
          width?: number
        }
        Relationships: []
      }
      telegram_media: {
        Row: {
          created_at: string
          file_id: string
          file_unique_id: string | null
          id: string
          is_selected: boolean | null
          local_path: string | null
          media_type: string | null
          post_id: string
          remote_url: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          file_id: string
          file_unique_id?: string | null
          id?: string
          is_selected?: boolean | null
          local_path?: string | null
          media_type?: string | null
          post_id: string
          remote_url?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          file_id?: string
          file_unique_id?: string | null
          id?: string
          is_selected?: boolean | null
          local_path?: string | null
          media_type?: string | null
          post_id?: string
          remote_url?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "telegram_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_posts: {
        Row: {
          chat_id: string
          created_at: string
          date: string | null
          id: string
          is_processed: boolean | null
          message_id: number
          raw_json: Json | null
          source_id: string
          synced_at: string
          text: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          date?: string | null
          id?: string
          is_processed?: boolean | null
          message_id: number
          raw_json?: Json | null
          source_id: string
          synced_at?: string
          text?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          date?: string | null
          id?: string
          is_processed?: boolean | null
          message_id?: number
          raw_json?: Json | null
          source_id?: string
          synced_at?: string
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_posts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "telegram_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_posts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "telegram_sources_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_sources: {
        Row: {
          auto_sync: boolean | null
          bot_token: string
          bot_token_encrypted: string | null
          chat_id: string
          created_at: string
          id: string
          include_images_default: boolean | null
          is_active: boolean | null
          is_token_encrypted: boolean | null
          last_synced_at: string | null
          mode: string | null
          name: string
          sync_interval_minutes: number | null
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          auto_sync?: boolean | null
          bot_token?: string
          bot_token_encrypted?: string | null
          chat_id: string
          created_at?: string
          id?: string
          include_images_default?: boolean | null
          is_active?: boolean | null
          is_token_encrypted?: boolean | null
          last_synced_at?: string | null
          mode?: string | null
          name: string
          sync_interval_minutes?: number | null
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          auto_sync?: boolean | null
          bot_token?: string
          bot_token_encrypted?: string | null
          chat_id?: string
          created_at?: string
          id?: string
          include_images_default?: boolean | null
          is_active?: boolean | null
          is_token_encrypted?: boolean | null
          last_synced_at?: string | null
          mode?: string | null
          name?: string
          sync_interval_minutes?: number | null
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      wc_categories_cache: {
        Row: {
          id: string
          name: string
          parent_id: number | null
          slug: string | null
          synced_at: string
          user_id: string
          wc_id: number
        }
        Insert: {
          id?: string
          name: string
          parent_id?: number | null
          slug?: string | null
          synced_at?: string
          user_id: string
          wc_id: number
        }
        Update: {
          id?: string
          name?: string
          parent_id?: number | null
          slug?: string | null
          synced_at?: string
          user_id?: string
          wc_id?: number
        }
        Relationships: []
      }
      wc_mappings: {
        Row: {
          created_at: string
          draft_product_id: string
          id: string
          last_synced_at: string
          wc_permalink: string | null
          wc_product_id: number
        }
        Insert: {
          created_at?: string
          draft_product_id: string
          id?: string
          last_synced_at?: string
          wc_permalink?: string | null
          wc_product_id: number
        }
        Update: {
          created_at?: string
          draft_product_id?: string
          id?: string
          last_synced_at?: string
          wc_permalink?: string | null
          wc_product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "wc_mappings_draft_product_id_fkey"
            columns: ["draft_product_id"]
            isOneToOne: true
            referencedRelation: "draft_products"
            referencedColumns: ["id"]
          },
        ]
      }
      wp_customizations: {
        Row: {
          applied: boolean
          applied_at: string | null
          created_at: string
          explanation: string | null
          generated_css: string
          generated_js: string
          id: string
          prompt: string
          provider: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          applied?: boolean
          applied_at?: string | null
          created_at?: string
          explanation?: string | null
          generated_css?: string
          generated_js?: string
          id?: string
          prompt: string
          provider?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          applied?: boolean
          applied_at?: string | null
          created_at?: string
          explanation?: string | null
          generated_css?: string
          generated_js?: string
          id?: string
          prompt?: string
          provider?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wp_plugin_versions: {
        Row: {
          changelog: string | null
          created_at: string
          css: string
          explanation: string | null
          id: string
          js: string
          php_code: string
          plugin_id: string
          prompt: string
          provider: string | null
          user_id: string
          version: string
        }
        Insert: {
          changelog?: string | null
          created_at?: string
          css?: string
          explanation?: string | null
          id?: string
          js?: string
          php_code?: string
          plugin_id: string
          prompt: string
          provider?: string | null
          user_id: string
          version: string
        }
        Update: {
          changelog?: string | null
          created_at?: string
          css?: string
          explanation?: string | null
          id?: string
          js?: string
          php_code?: string
          plugin_id?: string
          prompt?: string
          provider?: string | null
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "wp_plugin_versions_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "wp_plugins"
            referencedColumns: ["id"]
          },
        ]
      }
      wp_plugins: {
        Row: {
          created_at: string
          current_version: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_version?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_version?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      telegram_sources_secure: {
        Row: {
          auto_sync: boolean | null
          chat_id: string | null
          created_at: string | null
          has_token: boolean | null
          id: string | null
          include_images_default: boolean | null
          is_active: boolean | null
          is_token_encrypted: boolean | null
          last_synced_at: string | null
          mode: string | null
          name: string | null
          sync_interval_minutes: number | null
          updated_at: string | null
          user_id: string | null
          webhook_url: string | null
        }
        Insert: {
          auto_sync?: boolean | null
          chat_id?: string | null
          created_at?: string | null
          has_token?: never
          id?: string | null
          include_images_default?: boolean | null
          is_active?: boolean | null
          is_token_encrypted?: boolean | null
          last_synced_at?: string | null
          mode?: string | null
          name?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          auto_sync?: boolean | null
          chat_id?: string | null
          created_at?: string | null
          has_token?: never
          id?: string | null
          include_images_default?: boolean | null
          is_active?: boolean | null
          is_token_encrypted?: boolean | null
          last_synced_at?: string | null
          mode?: string | null
          name?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrypt_secret: {
        Args: { encrypted_text: string; encryption_key: string }
        Returns: string
      }
      encrypt_secret: {
        Args: { encryption_key: string; plain_text: string }
        Returns: string
      }
      get_decrypted_activity_log: {
        Args: { p_user_id: string }
        Returns: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          user_id: string
        }[]
      }
      get_social_connection_token: {
        Args: { p_connection_id: string }
        Returns: string
      }
      get_telegram_bot_token: { Args: { p_source_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_encrypted_activity_log: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      ai_provider: "lovable" | "gemini" | "openrouter"
      app_role: "admin" | "user"
      draft_product_status:
        | "inbox"
        | "draft"
        | "ai_processing"
        | "ai_processed"
        | "review_ready"
        | "publishing"
        | "published"
        | "failed"
      notification_level: "success" | "warning" | "error" | "info"
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
      ai_provider: ["lovable", "gemini", "openrouter"],
      app_role: ["admin", "user"],
      draft_product_status: [
        "inbox",
        "draft",
        "ai_processing",
        "ai_processed",
        "review_ready",
        "publishing",
        "published",
        "failed",
      ],
      notification_level: ["success", "warning", "error", "info"],
    },
  },
} as const
