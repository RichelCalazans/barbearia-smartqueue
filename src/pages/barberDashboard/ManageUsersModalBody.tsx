import type React from 'react';
import { AlertCircle, Mail, Shield, Trash2, UserPlus } from 'lucide-react';
import { Button } from '../../components/Button';
import type { AppUser, UserRole } from '../../types';
import { cn } from '../../utils';
import type { NewUserForm } from './types';

interface ManageUsersModalBodyProps {
  users: AppUser[];
  userError: string | null;
  showAddUserForm: boolean;
  newUser: NewUserForm;
  submitting: boolean;
  isSuperAdmin: boolean;
  onToggleRole: (user: AppUser) => void | Promise<void>;
  onDeleteUser: (user: AppUser) => void | Promise<void>;
  onNewUserChange: React.Dispatch<React.SetStateAction<NewUserForm>>;
  onCancelAddUser: () => void;
  onAddUser: () => void | Promise<void>;
  onStartAddUser: () => void;
}

const USER_ROLE_OPTIONS: UserRole[] = ['RECEPCIONISTA', 'BARBEIRO', 'ADMIN', 'SUPER_ADMIN'];

function getRoleLabel(role: UserRole): string {
  return role === 'SUPER_ADMIN' ? 'Super' : role === 'ADMIN' ? 'Admin' : role === 'BARBEIRO' ? 'Barbeiro' : 'Recep';
}

export function ManageUsersModalBody({
  users,
  userError,
  showAddUserForm,
  newUser,
  submitting,
  isSuperAdmin,
  onToggleRole,
  onDeleteUser,
  onNewUserChange,
  onCancelAddUser,
  onAddUser,
  onStartAddUser,
}: ManageUsersModalBodyProps) {
  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      {userError && (
        <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {userError}
        </div>
      )}

      <div className="space-y-2">
        {users.length === 0 && !showAddUserForm && (
          <p className="text-sm text-[#64748B] text-center py-4">Nenhum usuário cadastrado ainda.</p>
        )}
        {users.map(u => (
          <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-[#1E1E1E]">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[#F1F5F9]">{u.nome}</p>
              <p className="text-xs text-[#64748B] flex items-center gap-1">
                <Mail className="h-3 w-3" />{u.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleRole(u)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors',
                  u.role === 'SUPER_ADMIN' || u.role === 'ADMIN'
                    ? 'bg-brand/10 text-brand hover:bg-[#EF4444]/10 hover:text-[#EF4444]'
                    : 'bg-[#334155]/20 text-[#64748B] hover:bg-brand/10 hover:text-brand'
                )}
                title={`Mudar role (atual: ${u.role})`}
              >
                <Shield className="h-3 w-3" />
                {getRoleLabel(u.role)}
              </button>
              {isSuperAdmin && u.role !== 'SUPER_ADMIN' && (
                <button
                  onClick={() => onDeleteUser(u)}
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                  title="Remover usuário"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddUserForm ? (
        <div className="space-y-3 p-4 rounded-xl bg-[#111111] border border-brand/20">
          <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Novo Usuário</p>
          <input
            type="text"
            placeholder="Nome completo"
            value={newUser.nome}
            onChange={e => onNewUserChange(p => ({ ...p, nome: e.target.value }))}
            className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
          />
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={e => onNewUserChange(p => ({ ...p, email: e.target.value }))}
            className="flex h-11 w-full rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] px-4 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-brand transition-all"
          />
          <div className="space-y-2">
            <p className="text-xs text-[#64748B]">Função</p>
            <div className="grid grid-cols-2 gap-2">
              {USER_ROLE_OPTIONS.map(role => (
                <button
                  key={role}
                  onClick={() => onNewUserChange(p => ({ ...p, role }))}
                  className={cn(
                    'p-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors',
                    newUser.role === role
                      ? 'bg-brand text-black'
                      : 'bg-[#1A1A1A] text-[#64748B] border border-[#1E1E1E]'
                  )}
                >
                  {getRoleLabel(role)}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-[#64748B]">
            O usuário receberá um email para criar sua senha.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancelAddUser} className="flex-1">
              Cancelar
            </Button>
            <Button size="sm" onClick={onAddUser} loading={submitting} className="flex-1">
              Criar e Enviar Convite
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={onStartAddUser}
        >
          <UserPlus className="mr-2 h-4 w-4" /> Adicionar Usuário
        </Button>
      )}
    </div>
  );
}
