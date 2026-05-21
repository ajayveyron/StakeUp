import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";

/**
 * Persists state to AsyncStorage (localStorage on web, native KV on iOS/Android).
 * Returns [value, setValue, hydrated, clear]. `hydrated` is true once the saved
 * value (if any) has been loaded — useful to avoid flashing the default state.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void, boolean, () => void] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const hasLoadedRef = useRef(false);

  // Load saved value once
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (cancelled) return;
        if (raw != null) {
          try {
            setValue(JSON.parse(raw) as T);
          } catch {
            // ignore corrupt entries
          }
        }
        hasLoadedRef.current = true;
        setHydrated(true);
      })
      .catch(() => {
        hasLoadedRef.current = true;
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Save on every change after hydration
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
  }, [key, value]);

  function clear() {
    AsyncStorage.removeItem(key).catch(() => {});
    setValue(initial);
  }

  return [value, setValue, hydrated, clear];
}
