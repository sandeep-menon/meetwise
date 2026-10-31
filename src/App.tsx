import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import type { RollDirection } from "./components/RollingText";
import SearchResults, { resultId } from "./components/SearchResults";
import ZoneRow from "./components/ZoneRow";
import { buildSearchEntries, isKnownZone, LOCAL_ZONE, roundToStep } from "./utils/timezones";
import "./App.css";

const ZONES_KEY = "meetwise.zones";

// Only the added zones are saved. The default zone always comes from the system,
// so it follows the user if they change their Windows time zone.
function loadZones(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(ZONES_KEY) ?? "[]");
    const added = Array.isArray(saved)
      ? saved.filter((zone): zone is string => typeof zone === "string" && isKnownZone(zone) && zone !== LOCAL_ZONE)
      : [];
    return [LOCAL_ZONE, ...new Set(added)];
  } catch {
    return [LOCAL_ZONE];
  }
}

// The date picker shows the selected moment's date in the user's own (system) zone.
function localIso(moment: Date): string {
  const month = String(moment.getMonth() + 1).padStart(2, "0");
  const day = String(moment.getDate()).padStart(2, "0");
  return `${moment.getFullYear()}-${month}-${day}`;
}

export default function App() {
  const [zones, setZones] = useState<string[]>(loadZones);
  const [search, setSearch] = useState("");
  // The one moment every row shows. Moving any slider or the date changes it for all rows.
  const [moment, setMoment] = useState(() => roundToStep(new Date()));
  // While true, the moment keeps tracking the current time. Moving a slider or the date stops it; "Now" restarts it.
  const [following, setFollowing] = useState(true);
  // Which way the time digits roll: up when moving forward in time, down when moving back.
  const [direction, setDirection] = useState<RollDirection>("up");
  const popoverRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [highlighted, setHighlighted] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  // The results overlay the zone list at half the popover's height, so the popover never resizes
  // and the uncovered rows below stay clickable to dismiss the search.
  const [resultsHeight, setResultsHeight] = useState(0);
  const entries = useMemo(() => buildSearchEntries(new Date()), []);

  const query = search.trim().toLowerCase();
  const results = searchOpen
    ? entries.filter((entry) => entry.searchText.includes(query) && !zones.includes(entry.zone))
    : [];

  useEffect(() => {
    if (!following) return;
    const id = setInterval(() => {
      setDirection("up");
      setMoment(roundToStep(new Date()));
    }, 30_000);
    return () => clearInterval(id);
  }, [following]);

  useEffect(() => {
    localStorage.setItem(ZONES_KEY, JSON.stringify(zones.slice(1)));
  }, [zones]);

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

  function scrollResultsToTop() {
    if (resultsRef.current) resultsRef.current.scrollTop = 0;
  }

  function openSearch() {
    if (searchOpen) return;
    setResultsHeight(Math.round((popoverRef.current?.offsetHeight ?? 0) / 2));
    setHighlighted(0);
    setSearchOpen(true);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearch("");
    setHighlighted(0);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setHighlighted(0);
    scrollResultsToTop();
  }

  function addZone(zone: string) {
    setZones((current) => (current.includes(zone) ? current : [...current, zone]));
    closeSearch();
    searchRef.current?.blur();
  }

  // Scroll only on keyboard moves. Scrolling on hover moves rows under the mouse.
  function moveHighlight(next: number) {
    setHighlighted(next);
    document.getElementById(resultId(next))?.scrollIntoView({ block: "nearest" });
  }

  function handleSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveHighlight(Math.min(highlighted + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveHighlight(Math.max(highlighted - 1, 0));
    } else if (e.key === "Enter" && results[highlighted]) {
      addZone(results[highlighted].zone);
    } else if (e.key === "Escape") {
      closeSearch();
    }
  }

  function clearSearch() {
    updateSearch("");
    searchRef.current?.focus();
  }

  function showMoment(next: Date) {
    setDirection(next.getTime() >= moment.getTime() ? "up" : "down");
    setMoment(next);
  }

  function resetToNow() {
    showMoment(roundToStep(new Date()));
    setFollowing(true);
  }

  function moveTo(next: Date) {
    showMoment(next);
    setFollowing(false);
  }

  // Keeps the time of day and moves to the picked date, in the user's own zone.
  function changeDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return;
    const next = new Date(moment);
    next.setFullYear(year, month - 1, day);
    moveTo(next);
  }

  function removeZone(zone: string) {
    setZones((current) => current.filter((z) => z !== zone));
  }

  return (
    <main className="popover" ref={popoverRef}>
      <header className="toolbar">
        <div className="search-box">
          <input
            ref={searchRef}
            className="search"
            placeholder="Add time zone, country, or city"
            role="combobox"
            aria-expanded={searchOpen}
            aria-controls="zone-results"
            aria-activedescendant={searchOpen && results.length > 0 ? resultId(highlighted) : undefined}
            value={search}
            onFocus={openSearch}
            onClick={openSearch}
            onBlur={closeSearch}
            onChange={(e) => {
              updateSearch(e.currentTarget.value);
              openSearch();
            }}
            onKeyDown={handleSearchKey}
          />
          {search && (
            <button
              className="clear"
              type="button"
              aria-label="Clear search"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearSearch}
            >
              ×
            </button>
          )}
        </div>
        <button className="now" type="button" onClick={resetToNow}>
          Now
        </button>
        <input
          className="date"
          type="date"
          value={localIso(moment)}
          onChange={(e) => changeDate(e.currentTarget.value)}
        />
        {searchOpen && (
          <div className="results-panel" ref={resultsRef} style={{ height: resultsHeight }}>
            <SearchResults
              results={results}
              highlighted={highlighted}
              onPick={addZone}
              onHighlight={setHighlighted}
            />
          </div>
        )}
      </header>

      <section className="zone-list">
        {zones.map((zone, index) => (
          <ZoneRow
            key={zone}
            zone={zone}
            moment={moment}
            direction={direction}
            isDefault={index === 0}
            onRemove={removeZone}
            onMove={moveTo}
          />
        ))}
        {zones.length === 1 && (
          <p className="empty">Add another time zone from the search above.</p>
        )}
      </section>
    </main>
  );
}
