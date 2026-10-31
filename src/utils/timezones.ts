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
