import { dayTrack, describeZone, hourLabel, STEP_MINUTES } from "../utils/timezones";
import RollingText, { type RollDirection } from "./RollingText";

type ZoneRowProps = {
    zone: string;
    moment: Date;
    direction: RollDirection;
    isDefault: boolean;
    onRemove: (zone: string) => void;
    onMove: (moment: Date) => void;
}

export default function ZoneRow({ zone, moment, direction, isDefault, onRemove, onMove }: ZoneRowProps): React.ReactElement {
    const info = describeZone(zone, moment);
    const track = dayTrack(zone, moment);
    const value = Math.round((moment.getTime() - track.start) / 60_000);

    return (
        <div className="zone-row">
            <div className="zone-main">
                <div>
                    <div className="zone-city" title={info.city}>{info.title}</div>
                    <div className="zone-name">
                        {info.flagUrl && <img className="flag" src={info.flagUrl} alt={info.longName} />}
                        {info.longName}
                    </div>
                </div>
                <div className="zone-right">
                    <div className="zone-time">
                        <RollingText text={info.time} direction={direction} />
                    </div>
                    <div className="zone-meta">
                        <RollingText text={info.offset} direction={direction} /> |{" "}
                        <RollingText text={info.date} direction={direction} />
                    </div>
                </div>
            </div>
            <div className="slider">
                <div className="slider-bar" style={{ background: track.gradient }} />
                <input
                    className="slider-input"
                    type="range"
                    min={0}
                    max={track.maxMinutes}
                    step={STEP_MINUTES}
                    value={value}
                    aria-label={`Time in ${info.title}`}
                    aria-valuetext={`${info.time}, ${info.date}`}
                    onChange={(e) => onMove(new Date(track.start + Number(e.currentTarget.value) * 60_000))}
                />
            </div>
            <div className="slider-ticks" aria-hidden="true">
                {track.hours.map(({ hour, percent }) => (
                    <span
                        key={hour}
                        className={hour % 3 === 0 ? "tick major" : "tick"}
                        style={{ left: `${percent}%` }}
                    >
                        {hour % 3 === 0 && <span className="tick-label">{hourLabel(hour)}</span>}
                    </span>
                ))}
            </div>
            {!isDefault && (
                <button className="remove" aria-label={`Remove ${info.city}`} onClick={() => onRemove(zone)}>
                    ×
                </button>
            )}
        </div>
    );
}
