export interface ContactsListParams {
  search?: string;
  subscribed?: "true" | "false";
  source?: "manual" | "import" | "api";
  listId?: string;
  page?: number;
  limit?: number;
}

export interface ContactProperty {
  id: string;
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "multi_select" | "boolean" | "url" | "email" | "phone";
  groupName: string;
  options: string[] | null;
  required: boolean;
  position: number;
}

export interface Contact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  tags: string[] | null;
  properties: Record<string, unknown>;
  subscribed: boolean;
  source: "manual" | "import" | "api";
  createdAt: string;
  updatedAt: string;
}

export interface ContactWithActivity extends Contact {
  listCount: number;
  lastActivity: string | null;
}
