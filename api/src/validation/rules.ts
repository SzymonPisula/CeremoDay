
export const re = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  phone9: /^\d{9}$/,
  name: /^[A-ZĄĆĘŁŃÓŚŻŹ][a-ząćęłńóśżź]+$/,
  surname: /^[A-ZĄĆĘŁŃÓŚŻŹ][a-ząćęłńóśżź-]+$/,
  digits: /^\d+$/,
  amount: /^\d+(\.\d{1,2})?$/,
  isoDate: /^\d{4}-\d{2}-\d{2}$/,
  password: /^(?=.*[A-Z])(?=.*\d).{8,}$/,
};

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
export function isDatePastISO(d: string): boolean {
  return d < todayISO();
}
export function isDateFutureISO(d: string): boolean {
  return d > todayISO();
}
