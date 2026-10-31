import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import SearchResults, { resultId } from "./components/SearchResults";
import ZoneRow from "./components/ZoneRow";
import { buildSearchEntries, LOCAL_ZONE } from "./utils/timezones";
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

  function resetToNow() {
    setDate(todayIso());
    setNow(new Date());
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
          value={date}
          onChange={(e) => setDate(e.currentTarget.value)}
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
          <ZoneRow key={zone} zone={zone} now={now} isDefault={index === 0} onRemove={removeZone} />
        ))}
        {zones.length === 1 && (
          <p className="empty">Add another time zone from the search above.</p>
        )}
      </section>
    </main>
  );
}
