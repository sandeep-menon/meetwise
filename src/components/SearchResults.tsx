import type { SearchEntry } from "../utils/timezones";

type SearchResultsProps = {
    results: SearchEntry[];
    highlighted: number;
    onPick: (zone: string) => void;
    onHighlight: (index: number) => void;
}

export function resultId(index: number): string {
    return `zone-result-${index}`;
}

export default function SearchResults({ results, highlighted, onPick, onHighlight }: SearchResultsProps) {
    if (results.length === 0) {
        return <p className="empty">No matching time zones.</p>
    }

    return (
        <ul className="results" id="zone-results" role="listbox">
            { results.map((entry, index) => (
                <li
                    key={entry.zone}
                    id={resultId(index)}
                    role="option"
                    aria-selected={index === highlighted}
                    className={index === highlighted ? "result highlighted" : "result"}
                    onMouseEnter={() => onHighlight(index)}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        onPick(entry.zone);
                    }}
                >
                    <span className="result-country">{entry.country}</span>
                    <span className="result-city">{entry.city}</span>
                    <span className="result-offset">{entry.offset}</span>
                </li>
            ))}
        </ul>
    )
}
