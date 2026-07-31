// Validates and groups sourced game releases without inventing unconfirmed dates.

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidYmd(value) {
  if (!YMD_PATTERN.test(value ?? "")) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function compareUpcoming(left, right) {
  if (left.releaseDate && right.releaseDate) {
    return left.releaseDate.localeCompare(right.releaseDate);
  }
  if (left.releaseDate) return -1;
  if (right.releaseDate) return 1;
  return String(left.releaseWindow).localeCompare(String(right.releaseWindow)) || left.title.localeCompare(right.title);
}

export function prepareGameReleaseSchedule(releases, todayYmd) {
  if (!isValidYmd(todayYmd)) {
    return { upcoming: [], released: [], nextRelease: null };
  }

  const normalized = (Array.isArray(releases) ? releases : [])
    .filter((release) => {
      if (!release?.id || !release?.title || !release?.sourceUrl) return false;
      return release.releaseDate ? isValidYmd(release.releaseDate) : Boolean(release.releaseWindow);
    })
    .map((release) => ({
      ...release,
      timing: release.releaseDate ? "confirmed" : "announced",
      status: release.releaseDate && release.releaseDate < todayYmd ? "released" : "upcoming",
    }));

  const upcoming = normalized
    .filter((release) => release.status === "upcoming")
    .sort(compareUpcoming);
  const released = normalized
    .filter((release) => release.status === "released")
    .sort((left, right) => right.releaseDate.localeCompare(left.releaseDate));

  return {
    upcoming,
    released,
    nextRelease: upcoming[0] ?? null,
  };
}
