import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';

import {
  registerUser, loginUser, findAccount, resetPassword,
  sendWhatsappOtp, verifyWhatsappOtp, loginWithOtp,
  loginGoogleSimulated, loginAdminSimulated, logout, userKey, getCurrentUser,
} from '../lib/auth';

export const USER_STORAGE_KEY = 'afrimarket_user_v1';

const AuthContext = createContext(null);

export function AuthProvider({ children, initialUser = null, onUserChange = null }) {
  const [user, setUser] = useState(initialUser);

  const applyUser = useCallback(
    async (u) => {
      setUser(u);
      if (onUserChange) onUserChange(u);
      if (u) {
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
      } else {
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
      }
    },
    [onUserChange]
  );

  const clearSession = useCallback(() => setUser(null), []);

  const reloadUser = useCallback(async () => {
    const u = await getCurrentUser();
    if (u) setUser(u);
  }, []);

  const doLogin = useCallback(
    async (phoneP, passwordP) => {
      const r = await loginUser({ phone: phoneP, password: passwordP });
      if (r.ok && r.user) await applyUser(r.user);
      return r;
    },
    [applyUser]
  );

  const doRegister = useCallback(
    async (info) => {
      const r = await registerUser(info);
      if (r.ok && r.user) await applyUser(r.user);
      return r;
    },
    [applyUser]
  );

  const doSendOtp = useCallback(
    async (phoneP) => {
      const r = await sendWhatsappOtp(phoneP);
      return { ok: r.ok, code: r.code || null, phone: phoneP };
    },
    []
  );

  const doVerifyOtp = useCallback(
    async (phoneP, codeP) => {
      const r = await verifyWhatsappOtp(phoneP, codeP);
      return r;
    },
    []
  );

  const doLoginOtp = useCallback(
    async (phoneP, codeP) => {
      const r = await loginWithOtp(phoneP, codeP);
      if (r.ok && r.user) await applyUser(r.user);
      return r;
    },
    [applyUser]
  );

  const doLoginGoogle = useCallback(async () => {
    const r = await loginGoogleSimulated();
    if (r.ok && r.user) await applyUser(r.user);
    return r;
  }, [applyUser]);

  const doLoginAdmin = useCallback(async () => {
    const r = await loginAdminSimulated();
    if (r.ok && r.user) await applyUser(r.user);
    return r;
  }, [applyUser]);

  const doResetPassword = useCallback(
    async (phoneP, newPass) => resetPassword(phoneP, newPass),
    []
  );

  const doLogout = useCallback(async () => {
    await logout();
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      applyUser,
      clearSession,
      reloadUser,
      login: doLogin,
      register: doRegister,
      sendOtp: doSendOtp,
      verifyOtp: doVerifyOtp,
      loginOtp: doLoginOtp,
      loginGoogle: doLoginGoogle,
      loginAdmin: doLoginAdmin,
      resetPassword: doResetPassword,
      logout: doLogout,
      userKey,
      findAccount,
      USER_STORAGE_KEY,
    }),
    [user, doLogin, doRegister, doSendOtp, doVerifyOtp, doLoginOtp, doLoginGoogle, doLoginAdmin, doResetPassword, doLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l’intérieur d’un <AuthProvider>.');
  }
  return ctx;
}

export { USER_STORAGE_KEY as userKey };
