import { useEffect, useCallback, useRef } from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';

const STORAGE_PREFIX = 'form_draft_';

/**
 * Persists react-hook-form data to localStorage so users don't lose progress.
 * Call clearDraft() after successful submission.
 */
export function useFormPersistence<T extends FieldValues>(
  key: string,
  form: UseFormReturn<T>,
  options?: { exclude?: (keyof T)[]; debounceMs?: number }
) {
  const storageKey = STORAGE_PREFIX + key;
  const debounceMs = options?.debounceMs ?? 500;
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const restoredRef = useRef(false);

  // Restore on mount (once)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<T>;
      const exclude = options?.exclude || [];
      const current = form.getValues();
      const merged: any = { ...current };
      for (const [k, v] of Object.entries(saved)) {
        if (exclude.includes(k as keyof T)) continue;
        if (v !== undefined && v !== null && v !== '') {
          merged[k] = v;
        }
      }
      form.reset(merged);
    } catch {
      // ignore
    }
  }, []);

  // Watch all fields and persist with debounce
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          const toSave = { ...values };
          const exclude = options?.exclude || [];
          exclude.forEach((k) => delete toSave[k as string]);
          localStorage.setItem(storageKey, JSON.stringify(toSave));
        } catch {
          // storage full or unavailable
        }
      }, debounceMs);
    });
    return () => {
      subscription.unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [form, storageKey, debounceMs]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { clearDraft };
}

/**
 * Persists plain state object to localStorage (for non-react-hook-form forms).
 */
export function useStatePersistence<T extends Record<string, any>>(
  key: string,
  state: T,
  setState: (val: T) => void,
  options?: { debounceMs?: number }
) {
  const storageKey = STORAGE_PREFIX + key;
  const debounceMs = options?.debounceMs ?? 500;
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const restoredRef = useRef(false);

  // Restore on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<T>;
      setState({ ...state, ...saved } as T);
    } catch {
      // ignore
    }
  }, []);

  // Persist on change
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        // ignore
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, storageKey, debounceMs]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { clearDraft };
}
