export function isYYYYMMDD(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  // ensure same components
  const [y,m,dd]=s.split("-").map(Number);
  return d.getUTCFullYear()===y && (d.getUTCMonth()+1)===m && d.getUTCDate()===dd;
}

export function isHHmm(s: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [h,m]=s.split(":").map(Number);
  return h>=0 && h<=23 && m>=0 && m<=59;
}

export function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

export function compareYYYYMMDDToToday(s: string): number {
  // -1 past, 0 today, 1 future
  const t = startOfTodayUTC().getTime();
  const d = new Date(s + "T00:00:00Z").getTime();
  if (d < t) return -1;
  if (d > t) return 1;
  return 0;
}
