export interface UserUnit {
  unit_id: string;
  building_id: string;
  building_role?: string;
  is_primary?: boolean;
  unit_name?: string;
  building_name?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  app_role?: string;
  status?: string;
  phone?: string;
  units: UserUnit[];
}

export interface Invoice {
  id: string;
  unit_id?: string;
  building_id?: string;
  amount: number;
  paid_amount?: number | null;
  remaining?: number;
  period: string;
  description?: string | null;
  receipt_number?: string | null;
  status: "PENDING" | "PARTIAL" | "PAID" | "CANCELLED" | string;
  tag?: string;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PaymentMethod = "PAGO_MOVIL" | "TRANSFER" | "CASH";

export interface PaymentAllocation {
  id?: string;
  invoice_id: string;
  amount: number;
  allocated_at?: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency?: string;
  original_currency?: string;
  original_amount?: number | null;
  exchange_rate?: number | null;
  payment_date: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  method: PaymentMethod | string;
  reference?: string | null;
  bank?: string | null;
  unit_id: string;
  building_id?: string | null;
  proof_url?: string | null;
  notes?: string | null;
  allocations?: PaymentAllocation[];
  created_at?: string;
  user?: {
    id: string;
    name: string;
  };
}

export interface BalanceDetail {
  invoice_id: string;
  amount: number;
  paid: number;
  remaining: number;
  period: string;
  status: string;
}

export interface UnitBalance {
  unit: string;
  total_debt: number;
  pending_invoices: number;
  credit_balance: number;
  net_balance: number;
  details: BalanceDetail[];
}

export interface CreatePaymentRequest {
  amount: number | string;
  unit_id: string;
  building_id?: string;
  method: "PAGO_MOVIL" | "TRANSFER" | "CASH";
  date: string;
  reference?: string;
  bank?: string;
  notes?: string;
  proof_image?: File | null;
  allocations?: Array<{ invoice_id: string; amount: number }>;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  token?: {
    access_token: string;
    refresh_token?: string;
  };
  expires_in?: number;
  user: User;
}
