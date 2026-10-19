export const ROLES = ["admin", "technician", "receptionist", "readonly"] as const;
export type Role = (typeof ROLES)[number];
