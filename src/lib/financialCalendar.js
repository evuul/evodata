// Normalizes and groups sourced financial calendar events for the dashboard.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidYmd = (value) => {
  if (!DATE_PATTERN.test(String(value || ""))) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const toUtcDay = (ymd) => Date.parse(`${ymd}T00:00:00Z`);

export function prepareFinancialCalendar(events, todayYmd) {
  const today = isValidYmd(todayYmd) ? todayYmd : new Date().toISOString().slice(0, 10);
  const normalized = (Array.isArray(events) ? events : [])
    .map((event) => {
      if (!event?.id || !isValidYmd(event?.date)) return null;
      const endDate = isValidYmd(event?.endDate) && event.endDate >= event.date ? event.endDate : event.date;
      const status = endDate < today ? "past" : event.date > today ? "upcoming" : event.date === endDate ? "today" : "ongoing";
      return { ...event, endDate, status };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const upcoming = normalized.filter((event) => event.status !== "past");
  const past = normalized.filter((event) => event.status === "past").reverse();
  const nextEvent = upcoming[0] ?? null;
  const daysToNext = nextEvent
    ? Math.max(0, Math.round((toUtcDay(nextEvent.date) - toUtcDay(today)) / 86_400_000))
    : null;

  return { all: normalized, upcoming, past, nextEvent, daysToNext, todayYmd: today };
}

export function filterCalendarEvents(events, category = "all") {
  const rows = Array.isArray(events) ? events : [];
  if (category === "all") return rows;
  return rows.filter((event) => event.category === category);
}

function formatChipDate(ymd, locale) {
  const language = locale === "en" ? "en-GB" : "sv-SE";
  return new Intl.DateTimeFormat(language, { day: "numeric", month: "short" })
    .format(new Date(`${ymd}T12:00:00Z`))
    .replace(".", "");
}

function buildTimingLabels(event, daysToNext) {
  if (event.status === "ongoing") return { sv: "pågår", en: "ongoing" };
  if (daysToNext === 0) return { sv: "idag", en: "today" };
  if (daysToNext === 1) return { sv: "imorgon", en: "tomorrow" };
  if (daysToNext <= 14) return { sv: `om ${daysToNext} dagar`, en: `in ${daysToNext} days` };
  return { sv: formatChipDate(event.date, "sv"), en: formatChipDate(event.date, "en") };
}

export function buildNextCalendarChip(events, todayYmd) {
  const calendar = prepareFinancialCalendar(events, todayYmd);
  const event = calendar.nextEvent;
  if (!event) return null;

  const timing = buildTimingLabels(event, calendar.daysToNext);
  const desktopTitle = {
    sv: event.shortTitleSv || event.titleSv,
    en: event.shortTitleEn || event.titleEn,
  };
  const mobileTitle = {
    sv: event.mobileTitleSv || desktopTitle.sv,
    en: event.mobileTitleEn || desktopTitle.en,
  };

  return {
    eventId: event.id,
    daysToNext: calendar.daysToNext,
    labelSv: `${desktopTitle.sv} ${timing.sv}`,
    labelEn: `${desktopTitle.en} ${timing.en}`,
    mobileLabelSv: `${mobileTitle.sv} ${timing.sv}`,
    mobileLabelEn: `${mobileTitle.en} ${timing.en}`,
    titleSv: event.titleSv,
    titleEn: event.titleEn,
  };
}
