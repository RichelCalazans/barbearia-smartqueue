/**
 * Lightweight validators for user-provided form inputs.
 * Returns `null` when valid, otherwise a user-facing error message (pt-BR).
 */

export function validateNome(nome: string): string | null {
  const trimmed = nome.trim();
  if (trimmed.length === 0) return 'Informe seu nome.';
  if (trimmed.length < 2) return 'Nome muito curto.';
  if (trimmed.length > 100) return 'Nome muito longo (máx. 100 caracteres).';
  if (!/^[\p{L}\s'.-]+$/u.test(trimmed)) return 'Nome contém caracteres inválidos.';
  return null;
}

export function validateTelefone(telefone: string): string | null {
  const digits = telefone.replace(/\D/g, '');
  if (digits.length === 0) return 'Informe seu WhatsApp.';
  if (digits.length < 10 || digits.length > 11) return 'WhatsApp deve ter 10 ou 11 dígitos.';
  // Brazilian mobile numbers: DDD (2) + 9 + 8 digits
  if (digits.length === 11 && digits[2] !== '9') return 'Número de celular inválido.';
  return null;
}

/**
 * Validates an ISO date (YYYY-MM-DD). Birth dates must be in the past and
 * within a plausible range (not >120 years ago).
 */
export function validateDataNascimento(isoDate: string): string | null {
  if (!isoDate) return 'Informe a data de nascimento.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return 'Data inválida (use DD/MM/AAAA).';
  const parsed = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(parsed.getTime())) return 'Data inválida.';
  const now = new Date();
  if (parsed > now) return 'Data de nascimento não pode ser futura.';
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 120);
  if (parsed < minDate) return 'Data de nascimento muito antiga.';
  return null;
}

/** Validates an ISO date (YYYY-MM-DD) used for scheduling appointments. */
export function validateDataAgendamento(isoDate: string): string | null {
  if (!isoDate) return null; // empty means "today"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return 'Data de agendamento inválida.';
  const parsed = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(parsed.getTime())) return 'Data de agendamento inválida.';
  return null;
}
