import { useEffect, useState } from "react";

/**
 * Hook for sessionStorage with JSON serialization
 * Modeled after useLocalStorage but uses sessionStorage
 * Session data persists only for the browser tab/window session
 */
export function useSessionStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      // Always read the latest value from sessionStorage for function updates
      let currentValue = storedValue;
      if (value instanceof Function && typeof window !== "undefined") {
        try {
          const item = window.sessionStorage.getItem(key);
          currentValue = item ? JSON.parse(item) : initialValue;
        } catch {
          currentValue = storedValue;
        }
      }
      
      const valueToStore = value instanceof Function ? value(currentValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== "undefined") {
        if (valueToStore === null || valueToStore === undefined) {
          window.sessionStorage.removeItem(key);
        } else {
          window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
        }
      }
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error);
    }
  };

  // Listen to storage events for cross-tab synchronization
  // (sessionStorage is per-tab, but keeping pattern consistent)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.storageArea === sessionStorage) {
        try {
          setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, initialValue]);

  return [storedValue, setValue];
}
