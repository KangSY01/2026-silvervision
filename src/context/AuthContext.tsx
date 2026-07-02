import React, { createContext, useContext, useMemo, useState } from 'react';
import { mockGuardians, mockSeniors } from '../data/mockData';
import { GuardianProfile, SeniorProfile, UserType } from '../types';

interface AuthContextValue {
  userType: UserType | null;
  currentSenior: SeniorProfile | null;
  currentGuardian: GuardianProfile | null;
  selectUserType: (type: UserType) => void;
  login: (id: string, password: string) => boolean;
  logout: () => void;
  updateSeniorProfile: (updates: Partial<SeniorProfile>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [seniors, setSeniors] = useState<SeniorProfile[]>(mockSeniors);
  const [guardians] = useState<GuardianProfile[]>(mockGuardians);
  const [currentSeniorId, setCurrentSeniorId] = useState<string | null>(null);
  const [currentGuardianId, setCurrentGuardianId] = useState<string | null>(null);

  const selectUserType = (type: UserType) => setUserType(type);

  const login = (id: string, password: string): boolean => {
    if (userType === 'senior') {
      const found = seniors.find((s) => s.id === id && s.password === password);
      if (found) {
        setCurrentSeniorId(found.id);
        return true;
      }
      return false;
    }
    if (userType === 'guardian') {
      const found = guardians.find((g) => g.id === id && g.password === password);
      if (found) {
        setCurrentGuardianId(found.id);
        return true;
      }
      return false;
    }
    return false;
  };

  const logout = () => {
    setCurrentSeniorId(null);
    setCurrentGuardianId(null);
    setUserType(null);
  };

  const updateSeniorProfile = (updates: Partial<SeniorProfile>) => {
    setSeniors((prev) =>
      prev.map((s) => (s.id === currentSeniorId ? { ...s, ...updates } : s))
    );
  };

  const currentSenior = useMemo(
    () => seniors.find((s) => s.id === currentSeniorId) ?? null,
    [seniors, currentSeniorId]
  );
  const currentGuardian = useMemo(
    () => guardians.find((g) => g.id === currentGuardianId) ?? null,
    [guardians, currentGuardianId]
  );

  const value: AuthContextValue = {
    userType,
    currentSenior,
    currentGuardian,
    selectUserType,
    login,
    logout,
    updateSeniorProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}