import type React from "react";
import { useMemo, useState } from "react";

interface Props<T> {
  title: string;
  items: T[];
  selected?: string;
  getKey: (item: T) => string;
  render: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  searchPlaceholder: string;
  filterLabel: string;
  emptyMessage: string;
  headerAction?: React.ReactNode;
}

export function DataList<T>({ title, items, selected, getKey, render, onSelect, searchPlaceholder, filterLabel, emptyMessage, headerAction }: Props<T>) {
  const [filter, setFilter] = useState("");
  const filteredItems = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => getKey(item).toLowerCase().includes(term));
  }, [filter, getKey, items]);

  return (
    <section className="browser-column">
      <div className="browser-column-header">
        <h3>{title}</h3>
        {headerAction}
      </div>
      <input
        aria-label={`${filterLabel} ${title}`}
        className="text-input browser-filter"
        placeholder={searchPlaceholder}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <div className="list">
        {filteredItems.map((item) => {
          const key = getKey(item);
          return (
            <button className={selected === key ? "selected" : ""} key={key} onClick={() => onSelect(item)}>
              {render(item)}
            </button>
          );
        })}
        {filteredItems.length === 0 && <p className="empty-list">{emptyMessage}</p>}
      </div>
    </section>
  );
}
