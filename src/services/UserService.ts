import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppUser } from '../types';

export class UserService {
  private static COLLECTION = 'users';

  /**
   * Creates a Firebase Auth user via REST API (does NOT switch the current auth session)
   * then saves user info to Firestore and sends a password-setup email.
   */
  static async createUser(email: string, nome: string, isAdmin: boolean): Promise<void> {
    const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: tempPassword, returnSecureToken: false }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      const msg: string = err.error?.message || 'Erro ao criar usuário';
      if (msg === 'EMAIL_EXISTS') throw new Error('Este email já está cadastrado');
      throw new Error(msg);
    }

    const data = await res.json();
    const uid: string = data.localId;

    await setDoc(doc(db, this.COLLECTION, uid), {
      email,
      nome,
      isAdmin,
      ativo: true,
      createdAt: Date.now(),
    });

    // Send invite email — user clicks the link to set their password
    await sendPasswordResetEmail(auth, email);
  }

  static async listUsers(): Promise<AppUser[]> {
    const snapshot = await getDocs(collection(db, this.COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppUser));
  }

  static async updateRole(userId: string, isAdmin: boolean): Promise<void> {
    await updateDoc(doc(db, this.COLLECTION, userId), { isAdmin });
  }

  static async findByEmail(email: string): Promise<AppUser | null> {
    const q = query(collection(db, this.COLLECTION), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() } as AppUser;
  }
}
