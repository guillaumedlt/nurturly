import type { InferSelectModel } from "drizzle-orm";
import type { contacts } from "@/lib/db/schema";

export type Contact = InferSelectModel<typeof contacts>;

export interface CreateContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  tags?: string[];
}

export interface UpdateContactInput {
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  tags?: string[];
  subscribed?: boolean;
}

export interface ContactsListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  subscribed?: "true" | "false";
  source?: "manual" | "import" | "api";
  tag?: string;
  sortBy?: "email" | "firstName" | "lastName" | "company" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface ContactsListResponse {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; email: string; reason: string }>;
}
