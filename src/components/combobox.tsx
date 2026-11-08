'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';

export type ComboboxOption = { value: string; label: string };
export type ComboboxGroup = { label: string; options: readonly ComboboxOption[] };

type ComboboxProps = {
  label: string;
  groups: readonly ComboboxGroup[];
  value: string;
  onChange: (value: string) => void;
};

// Searching ignores case and accents, so "nordica" finds "Nórdica".
export const searchable = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export const filterGroups = (groups: readonly ComboboxGroup[], query: string): ComboboxGroup[] => {
  const wanted = searchable(query);

  return groups
    .map((group) => ({
      label: group.label,
      options:
        wanted === '' || searchable(group.label).includes(wanted)
          ? group.options
          : group.options.filter((option) => searchable(option.label).includes(wanted)),
    }))
    .filter((group) => group.options.length > 0);
};

/**
 * A single-choice combobox (WAI-ARIA 1.2 pattern): opens like a select, filters as you type, and
 * moves with the arrow keys, Home and End; Enter picks, Escape closes and keeps the old choice.
 */
export function Combobox({ label, groups, value, onChange }: ComboboxProps) {
  const { t } = useI18n();
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const selected = groups.flatMap((group) => group.options).find((option) => option.value === value);
  const shownGroups = useMemo(() => filterGroups(groups, query), [groups, query]);
  const shown = shownGroups.flatMap((group) => group.options);
  const optionId = (index: number) => `${id}-option-${index}`;

  const openList = () => {
    const index = groups.flatMap((group) => group.options).findIndex((option) => option.value === value);
    setQuery('');
    setActive(Math.max(0, index));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const choose = (option: ComboboxOption) => {
    onChange(option.value);
    close();
  };

  const move = (next: number) => {
    const index = Math.min(Math.max(next, 0), shown.length - 1);
    setActive(index);
    document.getElementById(optionId(index))?.scrollIntoView?.({ block: 'nearest' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => (open ? move(active + 1) : openList()),
      ArrowUp: () => (open ? move(active - 1) : openList()),
      Home: () => open && move(0),
      End: () => open && move(shown.length - 1),
      Enter: () => (open && shown[active] ? choose(shown[active]) : openList()),
      Escape: close,
    };
    const action = keys[event.key];

    if (action) {
      event.preventDefault();
      action();
    }
  };

  let position = -1;

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={id} className="font-display text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          value={open ? query : (selected?.label ?? '')}
          placeholder={open ? (selected?.label ?? t('Search')) : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onClick={() => (open ? undefined : openList())}
          onKeyDown={onKeyDown}
          onBlur={close}
          className={`${fieldClasses} min-h-11 pr-11`}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? t('Close the list') : t('Open the list')}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) {
              close();
            } else {
              openList();
              inputRef.current?.focus();
            }
          }}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-soft">
          <ChevronDown className={`h-5 w-5 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute top-full right-0 left-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-sm border border-rule bg-paper py-1 shadow-lg">
          {shownGroups.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-sm text-ink-soft">
              {t('Nothing found.')}
            </li>
          ) : (
            shownGroups.map((group) => (
              <li key={group.label} role="presentation">
                <p
                  role="presentation"
                  className="px-3 pt-2 pb-1 font-display text-xs font-semibold text-ink-soft uppercase">
                  {group.label}
                </p>
                <ul role="group" aria-label={group.label}>
                  {group.options.map((option) => {
                    position += 1;
                    const index = position;

                    return (
                      // The keyboard stays on the input (aria-activedescendant), as the combobox pattern asks;
                      // options only take the mouse or a tap.
                      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                      <li
                        key={option.value}
                        id={optionId(index)}
                        role="option"
                        aria-selected={option.value === value}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => choose(option)}
                        className={`flex min-h-11 cursor-pointer items-center px-3 text-sm ${
                          index === active ? 'bg-paper-deep' : ''
                        } ${option.value === value ? 'font-semibold text-accent' : ''}`}>
                        {option.label}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
