import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signIn, signOut } from '../firebase';
import { UserService } from '../services/UserService';

const ADMIN_EMAILS = ['richelcalazans6@gmail.com', 'teste@teste.com'];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      try {
        if (firebaseUser?.email) {
          if (ADMIN_EMAILS.includes(firebaseUser.email)) {
            setIsAdmin(true);
          } else {
            const appUser = await UserService.findByEmail(firebaseUser.email);
            setIsAdmin(!!appUser?.isAdmin);
          }
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  return {
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
    isAdmin,
  };
}
