"use client";

import {
  formatNumberInputDisplay,
  isEmptyNumberValue,
} from "@/lib/number-input";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
} from "react";

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value?: number | string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  /** Show blank instead of 0 when not focused. Default true. */
  emptyZero?: boolean;
};

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    { value, onChange, onFocus, onBlur, emptyZero = true, ...props },
    ref,
  ) {
    const [draft, setDraft] = useState<string | null>(null);
    const focusedRef = useRef(false);

    useEffect(() => {
      if (!focusedRef.current) {
        setDraft(null);
      }
    }, [value]);

    const displayValue =
      draft !== null ? draft : formatNumberInputDisplay(value, emptyZero);

    const handleFocus = useCallback(
      (e: FocusEvent<HTMLInputElement>) => {
        focusedRef.current = true;
        e.target.select();
        setDraft(
          emptyZero && isEmptyNumberValue(value)
            ? ""
            : formatNumberInputDisplay(value, false),
        );
        onFocus?.(e);
      },
      [emptyZero, onFocus, value],
    );

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        setDraft(e.target.value);
        onChange?.(e);
      },
      [onChange],
    );

    const handleBlur = useCallback(
      (e: FocusEvent<HTMLInputElement>) => {
        focusedRef.current = false;
        setDraft(null);
        onBlur?.(e);
      },
      [onBlur],
    );

    return (
      <input
        ref={ref}
        type="number"
        {...props}
        value={displayValue}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    );
  },
);
