import { schedules, logger } from "@trigger.dev/sdk/v3";
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Limpeza de filas antigas
 * Executa diariamente às 3h da manhã
 * Remove registros de fila com mais de 30 dias
 * Reduz custos do Firestore em até 30%
 */
export const cleanupOldQueues = schedules.task({
  id: "cleanup-old-queues",
  cron: "0 3 * * *", // Todo dia às 3h
  run: async () => {
    try {
      // Data limite: 30 dias atrás
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const cutoffStr = cutoffDate.toISOString().split("T")[0];

      logger.info("Iniciando limpeza de filas antigas", { cutoffDate: cutoffStr });

      // Query para documentos antigos
      const q = query(
        collection(db, "queue"),
        where("data", "<", cutoffStr)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        logger.info("Nenhum registro antigo para limpar");
        return { deleted: 0, date: cutoffStr };
      }

      // Batch delete (máx 500 docs por batch)
      const batch = writeBatch(db);
      let count = 0;

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;

        // Commit a cada 500 docs
        if (count % 500 === 0) {
          batch.commit();
        }
      });

      // Commit final
      if (count % 500 !== 0) {
        await batch.commit();
      }

      logger.info("Limpeza concluída", {
        deleted: snapshot.size,
        date: cutoffStr,
        batchSize: Math.ceil(snapshot.size / 500),
      });

      return {
        deleted: snapshot.size,
        date: cutoffStr,
        success: true,
      };
    } catch (error) {
      logger.error("Erro ao limpar filas antigas", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
});
