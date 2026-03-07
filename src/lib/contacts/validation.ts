export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateContactInput(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.email || !validateEmail(input.email)) {
    errors.push("Valid email is required");
  }
  if (input.phone && !/^[+\d\s()-]{7,20}$/.test(input.phone)) {
    errors.push("Invalid phone format");
  }
  return { valid: errors.length === 0, errors };
}
