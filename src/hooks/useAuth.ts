import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signIn, signOut } from '../firebase';
import { UserService } from '../services/UserService';
import { AppUser, Permission, UserRole } from '../types';
import { isSuperAdminEmail } from '../config/admin';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = isSuperAdminEmail(user?.email);

  const isAdmin = isSuperAdmin || appUser?.role === 'ADMIN' || appUser?.role === 'SUPER_ADMIN';

  const hasPermission = (permission: Permission): boolean => {
    if (isSuperAdmin) return true;
    if (!appUser) return false;
    return appUser.permissions?.includes(permission) ?? false;
  };

  const hasRole = (role: UserRole): boolean => {
    if (isSuperAdmin && role === 'SUPER_ADMIN') return true;
    return appUser?.role === role;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      try {
        if (firebaseUser?.email) {
          if (isSuperAdminEmail(firebaseUser.email)) {
            setAppUser({
              id: firebaseUser.uid,
              email: firebaseUser.email,
              nome: 'Super Admin',
              role: 'SUPER_ADMIN',
              permissions: ['manage_queue', 'manage_clients', 'manage_services', 'manage_users', 'view_metrics', 'manage_settings'],
              ativo: true,
              createdAt: 0,
            });
          } else {
            const foundUser = await UserService.findByEmail(firebaseUser.email);
            setAppUser(foundUser);
          }
        } else {
          setAppUser(null);
        }
      } catch {
        setAppUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  return {
    user,
    appUser,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
    isAdmin,
    isSuperAdmin,
    hasPermission,
    hasRole,
  };
}
