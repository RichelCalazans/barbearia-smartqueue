import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AppConfig, AppState } from '../types';

export class ConfigService {
  private static SETTINGS_PATH = 'config/settings';
  private static STATE_PATH = 'config/state';

  static DEFAULT_CONFIG: AppConfig = {
    BUFFER_MINUTES: 8,
    EWMA_ALPHA: 0.3,
    NEW_CLIENT_MULTIPLIER: 1.25,
    MAX_DAILY_CLIENTS: 30,
    OPENING_TIME: '09:00',
    CLOSING_TIME: '19:00',
    BARBER_EMAIL: 'richelcalazans6@gmail.com',
    BARBER_NAME: 'Barbeiro',
    SHOP_NAME: 'Barbearia SmartQueue',
    AUTO_REFRESH_SECONDS: 12,
    TIMEZONE: 'America/Sao_Paulo',
    AUTO_OPEN_CLOSE: false,
    WEEKLY_SCHEDULE: [
      { day: 0, enabled: false, openTime: '09:00', closeTime: '18:00' },
      { day: 1, enabled: true, openTime: '09:00', closeTime: '19:00' },
      { day: 2, enabled: true, openTime: '09:00', closeTime: '19:00' },
      { day: 3, enabled: true, openTime: '09:00', closeTime: '19:00' },
      { day: 4, enabled: true, openTime: '09:00', closeTime: '19:00' },
      { day: 5, enabled: true, openTime: '09:00', closeTime: '19:00' },
      { day: 6, enabled: true, openTime: '09:00', closeTime: '14:00' },
    ],
  };

  /**
   * Initializes the configuration and state if they don't exist.
   */
  static async initialize(): Promise<void> {
    try {
      const settingsDoc = await getDoc(doc(db, this.SETTINGS_PATH));
      if (!settingsDoc.exists()) {
        await setDoc(doc(db, this.SETTINGS_PATH), this.DEFAULT_CONFIG);
      } else {
        const currentConfig = settingsDoc.data() as AppConfig;
        const updates: any = {};
        if (currentConfig.AUTO_OPEN_CLOSE === undefined) updates.AUTO_OPEN_CLOSE = this.DEFAULT_CONFIG.AUTO_OPEN_CLOSE;
        if (currentConfig.WEEKLY_SCHEDULE === undefined) updates.WEEKLY_SCHEDULE = this.DEFAULT_CONFIG.WEEKLY_SCHEDULE;
        
        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, this.SETTINGS_PATH), updates);
        }
      }

      const stateDoc = await getDoc(doc(db, this.STATE_PATH));
      if (!stateDoc.exists()) {
        await setDoc(doc(db, this.STATE_PATH), {
          agendaAberta: false,
          dataAbertura: null,
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config');
    }
  }

  /**
   * Listens for configuration changes.
   */
  static onConfigChange(callback: (config: AppConfig) => void) {
    return onSnapshot(doc(db, this.SETTINGS_PATH), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as AppConfig);
      } else {
        callback(this.DEFAULT_CONFIG);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, this.SETTINGS_PATH);
    });
  }

  /**
   * Listens for state changes.
   */
  static onStateChange(callback: (state: AppState) => void) {
    return onSnapshot(doc(db, this.STATE_PATH), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as AppState);
      } else {
        callback({ agendaAberta: false, dataAbertura: null });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, this.STATE_PATH);
    });
  }

  /**
   * Checks and updates agenda status based on weekly schedule.
   */
  static async checkAutoOpenClose(config: AppConfig, currentState: AppState): Promise<void> {
    if (!config.AUTO_OPEN_CLOSE || !config.WEEKLY_SCHEDULE) return;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const schedule = config.WEEKLY_SCHEDULE.find(s => s.day === dayOfWeek);

    if (!schedule || !schedule.enabled) {
      if (currentState.agendaAberta) {
        await this.toggleAgenda(false);
      }
      return;
    }

    const [openH, openM] = schedule.openTime.split(':').map(Number);
    const [closeH, closeM] = schedule.closeTime.split(':').map(Number);

    const openDate = new Date(now);
    openDate.setHours(openH, openM, 0, 0);

    const closeDate = new Date(now);
    closeDate.setHours(closeH, closeM, 0, 0);

    const shouldBeOpen = now >= openDate && now < closeDate;

    if (shouldBeOpen !== currentState.agendaAberta) {
      await this.toggleAgenda(shouldBeOpen);
    }
  }

  /**
   * Opens or closes the agenda.
   */
  static async toggleAgenda(open: boolean): Promise<void> {
    try {
      await setDoc(doc(db, this.STATE_PATH), {
        agendaAberta: open,
        dataAbertura: open ? new Date().toISOString().split('T')[0] : null,
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, this.STATE_PATH);
    }
  }

  /**
   * Updates the configuration.
   */
  static async updateConfig(config: Partial<AppConfig>): Promise<void> {
    try {
      await updateDoc(doc(db, this.SETTINGS_PATH), config);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, this.SETTINGS_PATH);
    }
  }
}
