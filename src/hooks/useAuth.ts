import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signIn, signOut } from '../firebase';
import { UserService } from '../services/UserService';
import { AppUser, Permission, UserRole, ROLE_PERMISSIONS } from '../types';
import { isSuperAdminEmail } from '../config/admin';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = isSuperAdminEmail(user?.email);

  const effectivePermissions: Permission[] = appUser?.permissions?.length
    ? appUser.permissions
    : appUser?.role
      ? ROLE_PERMISSIONS[appUser.role]
      : [];

  const isAdmin = isSuperAdmin || appUser?.role === 'ADMIN' || appUser?.role === 'SUPER_ADMIN';
  const canAccessDashboard = isSuperAdmin || ((appUser?.ativo ?? false) && effectivePermissions.includes('manage_queue'));

  const hasPermission = (permission: Permission): boolean => {
    if (isSuperAdmin) return true;
    if (!appUser) return false;
    if (!appUser.ativo) return false;
    return effectivePermissions.includes(permission);
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
            try {
              const foundUser = await UserService.findById(firebaseUser.uid);
              if (!foundUser) {
                console.warn(`[useAuth] Usuário ${firebaseUser.email} (uid=${firebaseUser.uid}) não encontrado no Firestore. Permissões negadas.`);
                setAppUser(null);
              } else {
                setAppUser({
                  ...foundUser,
                  permissions: foundUser.permissions?.length
                    ? foundUser.permissions
                    : ROLE_PERMISSIONS[foundUser.role],
                });
              }
            } catch (userServiceError) {
              console.error(`[useAuth] Erro ao buscar usuário ${firebaseUser.email}:`, userServiceError);
              if (userServiceError instanceof Error && userServiceError.message.includes('permission-denied')) {
                console.error('[useAuth] Firestore permission denied ao ler user document');
              }
              setAppUser(null);
            }
          }
        } else {
          setAppUser(null);
        }
      } catch (error) {
        console.error('[useAuth] Erro inesperado na auth callback:', error);
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
    canAccessDashboard,
    hasPermission,
    hasRole,
  };
}
