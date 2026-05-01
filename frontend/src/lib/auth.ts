export type UserRole = "buyer" | "manager" | "admin";

export type AuthSession = {
  isAuthenticated: boolean;
  role: UserRole;
  fullName: string;
  email: string;
};

type BuyerAccount = {
  fullName: string;
  email: string;
  password: string;
  createdAt: string;
};

type ManagerAccount = {
  fullName: string;
  email: string;
  password: string;
  createdAt: string;
};

export type KnownUserRecord = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "blocked";
  source: "local";
  created_at: string;
};

const AUTH_KEY = "autoconfig_auth_v1";
const BUYERS_KEY = "autoconfig_buyers_v1";
const MANAGERS_KEY = "autoconfig_managers_v1";
const BLOCKED_USERS_KEY = "autoconfig_blocked_users_v1";

export const AUTH_CHANGED_EVENT = "autoconfig:auth-changed";

export const GUEST_SESSION: AuthSession = {
  isAuthenticated: false,
  role: "buyer",
  fullName: "",
  email: "",
};

export const MANAGER_CREDENTIALS = {
  email: "manager@autoconfig.local",
  password: "Manager123!",
  fullName: "Менеджер",
} as const;

export const ADMIN_CREDENTIALS = {
  email: "admin@autoconfig.local",
  password: "Admin123!",
  fullName: "Администратор",
} as const;

function isBrowser() {
  return typeof window !== "undefined";
}

function emitAuthChanged() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readJsonArray<T>(key: string): T[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, value: T[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readBuyers(): BuyerAccount[] {
  return readJsonArray<BuyerAccount>(BUYERS_KEY);
}

function writeBuyers(buyers: BuyerAccount[]) {
  writeJsonArray(BUYERS_KEY, buyers);
}

function readManagers(): ManagerAccount[] {
  return readJsonArray<ManagerAccount>(MANAGERS_KEY);
}

function writeManagers(managers: ManagerAccount[]) {
  writeJsonArray(MANAGERS_KEY, managers);
}

function readBlockedEmails(): string[] {
  return readJsonArray<string>(BLOCKED_USERS_KEY).map(normalizeEmail);
}

function writeBlockedEmails(emails: string[]) {
  writeJsonArray(BLOCKED_USERS_KEY, emails.map(normalizeEmail));
}

function removeBlockedEmail(email: string) {
  const normalized = normalizeEmail(email);
  const next = readBlockedEmails().filter((item) => item !== normalized);
  writeBlockedEmails(next);
}

function isBlockedEmail(email: string) {
  return readBlockedEmails().includes(normalizeEmail(email));
}

export function getAuthSession(): AuthSession {
  if (!isBrowser()) return GUEST_SESSION;

  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return GUEST_SESSION;

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed?.isAuthenticated) return GUEST_SESSION;

    const role: UserRole =
      parsed.role === "manager" || parsed.role === "admin" ? parsed.role : "buyer";

    return {
      isAuthenticated: true,
      role,
      fullName: String(parsed.fullName ?? ""),
      email: String(parsed.email ?? ""),
    };
  } catch {
    return GUEST_SESSION;
  }
}

export function signInSession(payload: AuthSession) {
  if (!isBrowser()) return;

  window.localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      isAuthenticated: true,
      role: payload.role,
      fullName: payload.fullName.trim(),
      email: normalizeEmail(payload.email),
    } satisfies AuthSession)
  );

  emitAuthChanged();
}

export function signOut() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(AUTH_KEY);
  emitAuthChanged();
}

