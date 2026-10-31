import { getAllTimezones, getTimezone } from "countries-and-timezones";

const flagUrls = import.meta.glob<string>("/node_modules/country-flag-icons/3x2/*.svg", {
    eager: true,
    query: "?url",
    import: "default",
});
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function canonical(zone: string): string {
    return getTimezone(zone)?.aliasOf ?? zone;
}

export const LOCAL_ZONE = canonical(Intl.DateTimeFormat().resolvedOptions().timeZone);
export const ALL_ZONES = Object.values(getAllTimezones())
    .filter((tz) => tz.countries.length > 0)
    .map((tz) => tz.name);

function countryCode(zone: string): string | undefined {
    return getTimezone(zone)?.countries[0];
}

function countryName(zone: string): string | undefined {
    const code = countryCode(zone);
    return code ? regionNames.of(code) : undefined;
}

export function cityName(zone: string): string {
    return (zone.split("/").pop() ?? zone).replace(/_/g, " ");
}

function zoneNamePart(
    zone: string,
    moment: Date,
    style: "long" | "short" | "shortOffset" | "longOffset",
    locale = "en-US",
): string {
    const parts = new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: style }).formatToParts(moment);
    return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}

function shortCode(zone: string, moment: Date): string {
    const country = countryCode(zone);
    const locale = country ? `en-${country}` : "en-US";
    return zoneNamePart(zone, moment, "short", locale).replace(/^GMT(?=[+-])/, "UTC");
}

function offsetLabel(zone: string, moment: Date): string {
    return zoneNamePart(zone, moment, "longOffset").replace("GMT", "") || "+00:00";
}

export function describeZone(zone: string, moment: Date) {
    const country = countryCode(zone);
    return {
        title: `${countryName(zone) ?? cityName(zone)} (${shortCode(zone, moment)})`,
        city: cityName(zone),
        flagUrl: country ? flagUrls[`/node_modules/country-flag-icons/3x2/${country}.svg`] : undefined,
        longName: zoneNamePart(zone, moment, "long"),
        offset: zoneNamePart(zone, moment, "shortOffset").replace("GMT", "UTC"),
        time: moment
            .toLocaleTimeString("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" })
            .toLowerCase(),
        date: moment.toLocaleDateString("en-US", {
            timeZone: zone,
            weekday: "short",
            month: "short",
            day: "numeric",
        }),
    };
}

export type SearchEntry = {
    zone: string;
    country: string;
    city: string;
    offset: string;
    searchText: string;
};

export function buildSearchEntries(moment: Date): SearchEntry[] {
    return ALL_ZONES.map((zone) => {
        const country = countryName(zone) ?? "";
        const city = cityName(zone);
        return {
            zone,
            country,
            city,
            offset: offsetLabel(zone, moment),
            searchText: `${country} ${city} ${shortCode(zone, moment)}`.toLowerCase(),
        };
    }).sort((a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city));
}

export const STEP_MINUTES = 15;
const MINUTE = 60_000;

export function roundToStep(moment: Date): Date {
    const step = STEP_MINUTES * MINUTE;
    return new Date(Math.round(moment.getTime() / step) * step);
}

const knownZones = new Set<string>(ALL_ZONES);

export function isKnownZone(zone: string): boolean {
    return knownZones.has(zone);
}

const wallClockFormats = new Map<string, Intl.DateTimeFormat>();

// The calendar date and clock time a zone shows at a given instant.
function wallClock(zone: string, instant: number) {
    let format = wallClockFormats.get(zone);
    if (!format) {
        format = new Intl.DateTimeFormat("en-US", {
            timeZone: zone,
            hourCycle: "h23",
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
        });
        wallClockFormats.set(zone, format);
    }
    const parts = Object.fromEntries(format.formatToParts(instant).map((part) => [part.type, part.value]));
    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
        minute: Number(parts.minute),
    };
}

function offsetMinutes(zone: string, instant: number): number {
    const wall = wallClock(zone, instant);
    const wallAsUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
    return Math.round((wallAsUtc - Math.floor(instant / MINUTE) * MINUTE) / MINUTE);
}

// The instant at which a zone's clock reads the given date and hour. The second pass corrects
// for a DST change between the guess and the answer. Date.UTC rolls day overflow into the next month.
function zoneInstant(zone: string, year: number, month: number, day: number, hour: number): number {
    const guess = Date.UTC(year, month - 1, day, hour);
    const first = guess - offsetMinutes(zone, guess) * MINUTE;
    return guess - offsetMinutes(zone, first) * MINUTE;
}

export function hourLabel(hour: number): string {
    return `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "am" : "pm"}`;
}

const NIGHT = "#3f6895";
const DAY = "#e8d39a";

export type DayTrack = {
    start: number;
    maxMinutes: number;
    hours: { hour: number; percent: number }[];
    gradient: string;
};

// The slider track for the zone's calendar day containing `moment`, built from real instants,
// so a 23- or 25-hour DST changeover day is drawn correctly.
export function dayTrack(zone: string, moment: Date): DayTrack {
    const { year, month, day } = wallClock(zone, moment.getTime());
    const start = zoneInstant(zone, year, month, day, 0);
    const end = zoneInstant(zone, year, month, day + 1, 0);
    // The last step is the day's final 15 minutes, so the slider never reaches the next midnight.
    const maxMinutes = (end - start) / MINUTE - STEP_MINUTES;
    const percent = (instant: number) => ((instant - start) / MINUTE / maxMinutes) * 100;

    const hours = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        percent: percent(zoneInstant(zone, year, month, day, hour)),
    }));
    const at = (hour: number) => hours[hour].percent;
    const gradient = `linear-gradient(to right, ${NIGHT} ${at(5)}%, ${DAY} ${at(7)}%, ${DAY} ${at(17)}%, ${NIGHT} ${at(19)}%)`;

    return { start, maxMinutes, hours, gradient };
}
