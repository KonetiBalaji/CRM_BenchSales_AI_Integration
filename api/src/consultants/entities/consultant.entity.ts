// Bench Sales CRM API - Consultant Entity
// Created by Balaji Koneti
// This entity represents the consultant data structure

export class Consultant {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  primarySkill?: string;
  skills: string[];
  visaStatus?: string;
  location?: string;
  availabilityDate?: Date;
  rateMin?: number;
  remoteOk: boolean;
  createdAt: Date;
}
