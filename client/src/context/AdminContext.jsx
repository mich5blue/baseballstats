/**
 * AdminContext — lightweight admin-mode gate.
 *
 * Admin mode is unlocked by entering VITE_ADMIN_PIN (set in .env.local).
 * The unlocked state persists in localStorage so you don't have to re-enter
 * it every visit.  Locking clears localStorage immediately.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'admin_mode_unlocked';
const ADMIN_PIN   = import.meta.env.VITE_ADMIN_PIN || '0000';

const AdminContext = createContext({ isAdmin: false, unlock: () => false, lock: () => {} });

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  const unlock = useCallback((pin) => {
    if (pin === ADMIN_PIN) {
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const lock = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setIsAdmin(false);
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, unlock, lock }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
