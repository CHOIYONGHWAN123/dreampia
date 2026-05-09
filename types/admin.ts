export type Admin = {
  id: string
  approved_by: string | null
  email: string
  name: string
  phone: string | null
  is_super: boolean
  is_authenticated: boolean
  is_sales: boolean
  is_comm: boolean
  approved_at: string | null
  created_at: string
}
