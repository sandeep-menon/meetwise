import { describeZone } from "../timezones";

type ZoneRowProps = {
    zone: string;
    now: Date;
    isDefault: boolean;
    onRemove: (zone: string) => void;
}

export default function ZoneRow({ zone, now, isDefault, onRemove }: ZoneRowProps): React.ReactElement {
    const info = describeZone(zone, now);

    return (
        <div className="zone-row">
            <div className="zone-main">
                <div>
                    <div className="zone-city">{info.city}</div>
                    <div className="zone-name">{info.longName}</div>
                </div>
                <div className="zone-right">
                    <div className="zone-time">{info.time}</div>
                    <div className="zone-meta">
                        {info.offset} | {info.date}
                    </div>
                </div>
            </div>
            <div className="zone-track" />
            {!isDefault && (
                <button className="remove" aria-label={`Remove ${info.city}`} onClick={() => onRemove(zone)}>
                    ×
                </button>
            )}
        </div>
    );
}