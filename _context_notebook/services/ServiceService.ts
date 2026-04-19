import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc, 
  getDoc,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Service } from '../types';

export class ServiceService {
  private static COLLECTION = 'services';

  static DEFAULT_SERVICES: Service[] = [
    { id: 'SRV001', nome: 'Corte Social', tempoBase: 30, preco: 35, ativo: true },
    { id: 'SRV002', nome: 'Degradê', tempoBase: 45, preco: 45, ativo: true },
    { id: 'SRV003', nome: 'Barba', tempoBase: 20, preco: 25, ativo: true },
    { id: 'SRV004', nome: 'Corte + Barba', tempoBase: 60, preco: 60, ativo: true },
    { id: 'SRV005', nome: 'Sobrancelha', tempoBase: 10, preco: 15, ativo: true },
    { id: 'SRV006', nome: 'Luzes', tempoBase: 90, preco: 80, ativo: true },
    { id: 'SRV007', nome: 'Platinado', tempoBase: 120, preco: 120, ativo: true },
    { id: 'SRV008', nome: 'Lavagem', tempoBase: 10, preco: 10, ativo: true },
  ];

  static async initialize(): Promise<void> {
    try {
      const snapshot = await getDocs(collection(db, this.COLLECTION));
      if (snapshot.empty) {
        for (const service of this.DEFAULT_SERVICES) {
          await setDoc(doc(db, this.COLLECTION, service.id), service);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, this.COLLECTION);
    }
  }

  static async listActive(): Promise<Service[]> {
    const path = this.COLLECTION;
    try {
      const q = query(collection(db, path), where('ativo', '==', true));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Service));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  static async listAll(): Promise<Service[]> {
    const path = this.COLLECTION;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Service));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  static async create(service: Omit<Service, 'id'>): Promise<Service> {
    const path = this.COLLECTION;
    const id = `SRV${Date.now()}`;
    const newService = { ...service, id };
    await setDoc(doc(db, path, id), newService);
    return newService;
  }

  static async update(service: Service): Promise<void> {
    const path = this.COLLECTION;
    await setDoc(doc(db, path, service.id), service);
  }

  static async delete(id: string): Promise<void> {
    const path = this.COLLECTION;
    await deleteDoc(doc(db, path, id));
  }
}
