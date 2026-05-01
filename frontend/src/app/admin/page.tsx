"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MainNav } from "@/components/ui/MainNav";
import {
  fetchAdminSummary,
  fetchAdminUsers,
  fetchOrders,
  fetchServiceRequests,
  type AdminSummaryOut,
  type AdminUserOut,
  type OrderOut,
  type ServiceRequestOut,
} from "@/lib/api";
import {
  GUEST_SESSION,
  addManagerAccount,
  getAuthSession,
  getKnownUsers,
  isAdmin,
  removeManagerAccount,
  roleLabel,
  toggleBlockedUser,
  type AuthSession,
  type KnownUserRecord,
} from "@/lib/auth";
import styles from "./page.module.css";

type AdminTab = "overview" | "users" | "orders" | "service" | "managers";

type DisplayUser = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  orders_count: number;
  source: "backend" | "local";
  roleLabel?: string;
  status?: "active" | "blocked";
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " р.";
}

function orderStatusLabel(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (["new", "created", "pending"].includes(normalized)) return "Новый";
  if (["paid", "processing", "in_progress"].includes(normalized)) return "В обработке";
  if (["delivered", "completed", "done"].includes(normalized)) return "Завершён";
  if (["cancelled", "canceled", "closed"].includes(normalized)) return "Закрыт";
  return status || "Неизвестно";
}

function requestStatusLabel(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (["new", "created", "pending"].includes(normalized)) return "Новая";
  if (["confirmed", "accepted", "scheduled"].includes(normalized)) return "Подтверждена";
  if (["done", "completed", "closed"].includes(normalized)) return "Завершена";
  return status || "Неизвестно";
}

function isExampleEmail(email: string) {
  return email.toLowerCase().includes("example");
}

function mapLocalUsersToDisplay(users: KnownUserRecord[]): DisplayUser[] {
  return users
    .filter((user) => !isExampleEmail(user.email))
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      orders_count: 0,
      source: "local",
      roleLabel:
        user.role === "admin"
          ? "Администратор"
          : user.role === "manager"
          ? "Менеджер"
          : "Покупатель",
      status: user.status,
    }));
}

