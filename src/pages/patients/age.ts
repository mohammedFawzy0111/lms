import type { Patient } from "./types";

/** Whole years between two dates, honouring whether the birthday has passed. */
function yearsSince(birth: Date, now = new Date()): number {
  let years = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) years--;
  return Math.max(0, years);
}

export function calcAge(p: Pick<Patient, "date_of_birth" | "age_override">): string {
  if (p.date_of_birth) {
    const birth = new Date(p.date_of_birth);
    return isNaN(birth.getTime()) ? "—" : `${yearsSince(birth)}y`;
  }
  if (p.age_override != null) return `${p.age_override}y (est.)`;
  return "—";
}
