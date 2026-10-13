import { apiClient } from "@/lib/api/client";

export interface BuildingPublic {
  id: string;
  name: string;
  address: string;
  building_code: string;
}

export interface UnitPublic {
  id: string;
  building_id: string;
  name: string;
  floor?: string;
  aliquot?: number;
}

export interface RegistrationRequestPayload {
  building_code: string;
  unit_id: string;
  first_name: string;
  last_name: string;
  email: string;
  document_id: string;
  phone?: string;
}

export interface RegistrationRequestResponse {
  id: string;
  building_id: string;
  unit_id: string;
  email: string;
  first_name: string;
  last_name: string;
  source: string;
  status: string;
  created_at: string;
}

export const onboardingService = {
  async getBuildings(): Promise<BuildingPublic[]> {
    const res = await apiClient.get<BuildingPublic[]>("/buildings");
    return res.data;
  },

  async getBuildingByCode(code: string): Promise<BuildingPublic> {
    const res = await apiClient.get<BuildingPublic>(`/buildings/by-code/${code}`);
    return res.data;
  },

  async getUnitsByCode(code: string): Promise<UnitPublic[]> {
    const res = await apiClient.get<UnitPublic[]>(`/buildings/by-code/${code}/units`);
    return res.data;
  },

  async submitRegistration(payload: RegistrationRequestPayload): Promise<RegistrationRequestResponse> {
    const res = await apiClient.post<RegistrationRequestResponse>("/registration-requests", payload);
    return res.data;
  },
};