export function registerBuyerAccount(input: {
  fullName: string;
  email: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim();
  const password = input.password.trim();

  const buyers = readBuyers();
  const existingIndex = buyers.findIndex((buyer) => normalizeEmail(buyer.email) === email);

  const record: BuyerAccount = {
    fullName,
    email,
    password,
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    buyers[existingIndex] = {
      ...buyers[existingIndex],
      fullName: record.fullName,
      password: record.password,
    };
  } else {
    buyers.push(record);
  }

  writeBuyers(buyers);
  return record;
}

export function addManagerAccount(input: {
  fullName: string;
  email: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim();
  const password = input.password.trim();

  if (!fullName || !email || !password) {
    throw new Error("Заполни имя, email и пароль менеджера.");
  }

  if (email === normalizeEmail(ADMIN_CREDENTIALS.email)) {
    throw new Error("Этот email уже занят администратором.");
  }

  if (email === normalizeEmail(MANAGER_CREDENTIALS.email)) {
    throw new Error("Этот логин уже занят системным менеджером.");
  }

  const buyers = readBuyers();
  if (buyers.some((buyer) => normalizeEmail(buyer.email) === email)) {
    throw new Error("Этот email уже используется покупателем.");
  }

  const managers = readManagers();
  const existingIndex = managers.findIndex((manager) => normalizeEmail(manager.email) === email);

  const record: ManagerAccount = {
    fullName,
    email,
    password,
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    managers[existingIndex] = {
      ...managers[existingIndex],
      fullName: record.fullName,
      password: record.password,
    };
  } else {
    managers.push(record);
  }

  writeManagers(managers);
  emitAuthChanged();
  return record;
}

export function removeManagerAccount(email: string) {
  const normalized = normalizeEmail(email);

  if (normalized === normalizeEmail(MANAGER_CREDENTIALS.email)) {
    throw new Error("Системного менеджера удалить нельзя.");
  }

  const managers = readManagers();
  const next = managers.filter((manager) => normalizeEmail(manager.email) !== normalized);

  if (next.length === managers.length) {
    throw new Error("Менеджер не найден.");
  }

  writeManagers(next);
  removeBlockedEmail(normalized);

  const session = getAuthSession();
  if (session.isAuthenticated && normalizeEmail(session.email) === normalized) {
    signOut();
  } else {
    emitAuthChanged();
  }
}

export function toggleBlockedUser(email: string) {
  const normalized = normalizeEmail(email);
  const blocked = new Set(readBlockedEmails());

  if (blocked.has(normalized)) {
    blocked.delete(normalized);
  } else {
    blocked.add(normalized);
  }

  writeBlockedEmails(Array.from(blocked));
  emitAuthChanged();
}

export function loginWithCredentials(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const password = input.password.trim();

  if (isBlockedEmail(email)) {
    return {
      ok: false as const,
      message: "Этот пользователь заблокирован.",
    };
  }

  if (
    email === normalizeEmail(ADMIN_CREDENTIALS.email) &&
    password === ADMIN_CREDENTIALS.password
  ) {
    const session: AuthSession = {
      isAuthenticated: true,
      role: "admin",
      fullName: ADMIN_CREDENTIALS.fullName,
      email: ADMIN_CREDENTIALS.email,
    };
    signInSession(session);
    return { ok: true as const, session };
  }

  if (
    email === normalizeEmail(MANAGER_CREDENTIALS.email) &&
    password === MANAGER_CREDENTIALS.password
  ) {
    const session: AuthSession = {
      isAuthenticated: true,
      role: "manager",
      fullName: MANAGER_CREDENTIALS.fullName,
      email: MANAGER_CREDENTIALS.email,
    };
    signInSession(session);
    return { ok: true as const, session };
  }

  const extraManager = readManagers().find(
    (item) => normalizeEmail(item.email) === email && item.password === password
  );

  if (extraManager) {
    const session: AuthSession = {
      isAuthenticated: true,
      role: "manager",
      fullName: extraManager.fullName,
      email: extraManager.email,
    };
    signInSession(session);
    return { ok: true as const, session };
  }

  const buyer = readBuyers().find(
    (item) => normalizeEmail(item.email) === email && item.password === password
  );

  if (!buyer) {
    return {
      ok: false as const,
      message: "Этот пользователь не зарегистрирован.",
    };
  }

  const session: AuthSession = {
    isAuthenticated: true,
    role: "buyer",
    fullName: buyer.fullName,
    email: buyer.email,
  };

  signInSession(session);
  return { ok: true as const, session };
}

export function getKnownUsers(): KnownUserRecord[] {
  const blocked = new Set(readBlockedEmails());

  const admin: KnownUserRecord = {
    id: "local-admin",
    name: ADMIN_CREDENTIALS.fullName,
    email: ADMIN_CREDENTIALS.email,
    role: "admin",
    status: blocked.has(normalizeEmail(ADMIN_CREDENTIALS.email)) ? "blocked" : "active",
    source: "local",
    created_at: "2026-01-01T00:00:00.000Z",
  };

  const defaultManager: KnownUserRecord = {
    id: "local-manager-default",
    name: MANAGER_CREDENTIALS.fullName,
    email: MANAGER_CREDENTIALS.email,
    role: "manager",
    status: blocked.has(normalizeEmail(MANAGER_CREDENTIALS.email)) ? "blocked" : "active",
    source: "local",
    created_at: "2026-01-01T00:00:00.000Z",
  };

  const extraManagers: KnownUserRecord[] = readManagers().map((manager, index) => ({
    id: `local-manager-${index + 1}`,
    name: manager.fullName,
    email: manager.email,
    role: "manager",
    status: blocked.has(normalizeEmail(manager.email)) ? "blocked" : "active",
    source: "local",
    created_at: manager.createdAt,
  }));

  const buyers: KnownUserRecord[] = readBuyers().map((buyer, index) => ({
    id: `local-buyer-${index + 1}`,
    name: buyer.fullName,
    email: buyer.email,
    role: "buyer",
    status: blocked.has(normalizeEmail(buyer.email)) ? "blocked" : "active",
    source: "local",
    created_at: buyer.createdAt,
  }));

  return [admin, defaultManager, ...extraManagers, ...buyers];
}

export function isManager(session: AuthSession) {
  return session.isAuthenticated && session.role === "manager";
}

export function isAdmin(session: AuthSession) {
  return session.isAuthenticated && session.role === "admin";
}

export function isBuyer(session: AuthSession) {
  return session.isAuthenticated && session.role === "buyer";
}

export function roleLabel(role: UserRole) {
  if (role === "admin") return "Администратор";
  if (role === "manager") return "Менеджер";
  return "Покупатель";
}