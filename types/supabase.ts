export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admins: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string
          id: string
          is_authenticated: boolean
          is_comm: boolean
          is_sales: boolean
          is_super: boolean
          name: string
          phone: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email: string
          id: string
          is_authenticated?: boolean
          is_comm?: boolean
          is_sales?: boolean
          is_super?: boolean
          name: string
          phone?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string
          id?: string
          is_authenticated?: boolean
          is_comm?: boolean
          is_sales?: boolean
          is_super?: boolean
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admins_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          link_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          link_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          link_url?: string | null
          name?: string
        }
        Relationships: []
      }
      campaign: {
        Row: {
          content: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_info: {
        Row: {
          content_html: string
          id: string
          updated_at: string
        }
        Insert: {
          content_html?: string
          id?: string
          updated_at?: string
        }
        Update: {
          content_html?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_rows: {
        Row: {
          attendance: boolean | null
          classroom: string | null
          criminal_background_check: string | null
          end_time: string | null
          event_id: string | null
          headcount: number | null
          id: string
          instructor_waiting_room: string | null
          lecture_fee: number | null
          lecture_fee_after_tax: number | null
          lecture_fee_payer_id: string | null
          material_fee_payer_id: string | null
          mentor_id: string | null
          occupation_program_unit_id: string | null
          remarks: string | null
          school_request_response: string | null
          session_headcount: number | null
          start_time: string | null
        }
        Insert: {
          attendance?: boolean | null
          classroom?: string | null
          criminal_background_check?: string | null
          end_time?: string | null
          event_id?: string | null
          headcount?: number | null
          id?: string
          instructor_waiting_room?: string | null
          lecture_fee?: number | null
          lecture_fee_after_tax?: number | null
          lecture_fee_payer_id?: string | null
          material_fee_payer_id?: string | null
          mentor_id?: string | null
          occupation_program_unit_id?: string | null
          remarks?: string | null
          school_request_response?: string | null
          session_headcount?: number | null
          start_time?: string | null
        }
        Update: {
          attendance?: boolean | null
          classroom?: string | null
          criminal_background_check?: string | null
          end_time?: string | null
          event_id?: string | null
          headcount?: number | null
          id?: string
          instructor_waiting_room?: string | null
          lecture_fee?: number | null
          lecture_fee_after_tax?: number | null
          lecture_fee_payer_id?: string | null
          material_fee_payer_id?: string | null
          mentor_id?: string | null
          occupation_program_unit_id?: string | null
          remarks?: string | null
          school_request_response?: string | null
          session_headcount?: number | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_rows_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rows_lecture_fee_payer_id_fkey"
            columns: ["lecture_fee_payer_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rows_material_fee_payer_id_fkey"
            columns: ["material_fee_payer_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rows_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rows_occupation_program_unit_id_fkey"
            columns: ["occupation_program_unit_id"]
            isOneToOne: false
            referencedRelation: "occupation_program_unit"
            referencedColumns: ["id"]
          },
        ]
      }
      event_schedules: {
        Row: {
          end_time: string
          event_id: string
          id: string
          label: string
          sort_order: number
          start_time: string
        }
        Insert: {
          end_time: string
          event_id: string
          id?: string
          label: string
          sort_order: number
          start_time: string
        }
        Update: {
          end_time?: string
          event_id?: string
          id?: string
          label?: string
          sort_order?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sessions: {
        Row: {
          end_at: string | null
          event_id: string
          id: string
          sort_order: number
          start_at: string
        }
        Insert: {
          end_at?: string | null
          event_id: string
          id?: string
          sort_order?: number
          start_at: string
        }
        Update: {
          end_at?: string | null
          event_id?: string
          id?: string
          sort_order?: number
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          admin_contact: string | null
          admin_docs: string | null
          admin_docs_delivered: boolean | null
          budget: number | null
          campaign_id: string | null
          comm_admin_id: string | null
          comm_content: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_status: Database["public"]["Enums"]["contract_status"] | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          created_at: string
          crime_check_info: string | null
          crime_check_method:
            | Database["public"]["Enums"]["crime_check_method"]
            | null
          crime_check_notified: boolean | null
          crime_check_status:
            | Database["public"]["Enums"]["crime_check_status"]
            | null
          estimate_file_url: string | null
          event_check_status: number
          event_end_at: string | null
          event_start_at: string | null
          field_admin_ids: string[] | null
          floor_map_url: string | null
          group_chat_link: string | null
          group_chat_status: string | null
          has_elevator: boolean | null
          id: string
          indoor_shoes_note: string | null
          inflow_source: Database["public"]["Enums"]["inflow_source"] | null
          institution_id: string | null
          institution_request_status:
            | Database["public"]["Enums"]["institution_request_status"]
            | null
          institution_type:
            | Database["public"]["Enums"]["institution_type"]
            | null
          instructor_waiting_room: string | null
          laptop_wifi_note: string | null
          memo: string | null
          name: string
          notice: string | null
          occupation_program_id: string | null
          parking_note: string | null
          payment_confirmed: boolean | null
          photo_sent: boolean | null
          pre_notice_sent: boolean
          prep_note: string | null
          recruit_delivered: boolean | null
          recruit_start_date: string | null
          recruit_status: Database["public"]["Enums"]["recruit_status"] | null
          remarks: string | null
          report_sent: boolean | null
          requested_dates: string[] | null
          sales_admin_id: string | null
          school_request_delivered: boolean | null
          start_recruit_at: string | null
          student_rotation: string | null
          supplies_status: Database["public"]["Enums"]["supplies_status"] | null
          target_grade: string | null
          teacher_name: string | null
        }
        Insert: {
          admin_contact?: string | null
          admin_docs?: string | null
          admin_docs_delivered?: boolean | null
          budget?: number | null
          campaign_id?: string | null
          comm_admin_id?: string | null
          comm_content?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_status?:
            | Database["public"]["Enums"]["contract_status"]
            | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string
          crime_check_info?: string | null
          crime_check_method?:
            | Database["public"]["Enums"]["crime_check_method"]
            | null
          crime_check_notified?: boolean | null
          crime_check_status?:
            | Database["public"]["Enums"]["crime_check_status"]
            | null
          estimate_file_url?: string | null
          event_check_status?: number
          event_end_at?: string | null
          event_start_at?: string | null
          field_admin_ids?: string[] | null
          floor_map_url?: string | null
          group_chat_link?: string | null
          group_chat_status?: string | null
          has_elevator?: boolean | null
          id?: string
          indoor_shoes_note?: string | null
          inflow_source?: Database["public"]["Enums"]["inflow_source"] | null
          institution_id?: string | null
          institution_request_status?:
            | Database["public"]["Enums"]["institution_request_status"]
            | null
          institution_type?:
            | Database["public"]["Enums"]["institution_type"]
            | null
          instructor_waiting_room?: string | null
          laptop_wifi_note?: string | null
          memo?: string | null
          name: string
          notice?: string | null
          occupation_program_id?: string | null
          parking_note?: string | null
          payment_confirmed?: boolean | null
          photo_sent?: boolean | null
          pre_notice_sent?: boolean
          prep_note?: string | null
          recruit_delivered?: boolean | null
          recruit_start_date?: string | null
          recruit_status?: Database["public"]["Enums"]["recruit_status"] | null
          remarks?: string | null
          report_sent?: boolean | null
          requested_dates?: string[] | null
          sales_admin_id?: string | null
          school_request_delivered?: boolean | null
          start_recruit_at?: string | null
          student_rotation?: string | null
          supplies_status?:
            | Database["public"]["Enums"]["supplies_status"]
            | null
          target_grade?: string | null
          teacher_name?: string | null
        }
        Update: {
          admin_contact?: string | null
          admin_docs?: string | null
          admin_docs_delivered?: boolean | null
          budget?: number | null
          campaign_id?: string | null
          comm_admin_id?: string | null
          comm_content?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_status?:
            | Database["public"]["Enums"]["contract_status"]
            | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string
          crime_check_info?: string | null
          crime_check_method?:
            | Database["public"]["Enums"]["crime_check_method"]
            | null
          crime_check_notified?: boolean | null
          crime_check_status?:
            | Database["public"]["Enums"]["crime_check_status"]
            | null
          estimate_file_url?: string | null
          event_check_status?: number
          event_end_at?: string | null
          event_start_at?: string | null
          field_admin_ids?: string[] | null
          floor_map_url?: string | null
          group_chat_link?: string | null
          group_chat_status?: string | null
          has_elevator?: boolean | null
          id?: string
          indoor_shoes_note?: string | null
          inflow_source?: Database["public"]["Enums"]["inflow_source"] | null
          institution_id?: string | null
          institution_request_status?:
            | Database["public"]["Enums"]["institution_request_status"]
            | null
          institution_type?:
            | Database["public"]["Enums"]["institution_type"]
            | null
          instructor_waiting_room?: string | null
          laptop_wifi_note?: string | null
          memo?: string | null
          name?: string
          notice?: string | null
          occupation_program_id?: string | null
          parking_note?: string | null
          payment_confirmed?: boolean | null
          photo_sent?: boolean | null
          pre_notice_sent?: boolean
          prep_note?: string | null
          recruit_delivered?: boolean | null
          recruit_start_date?: string | null
          recruit_status?: Database["public"]["Enums"]["recruit_status"] | null
          remarks?: string | null
          report_sent?: boolean | null
          requested_dates?: string[] | null
          sales_admin_id?: string | null
          school_request_delivered?: boolean | null
          start_recruit_at?: string | null
          student_rotation?: string | null
          supplies_status?:
            | Database["public"]["Enums"]["supplies_status"]
            | null
          target_grade?: string | null
          teacher_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_comm_admin_id_fkey"
            columns: ["comm_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_occupation_program_id_fkey"
            columns: ["occupation_program_id"]
            isOneToOne: false
            referencedRelation: "occupation_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_sales_admin_id_fkey"
            columns: ["sales_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      fields: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      institutions: {
        Row: {
          address: string | null
          admin_contact: string | null
          category: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          crime_check_info: string | null
          crime_check_method:
            | Database["public"]["Enums"]["crime_check_method"]
            | null
          floor_map_url: string | null
          has_elevator: boolean | null
          id: string
          indoor_shoes_note: string | null
          institution_type:
            | Database["public"]["Enums"]["institution_type"]
            | null
          instructor_waiting_room: string | null
          laptop_wifi_note: string | null
          name: string
          parking_note: string | null
          region1: string
          region2: string | null
          teacher_name: string | null
        }
        Insert: {
          address?: string | null
          admin_contact?: string | null
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          crime_check_info?: string | null
          crime_check_method?:
            | Database["public"]["Enums"]["crime_check_method"]
            | null
          floor_map_url?: string | null
          has_elevator?: boolean | null
          id?: string
          indoor_shoes_note?: string | null
          institution_type?:
            | Database["public"]["Enums"]["institution_type"]
            | null
          instructor_waiting_room?: string | null
          laptop_wifi_note?: string | null
          name: string
          parking_note?: string | null
          region1: string
          region2?: string | null
          teacher_name?: string | null
        }
        Update: {
          address?: string | null
          admin_contact?: string | null
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          crime_check_info?: string | null
          crime_check_method?:
            | Database["public"]["Enums"]["crime_check_method"]
            | null
          floor_map_url?: string | null
          has_elevator?: boolean | null
          id?: string
          indoor_shoes_note?: string | null
          institution_type?:
            | Database["public"]["Enums"]["institution_type"]
            | null
          instructor_waiting_room?: string | null
          laptop_wifi_note?: string | null
          name?: string
          parking_note?: string | null
          region1?: string
          region2?: string | null
          teacher_name?: string | null
        }
        Relationships: []
      }
      lesson_plans: {
        Row: {
          created_at: string
          file_url: string | null
          grade: Database["public"]["Enums"]["grade"]
          id: string
          lesson_category: Database["public"]["Enums"]["lesson_category"]
          occupation_program_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          grade: Database["public"]["Enums"]["grade"]
          id?: string
          lesson_category: Database["public"]["Enums"]["lesson_category"]
          occupation_program_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          grade?: Database["public"]["Enums"]["grade"]
          id?: string
          lesson_category?: Database["public"]["Enums"]["lesson_category"]
          occupation_program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_occupation_program_id_fkey"
            columns: ["occupation_program_id"]
            isOneToOne: false
            referencedRelation: "occupation_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_occupation_programs: {
        Row: {
          id: string
          lecture_fee_payer_id: string | null
          material_fee_payer_id: string | null
          mentor_id: string | null
          occupation_program_unit_id: string | null
          ppt_file_url: string | null
          profile_file_url: string | null
        }
        Insert: {
          id?: string
          lecture_fee_payer_id?: string | null
          material_fee_payer_id?: string | null
          mentor_id?: string | null
          occupation_program_unit_id?: string | null
          ppt_file_url?: string | null
          profile_file_url?: string | null
        }
        Update: {
          id?: string
          lecture_fee_payer_id?: string | null
          material_fee_payer_id?: string | null
          mentor_id?: string | null
          occupation_program_unit_id?: string | null
          ppt_file_url?: string | null
          profile_file_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_occupation_programs_lecture_fee_payer_id_fkey"
            columns: ["lecture_fee_payer_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_occupation_programs_material_fee_payer_id_fkey"
            columns: ["material_fee_payer_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_occupation_programs_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_occupation_programs_occupation_program_unit_id_fkey"
            columns: ["occupation_program_unit_id"]
            isOneToOne: false
            referencedRelation: "occupation_program_unit"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          address: string | null
          agreement_file_url: string | null
          available_areas: string[] | null
          bank_account: string | null
          belongs_to: string | null
          created_at: string
          detail_address: string | null
          id: string
          id_number: string | null
          is_authenticated: boolean
          is_available: boolean
          name: string
          phone: string | null
          score: number | null
          terms_agreed_at: string | null
          terms_version_id: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          agreement_file_url?: string | null
          available_areas?: string[] | null
          bank_account?: string | null
          belongs_to?: string | null
          created_at?: string
          detail_address?: string | null
          id?: string
          id_number?: string | null
          is_authenticated?: boolean
          is_available?: boolean
          name: string
          phone?: string | null
          score?: number | null
          terms_agreed_at?: string | null
          terms_version_id?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          agreement_file_url?: string | null
          available_areas?: string[] | null
          bank_account?: string | null
          belongs_to?: string | null
          created_at?: string
          detail_address?: string | null
          id?: string
          id_number?: string | null
          is_authenticated?: boolean
          is_available?: boolean
          name?: string
          phone?: string | null
          score?: number | null
          terms_agreed_at?: string | null
          terms_version_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentors_belongs_to_fkey"
            columns: ["belongs_to"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentors_terms_version_id_fkey"
            columns: ["terms_version_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      occupation_program_unit: {
        Row: {
          created_at: string
          description: string | null
          dreampia_material_cost: number | null
          final_product_available: boolean | null
          id: string
          is_delivery_available: boolean
          mentor_material_cost: number | null
          occupation_programs_id: string | null
          prep_by: Database["public"]["Enums"]["prep_by"] | null
          program_category_id: string | null
          school_request_note: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dreampia_material_cost?: number | null
          final_product_available?: boolean | null
          id?: string
          is_delivery_available?: boolean
          mentor_material_cost?: number | null
          occupation_programs_id?: string | null
          prep_by?: Database["public"]["Enums"]["prep_by"] | null
          program_category_id?: string | null
          school_request_note?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dreampia_material_cost?: number | null
          final_product_available?: boolean | null
          id?: string
          is_delivery_available?: boolean
          mentor_material_cost?: number | null
          occupation_programs_id?: string | null
          prep_by?: Database["public"]["Enums"]["prep_by"] | null
          program_category_id?: string | null
          school_request_note?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "occupation_program_unit_occupation_programs_id_fkey"
            columns: ["occupation_programs_id"]
            isOneToOne: false
            referencedRelation: "occupation_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupation_program_unit_program_category_id_fkey"
            columns: ["program_category_id"]
            isOneToOne: false
            referencedRelation: "program_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      occupation_programs: {
        Row: {
          id: string
          name: string
          occupation_id: string | null
        }
        Insert: {
          id?: string
          name: string
          occupation_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          occupation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "occupation_programs_occupation_id_fkey"
            columns: ["occupation_id"]
            isOneToOne: false
            referencedRelation: "occupations"
            referencedColumns: ["id"]
          },
        ]
      }
      occupations: {
        Row: {
          field_id: string | null
          id: string
          name: string
        }
        Insert: {
          field_id?: string | null
          id?: string
          name: string
        }
        Update: {
          field_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "occupations_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      program_categories: {
        Row: {
          experience_type: Database["public"]["Enums"]["experience_type"]
          id: string
          school_level: Database["public"]["Enums"]["school_level"] | null
          sort_order: number
        }
        Insert: {
          experience_type: Database["public"]["Enums"]["experience_type"]
          id?: string
          school_level?: Database["public"]["Enums"]["school_level"] | null
          sort_order?: number
        }
        Update: {
          experience_type?: Database["public"]["Enums"]["experience_type"]
          id?: string
          school_level?: Database["public"]["Enums"]["school_level"] | null
          sort_order?: number
        }
        Relationships: []
      }
      supplies: {
        Row: {
          id: string
          is_consumable: boolean
          kit_threshold: number | null
          max_daily_stock: number | null
          memo: string | null
          occupation_program_unit_id: string | null
          qty_per_person: number
          updated_at: string
        }
        Insert: {
          id?: string
          is_consumable?: boolean
          kit_threshold?: number | null
          max_daily_stock?: number | null
          memo?: string | null
          occupation_program_unit_id?: string | null
          qty_per_person?: number
          updated_at?: string
        }
        Update: {
          id?: string
          is_consumable?: boolean
          kit_threshold?: number | null
          max_daily_stock?: number | null
          memo?: string | null
          occupation_program_unit_id?: string | null
          qty_per_person?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplies_occupation_program_unit_id_fkey"
            columns: ["occupation_program_unit_id"]
            isOneToOne: true
            referencedRelation: "occupation_program_unit"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_logs: {
        Row: {
          admin_id: string | null
          created_at: string
          delta: number
          event_row_id: string | null
          id: string
          reason: string | null
          stock_type: Database["public"]["Enums"]["stock_type"]
          supply_id: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          delta: number
          event_row_id?: string | null
          id?: string
          reason?: string | null
          stock_type: Database["public"]["Enums"]["stock_type"]
          supply_id?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          delta?: number
          event_row_id?: string | null
          id?: string
          reason?: string | null
          stock_type?: Database["public"]["Enums"]["stock_type"]
          supply_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_logs_event_row_id_fkey"
            columns: ["event_row_id"]
            isOneToOne: false
            referencedRelation: "event_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_logs_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          effective_at: string
          id: string
          privacy_policy: string
          service_terms: string
        }
        Insert: {
          effective_at?: string
          id?: string
          privacy_policy?: string
          service_terms?: string
        }
        Update: {
          effective_at?: string
          id?: string
          privacy_policy?: string
          service_terms?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_approved_admin: { Args: never; Returns: boolean }
      is_authenticated_admin: { Args: never; Returns: boolean }
      is_authenticated_admin_or_mentor: { Args: never; Returns: boolean }
      is_authenticated_mentor: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      area: "부산" | "김해" | "울산" | "창원"
      contract_status:
        | "계약 시작 전"
        | "진행중(단일계약)"
        | "진행중(공동계약)"
        | "최종일 계약"
        | "계약 완료"
        | "계약 없음"
      contract_type: "학교장터" | "수의계약" | "MyDesk" | "페이백" | "나라장터"
      crime_check_method: "회보서" | "동의서"
      crime_check_status: "불필요" | "진행전" | "취합중" | "완료"
      experience_type: "직업체험" | "문화예술체험"
      grade: "유치원" | "초등학교" | "중학교" | "고등학교"
      inflow_source:
        | "팜플렛"
        | "기존진행"
        | "홈페이지"
        | "블로그"
        | "전화영업"
        | "꿈길"
        | "카카오톡채널"
        | "MOU"
        | "입찰"
        | "소개"
      institution_request_status: "예정" | "전달" | "회신"
      institution_type:
        | "유치원"
        | "초등"
        | "중등"
        | "고등"
        | "기관"
        | "특수학교"
        | "문화센터"
      lesson_category: "직업체험" | "문화예술체험" | "진로박람회"
      prep_by: "강사" | "드림피아" | "모두가능"
      recruit_status: "섭외대기" | "섭외진행중" | "섭외완료"
      school_level: "초등" | "중고등" | "유치원"
      stock_type: "total" | "kit"
      supplies_status:
        | "준비 완료"
        | "체크 전"
        | "재고 이상무"
        | "재고 파악"
        | "주문 필요"
        | "택배 예정"
        | "택배 발송"
        | "회수 필요"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      area: ["부산", "김해", "울산", "창원"],
      contract_status: [
        "계약 시작 전",
        "진행중(단일계약)",
        "진행중(공동계약)",
        "최종일 계약",
        "계약 완료",
        "계약 없음",
      ],
      contract_type: ["학교장터", "수의계약", "MyDesk", "페이백", "나라장터"],
      crime_check_method: ["회보서", "동의서"],
      crime_check_status: ["불필요", "진행전", "취합중", "완료"],
      experience_type: ["직업체험", "문화예술체험"],
      grade: ["유치원", "초등학교", "중학교", "고등학교"],
      inflow_source: [
        "팜플렛",
        "기존진행",
        "홈페이지",
        "블로그",
        "전화영업",
        "꿈길",
        "카카오톡채널",
        "MOU",
        "입찰",
        "소개",
      ],
      institution_request_status: ["예정", "전달", "회신"],
      institution_type: [
        "유치원",
        "초등",
        "중등",
        "고등",
        "기관",
        "특수학교",
        "문화센터",
      ],
      lesson_category: ["직업체험", "문화예술체험", "진로박람회"],
      prep_by: ["강사", "드림피아", "모두가능"],
      recruit_status: ["섭외대기", "섭외진행중", "섭외완료"],
      school_level: ["초등", "중고등", "유치원"],
      stock_type: ["total", "kit"],
      supplies_status: [
        "준비 완료",
        "체크 전",
        "재고 이상무",
        "재고 파악",
        "주문 필요",
        "택배 예정",
        "택배 발송",
        "회수 필요",
      ],
    },
  },
} as const
