import { schedules, logger } from "@trigger.dev/sdk/v3";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

interface MetricsSnapshot {
  date: string;
  totalAttended: number;
  totalCancelled: number;
  totalAbsent: number;
  averageWaitTime: number;
  averageServiceTime: number;
  peakHour: string;
  generatedAt: number;
}

/**
 * Snapshot diário de métricas
 * Executa diariamente às 23h (fim do expediente)
 * Pré-calcula métricas para dashboard instantâneo
 */
export const dailyMetricsSnapshot = schedules.task({
  id: "daily-metrics-snapshot",
  cron: "0 23 * * *", // Todo dia às 23h
  run: async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      logger.info("Iniciando snapshot de métricas", { date: today });

      // Buscar histórico do dia
      const q = query(
        collection(db, "history"),
        where("data", "==", today)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        logger.info("Nenhum atendimento no dia", { date: today });
        return { date: today, success: false };
      }

      // Calcular métricas
      let totalAttended = 0;
      let totalCancelled = 0;
      let totalAbsent = 0;
      let totalWaitTime = 0;
      let totalServiceTime = 0;
      const hourCounts: Record<string, number> = {};

      snapshot.docs.forEach((doc) => {
        const data = doc.data();

        // Contar por status
        if (data.status === "CONCLUIDO") totalAttended++;
        else if (data.status === "CANCELADO") totalCancelled++;
        else if (data.status === "AUSENTE") totalAbsent++;

        // Calcular tempos (em minutos)
        if (data.tempoEstimado) totalServiceTime += data.tempoEstimado;
        if (data.horaEntrada && data.horaInicio) {
          const entrada = new Date(data.horaEntrada).getTime();
          const inicio = new Date(data.horaInicio).getTime();
          totalWaitTime += (inicio - entrada) / 60000; // converter para minutos
        }

        // Hora de pico
        if (data.horaInicio) {
          const hora = new Date(data.horaInicio).getHours().toString().padStart(2, "0");
          hourCounts[hora] = (hourCounts[hora] || 0) + 1;
        }
      });

      // Hora de pico
      const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "00";

      // Salvar snapshot
      const metrics: MetricsSnapshot = {
        date: today,
        totalAttended,
        totalCancelled,
        totalAbsent,
        averageWaitTime: totalAttended > 0 ? totalWaitTime / totalAttended : 0,
        averageServiceTime: totalAttended > 0 ? totalServiceTime / totalAttended : 0,
        peakHour,
        generatedAt: Date.now(),
      };

      await setDoc(doc(db, "metricsSnapshots", today), metrics);

      logger.info("Snapshot de métricas salvo", {
        date: today,
        totalAttended,
        peakHour,
      });

      return { ...metrics, success: true };
    } catch (error) {
      logger.error("Erro ao gerar snapshot de métricas", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
});
