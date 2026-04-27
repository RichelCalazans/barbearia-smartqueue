/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { SUPER_ADMIN_EMAILS } from '../src/config/admin';
import { ROLE_PERMISSIONS, type Permission, type UserRole } from '../src/types';

type ParsedArgs = {
  uid?: string;
  email?: string;
  nome?: string;
  role?: UserRole;
  permissions?: Permission[];
  ativo?: boolean;
  writeUserDoc: boolean;
  dryRun: boolean;
  help: boolean;
};

type UserDocData = {
  email?: unknown;
  nome?: unknown;
  role?: unknown;
  permissions?: unknown;
  ativo?: unknown;
  isAdmin?: unknown;
  createdAt?: unknown;
};

type AdminClaims = {
  role: UserRole;
  permissions: Permission[];
  isAdmin: boolean;
  isQueueManager: boolean;
  ativo: boolean;
};

const VALID_ROLES: readonly UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'BARBEIRO', 'RECEPCIONISTA'];
const VALID_PERMISSIONS = Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()));

function usage(): string {
  return [
    'Uso:',
    '  npx tsx scripts/sync-admin-claims.ts --email admin@example.com',
    '  npx tsx scripts/sync-admin-claims.ts --uid firebase-uid --role ADMIN --write-user-doc',
    '',
    'Opcoes:',
    '  --email <email>              Resolve o usuario pelo email do Firebase Auth',
    '  --uid <uid>                  Resolve o usuario pelo uid do Firebase Auth',
    '  --role <role>                SUPER_ADMIN, ADMIN, BARBEIRO ou RECEPCIONISTA',
    '  --permissions <csv>          Permissoes efetivas separadas por virgula',
    '  --ativo <true|false>         Status administrativo da claim',
    '  --nome <nome>                Nome usado ao escrever users/{uid}',
    '  --write-user-doc             Cria/atualiza users/{uid} com role/permissoes/ativo',
    '  --dry-run                    Mostra o que seria escrito, sem aplicar mudancas',
    '  --help                       Mostra esta ajuda',
  ].join('\n');
}

function readOptionValue(argv: string[], index: number, name: string): { value: string; nextIndex: number } {
  const current = argv[index];
  const inlineValue = current.slice(name.length + 3);

  if (current.startsWith(`--${name}=`)) {
    if (!inlineValue) throw new Error(`Opcao --${name} precisa de valor.`);
    return { value: inlineValue, nextIndex: index };
  }

  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Opcao --${name} precisa de valor.`);
  return { value, nextIndex: index + 1 };
}

function isRole(value: string): value is UserRole {
  return (VALID_ROLES as readonly string[]).includes(value);
}

function isPermission(value: string): value is Permission {
  return (VALID_PERMISSIONS as readonly string[]).includes(value);
}

function parseBoolean(value: string, name: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Opcao --${name} aceita apenas true ou false.`);
}

function parsePermissions(value: string): Permission[] {
  const permissions = value
    .split(',')
    .map((permission) => permission.trim())
    .filter(Boolean);

  const invalid = permissions.filter((permission) => !isPermission(permission));
  if (invalid.length > 0) {
    throw new Error(`Permissoes invalidas: ${invalid.join(', ')}`);
  }

  return Array.from(new Set(permissions as Permission[]));
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    writeUserDoc: false,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--write-user-doc' || arg === '--ensure-user-doc') {
      parsed.writeUserDoc = true;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--uid' || arg.startsWith('--uid=')) {
      const result = readOptionValue(argv, index, 'uid');
      parsed.uid = result.value;
      index = result.nextIndex;
    } else if (arg === '--email' || arg.startsWith('--email=')) {
      const result = readOptionValue(argv, index, 'email');
      parsed.email = result.value.toLowerCase();
      index = result.nextIndex;
    } else if (arg === '--nome' || arg.startsWith('--nome=')) {
      const result = readOptionValue(argv, index, 'nome');
      parsed.nome = result.value;
      index = result.nextIndex;
    } else if (arg === '--role' || arg.startsWith('--role=')) {
      const result = readOptionValue(argv, index, 'role');
      const role = result.value.toUpperCase();
      if (!isRole(role)) throw new Error(`Role invalida: ${result.value}`);
      parsed.role = role;
      index = result.nextIndex;
    } else if (arg === '--permissions' || arg.startsWith('--permissions=')) {
      const result = readOptionValue(argv, index, 'permissions');
      parsed.permissions = parsePermissions(result.value);
      index = result.nextIndex;
    } else if (arg === '--ativo' || arg.startsWith('--ativo=')) {
      const result = readOptionValue(argv, index, 'ativo');
      parsed.ativo = parseBoolean(result.value, 'ativo');
      index = result.nextIndex;
    } else {
      throw new Error(`Opcao desconhecida: ${arg}`);
    }
  }

  if (!parsed.help && !parsed.uid && !parsed.email) {
    throw new Error('Informe --uid ou --email.');
  }

  return parsed;
}

