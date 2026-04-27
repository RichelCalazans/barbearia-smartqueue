import { useState, useEffect } from 'react';
import { getIdTokenResult, onAuthStateChanged, type IdTokenResult, type User } from 'firebase/auth';
import { auth, signIn, signOut } from '../firebase';
import { UserService } from '../services/UserService';
import { AppUser, Permission, UserRole, ROLE_PERMISSIONS } from '../types';
import { isSuperAdminEmail } from '../config/admin';
import { diag } from '../utils/diag';

const VALID_ROLES: readonly UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'BARBEIRO', 'RECEPCIONISTA'];
const VALID_PERMISSIONS = Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()));

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value);
}

function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (VALID_PERMISSIONS as readonly string[]).includes(value);
}

function getRoleFromClaims(claims: Record<string, unknown>): UserRole | null {
  if (isUserRole(claims.role)) return claims.role;
  if (claims.isAdmin === true) return 'ADMIN';
  if (claims.isQueueManager === true) return 'BARBEIRO';
  return null;
}

function getPermissionsFromClaims(claims: Record<string, unknown>, role: UserRole): Permission[] {
  if (role === 'SUPER_ADMIN') return ROLE_PERMISSIONS.SUPER_ADMIN;

  if (Array.isArray(claims.permissions)) {
    const permissions = Array.from(new Set(claims.permissions.filter(isPermission)));
    if (permissions.length > 0) return permissions;
  }

  return ROLE_PERMISSIONS[role];
}

function getDisplayName(firebaseUser: User, claims: Record<string, unknown>, role: UserRole): string {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (firebaseUser.displayName) return firebaseUser.displayName;
  if (typeof claims.name === 'string' && claims.name.trim()) return claims.name;
  return firebaseUser.email ?? 'Usuário';
}

function buildAppUserFromClaims(firebaseUser: User, tokenResult: IdTokenResult): AppUser | null {
  const claims = tokenResult.claims as Record<string, unknown>;
  const role = getRoleFromClaims(claims);
  const ativo = claims.ativo;

  if (!role || typeof ativo !== 'boolean') return null;

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    nome: getDisplayName(firebaseUser, claims, role),
    role,
    permissions: getPermissionsFromClaims(claims, role),
    ativo,
    createdAt: 0,
  };
}

function buildSuperAdminFallback(firebaseUser: User): AppUser {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    nome: 'Super Admin',
    role: 'SUPER_ADMIN',
    permissions: ROLE_PERMISSIONS.SUPER_ADMIN,
    ativo: true,
    createdAt: 0,
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = (appUser?.ativo === true && appUser.role === 'SUPER_ADMIN') || isSuperAdminEmail(user?.email);

  const effectivePermissions: Permission[] = appUser?.permissions?.length
    ? appUser.permissions
    : appUser?.role
      ? ROLE_PERMISSIONS[appUser.role]
      : [];

  const isAdmin = isSuperAdmin || ((appUser?.ativo ?? false) && (appUser?.role === 'ADMIN' || appUser?.role === 'SUPER_ADMIN'));
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
    diag('useAuth:subscribe');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      diag('useAuth:onAuthStateChanged', { email: firebaseUser?.email ?? null, uid: firebaseUser?.uid ?? null });
      setLoading(true);
      setUser(firebaseUser);
      try {
        if (firebaseUser) {
          try {
            diag('useAuth:getIdTokenResult:start', firebaseUser.uid);
            const tokenResult = await getIdTokenResult(firebaseUser, true);
            const claimsUser = buildAppUserFromClaims(firebaseUser, tokenResult);
            diag('useAuth:getIdTokenResult:done', {
              hasClaimsUser: !!claimsUser,
              role: tokenResult.claims.role ?? null,
              ativo: tokenResult.claims.ativo ?? null,
            });

            if (claimsUser) {
              diag('useAuth:claims', { role: claimsUser.role, ativo: claimsUser.ativo });
              setAppUser(claimsUser);
              return;
            }
          } catch (tokenError) {
            diag('useAuth:getIdTokenResult:error', tokenError instanceof Error ? tokenError.message : String(tokenError));
            console.error(`[useAuth] Erro ao buscar custom claims para ${firebaseUser.email ?? firebaseUser.uid}:`, tokenError);
          }

          if (firebaseUser.email && isSuperAdminEmail(firebaseUser.email)) {
            diag('useAuth:superAdmin:fallback');
            setAppUser(buildSuperAdminFallback(firebaseUser));
          } else {
            try {
              diag('useAuth:findById:start', firebaseUser.uid);
              const foundUser = await UserService.findById(firebaseUser.uid);
              diag('useAuth:findById:done', { found: !!foundUser, role: foundUser?.role, ativo: foundUser?.ativo });
              if (!foundUser) {
                console.warn(`[useAuth] Usuário ${firebaseUser.email ?? '(sem email)'} (uid=${firebaseUser.uid}) sem custom claims válidas e não encontrado no Firestore. Permissões negadas.`);
                setAppUser(null);
              } else if (!foundUser.ativo) {
                console.warn(`[useAuth] Usuário ${firebaseUser.email ?? foundUser.email} (uid=${firebaseUser.uid}) está inativo no Firestore. Permissões negadas.`);
                setAppUser({
                  ...foundUser,
                  permissions: foundUser.permissions?.length
                    ? foundUser.permissions
                    : ROLE_PERMISSIONS[foundUser.role],
                });
              } else {
                setAppUser({
                  ...foundUser,
                  permissions: foundUser.permissions?.length
                    ? foundUser.permissions
                    : ROLE_PERMISSIONS[foundUser.role],
                });
              }
            } catch (userServiceError) {
              diag('useAuth:findById:error', userServiceError instanceof Error ? userServiceError.message : String(userServiceError));
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
        diag('useAuth:loading=false');
        setLoading(false);
      }
    });
    return () => {
      diag('useAuth:unsubscribe');
      unsubscribe();
    };
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
