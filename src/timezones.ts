export const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
export const ALL_ZONES = Intl.supportedValuesOf("timeZone");

export function cityName(zone: string): string {
    return (zone.split("/").pop() ?? zone).replace(/_/g, " ");
}

function zoneNamePart(zone: string, now: Date, style: "long" | "shortOffset"): string {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: style }).formatToParts(now);
    return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}

export function describeZone(zone: string, now: Date) {
    return {
        city: cityName(zone),
        longName: zoneNamePart(zone, now, "long"),
        offset: zoneNamePart(zone, now, "shortOffset").replace("GMT", "UTC"),
        time: now
            .toLocaleTimeString("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" })
            .toLowerCase(),
        date: now.toLocaleDateString("en-US", {
            timeZone: zone,
            weekday: "short",
            month: "short",
            day: "numeric",
        }),
    };
}