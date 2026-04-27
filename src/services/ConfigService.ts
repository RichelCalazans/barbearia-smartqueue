import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AppConfig, AppState, BarberStatus, BarberStatusAction, BarberStatusHistoryEntry } from '../types';
import { DEFAULT_BARBER_EMAIL } from '../config/admin';

export class ConfigService {
  private static SETTINGS_PATH = 'config/settings';
  private static STATE_PATH = 'config/state';
  private static STATUS_HISTORY_LIMIT = 200;

  static DEFAULT_CONFIG: AppConfig = {
    BUFFER_MINUTES: 8,
    EWMA_ALPHA: 0.3,
    NEW_CLIENT_MULTIPLIER: 1.25,
    MAX_DAILY_CLIENTS: 30,
    OPENING_TIME: '09:00',
    CLOSING_TIME: '19:00',
    BARBER_EMAIL: DEFAULT_BARBER_EMAIL,
    BARBER_WHATSAPP: '',
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
    LOGO_URL: '',
    PRIMARY_COLOR: '#00D4A5',
    SECONDARY_COLOR: '#1A1A1A',
    ACCENT_COLOR: '#0A0A0A',
    DARK_MODE: true,
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
        if (currentConfig.BARBER_WHATSAPP === undefined) updates.BARBER_WHATSAPP = this.DEFAULT_CONFIG.BARBER_WHATSAPP;
        
        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, this.SETTINGS_PATH), updates);
        }
      }

      const stateDoc = await getDoc(doc(db, this.STATE_PATH));
      if (!stateDoc.exists()) {
        const startedAt = Date.now();
        await setDoc(doc(db, this.STATE_PATH), {
          agendaAberta: false,
          agendaPausada: false,
          dataAbertura: null,
          barberStatus: 'FILA_FECHADA',
          barberStatusStartedAt: startedAt,
          barberStatusLastAction: 'INICIALIZACAO',
          barberStatusHistory: [
            {
              status: 'FILA_FECHADA',
              action: 'INICIALIZACAO',
              startedAt,
            } as BarberStatusHistoryEntry,
          ],
        });
      } else {
        const currentState = stateDoc.data() as AppState;
        const updates: any = {};

        if (currentState.agendaPausada === undefined) {
          updates.agendaPausada = false;
        }

        if (!currentState.barberStatus) {
          const startedAt = Date.now();
          updates.barberStatus = 'FILA_FECHADA';
          updates.barberStatusStartedAt = startedAt;
          updates.barberStatusLastAction = 'INICIALIZACAO';
          updates.barberStatusHistory = [
            {
              status: 'FILA_FECHADA',
              action: 'INICIALIZACAO',
              startedAt,
            } as BarberStatusHistoryEntry,
          ];
        } else if (!currentState.barberStatusStartedAt) {
          const startedAt = Date.now();
          const history = Array.isArray(currentState.barberStatusHistory) ? currentState.barberStatusHistory : [];
          const nextHistory = [
            ...history,
            {
              status: currentState.barberStatus,
              action: currentState.barberStatusLastAction || 'INICIALIZACAO',
              startedAt,
            } as BarberStatusHistoryEntry,
          ].slice(-this.STATUS_HISTORY_LIMIT);
          updates.barberStatusStartedAt = startedAt;
          updates.barberStatusLastAction = currentState.barberStatusLastAction || 'INICIALIZACAO';
          updates.barberStatusHistory = nextHistory;
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, this.STATE_PATH), updates);
        }
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
        callback({
          agendaAberta: false,
          dataAbertura: null,
          agendaPausada: false,
          barberStatus: 'FILA_FECHADA',
          barberStatusStartedAt: Date.now(),
          barberStatusLastAction: 'INICIALIZACAO',
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, this.STATE_PATH);
    });
  }

  /**
   * Checks and updates agenda status based on weekly schedule.
   * Respects manual override: if barber opened manually outside schedule with a
   * custom close time, keep open until that time (don't auto-close).
   */
  static async checkAutoOpenClose(config: AppConfig, currentState: AppState): Promise<void> {
    if (!config.AUTO_OPEN_CLOSE || !config.WEEKLY_SCHEDULE) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dayOfWeek = now.getDay();
    const schedule = config.WEEKLY_SCHEDULE.find(s => s.day === dayOfWeek);

    // Check manual override for today
    const hasOverrideForToday =
      currentState.manualOverrideDate === today &&
      !!currentState.manualOverrideCloseTime;

    if (hasOverrideForToday) {
      const [closeH, closeM] = currentState.manualOverrideCloseTime!.split(':').map(Number);
      const overrideCloseDate = new Date(now);
      overrideCloseDate.setHours(closeH, closeM, 0, 0);

      // If override close time has passed, close and clear the override
      if (now >= overrideCloseDate) {
        await this.toggleAgenda(false);
        await this.clearManualOverride();
      }
      // Otherwise, keep agenda as-is (don't auto-toggle while override is active)
      return;
    }

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
   * Checks if current time is outside today's scheduled window.
   * Returns true when AUTO_OPEN_CLOSE is on and now is before openTime or after closeTime
   * (or the day is disabled). Returns false when inside the scheduled window or when
   * AUTO_OPEN_CLOSE is disabled.
   */
  static isOutsideScheduledWindow(config: AppConfig): boolean {
    if (!config.AUTO_OPEN_CLOSE || !config.WEEKLY_SCHEDULE) return false;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const schedule = config.WEEKLY_SCHEDULE.find(s => s.day === dayOfWeek);

    if (!schedule || !schedule.enabled) return true;

    const [openH, openM] = schedule.openTime.split(':').map(Number);
    const [closeH, closeM] = schedule.closeTime.split(':').map(Number);
    const openDate = new Date(now);
    openDate.setHours(openH, openM, 0, 0);
    const closeDate = new Date(now);
    closeDate.setHours(closeH, closeM, 0, 0);

    return now < openDate || now >= closeDate;
  }

  /**
   * Opens the agenda manually with a custom close time for today only.
   * Used when AUTO_OPEN_CLOSE is on but barber wants to open outside schedule.
   */
  static async openAgendaWithManualOverride(closeTime: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    try {
      await setDoc(doc(db, this.STATE_PATH), {
        agendaAberta: true,
        agendaPausada: false,
        dataAbertura: today,
        manualOverrideCloseTime: closeTime,
        manualOverrideDate: today,
      }, { merge: true });

      await this.setBarberStatusFromAction('AGUARDANDO_CLIENTE', 'ABRIU_AGENDA');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, this.STATE_PATH);
    }
  }

  /**
   * Clears the manual override (called when override expires or agenda is closed).
   */
  static async clearManualOverride(): Promise<void> {
    try {
      await setDoc(doc(db, this.STATE_PATH), {
        manualOverrideCloseTime: null,
        manualOverrideDate: null,
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, this.STATE_PATH);
    }
  }

  /**
   * Opens or closes the agenda.
   */
  static async toggleAgenda(open: boolean): Promise<void> {
    try {
      await setDoc(doc(db, this.STATE_PATH), {
        agendaAberta: open,
        agendaPausada: false,
        dataAbertura: open ? new Date().toISOString().split('T')[0] : null,
        // Clear manual override when manually closing
        ...(open ? {} : { manualOverrideCloseTime: null, manualOverrideDate: null }),
      }, { merge: true });

      await this.setBarberStatusFromAction(
        open ? 'AGUARDANDO_CLIENTE' : 'FILA_FECHADA',
        open ? 'ABRIU_AGENDA' : 'FECHOU_FILA'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, this.STATE_PATH);
    }
  }

  /**
   * Pauses or resumes the agenda.
   */
  static async togglePause(paused: boolean, minutesToResume?: number): Promise<void> {
    try {
      const updates: any = {
        agendaPausada: paused,
      };
      if (paused && minutesToResume) {
        // Calculate when to auto-resume
        updates.tempoRetomada = Date.now() + minutesToResume * 60 * 1000;
      } else {
        updates.tempoRetomada = null;
      }
      await setDoc(doc(db, this.STATE_PATH), updates, { merge: true });

      await this.setBarberStatusFromAction(
        paused ? 'EM_PAUSA' : 'AGUARDANDO_CLIENTE',
        paused ? 'PAUSA_CONFIRMADA' : 'RETOMOU_PAUSA'
      );
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

  /**
   * Updates the barber status.
   */
  static async setBarberStatus(status: BarberStatus, action: BarberStatusAction = 'SINCRONIZACAO_SISTEMA'): Promise<void> {
    await this.setBarberStatusFromAction(status, action);
  }

  /**
   * Derives barber status from current queue/agenda runtime.
   */
  static deriveBarberStatus(agendaAberta: boolean, agendaPausada: boolean, hasClientInService: boolean): BarberStatus {
    if (!agendaAberta) return 'FILA_FECHADA';
    if (agendaPausada) return 'EM_PAUSA';
    if (hasClientInService) return 'EM_CORTE';
    return 'AGUARDANDO_CLIENTE';
  }

  /**
   * Syncs barber status from derived runtime state.
   */
  static async syncBarberStatusFromRuntime(
    agendaAberta: boolean,
    agendaPausada: boolean,
    hasClientInService: boolean
  ): Promise<void> {
    const derivedStatus = this.deriveBarberStatus(agendaAberta, agendaPausada, hasClientInService);
    const actionByStatus: Record<BarberStatus, BarberStatusAction> = {
      AGUARDANDO_CLIENTE: 'SEM_CLIENTE_CHAMADO',
      EM_CORTE: 'CHAMOU_PROXIMO_CLIENTE',
      EM_PAUSA: 'PAUSA_CONFIRMADA',
      FILA_FECHADA: 'FECHOU_FILA',
    };
    await this.setBarberStatusFromAction(derivedStatus, actionByStatus[derivedStatus]);
  }

  /**
   * Transitions barber status and stores status start history.
   */
  static async setBarberStatusFromAction(
    status: BarberStatus,
    action: BarberStatusAction,
    startedAt: number = Date.now()
  ): Promise<void> {
    try {
      const stateRef = doc(db, this.STATE_PATH);

      await runTransaction(db, async (transaction) => {
        const stateDoc = await transaction.get(stateRef);
        const currentState = stateDoc.exists() ? (stateDoc.data() as AppState) : null;

        const currentStatus = currentState?.barberStatus;
        const statusAlreadyStarted = currentState?.barberStatusStartedAt;
        if (currentStatus === status && statusAlreadyStarted) {
          return;
        }

        const history = Array.isArray(currentState?.barberStatusHistory) ? currentState!.barberStatusHistory : [];
        const nextHistory: BarberStatusHistoryEntry[] = [
          ...history,
          { status, action, startedAt },
        ].slice(-this.STATUS_HISTORY_LIMIT);

        transaction.set(stateRef, {
          barberStatus: status,
          barberStatusStartedAt: startedAt,
          barberStatusLastAction: action,
          barberStatusHistory: nextHistory,
        }, { merge: true });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, this.STATE_PATH);
    }
  }

  /**
   * Starts or stops the delay alert timer.
   */
  static async setDelayAlert(active: boolean): Promise<void> {
    try {
      await setDoc(doc(db, this.STATE_PATH), {
        delayAlertStartedAt: active ? Date.now() : null,
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, this.STATE_PATH);
    }
  }
}
