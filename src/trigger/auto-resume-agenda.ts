import { task, logger } from "@trigger.dev/sdk/v3";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

interface AutoResumePayload {
  resumeAt: number; // timestamp em ms quando retomar
}

/**
 * Auto-resume de agenda pausada
 * Task on-demand que retoma agenda automaticamente
 * Funciona mesmo com browser fechado
 * Implementa retry automático com backoff
 */
export const autoResumeAgenda = task({
  id: "auto-resume-agenda",
  maxDuration: 60,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 5000,
    factor: 2,
  },
  run: async (payload: AutoResumePayload) => {
    try {
      logger.info("Auto-resume agenda iniciado", {
        resumeAt: new Date(payload.resumeAt).toISOString(),
      });

      // Se ainda não é hora, aguardar
      const now = Date.now();
      if (now < payload.resumeAt) {
        const delay = payload.resumeAt - now;
        logger.info("Agendando para mais tarde", {
          delayMs: delay,
          resumeAt: new Date(payload.resumeAt).toISOString(),
        });

        // Aguardar até 55 segundos (margem para re-agendar se necessário)
        const waitTime = Math.min(delay, 55000);
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // Se ainda não passou do horário, retornar para re-agendar
        if (Date.now() < payload.resumeAt) {
          return {
            resumed: false,
            reason: "Agendado para mais tarde",
            nextTryAt: new Date(payload.resumeAt).toISOString(),
          };
        }
      }

      // Buscar estado atual
      const stateDoc = await getDoc(doc(db, "config", "state"));
      const state = stateDoc.data();

      if (!state?.agendaPausada) {
        logger.info("Agenda já foi retomada ou nunca foi pausada");
        return {
          resumed: false,
          reason: "Agenda não estava pausada",
        };
      }

      // Verificar se já passou da hora programada
      if (state.tempoRetomada && state.tempoRetomada > Date.now()) {
        logger.warn("Ainda não é hora de retomar", {
          resumeAt: new Date(state.tempoRetomada).toISOString(),
        });
        return {
          resumed: false,
          reason: "Ainda não é hora de retomar",
          nextTryAt: new Date(state.tempoRetomada).toISOString(),
        };
      }

      // Retomar agenda
      await setDoc(
        doc(db, "config", "state"),
        {
          agendaPausada: false,
          tempoRetomada: null,
        },
        { merge: true }
      );

      logger.info("Agenda retomada automaticamente", {
        timestamp: new Date().toISOString(),
      });

      return {
        resumed: true,
        timestamp: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      logger.error("Erro ao retomar agenda", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
});
