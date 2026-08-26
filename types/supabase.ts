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
    PostgrestVersion: "14.17"
  }
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
          is_deleted: boolean
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
          is_deleted?: boolean
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
          is_deleted?: boolean
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
      event_categories: {
        Row: {
          created_at: string
          elementary_ppt_template_id: string | null
          id: string
          name: string
          secondary_ppt_template_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          elementary_ppt_template_id?: string | null
          id?: string
          name: string
          secondary_ppt_template_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          elementary_ppt_template_id?: string | null
          id?: string
          name?: string
          secondary_ppt_template_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_categories_elementary_ppt_template_id_fkey"
            columns: ["elementary_ppt_template_id"]
            isOneToOne: false
            referencedRelation: "ppt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_categories_secondary_ppt_template_id_fkey"
            columns: ["secondary_ppt_template_id"]
            isOneToOne: false
            referencedRelation: "ppt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notice_files: {
        Row: {
          created_at: string
          event_id: string
          id: string
          url: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          url: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_notice_files_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_notice_files_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mentor_event_row_detail"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_notice_files_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_photos: {
        Row: {
          created_at: string
          event_rows_id: string
          id: string
          url: string
        }
        Insert: {
          created_at?: string
          event_rows_id: string
          id?: string
          url: string
        }
        Update: {
          created_at?: string
          event_rows_id?: string
          id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_rows_id_fkey"
            columns: ["event_rows_id"]
            isOneToOne: false
            referencedRelation: "event_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_photos_event_rows_id_fkey"
            columns: ["event_rows_id"]
            isOneToOne: false
            referencedRelation: "mentor_event_row_detail"
            referencedColumns: ["event_row_id"]
          },
          {
            foreignKeyName: "event_photos_event_rows_id_fkey"
            columns: ["event_rows_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["event_row_id"]
          },
        ]
      }
      event_rows: {
        Row: {
          attendance: boolean | null
          attendance_reminder_sent_at: string | null
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
          preparing: boolean
          preparing_reminder_sent_at: string | null
          remarks: string | null
          school_request_response: string | null
          session_headcount: number | null
          start_time: string | null
          supplies_prepared: boolean
          target: string | null
        }
        Insert: {
          attendance?: boolean | null
          attendance_reminder_sent_at?: string | null
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
          preparing?: boolean
          preparing_reminder_sent_at?: string | null
          remarks?: string | null
          school_request_response?: string | null
          session_headcount?: number | null
          start_time?: string | null
          supplies_prepared?: boolean
          target?: string | null
        }
        Update: {
          attendance?: boolean | null
          attendance_reminder_sent_at?: string | null
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
          preparing?: boolean
          preparing_reminder_sent_at?: string | null
          remarks?: string | null
          school_request_response?: string | null
          session_headcount?: number | null
          start_time?: string | null
          supplies_prepared?: boolean
          target?: string | null
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
            foreignKeyName: "event_rows_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mentor_event_row_detail"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_rows_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["event_id"]
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
            referencedRelation: "mentor_event_row_detail"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "event_rows_occupation_program_unit_id_fkey"
            columns: ["occupation_program_unit_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["unit_id"]
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
          {
            foreignKeyName: "event_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mentor_event_row_detail"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["event_id"]
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
          {
            foreignKeyName: "event_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mentor_event_row_detail"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["event_id"]
          },
        ]
      }
      events: {
        Row: {
          admin_contact: string | null
          admin_docs: string | null
          admin_docs_delivered: boolean | null
          budget: number | null
          comm_admin_id: string | null
          comm_content: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_delivered: boolean
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
          event_category_id: string | null
          event_check_status: number
          event_end_at: string | null
          event_start_at: string | null
          field_admin_ids: string[] | null
          final_budget: number | null
          floor_map_url: string | null
          group_chat_link: string | null
          group_chat_status: string | null
          has_elevator: Database["public"]["Enums"]["elevator_status"]
          id: string
          indoor_shoes_note: string | null
          inflow_source: Database["public"]["Enums"]["inflow_source"] | null
          institution_id: string | null
          institution_request_delivered: boolean | null
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
          school_request_note: string | null
          start_recruit_at: string | null
          student_rotation: string | null
          supplies_status: Database["public"]["Enums"]["supplies_status"] | null
          target_grade: string | null
          teacher_name: string | null
          transaction_statement_file_url: string | null
        }
        Insert: {
          admin_contact?: string | null
          admin_docs?: string | null
          admin_docs_delivered?: boolean | null
          budget?: number | null
          comm_admin_id?: string | null
          comm_content?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_delivered?: boolean
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
          event_category_id?: string | null
          event_check_status?: number
          event_end_at?: string | null
          event_start_at?: string | null
          field_admin_ids?: string[] | null
          final_budget?: number | null
          floor_map_url?: string | null
          group_chat_link?: string | null
          group_chat_status?: string | null
          has_elevator?: Database["public"]["Enums"]["elevator_status"]
          id?: string
          indoor_shoes_note?: string | null
          inflow_source?: Database["public"]["Enums"]["inflow_source"] | null
          institution_id?: string | null
          institution_request_delivered?: boolean | null
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
          school_request_note?: string | null
          start_recruit_at?: string | null
          student_rotation?: string | null
          supplies_status?:
            | Database["public"]["Enums"]["supplies_status"]
            | null
          target_grade?: string | null
          teacher_name?: string | null
          transaction_statement_file_url?: string | null
        }
        Update: {
          admin_contact?: string | null
          admin_docs?: string | null
          admin_docs_delivered?: boolean | null
          budget?: number | null
          comm_admin_id?: string | null
          comm_content?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_delivered?: boolean
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
          event_category_id?: string | null
          event_check_status?: number
          event_end_at?: string | null
          event_start_at?: string | null
          field_admin_ids?: string[] | null
          final_budget?: number | null
          floor_map_url?: string | null
          group_chat_link?: string | null
          group_chat_status?: string | null
          has_elevator?: Database["public"]["Enums"]["elevator_status"]
          id?: string
          indoor_shoes_note?: string | null
          inflow_source?: Database["public"]["Enums"]["inflow_source"] | null
          institution_id?: string | null
          institution_request_delivered?: boolean | null
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
          school_request_note?: string | null
          start_recruit_at?: string | null
          student_rotation?: string | null
          supplies_status?:
            | Database["public"]["Enums"]["supplies_status"]
            | null
          target_grade?: string | null
          teacher_name?: string | null
          transaction_statement_file_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_comm_admin_id_fkey"
            columns: ["comm_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_event_category_id_fkey"
            columns: ["event_category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
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
      field_event_categories: {
        Row: {
          event_category_id: string
          field_id: string
        }
        Insert: {
          event_category_id: string
          field_id: string
        }
        Update: {
          event_category_id?: string
          field_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_event_categories_event_category_id_fkey"
            columns: ["event_category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_event_categories_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
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
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          crime_check_info: string | null
          crime_check_method:
            | Database["public"]["Enums"]["crime_check_method"]
            | null
          floor_map_url: string | null
          has_elevator: Database["public"]["Enums"]["elevator_status"]
          id: string
          indoor_shoes_note: string | null
          institution_type:
            | Database["public"]["Enums"]["institution_type"]
            | null
          instructor_waiting_room: string | null
          is_deleted: boolean
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
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          crime_check_info?: string | null
          crime_check_method?:
            | Database["public"]["Enums"]["crime_check_method"]
            | null
          floor_map_url?: string | null
          has_elevator?: Database["public"]["Enums"]["elevator_status"]
          id?: string
          indoor_shoes_note?: string | null
          institution_type?:
            | Database["public"]["Enums"]["institution_type"]
            | null
          instructor_waiting_room?: string | null
          is_deleted?: boolean
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
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          crime_check_info?: string | null
          crime_check_method?:
            | Database["public"]["Enums"]["crime_check_method"]
            | null
          floor_map_url?: string | null
          has_elevator?: Database["public"]["Enums"]["elevator_status"]
          id?: string
          indoor_shoes_note?: string | null
          institution_type?:
            | Database["public"]["Enums"]["institution_type"]
            | null
          instructor_waiting_room?: string | null
          is_deleted?: boolean
          laptop_wifi_note?: string | null
          name?: string
          parking_note?: string | null
          region1?: string
          region2?: string | null
          teacher_name?: string | null
        }
        Relationships: []
      }
      invitation_event_rows: {
        Row: {
          event_row_id: string | null
          id: string
          invitation_id: string
        }
        Insert: {
          event_row_id?: string | null
          id?: string
          invitation_id: string
        }
        Update: {
          event_row_id?: string | null
          id?: string
          invitation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_event_rows_event_row_id_fkey"
            columns: ["event_row_id"]
            isOneToOne: false
            referencedRelation: "event_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_event_rows_event_row_id_fkey"
            columns: ["event_row_id"]
            isOneToOne: false
            referencedRelation: "mentor_event_row_detail"
            referencedColumns: ["event_row_id"]
          },
          {
            foreignKeyName: "invitation_event_rows_event_row_id_fkey"
            columns: ["event_row_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["event_row_id"]
          },
          {
            foreignKeyName: "invitation_event_rows_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_event_rows_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["invitation_id"]
          },
        ]
      }
      invitation_mentors: {
        Row: {
          id: string
          invitation_id: string
          mentor_id: string
          notified_at: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_mentor_status"]
        }
        Insert: {
          id?: string
          invitation_id: string
          mentor_id: string
          notified_at?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_mentor_status"]
        }
        Update: {
          id?: string
          invitation_id?: string
          mentor_id?: string
          notified_at?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_mentor_status"]
        }
        Relationships: [
          {
            foreignKeyName: "invitation_mentors_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_mentors_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["invitation_id"]
          },
          {
            foreignKeyName: "invitation_mentors_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_row_responses: {
        Row: {
          accepted_at: string
          event_row_id: string | null
          id: string
          invitation_mentor_id: string
        }
        Insert: {
          accepted_at?: string
          event_row_id?: string | null
          id?: string
          invitation_mentor_id: string
        }
        Update: {
          accepted_at?: string
          event_row_id?: string | null
          id?: string
          invitation_mentor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_row_responses_event_row_id_fkey"
            columns: ["event_row_id"]
            isOneToOne: false
            referencedRelation: "event_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_row_responses_event_row_id_fkey"
            columns: ["event_row_id"]
            isOneToOne: false
            referencedRelation: "mentor_event_row_detail"
            referencedColumns: ["event_row_id"]
          },
          {
            foreignKeyName: "invitation_row_responses_event_row_id_fkey"
            columns: ["event_row_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["event_row_id"]
          },
          {
            foreignKeyName: "invitation_row_responses_invitation_mentor_id_fkey"
            columns: ["invitation_mentor_id"]
            isOneToOne: false
            referencedRelation: "invitation_mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_row_responses_invitation_mentor_id_fkey"
            columns: ["invitation_mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["invitation_mentor_id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          is_all_approval_required: boolean
          is_auto: boolean
          status: Database["public"]["Enums"]["invitation_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_all_approval_required?: boolean
          is_auto?: boolean
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_all_approval_required?: boolean
          is_auto?: boolean
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_devices: {
        Row: {
          created_at: string
          expo_push_token: string
          id: string
          mentor_id: string
          platform: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expo_push_token: string
          id?: string
          mentor_id: string
          platform?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expo_push_token?: string
          id?: string
          mentor_id?: string
          platform?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_devices_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_find_id_attempts: {
        Row: {
          action: string
          created_at: string
          id: string
          phone_digits: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          phone_digits: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          phone_digits?: string
        }
        Relationships: []
      }
      mentor_occupation_certificates: {
        Row: {
          created_at: string
          file_url: string
          id: string
          mentor_id: string
          occupation_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          mentor_id: string
          occupation_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          mentor_id?: string
          occupation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_occupation_certificates_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_occupation_certificates_occupation_id_fkey"
            columns: ["occupation_id"]
            isOneToOne: false
            referencedRelation: "occupations"
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
          program_score: number
          school_request_note: string | null
        }
        Insert: {
          id?: string
          lecture_fee_payer_id?: string | null
          material_fee_payer_id?: string | null
          mentor_id?: string | null
          occupation_program_unit_id?: string | null
          ppt_file_url?: string | null
          profile_file_url?: string | null
          program_score?: number
          school_request_note?: string | null
        }
        Update: {
          id?: string
          lecture_fee_payer_id?: string | null
          material_fee_payer_id?: string | null
          mentor_id?: string | null
          occupation_program_unit_id?: string | null
          ppt_file_url?: string | null
          profile_file_url?: string | null
          program_score?: number
          school_request_note?: string | null
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
            referencedRelation: "mentor_event_row_detail"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "mentor_occupation_programs_occupation_program_unit_id_fkey"
            columns: ["occupation_program_unit_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["unit_id"]
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
          admin_info_consent_file_url: string | null
          available_areas: string[] | null
          bank: string | null
          bank_account: string | null
          bankbook_file_url: string | null
          belongs_to: string | null
          contract_file_url: string | null
          created_at: string
          criminal_record_consent_file_url: string | null
          detail_address: string | null
          id: string
          id_card_file_url: string | null
          id_number: string | null
          identity_verification_ci: string | null
          identity_verified_at: string | null
          is_authenticated: boolean
          is_available: boolean
          mentor_unique_code: string
          name: string
          phone: string | null
          score: number
          terms_agreed_at: string | null
          terms_version_id: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admin_info_consent_file_url?: string | null
          available_areas?: string[] | null
          bank?: string | null
          bank_account?: string | null
          bankbook_file_url?: string | null
          belongs_to?: string | null
          contract_file_url?: string | null
          created_at?: string
          criminal_record_consent_file_url?: string | null
          detail_address?: string | null
          id?: string
          id_card_file_url?: string | null
          id_number?: string | null
          identity_verification_ci?: string | null
          identity_verified_at?: string | null
          is_authenticated?: boolean
          is_available?: boolean
          mentor_unique_code: string
          name: string
          phone?: string | null
          score?: number
          terms_agreed_at?: string | null
          terms_version_id?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admin_info_consent_file_url?: string | null
          available_areas?: string[] | null
          bank?: string | null
          bank_account?: string | null
          bankbook_file_url?: string | null
          belongs_to?: string | null
          contract_file_url?: string | null
          created_at?: string
          criminal_record_consent_file_url?: string | null
          detail_address?: string | null
          id?: string
          id_card_file_url?: string | null
          id_number?: string | null
          identity_verification_ci?: string | null
          identity_verified_at?: string | null
          is_authenticated?: boolean
          is_available?: boolean
          mentor_unique_code?: string
          name?: string
          phone?: string | null
          score?: number
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
          final_product_available: boolean | null
          id: string
          is_delivery_available: boolean
          occupation_programs_id: string | null
          school_level: Database["public"]["Enums"]["school_level"] | null
          school_request_note: string | null
          syllabus: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          final_product_available?: boolean | null
          id?: string
          is_delivery_available?: boolean
          occupation_programs_id?: string | null
          school_level?: Database["public"]["Enums"]["school_level"] | null
          school_request_note?: string | null
          syllabus?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          final_product_available?: boolean | null
          id?: string
          is_delivery_available?: boolean
          occupation_programs_id?: string | null
          school_level?: Database["public"]["Enums"]["school_level"] | null
          school_request_note?: string | null
          syllabus?: string | null
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
        ]
      }
      occupation_programs: {
        Row: {
          dreampia_material_cost: number | null
          id: string
          mentor_material_cost: number | null
          name: string
          occupation_id: string | null
          prep_by: Database["public"]["Enums"]["prep_by"] | null
        }
        Insert: {
          dreampia_material_cost?: number | null
          id?: string
          mentor_material_cost?: number | null
          name: string
          occupation_id?: string | null
          prep_by?: Database["public"]["Enums"]["prep_by"] | null
        }
        Update: {
          dreampia_material_cost?: number | null
          id?: string
          mentor_material_cost?: number | null
          name?: string
          occupation_id?: string | null
          prep_by?: Database["public"]["Enums"]["prep_by"] | null
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
      ppt_templates: {
        Row: {
          created_at: string
          file_url: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      push_notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          error: string | null
          expo_ticket: Json | null
          id: string
          invitation_mentor_id: string | null
          mentor_id: string | null
          status: string
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          expo_ticket?: Json | null
          id?: string
          invitation_mentor_id?: string | null
          mentor_id?: string | null
          status?: string
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          expo_ticket?: Json | null
          id?: string
          invitation_mentor_id?: string | null
          mentor_id?: string | null
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notifications_invitation_mentor_id_fkey"
            columns: ["invitation_mentor_id"]
            isOneToOne: false
            referencedRelation: "invitation_mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notifications_invitation_mentor_id_fkey"
            columns: ["invitation_mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["invitation_mentor_id"]
          },
          {
            foreignKeyName: "push_notifications_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      supplies: {
        Row: {
          id: string
          is_consumable: boolean
          kit_threshold: number | null
          max_daily_stock: number | null
          memo: string | null
          occupation_programs_id: string | null
          qty_per_person: number
          updated_at: string
        }
        Insert: {
          id?: string
          is_consumable?: boolean
          kit_threshold?: number | null
          max_daily_stock?: number | null
          memo?: string | null
          occupation_programs_id?: string | null
          qty_per_person?: number
          updated_at?: string
        }
        Update: {
          id?: string
          is_consumable?: boolean
          kit_threshold?: number | null
          max_daily_stock?: number | null
          memo?: string | null
          occupation_programs_id?: string | null
          qty_per_person?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplies_occupation_programs_id_fkey"
            columns: ["occupation_programs_id"]
            isOneToOne: false
            referencedRelation: "occupation_programs"
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
            foreignKeyName: "supply_logs_event_row_id_fkey"
            columns: ["event_row_id"]
            isOneToOne: false
            referencedRelation: "mentor_event_row_detail"
            referencedColumns: ["event_row_id"]
          },
          {
            foreignKeyName: "supply_logs_event_row_id_fkey"
            columns: ["event_row_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["event_row_id"]
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
      teachers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          institution_id: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          institution_id: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          institution_id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
      work_logs: {
        Row: {
          admin_id: string
          created_at: string
          event_id: string | null
          id: string
          task_type: Database["public"]["Enums"]["task_type"]
        }
        Insert: {
          admin_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          task_type: Database["public"]["Enums"]["task_type"]
        }
        Update: {
          admin_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          task_type?: Database["public"]["Enums"]["task_type"]
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mentor_event_row_detail"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "work_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mentor_invitation_requests"
            referencedColumns: ["event_id"]
          },
        ]
      }
    }
    Views: {
      mentor_event_row_detail: {
        Row: {
          attendance: boolean | null
          classroom: string | null
          crime_check_info: string | null
          criminal_background_check: string | null
          dreampia_material_cost: number | null
          end_time: string | null
          event_id: string | null
          event_name: string | null
          event_row_id: string | null
          headcount: number | null
          indoor_shoes_note: string | null
          institution_address: string | null
          institution_name: string | null
          instructor_waiting_room: string | null
          laptop_wifi_note: string | null
          lecture_fee: number | null
          lecture_fee_after_tax: number | null
          lecture_fee_payer_id: string | null
          material_fee_payer_id: string | null
          memo: string | null
          mentor_id: string | null
          mentor_material_cost: number | null
          mentor_name: string | null
          mentor_phone: string | null
          notice: string | null
          occupation_name: string | null
          parking_note: string | null
          prep_by: Database["public"]["Enums"]["prep_by"] | null
          preparing: boolean | null
          program_name: string | null
          session_headcount: number | null
          start_time: string | null
          student_rotation: string | null
          target: string | null
          unit_id: string | null
          unit_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_rows_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_invitation_requests: {
        Row: {
          assigned_mentor_id: string | null
          classroom: string | null
          end_time: string | null
          event_id: string | null
          event_name: string | null
          event_row_id: string | null
          experience_type: string | null
          expires_at: string | null
          headcount: number | null
          institution_address: string | null
          institution_name: string | null
          invitation_id: string | null
          invitation_mentor_id: string | null
          invitation_status:
            | Database["public"]["Enums"]["invitation_status"]
            | null
          is_all_approval_required: boolean | null
          lecture_fee: number | null
          lecture_fee_after_tax: number | null
          mentor_id: string | null
          mentor_status:
            | Database["public"]["Enums"]["invitation_mentor_status"]
            | null
          occupation_name: string | null
          program_name: string | null
          responded_at: string | null
          session_headcount: number | null
          start_time: string | null
          target: string | null
          unit_id: string | null
          unit_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_rows_mentor_id_fkey"
            columns: ["assigned_mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_mentors_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation_all: {
        Args: { p_invitation_mentor_id: string }
        Returns: undefined
      }
      accept_invitation_event_row: {
        Args: { p_event_row_id: string; p_invitation_mentor_id: string }
        Returns: undefined
      }
      advance_auto_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      cancel_event_row_assignment: {
        Args: { p_event_row_id: string }
        Returns: undefined
      }
      count_all_approval_candidates: {
        Args: { p_event_row_ids: string[] }
        Returns: number
      }
      create_auto_invitation: {
        Args: { p_event_row_ids: string[]; p_is_all_approval_required: boolean }
        Returns: string
      }
      decline_invitation: {
        Args: { p_invitation_mentor_id: string }
        Returns: undefined
      }
      expire_stale_invitations: { Args: never; Returns: undefined }
      find_mentor_by_unique_code: {
        Args: { p_code: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      find_next_auto_candidate_tier: {
        Args: { p_invitation_id: string }
        Returns: string[]
      }
      generate_mentor_unique_code: { Args: never; Returns: string }
      get_mentor_names: {
        Args: { ids: string[] }
        Returns: {
          id: string
          name: string
        }[]
      }
      get_sub_mentor_event_row_detail: {
        Args: { p_event_row_id: string }
        Returns: {
          attendance: boolean
          classroom: string
          crime_check_info: string
          criminal_background_check: string
          dreampia_material_cost: number
          end_time: string
          event_id: string
          event_name: string
          event_row_id: string
          headcount: number
          indoor_shoes_note: string
          institution_address: string
          institution_name: string
          instructor_waiting_room: string
          laptop_wifi_note: string
          lecture_fee: number
          lecture_fee_after_tax: number
          lecture_fee_payer_id: string
          material_fee_payer_id: string
          memo: string
          mentor_id: string
          mentor_material_cost: number
          mentor_name: string
          mentor_phone: string
          notice: string
          occupation_name: string
          parking_note: string
          prep_by: Database["public"]["Enums"]["prep_by"]
          preparing: boolean
          program_name: string
          session_headcount: number
          start_time: string
          student_rotation: string
          target: string
          unit_id: string
          unit_title: string
        }[]
      }
      get_sub_mentor_schedule: {
        Args: never
        Returns: {
          end_time: string
          event_row_id: string
          institution_name: string
          mentor_id: string
          mentor_name: string
          program_name: string
          start_time: string
          target: string
          unit_title: string
        }[]
      }
      is_approved_admin: { Args: never; Returns: boolean }
      is_authenticated_admin: { Args: never; Returns: boolean }
      is_authenticated_admin_or_mentor: { Args: never; Returns: boolean }
      is_authenticated_mentor: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      plan_auto_bundles_internal: {
        Args: { p_event_row_ids: string[]; p_skip_initial_full_check?: boolean }
        Returns: {
          bundle_index: number
          candidate_count: number
          event_row_id: string
        }[]
      }
      preview_auto_bundles: {
        Args: { p_event_row_ids: string[] }
        Returns: {
          bundle_index: number
          candidate_count: number
          event_row_id: string
        }[]
      }
      search_mentors: {
        Args: { q?: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      send_lecture_reminders: { Args: never; Returns: undefined }
      spawn_fallback_bundles: {
        Args: { p_created_by: string; p_event_row_ids: string[] }
        Returns: undefined
      }
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
      elevator_status: "있음" | "없음" | "확인필요"
      experience_type: "직업체험" | "문화예술체험"
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
      invitation_mentor_status: "대기" | "수락" | "거절" | "마감" | "만료"
      invitation_status: "발송중" | "마감" | "만료" | "취소" | "후보소진"
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
      task_type:
        | "강사 섭외"
        | "준비물 준비"
        | "견적서 제작"
        | "강사 섭외 전달"
        | "학교 요청 사항 전달"
        | "행정서류 전달"
        | "계약 전달"
        | "행사 안내"
        | "행사 사진 전달"
        | "보고서 전달"
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
      elevator_status: ["있음", "없음", "확인필요"],
      experience_type: ["직업체험", "문화예술체험"],
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
      invitation_mentor_status: ["대기", "수락", "거절", "마감", "만료"],
      invitation_status: ["발송중", "마감", "만료", "취소", "후보소진"],
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
      task_type: [
        "강사 섭외",
        "준비물 준비",
        "견적서 제작",
        "강사 섭외 전달",
        "학교 요청 사항 전달",
        "행정서류 전달",
        "계약 전달",
        "행사 안내",
        "행사 사진 전달",
        "보고서 전달",
      ],
    },
  },
} as const
