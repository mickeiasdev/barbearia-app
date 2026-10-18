// Tipos que espelham o schema do Supabase (supabase/migrations/0001_schema.sql)

export type UserRole = 'client' | 'barber' | 'admin'

export interface Profile {
  id: string
  email: string | null
  full_name: string
  phone: string | null
  role: UserRole
  created_at: string
}

export interface Establishment {
  id: string
  name: string
  address: string | null
  phone: string | null
  whatsapp: string | null
  instagram: string | null
  opening_time: string
  closing_time: string
  slot_step_min: number
  created_at: string
}

export interface Barber {
  id: string
  establishment_id: string
  profile_id: string | null
  full_name: string
  bio: string | null
  photo_url: string | null
  commission_pct: number
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  establishment_id: string
  name: string
  description: string | null
  price_cents: number
  duration_min: number
  is_active: boolean
  created_at: string
}

export interface BarberSchedule {
  id: string
  barber_id: string
  weekday: number // 0 = domingo
  start_time: string
  end_time: string
}

export interface Product {
  id: string
  establishment_id: string
  name: string
  description: string | null
  category: string | null
  image_url: string | null
  price_cents: number
  stock: number
  is_active: boolean
  created_at: string
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface Appointment {
  id: string
  establishment_id: string
  barber_id: string
  service_id: string
  client_id: string
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  price_cents: number
  notes: string | null
  created_at: string
}

export interface AppointmentDetails extends Appointment {
  barber?: { full_name: string } | null
  service?: { name: string; duration_min: number } | null
  client?: { full_name: string; phone: string | null } | null
}

export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao'

export interface Order {
  id: string
  establishment_id: string
  client_id: string | null
  appointment_id: string | null
  total_cents: number
  payment_method: PaymentMethod
  status: 'pending' | 'paid' | 'cancelled'
  created_by: string | null
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  unit_price_cents: number
  quantity: number
}

export interface OrderWithItems extends Order {
  client?: { full_name: string } | null
  order_items?: OrderItem[] | null
}

export interface CartItem {
  product_id: string
  name: string
  price_cents: number
  quantity: number
  stock: number
}
