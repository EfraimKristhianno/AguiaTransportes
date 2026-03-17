// Database types based on Supabase tables

export type UserRole = 'admin' | 'gestor' | 'motorista' | 'cliente' | 'assistente_logistico';

export interface User {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserWithRole extends User {
  role: UserRole;
  vehicleTypes?: string[];
}

export interface UserRole_DB {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string; // CPF/CNPJ
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Driver {
  id: string;
  user_id?: string;
  name: string;
  phone?: string;
  email?: string;
  license_number?: string;
  is_fixed: boolean; // true = fixo, false = agregado
  vehicle_id?: string;
  status: 'available' | 'busy' | 'offline';
  created_at: string;
  updated_at?: string;
}

export interface DriverWithStats extends Driver {
  total_deliveries: number;
  completed_deliveries: number;
  active_deliveries: number;
}

export interface Vehicle {
  id: string;
  plate: string;
  type: string; // Moto, Carro, Van, Caminhão
  brand?: string;
  model?: string;
  year?: number;
  capacity?: number;
  length?: number;
  width?: number;
  height?: number;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export interface MaterialType {
  id: string;
  name: string;
  description?: string;
  requires_special_handling: boolean;
  created_at: string;
}

export interface DriverVehicleType {
  id: string;
  driver_id: string;
  vehicle_type: string;
  created_at: string;
}

export interface DeliveryRequest {
  id: string;
  client_id: string;
  driver_id?: string;
  vehicle_id?: string;
  material_type_id?: string;
  origin_address: string;
  destination_address: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'delivered' | 'cancelled';
  scheduled_date?: string;
  delivered_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  // Joined fields
  client?: Client;
  driver?: Driver;
  vehicle?: Vehicle;
  material_type?: MaterialType;
}
