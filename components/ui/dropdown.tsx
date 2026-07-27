"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type DropdownOption = {
  value: string;
  label: React.ReactNode;
  /** Optional plain-text label used for the trigger when `label` is a node. */
  text?: string;
  icon?: React.ReactNode;
  hint?: string;
};

type DropdownProps = {
  options: DropdownOption[];
  /** Controlled value. Omit to use the component uncontrolled. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** When set, a hidden input is rendered so the value is submitted with a <form>. */
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  /** Popover alignment relative to the trigger. */
  align?: "start" | "end";
  "aria-label"?: string;
};

/**
 * A polished, accessible custom dropdown that looks consistent everywhere.
 * Works both controlled (value + onChange) and inside forms (name + defaultValue
 * → renders a hidden input so FormData picks it up).
 */
export function Dropdown({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  name,
  placeholder = "Select…",
  disabled,
  className,
  buttonClassName,
  align = "start",
  "aria-label": ariaLabel,
}: DropdownProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const value = isControlled ? controlledValue : internalValue;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  function commit(next: string) {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
    setOpen(false);
  }

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // When opening, focus the currently selected option.
  useEffect(() => {
    if (open) setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function onButtonKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) commit(opt.value);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={value} />}

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-left text-sm font-medium text-foreground shadow-sm outline-none transition-all",
          "hover:border-border hover:bg-background focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary",
          "dark:bg-muted/20 dark:hover:bg-muted/40",
          open && "border-primary/60 ring-2 ring-primary/20",
          disabled && "cursor-not-allowed opacity-60",
          buttonClassName
        )}
      >
        {selected?.icon && <span className="shrink-0 text-muted-foreground">{selected.icon}</span>}
        <span className={cn("flex-1 truncate", !selected && "text-muted-foreground font-normal")}>
          {selected ? selected.text ?? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary"
          )}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-50 mt-2 max-h-72 w-full min-w-[12rem] overflow-y-auto rounded-2xl border border-border/60 bg-card/95 p-1.5 shadow-xl backdrop-blur-xl custom-scrollbar animate-slide-down",
            "dark:bg-neutral-900/95",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIndex;
            return (
              <li key={opt.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => commit(opt.value)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    isActive ? "bg-primary/10 text-foreground" : "text-foreground/90 hover:bg-muted/60",
                    isSelected && "font-semibold"
                  )}
                >
                  {opt.icon && <span className="shrink-0 text-muted-foreground">{opt.icon}</span>}
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{opt.label}</span>
                    {opt.hint && <span className="block truncate text-xs text-muted-foreground">{opt.hint}</span>}
                  </span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
