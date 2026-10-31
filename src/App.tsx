import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import ZoneRow from "./components/ZoneRow";
import { ALL_ZONES, LOCAL_ZONE } from "./timezones";
import "./App.css";

function todayIso(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export default function App() {
  const [zones, setZones] = useState<string[]>([LOCAL_ZONE]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(todayIso);
  const [now, setNow] = useState(() => new Date());
  const popoverRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;

    const observer = new ResizeObserver(() => {
      const height = Math.ceil(popover.getBoundingClientRect().height);
      getCurrentWindow()
        .setSize(new LogicalSize(window.innerWidth, height))
        .catch(console.error);
    });

    observer.observe(popover);
    return () => observer.disconnect();
  }, []);

  function handleSearch(value: string) {
    if (ALL_ZONES.includes(value)) {
      setZones((current) => (current.includes(value) ? current : [...current, value]));
      setSearch("");
    } else {
      setSearch(value);
    }
  }

  function removeZone(zone: string) {
    setZones((current) => current.filter((z) => z !== zone));
  }

  return (
    <main className="popover" ref={popoverRef}>
      <header className="toolbar">
        <input
          className="search"
          list="zone-options"
          placeholder="Add time zone or city"
          value={search}
          onChange={(e) => handleSearch(e.currentTarget.value)}
        />
        <datalist id="zone-options">
          {ALL_ZONES.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
        <input
          className="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.currentTarget.value)}
        />
      </header>

      <section className="zone-list">
        {zones.map((zone, index) => (
          <ZoneRow key={zone} zone={zone} now={now} isDefault={index === 0} onRemove={removeZone} />
        ))}
        {zones.length === 1 && (
          <p className="empty">Add another time zone from the search above.</p>
        )}
      </section>
    </main>
  );
}