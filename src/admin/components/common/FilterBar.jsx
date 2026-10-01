import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter, Search, X } from 'lucide-react';
import { Button } from '@/admin/components/ui/button';
import { Input, Select } from '@/admin/components/ui/input';
import { RANGES } from '@/admin/constants/ranges';
import { cn } from '@/lib/utils';

/**
 * Search and filters above a table.
 *
 * On a wide screen everything is on one line, which is what an operator wants:
 * all the filters visible, no clicking to find them. On a narrow screen the
 * search box stays and the rest collapses behind a button with a count, because
 * six selects stacked vertically pushes the table off the screen.
 */
export function FilterBar({ search, onSearch, searchPlaceholder = 'Search…', filters = [], onReset, className }) {
  const [open, setOpen] = useState(false);

  const activeCount = filters.filter((filter) => filter.value !== '' && filter.value != null).length;
  const hasActive = activeCount > 0 || Boolean(search);

  return (
    <div className={cn('mb-3 space-y-2', className)}>
      <div className="flex items-center gap-2">
        {onSearch && (
          <div className="relative min-w-0 flex-1 md:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <Input
              // A search field, so the browser and assistive tech treat it as
              // one; the native clear control is hidden in favour of ours,
              // which is sized for a thumb.
              type="search"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8 pr-9 [&::-webkit-search-cancel-button]:hidden"
              aria-label={searchPlaceholder}
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearch('')}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-faint transition-colors hover:bg-[var(--surface-hover)] hover:text-body md:size-6"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        )}

        {/* Wide: every filter on the line. */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {filters.map((filter) => (
            <FilterControl key={filter.key} filter={filter} />
          ))}
        </div>

        {/* Narrow: one button holding the lot. */}
        {filters.length > 0 && (
          <Button size="md" className="md:hidden" onClick={() => setOpen((value) => !value)}>
            <Filter aria-hidden />
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 rounded-full bg-[var(--accent)] px-1.5 text-[11px] text-[var(--accent-contrast)]">
                {activeCount}
              </span>
            )}
          </Button>
        )}

        {hasActive && onReset && (
          <Button variant="ghost" size="md" onClick={onReset} className="hidden md:inline-flex">
            Clear
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && filters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden md:hidden"
          >
            <div className="grid gap-2 rounded-[var(--radius-card)] border border-hair bg-surface p-3 sm:grid-cols-2">
              {filters.map((filter) => (
                <label key={filter.key} className="block">
                  <span className="mb-1 block text-[11.5px] font-medium text-muted">{filter.label}</span>
                  <FilterControl filter={filter} full />
                </label>
              ))}
              {onReset && (
                <Button variant="subtle" block onClick={onReset} className="sm:col-span-2">
                  Clear all filters
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterControl({ filter, full = false }) {
  const className = full ? 'w-full' : 'w-auto min-w-[8.5rem]';

  if (filter.type === 'date') {
    return (
      <Input
        type="date"
        value={filter.value || ''}
        onChange={(event) => filter.onChange(event.target.value)}
        className={className}
        aria-label={filter.label}
      />
    );
  }

  return (
    <Select
      value={filter.value ?? ''}
      onChange={(event) => filter.onChange(event.target.value)}
      className={className}
      aria-label={filter.label}
    >
      <option value="">{filter.placeholder || `All ${filter.label.toLowerCase()}`}</option>
      {filter.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

/**
 * The date-window picker the dashboard and every list share.
 *
 * Custom reveals two date inputs rather than a calendar widget: the native
 * control is keyboard-friendly and an operator typing 01/09 is faster than
 * clicking through a month view.
 */
export function RangePicker({ value, from, to, onChange, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Select
        value={value}
        onChange={(event) => onChange({ range: event.target.value, from, to })}
        className="w-auto min-w-[9.5rem]"
        aria-label="Date range"
      >
        {RANGES.map((range) => (
          <option key={range.value} value={range.value}>
            {range.label}
          </option>
        ))}
      </Select>

      {value === 'custom' && (
        <>
          <Input
            type="date"
            value={from || ''}
            max={to || undefined}
            onChange={(event) => onChange({ range: 'custom', from: event.target.value, to })}
            className="w-auto"
            aria-label="From date"
          />
          <span className="text-muted">to</span>
          <Input
            type="date"
            value={to || ''}
            min={from || undefined}
            onChange={(event) => onChange({ range: 'custom', from, to: event.target.value })}
            className="w-auto"
            aria-label="To date"
          />
        </>
      )}
    </div>
  );
}
