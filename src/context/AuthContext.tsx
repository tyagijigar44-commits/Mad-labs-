import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Branch } from '../types.ts';
import { api } from '../lib/api.ts';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  currentBranch: Branch | null;
  branches: Branch[];
  token: string | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchBranch: (branchId: string) => void;
  canAccess: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);

  useEffect(() => {
    const savedToken = window.localStorage.getItem('labpulse_session_token');
    if (savedToken) {
      setToken(savedToken);
      api.getMe(savedToken).then(res => setUser(res.user)).catch(() => {
        window.localStorage.removeItem('labpulse_session_token');
        setToken(null);
        setUser(null);
      });
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    api.getBranches().then(list => {
      setBranches(list);
      if (list.length > 0) setCurrentBranch(current => current || list[0]);
    }).catch(err => console.warn('Could not load branches:', err));
  }, [token]);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    window.localStorage.setItem('labpulse_session_token', res.token);
    setUser(res.user);
    setToken(res.token);
  };

  const logout = () => {
    if (token) api.logout(token).catch(() => {});
    window.localStorage.removeItem('labpulse_session_token');
    setUser(null);
    setToken(null);
  };

  const switchBranch = (branchId: string) => {
    const b = branches.find(item => item.id === branchId);
    if (b) setCurrentBranch(b);
  };

  const canAccess = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'lab_owner') return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : 'patient',
        currentBranch,
        branches,
        token,
        login,
        logout,
        switchBranch,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