async function loadFirebaseAdmin() {
  try {
    const appModuleName = 'firebase-admin/app';
    const authModuleName = 'firebase-admin/auth';
    const firestoreModuleName = 'firebase-admin/firestore';

    const [app, auth, firestore] = await Promise.all([
      import(appModuleName),
      import(authModuleName),
      import(firestoreModuleName),
    ]);

    return { app, auth, firestore };
  } catch (error) {
    throw new Error(
      `Nao foi possivel carregar firebase-admin. Instale a dependencia antes de rodar este script. Erro: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function parseServiceAccount(raw: string): Record<string, string> {
  const source = raw.startsWith('@') ? raw.slice(1) : raw;
  const json = raw.startsWith('@') || raw.endsWith('.json')
    ? readFile(source)
    : raw;
  const serviceAccount = JSON.parse(json) as Record<string, string>;

  if (typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  return serviceAccount;
}

function readFile(path: string): string {
  return readFileSync(path, 'utf8');
}

async function initializeFirebaseAdmin() {
  const { app, auth, firestore } = await loadFirebaseAdmin();
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const options: Record<string, unknown> = {};

  if (projectId) options.projectId = projectId;

  if (serviceAccountRaw) {
    const serviceAccount = parseServiceAccount(serviceAccountRaw);
    options.credential = app.cert(serviceAccount);
    options.projectId = projectId ?? serviceAccount.project_id;
  } else {
    options.credential = app.applicationDefault();
  }

  if (app.getApps().length === 0) {
    app.initializeApp(options);
  }

  return {
    auth: auth.getAuth(),
    db: firestore.getFirestore(),
  };
}

function coerceDocData(data: unknown): UserDocData {
  return data && typeof data === 'object' ? data as UserDocData : {};
}

function roleFromDoc(data: UserDocData): UserRole | null {
  if (typeof data.role === 'string' && isRole(data.role)) return data.role;
  if (typeof data.isAdmin === 'boolean') return data.isAdmin ? 'ADMIN' : 'BARBEIRO';
  return null;
}

function permissionsFromDoc(data: UserDocData): Permission[] | null {
  if (!Array.isArray(data.permissions)) return null;
  const permissions = data.permissions.filter((permission): permission is Permission => {
    return typeof permission === 'string' && isPermission(permission);
  });

  return permissions.length > 0 ? Array.from(new Set(permissions)) : null;
}

function resolveRole(args: ParsedArgs, data: UserDocData, email?: string): UserRole {
  const role = args.role ?? roleFromDoc(data);
  if (role) return role;

  if (email && (SUPER_ADMIN_EMAILS as readonly string[]).includes(email)) {
    return 'SUPER_ADMIN';
  }

  throw new Error('Nao foi possivel determinar role. Informe --role ou crie users/{uid} antes.');
}

function resolvePermissions(args: ParsedArgs, data: UserDocData, role: UserRole): Permission[] {
  if (role === 'SUPER_ADMIN') return ROLE_PERMISSIONS.SUPER_ADMIN;
  return args.permissions ?? permissionsFromDoc(data) ?? ROLE_PERMISSIONS[role];
}

function resolveAtivo(args: ParsedArgs, data: UserDocData): boolean {
  if (typeof args.ativo === 'boolean') return args.ativo;
  if (typeof data.ativo === 'boolean') return data.ativo;
  return true;
}

function buildClaims(role: UserRole, permissions: Permission[], ativo: boolean): AdminClaims {
  return {
    role,
    permissions: role === 'SUPER_ADMIN' ? ROLE_PERMISSIONS.SUPER_ADMIN : permissions,
    isAdmin: role === 'SUPER_ADMIN' || role === 'ADMIN',
    isQueueManager: permissions.includes('manage_queue'),
    ativo,
  };
}

function displayJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  const { auth, db } = await initializeFirebaseAdmin();
  const authUser = args.uid
    ? await auth.getUser(args.uid)
    : await auth.getUserByEmail(args.email);
  const authEmail = typeof authUser.email === 'string' ? authUser.email.toLowerCase() : args.email;

  if (args.email && authEmail && args.email !== authEmail) {
    throw new Error(`Email informado (${args.email}) nao corresponde ao usuario Auth (${authEmail}).`);
  }

  const userRef = db.collection('users').doc(authUser.uid);
  const userSnap = await userRef.get();
  const userDoc = coerceDocData(userSnap.exists ? userSnap.data() : null);
  const role = resolveRole(args, userDoc, authEmail);
  const permissions = resolvePermissions(args, userDoc, role);
  const ativo = resolveAtivo(args, userDoc);
  const adminClaims = buildClaims(role, permissions, ativo);
  const nextClaims = {
    ...(authUser.customClaims ?? {}),
    ...adminClaims,
  };

  const userDocPatch = {
    email: authEmail ?? stringValue(userDoc.email) ?? '',
    nome: args.nome ?? stringValue(userDoc.nome) ?? authUser.displayName ?? (role === 'SUPER_ADMIN' ? 'Super Admin' : authEmail ?? authUser.uid),
    role,
    permissions: adminClaims.permissions,
    ativo,
    updatedAt: Date.now(),
    ...(userSnap.exists || typeof userDoc.createdAt === 'number' ? {} : { createdAt: Date.now() }),
  };

  console.log('Usuario alvo:');
  console.log(displayJson({ uid: authUser.uid, email: authEmail, userDocExists: userSnap.exists }));
  console.log('Claims calculadas:');
  console.log(displayJson(adminClaims));

  if (args.dryRun) {
    console.log('Dry-run ativo: nenhuma mudanca aplicada.');
    if (args.writeUserDoc) {
      console.log('Patch users/{uid}:');
      console.log(displayJson(userDocPatch));
    }
    return;
  }

  await auth.setCustomUserClaims(authUser.uid, nextClaims);
  console.log('Custom claims sincronizadas com sucesso.');

  if (args.writeUserDoc) {
    await userRef.set(userDocPatch, { merge: true });
    console.log('Documento users/{uid} criado/atualizado com sucesso.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  console.error('');
  console.error(usage());
  process.exitCode = 1;
});