export default function AdminPage() {
  const router = useRouter();

  const [session, setSession] = useState<AuthSession>(GUEST_SESSION);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<AdminTab>("overview");

  const [summary, setSummary] = useState<AdminSummaryOut | null>(null);
  const [backendUsers, setBackendUsers] = useState<AdminUserOut[]>([]);
  const [localUsers, setLocalUsers] = useState<KnownUserRecord[]>([]);
  const [orders, setOrders] = useState<OrderOut[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestOut[]>([]);

  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [savingManager, setSavingManager] = useState(false);

  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    const currentSession = getAuthSession();
    setSession(currentSession);

    if (!isAdmin(currentSession)) {
      router.replace("/login?next=/admin");
      return;
    }

    setAllowed(true);

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [summaryData, usersData, ordersData, serviceData] = await Promise.all([
          fetchAdminSummary().catch(() => null),
          fetchAdminUsers().catch(() => []),
          fetchOrders().catch(() => []),
          fetchServiceRequests().catch(() => []),
        ]);

        setSummary(summaryData);
        setBackendUsers(
          Array.isArray(usersData)
            ? usersData.filter((user) => !isExampleEmail(user.email))
            : []
        );
        setLocalUsers(getKnownUsers().filter((user) => !isExampleEmail(user.email)));
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setServiceRequests(Array.isArray(serviceData) ? serviceData : []);
      } catch (e: any) {
        setError(e?.message ?? "Не удалось загрузить панель администратора.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [router]);

  const users = useMemo<DisplayUser[]>(() => {
    const localMapped = mapLocalUsersToDisplay(localUsers);
    const backendMapped: DisplayUser[] = backendUsers.map((user) => ({
      id: `backend-${user.id}`,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      orders_count: user.orders_count,
      source: "backend",
    }));

    const map = new Map<string, DisplayUser>();

    for (const backendUser of backendMapped) {
      map.set(backendUser.email.toLowerCase(), backendUser);
    }

    for (const localUser of localMapped) {
      const key = localUser.email.toLowerCase();

      if (map.has(key)) {
        const existing = map.get(key)!;
        map.set(key, {
          ...existing,
          roleLabel: localUser.roleLabel,
          status: localUser.status,
        });
      } else {
        map.set(key, localUser);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [backendUsers, localUsers]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        String(user.roleLabel || "").toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const managersOnly = useMemo(
    () => users.filter((user) => user.roleLabel === "Менеджер"),
    [users]
  );

  const mergedSummary = useMemo(() => {
    return {
      usersTotal: Math.max(summary?.users_total ?? 0, users.length),
      ordersTotal: Math.max(summary?.orders_total ?? 0, orders.length),
      serviceRequestsTotal: Math.max(
        summary?.service_requests_total ?? 0,
        serviceRequests.length
      ),
      brandsTotal: summary?.brands_total ?? 0,
      modelsTotal: summary?.models_total ?? 0,
      fitmentsTotal: summary?.fitments_total ?? 0,
      categoriesTotal: summary?.categories_total ?? 0,
    };
  }, [summary, users.length, orders.length, serviceRequests.length]);

  const refreshLocalUsers = () => {
    setLocalUsers(getKnownUsers().filter((user) => !isExampleEmail(user.email)));
  };

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSavingManager(true);
      setError("");

      addManagerAccount({
        fullName: managerName,
        email: managerEmail,
        password: managerPassword,
      });

      setManagerName("");
      setManagerEmail("");
      setManagerPassword("");
      refreshLocalUsers();
      setTab("managers");
    } catch (e: any) {
      setError(e?.message ?? "Не удалось создать менеджера.");
    } finally {
      setSavingManager(false);
    }
  };

  const handleToggleBlocked = (email: string) => {
    toggleBlockedUser(email);
    refreshLocalUsers();
  };

  const handleDeleteManager = (email: string) => {
    try {
      setError("");
      removeManagerAccount(email);
      refreshLocalUsers();
    } catch (e: any) {
      setError(e?.message ?? "Не удалось удалить менеджера.");
    }
  };

  if (!allowed) return null;

  return (
    <main className={styles.page}>
      <div className="page-shell">
        <MainNav active="admin" />

        <section className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.profileCard}>
              <div className={styles.avatar}>
                {(session.fullName || "A").charAt(0).toUpperCase()}
              </div>

              <div className={styles.profileName}>
                {session.fullName || "Администратор"}
              </div>

              <div className={styles.profileRole}>{roleLabel(session.role)}</div>

              <div className={styles.profileMeta}>
                <span>Email</span>
                <b>{session.email || "Не указан"}</b>
              </div>

              <div className={styles.profileMeta}>
                <span>Обязанности</span>
                <b>Пользователи, роли, заказы, сервис и контроль данных</b>
              </div>
            </div>

            <div className={styles.sidebarCard}>
              <div className={styles.sidebarTitle}>Сводка системы</div>

              <div className={styles.metric}>
                <span>Пользователи</span>
                <b>{mergedSummary.usersTotal}</b>
              </div>

              <div className={styles.metric}>
                <span>Заказы</span>
                <b>{mergedSummary.ordersTotal}</b>
              </div>

              <div className={styles.metric}>
                <span>Сервисные заявки</span>
                <b>{mergedSummary.serviceRequestsTotal}</b>
              </div>

              <div className={styles.metric}>
                <span>Марки / модели</span>
                <b>
                  {mergedSummary.brandsTotal} / {mergedSummary.modelsTotal}
                </b>
              </div>

              <div className={styles.metric}>
                <span>Категории</span>
                <b>{mergedSummary.categoriesTotal}</b>
              </div>

              <div className={styles.metric}>
                <span>Совместимости</span>
                <b>{mergedSummary.fitmentsTotal}</b>
              </div>
            </div>
          </aside>

          <section className={styles.content}>
            <header className={styles.header}>
              <h1 className={styles.title}>Панель администратора</h1>
              <p className={styles.subtitle}>
                Управление пользователями, менеджерами, заказами и состоянием системы.
              </p>
            </header>

            <nav className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${tab === "overview" ? styles.tabActive : ""}`}
                onClick={() => setTab("overview")}
              >
                Обзор
              </button>

              <button
                type="button"
                className={`${styles.tab} ${tab === "users" ? styles.tabActive : ""}`}
                onClick={() => setTab("users")}
              >
                Пользователи
              </button>

              <button
                type="button"
                className={`${styles.tab} ${tab === "orders" ? styles.tabActive : ""}`}
                onClick={() => setTab("orders")}
              >
                Заказы
              </button>

              <button
                type="button"
                className={`${styles.tab} ${tab === "service" ? styles.tabActive : ""}`}
                onClick={() => setTab("service")}
              >
                Сервис
              </button>

              <button
                type="button"
                className={`${styles.tab} ${tab === "managers" ? styles.tabActive : ""}`}
                onClick={() => setTab("managers")}
              >
                Менеджеры
              </button>
            </nav>

            {loading ? <div className={styles.loading}>Загрузка панели...</div> : null}
            {error ? <div className={styles.errorBox}>{error}</div> : null}

            {!loading && tab === "overview" && (
              <section className={styles.overviewSection}>
                <div className={styles.statsGrid}>
                  <article className={styles.statCard}>
                    <span>Категории</span>
                    <b>{mergedSummary.categoriesTotal}</b>
                  </article>

                  <article className={styles.statCard}>
                    <span>Марки</span>
                    <b>{mergedSummary.brandsTotal}</b>
                  </article>

                  <article className={styles.statCard}>
                    <span>Модели</span>
                    <b>{mergedSummary.modelsTotal}</b>
                  </article>

                  <article className={styles.statCard}>
                    <span>Совместимости</span>
                    <b>{mergedSummary.fitmentsTotal}</b>
                  </article>
                </div>

                <div className={styles.overviewGrid}>
                  <article className={styles.panelCard}>
                    <div className={styles.sectionTitle}>Последние заказы</div>

                    <div className={styles.compactList}>
                      {orders.length > 0 ? (
                        orders.slice(0, 5).map((order) => (
                          <div key={order.id} className={styles.compactRow}>
                            <div>
                              <b>Заказ #{order.id}</b>
                              <span>{order.customer.fullName || "Клиент не указан"}</span>
                            </div>
                            <div className={styles.compactRight}>
                              <b>{formatPrice(order.total)}</b>
                              <span>{orderStatusLabel(order.status)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={styles.emptyState}>Заказов пока нет.</div>
                      )}
                    </div>
                  </article>

                  <article className={styles.panelCard}>
                    <div className={styles.sectionTitle}>Последние заявки сервиса</div>

                    <div className={styles.compactList}>
                      {serviceRequests.length > 0 ? (
                        serviceRequests.slice(0, 5).map((request) => (
                          <div key={request.id} className={styles.compactRow}>
                            <div>
                              <b>{request.itemTitle}</b>
                              <span>{request.customerName || "Клиент не указан"}</span>
                            </div>
                            <div className={styles.compactRight}>
                              <b>{request.serviceCenter}</b>
                              <span>{requestStatusLabel(request.status)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={styles.emptyState}>Заявок пока нет.</div>
                      )}
                    </div>
                  </article>
                </div>
              </section>
            )}

            {!loading && tab === "users" && (
              <section className={styles.usersSection}>
                <div className={styles.toolbarRow}>
                  <div className={styles.sectionTitle}>Пользователи системы</div>
                  <input
                    className={styles.searchInput}
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Поиск по имени, email или роли"
                  />
                </div>

                <div className={styles.grid}>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <article key={user.id} className={styles.card}>
                        <div className={styles.cardTitle}>{user.name}</div>
                        <div className={styles.cardMeta}>{user.email}</div>
                        <div className={styles.cardMeta}>
                          Создан: {formatDate(user.created_at)}
                        </div>
                        <div className={styles.statusLine}>
                          Заказов: <b>{user.orders_count}</b>
                        </div>
                        <div className={styles.cardMeta}>
                          Источник: {user.source === "backend" ? "база данных" : "локальная система"}
                        </div>
                        {user.roleLabel ? (
                          <div className={styles.cardMeta}>Роль: {user.roleLabel}</div>
                        ) : null}
                        {user.status ? (
                          <div className={styles.cardMeta}>
                            Статус: {user.status === "blocked" ? "заблокирован" : "активен"}
                          </div>
                        ) : null}

                        {user.source === "local" ? (
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => handleToggleBlocked(user.email)}
                          >
                            {user.status === "blocked" ? "Разблокировать" : "Заблокировать"}
                          </button>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <div className={styles.emptyState}>Пользователи не найдены.</div>
                  )}
                </div>
              </section>
            )}

            {!loading && tab === "orders" && (
              <section className={styles.grid}>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <article key={order.id} className={styles.card}>
                      <div className={styles.cardHead}>
                        <div>
                          <div className={styles.cardTitle}>Заказ #{order.id}</div>
                          <div className={styles.cardMeta}>{formatDate(order.created_at)}</div>
                          <div className={styles.cardMeta}>
                            Клиент: {order.customer.fullName || "Не указан"}
                          </div>
                          <div className={styles.cardMeta}>
                            Email: {order.customer.email || "Не указан"}
                          </div>
                        </div>

                        <div className={styles.cardPrice}>{formatPrice(order.total)}</div>
                      </div>

                      <div className={styles.statusLine}>
                        Статус: <b>{orderStatusLabel(order.status)}</b>
                      </div>

                      <div className={styles.itemsList}>
                        {order.items.map((item) => (
                          <div key={item.id} className={styles.itemRow}>
                            <span>{item.title}</span>
                            <span>
                              {item.qty} × {formatPrice(item.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className={styles.emptyState}>Заказов пока нет.</div>
                )}
              </section>
            )}

            {!loading && tab === "service" && (
              <section className={styles.grid}>
                {serviceRequests.length > 0 ? (
                  serviceRequests.map((request) => (
                    <article key={request.id} className={styles.card}>
                      <div className={styles.cardHead}>
                        <div>
                          <div className={styles.cardTitle}>{request.itemTitle}</div>
                          <div className={styles.cardMeta}>{request.customerName}</div>
                          <div className={styles.cardMeta}>{request.serviceCenter}</div>
                          <div className={styles.cardMeta}>Телефон: {request.phone}</div>
                        </div>

                        <div className={styles.statusBadge}>
                          {requestStatusLabel(request.status)}
                        </div>
                      </div>

                      <div className={styles.statusLine}>
                        Дата: <b>{formatDate(request.created_at)}</b>
                      </div>
                      <div className={styles.cardMeta}>
                        Комментарий: {request.comment || "нет"}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className={styles.emptyState}>Заявок на установку пока нет.</div>
                )}
              </section>
            )}

            {!loading && tab === "managers" && (
              <section className={styles.managersSection}>
                <article className={styles.managerCreateSection}>
                  <div className={styles.sectionTitle}>Добавить менеджера</div>

                  <form className={styles.managerForm} onSubmit={handleCreateManager}>
                    <input
                      className={styles.input}
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="Имя менеджера"
                    />

                    <input
                      className={styles.input}
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      placeholder="Логин / email"
                    />

                    <input
                      className={styles.input}
                      type="password"
                      value={managerPassword}
                      onChange={(e) => setManagerPassword(e.target.value)}
                      placeholder="Пароль"
                    />

                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={savingManager}
                    >
                      {savingManager ? "Сохранение..." : "Создать менеджера"}
                    </button>
                  </form>
                </article>

                <article className={styles.panelCard}>
                  <div className={styles.sectionTitle}>Менеджеры системы</div>

                  <div className={styles.grid}>
                    {managersOnly.length > 0 ? (
                      managersOnly.map((manager) => (
                        <article key={manager.id} className={styles.card}>
                          <div className={styles.cardTitle}>{manager.name}</div>
                          <div className={styles.cardMeta}>{manager.email}</div>
                          <div className={styles.cardMeta}>
                            Создан: {formatDate(manager.created_at)}
                          </div>
                          <div className={styles.cardMeta}>
                            Статус: {manager.status === "blocked" ? "заблокирован" : "активен"}
                          </div>

                          <div className={styles.cardActions}>
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() => handleToggleBlocked(manager.email)}
                            >
                              {manager.status === "blocked" ? "Разблокировать" : "Заблокировать"}
                            </button>

                            {manager.email !== "manager@autoconfig.local" ? (
                              <button
                                type="button"
                                className={styles.dangerButton}
                                onClick={() => handleDeleteManager(manager.email)}
                              >
                                Удалить
                              </button>
                            ) : null}
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className={styles.emptyState}>Менеджеров пока нет.</div>
                    )}
                  </div>
                </article>
              </section>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}