import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";
import {
  AppConfig,
  AppState,
  DEFAULT_TIME_ZONE,
  AgendaAction,
  buildStateUpdate,
  decideAgendaAction,
  getBusinessClock,
} from "./agendaAutomation";

if (getApps().length === 0) {
  initializeApp();
}

setGlobalOptions({
  region: "southamerica-east1",
  maxInstances: 1,
});

const SETTINGS_PATH = "config/settings";
const STATE_PATH = "config/state";
const LOCKS_COLLECTION = "automationLocks";
const LOCK_RETENTION_DAYS = 14;
const SOURCE = "auto-open-close-scheduler-v2";

export interface AutomationRunResult {
  action: AgendaAction;
  bucket: string;
  lockPath: string;
  locked: boolean;
  businessDate: string;
  timeZone: string;
}

export const autoOpenCloseAgenda = onSchedule(
  {
    schedule: "* * * * *",
    timeZone: DEFAULT_TIME_ZONE,
    retryCount: 3,
  },
  async (event: ScheduledEvent) => {
    const scheduledAt = event.scheduleTime ? new Date(event.scheduleTime) : new Date();
    const result = await runAutoOpenCloseAgenda(scheduledAt);

    logger.info("Auto open/close agenda run completed", result);
  }
);

export async function runAutoOpenCloseAgenda(now: Date = new Date()): Promise<AutomationRunResult> {
  const db = getFirestore();
  const settingsRef = db.doc(SETTINGS_PATH);
  const stateRef = db.doc(STATE_PATH);

  return db.runTransaction(async (transaction) => {
    const [settingsSnapshot, stateSnapshot] = await Promise.all([
      transaction.get(settingsRef),
      transaction.get(stateRef),
    ]);

    const config = settingsSnapshot.exists ? (settingsSnapshot.data() as AppConfig) : {};
    const state = stateSnapshot.exists ? (stateSnapshot.data() as AppState) : {};
    const clock = getBusinessClock(now, config.TIMEZONE);
    const bucket = `auto-open-close-${clock.dateString}-${clock.hour}-${clock.minute}`;
    const lockRef = db.collection(LOCKS_COLLECTION).doc(bucket);
    const action = decideAgendaAction(config, state, now);

    if (action === "NOOP") {
      return {
        action,
        bucket,
        lockPath: lockRef.path,
        locked: false,
        businessDate: clock.dateString,
        timeZone: clock.timeZone,
      };
    }

    const lockSnapshot = await transaction.get(lockRef);

    if (lockSnapshot.exists) {
      return {
        action: "NOOP",
        bucket,
        lockPath: lockRef.path,
        locked: true,
        businessDate: clock.dateString,
        timeZone: clock.timeZone,
      };
    }

    const stateUpdate = buildStateUpdate(action, state, clock.dateString, now.getTime());

    transaction.create(lockRef, {
      action,
      bucket,
      businessDate: clock.dateString,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now.getTime() + LOCK_RETENTION_DAYS * 24 * 60 * 60 * 1000),
      source: SOURCE,
      timeZone: clock.timeZone,
    });

    if (Object.keys(stateUpdate).length > 0) {
      transaction.set(stateRef, stateUpdate, { merge: true });
    }

    return {
      action,
      bucket,
      lockPath: lockRef.path,
      locked: false,
      businessDate: clock.dateString,
      timeZone: clock.timeZone,
    };
  });
}
