// ── Contact Filter Types & Utilities ──

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  | "greater_than"
  | "less_than"
  | "between"
  | "is_true"
  | "is_false"
  | "in"
  | "not_in"
  | "before"
  | "after";

export interface FilterCondition {
  id: string;
  field: string; // built-in field name or "prop:customPropName"
  operator: FilterOperator;
  value: string;
  value2?: string; // for "between" operator
}

export interface FilterGroup {
  id: string;
  logic: "and" | "or";
  conditions: FilterCondition[];
}

export interface ContactFilters {
  logic: "and" | "or"; // logic between groups
  groups: FilterGroup[];
}

// Built-in fields available for filtering
export const BUILTIN_FILTER_FIELDS = [
  { key: "email", label: "Email", type: "text" as const },
  { key: "firstName", label: "First name", type: "text" as const },
  { key: "lastName", label: "Last name", type: "text" as const },
  { key: "company", label: "Company", type: "text" as const },
  { key: "jobTitle", label: "Job title", type: "text" as const },
  { key: "phone", label: "Phone", type: "text" as const },
  { key: "subscribed", label: "Subscribed", type: "boolean" as const },
  { key: "source", label: "Source", type: "select" as const, options: ["manual", "import", "api"] },
  { key: "createdAt", label: "Created at", type: "date" as const },
];

// Operators available per field type
export function getOperatorsForType(type: string): { value: FilterOperator; label: string }[] {
  switch (type) {
    case "text":
    case "url":
    case "email":
    case "phone":
      return [
        { value: "equals", label: "equals" },
        { value: "not_equals", label: "does not equal" },
        { value: "contains", label: "contains" },
        { value: "not_contains", label: "does not contain" },
        { value: "starts_with", label: "starts with" },
        { value: "ends_with", label: "ends with" },
        { value: "is_empty", label: "is empty" },
        { value: "is_not_empty", label: "is not empty" },
      ];
    case "number":
      return [
        { value: "equals", label: "equals" },
        { value: "not_equals", label: "does not equal" },
        { value: "greater_than", label: "greater than" },
        { value: "less_than", label: "less than" },
        { value: "between", label: "between" },
        { value: "is_empty", label: "is empty" },
        { value: "is_not_empty", label: "is not empty" },
      ];
    case "date":
      return [
        { value: "equals", label: "equals" },
        { value: "before", label: "before" },
        { value: "after", label: "after" },
        { value: "between", label: "between" },
        { value: "is_empty", label: "is empty" },
        { value: "is_not_empty", label: "is not empty" },
      ];
    case "boolean":
      return [
        { value: "is_true", label: "is true" },
        { value: "is_false", label: "is false" },
        { value: "is_empty", label: "is empty" },
      ];
    case "select":
      return [
        { value: "equals", label: "equals" },
        { value: "not_equals", label: "does not equal" },
        { value: "in", label: "is any of" },
        { value: "not_in", label: "is none of" },
        { value: "is_empty", label: "is empty" },
        { value: "is_not_empty", label: "is not empty" },
      ];
    case "multi_select":
      return [
        { value: "contains", label: "contains" },
        { value: "not_contains", label: "does not contain" },
        { value: "is_empty", label: "is empty" },
        { value: "is_not_empty", label: "is not empty" },
      ];
    default:
      return [
        { value: "equals", label: "equals" },
        { value: "not_equals", label: "does not equal" },
        { value: "is_empty", label: "is empty" },
        { value: "is_not_empty", label: "is not empty" },
      ];
  }
}

export function needsValue(operator: FilterOperator): boolean {
  return !["is_empty", "is_not_empty", "is_true", "is_false"].includes(operator);
}

export function needsSecondValue(operator: FilterOperator): boolean {
  return operator === "between";
}

export function createCondition(): FilterCondition {
  return {
    id: crypto.randomUUID(),
    field: "email",
    operator: "contains",
    value: "",
  };
}

export function createGroup(): FilterGroup {
  return {
    id: crypto.randomUUID(),
    logic: "and",
    conditions: [createCondition()],
  };
}

export function createEmptyFilters(): ContactFilters {
  return {
    logic: "and",
    groups: [],
  };
}

export function hasActiveFilters(filters: ContactFilters): boolean {
  return filters.groups.length > 0 && filters.groups.some(g => g.conditions.length > 0);
}

export function countActiveFilters(filters: ContactFilters): number {
  return filters.groups.reduce((sum, g) => sum + g.conditions.length, 0);
}
