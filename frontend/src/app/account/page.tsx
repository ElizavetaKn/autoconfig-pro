"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MainNav } from "@/components/ui/MainNav";
import {
  fetchBodyTypesByModelYear,
  fetchBrands,
  fetchModelsByBrand,
  fetchOrders,
  fetchServiceRequests,
  fetchYearsByModel,
  type Brand,
  type Model,
  type OrderOut,
  type ServiceRequestOut,
} from "@/lib/api";
import {
  addToCart,
  readCart,
  readCheckoutDraft,
  type CartItem,
} from "@/lib/cart";
import styles from "./account.module.css";

type TabKey = "current" | "completed" | "configs" | "service";

type SavedConfig = {
  savedAt?: string;
  configurationId?: string;
  configurationCartId?: number;
  brandId?: number | null;
  modelId?: number | null;
  year?: number | null;
  bodyType?: string;
  engineId?: string;
  transmissionId?: string;
  wheelId?: string;
  paintId?: string;
  interiorId?: string;
  panorama?: boolean;
  assistPack?: boolean;
  adaptiveLights?: boolean;
  headlightsOn?: boolean;
  totalPrice?: number;
  total?: number;
  price?: number;
};

type ProfileDraft = {
  fullName: string;
  email: string;
  phone: string;
  primaryVehicleText: string;
  primaryVehicleBrandId: number | null;
  primaryVehicleBrandName: string;
  primaryVehicleModelId: number | null;
  primaryVehicleModelName: string;
  primaryVehicleYear: number | null;
  primaryVehicleBodyType: string;
};

const CONFIG_DRAFT_KEY = "autoconfig_configurator_draft_v1";
const CONFIG_HISTORY_KEY = "autoconfig_configurator_history_v1";
const EDITABLE_CONFIGURATION_KEY = "autoconfig_current_config_v1";
const PROFILE_KEY = "autoconfig_profile_v1";

function formatPrice(v: number) {
  return new Intl.NumberFormat("ru-RU").format(v) + " р.";
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isCompletedStatus(status: string) {
  return ["completed", "done", "closed", "delivered"].includes(
    String(status || "").toLowerCase()
  );
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

function isNotFoundError(message: string) {
  const normalized = String(message || "").toLowerCase();
  return normalized.includes("not found") || normalized.includes("404");
}

function deriveNameFromEmail(email: string) {
  const value = email.trim();
  if (!value) return "Пользователь";

  const localPart = value.split("@")[0] || "Пользователь";
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();

  if (!cleaned) return "Пользователь";

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function emptyProfile(): ProfileDraft {
  return {
    fullName: "",
    email: "",
    phone: "",
    primaryVehicleText: "",
    primaryVehicleBrandId: null,
    primaryVehicleBrandName: "",
    primaryVehicleModelId: null,
    primaryVehicleModelName: "",
    primaryVehicleYear: null,
    primaryVehicleBodyType: "",
  };
}

function buildVehicleText(input: {
  brandName?: string;
  modelName?: string;
  year?: number | null;
  bodyType?: string;
}) {
  const parts = [
    input.brandName?.trim(),
    input.modelName?.trim(),
    input.year ? String(input.year) : "",
    input.bodyType?.trim(),
  ].filter(Boolean);

  return parts.join(" • ");
}

function readSavedConfigurations(): SavedConfig[] {
  if (typeof window === "undefined") return [];

  try {
    const historyRaw = window.localStorage.getItem(CONFIG_HISTORY_KEY);
    if (historyRaw) {
      const parsed = JSON.parse(historyRaw);
      if (Array.isArray(parsed)) {
        return parsed as SavedConfig[];
      }
    }
  } catch {
    // ignore
  }

  try {
    const draftRaw = window.localStorage.getItem(CONFIG_DRAFT_KEY);
    if (!draftRaw) return [];
    const parsed = JSON.parse(draftRaw);
    return parsed ? [parsed as SavedConfig] : [];
  } catch {
    return [];
  }
}

function writeSavedConfigurations(configs: SavedConfig[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONFIG_HISTORY_KEY, JSON.stringify(configs));
}

function readProfileFromStorage(): ProfileDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ProfileDraft> & {
      primaryVehicle?: string;
    };

    return {
      ...emptyProfile(),
      fullName: parsed.fullName ?? "",
      email: parsed.email ?? "",
      phone: parsed.phone ?? "",
      primaryVehicleText:
        parsed.primaryVehicleText ?? parsed.primaryVehicle ?? "",
      primaryVehicleBrandId: parsed.primaryVehicleBrandId ?? null,
      primaryVehicleBrandName: parsed.primaryVehicleBrandName ?? "",
      primaryVehicleModelId: parsed.primaryVehicleModelId ?? null,
      primaryVehicleModelName: parsed.primaryVehicleModelName ?? "",
      primaryVehicleYear: parsed.primaryVehicleYear ?? null,
      primaryVehicleBodyType: parsed.primaryVehicleBodyType ?? "",
    };
  } catch {
    return null;
  }
}

function writeProfileToStorage(profile: ProfileDraft) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  const defaultVehicle = {
    brandId: profile.primaryVehicleBrandId ?? null,
    modelId: profile.primaryVehicleModelId ?? null,
    year: profile.primaryVehicleYear ?? null,
    bodyType: profile.primaryVehicleBodyType ?? "",
    brandName: profile.primaryVehicleBrandName ?? "",
    modelName: profile.primaryVehicleModelName ?? "",
  };

  window.localStorage.setItem(
    "autoconfig_default_vehicle_v1",
    JSON.stringify(defaultVehicle)
  );
}

function getLatestConfig(configs: SavedConfig[]) {
  return configs[0] ?? null;
}

function configUniqueKey(config: SavedConfig, index: number) {
  return String(
    config.configurationId ??
      config.configurationCartId ??
      config.savedAt ??
      `config-${index}`
  );
}

function getConfigCartId(config: SavedConfig, index: number) {
  return Number(config.configurationCartId ?? index + 1_000_000);
}

function getConfigPrice(config: SavedConfig) {
  return Number(config.totalPrice ?? config.total ?? config.price ?? 0);
}

export default function AccountPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("current");

  const [profile, setProfile] = useState<ProfileDraft>(emptyProfile());
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfile());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [orders, setOrders] = useState<OrderOut[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestOut[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const brandNameById = useMemo(() => {
    const map = new Map<number, string>();
    brands.forEach((brand) => map.set(brand.id, brand.name));
    return map;
  }, [brands]);

  const modelNameById = useMemo(() => {
    const map = new Map<number, string>();
    models.forEach((model) => map.set(model.id, model.name));
    return map;
  }, [models]);

  const currentOrders = useMemo(
    () => orders.filter((order) => !isCompletedStatus(order.status)),
    [orders]
  );

  const completedOrders = useMemo(
    () => orders.filter((order) => isCompletedStatus(order.status)),
    [orders]
  );

  const displayName = profile.fullName.trim() || deriveNameFromEmail(profile.email);
  const welcomeText = `Добро пожаловать, ${displayName}! Здесь собраны ваши заказы, сохранённые конфигурации и заявки на установку.`;

  const currentVehicleText = useMemo(() => {
    return (
      profile.primaryVehicleText ||
      buildVehicleText({
        brandName: profile.primaryVehicleBrandName,
        modelName: profile.primaryVehicleModelName,
        year: profile.primaryVehicleYear,
        bodyType: profile.primaryVehicleBodyType,
      }) ||
      "Не выбран"
    );
  }, [profile]);

  function isConfigInCart(config: SavedConfig, index: number) {
    const configId = config.configurationId ?? configUniqueKey(config, index);
    const cartId = getConfigCartId(config, index);

    return cartItems.some(
      (item) =>
        item.sourceType === "configuration" &&
        (item.configurationId === configId || item.id === cartId)
    );
  }

  async function loadData(nextEmail: string, nextPhone: string) {
    setLoading(true);
    setError("");

    const safeOrdersPromise = nextEmail.trim()
      ? fetchOrders(nextEmail.trim()).catch((e: any) => {
          const message = e?.message ?? "";
          if (isNotFoundError(message)) return [];
          throw e;
        })
      : Promise.resolve([]);

    const safeServicePromise = nextPhone.trim()
      ? fetchServiceRequests(nextPhone.trim()).catch((e: any) => {
          const message = e?.message ?? "";
          if (isNotFoundError(message)) return [];
          throw e;
        })
      : Promise.resolve([]);

    try {
      const [ordersData, serviceData] = await Promise.all([
        safeOrdersPromise,
        safeServicePromise,
      ]);

      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setServiceRequests(Array.isArray(serviceData) ? serviceData : []);
      setSavedConfigs(readSavedConfigurations());
      setCartItems(readCart());
    } catch (e: any) {
      setError(e?.message ?? "Не удалось загрузить данные личного кабинета.");
      setOrders([]);
      setServiceRequests([]);
      setSavedConfigs(readSavedConfigurations());
      setCartItems(readCart());
    } finally {
      setLoading(false);
    }
  }

  async function bootstrapVehicleData(initialProfile: ProfileDraft, configs: SavedConfig[]) {
    try {
      const brandsData = await fetchBrands();
      setBrands(Array.isArray(brandsData) ? brandsData : []);

      const latestConfig = getLatestConfig(configs);
      const initialBrandId =
        initialProfile.primaryVehicleBrandId ?? latestConfig?.brandId ?? null;
      const initialModelId =
        initialProfile.primaryVehicleModelId ?? latestConfig?.modelId ?? null;
      const initialYear =
        initialProfile.primaryVehicleYear ?? latestConfig?.year ?? null;

      if (initialBrandId) {
        const modelsData = await fetchModelsByBrand(initialBrandId);
        setModels(Array.isArray(modelsData) ? modelsData : []);

        const brandName =
          brandsData.find((brand) => brand.id === initialBrandId)?.name ?? "";

        if (initialModelId) {
          const yearsData = await fetchYearsByModel(initialModelId);
          setYears(Array.isArray(yearsData.years) ? yearsData.years : []);

          const modelName =
            modelsData.find((model) => model.id === initialModelId)?.name ?? "";

          if (initialYear) {
            const bodyTypesData = await fetchBodyTypesByModelYear(
              initialModelId,
              initialYear
            );
            setBodyTypes(
              Array.isArray(bodyTypesData.body_types) ? bodyTypesData.body_types : []
            );

            const resolvedVehicleText = buildVehicleText({
              brandName,
              modelName,
              year: initialYear,
              bodyType:
                initialProfile.primaryVehicleBodyType || latestConfig?.bodyType || "",
            });

            setProfile((prev) => ({
              ...prev,
              primaryVehicleBrandId: initialBrandId,
              primaryVehicleBrandName: brandName,
              primaryVehicleModelId: initialModelId,
              primaryVehicleModelName: modelName,
              primaryVehicleYear: initialYear,
              primaryVehicleBodyType:
                prev.primaryVehicleBodyType || latestConfig?.bodyType || "",
              primaryVehicleText: resolvedVehicleText,
            }));

            setProfileDraft((prev) => ({
              ...prev,
              primaryVehicleBrandId: initialBrandId,
              primaryVehicleBrandName: brandName,
              primaryVehicleModelId: initialModelId,
              primaryVehicleModelName: modelName,
              primaryVehicleYear: initialYear,
              primaryVehicleBodyType:
                prev.primaryVehicleBodyType || latestConfig?.bodyType || "",
              primaryVehicleText: resolvedVehicleText,
            }));
          } else {
            const resolvedVehicleText = buildVehicleText({
              brandName,
              modelName,
              year: null,
              bodyType: "",
            });

            setProfile((prev) => ({
              ...prev,
              primaryVehicleBrandId: initialBrandId,
              primaryVehicleBrandName: brandName,
              primaryVehicleModelId: initialModelId,
              primaryVehicleModelName: modelName,
              primaryVehicleText: resolvedVehicleText,
            }));

            setProfileDraft((prev) => ({
              ...prev,
              primaryVehicleBrandId: initialBrandId,
              primaryVehicleBrandName: brandName,
              primaryVehicleModelId: initialModelId,
              primaryVehicleModelName: modelName,
              primaryVehicleText: resolvedVehicleText,
            }));
          }
        } else {
          setProfile((prev) => ({
            ...prev,
            primaryVehicleBrandId: initialBrandId,
            primaryVehicleBrandName: brandName,
          }));
          setProfileDraft((prev) => ({
            ...prev,
            primaryVehicleBrandId: initialBrandId,
            primaryVehicleBrandName: brandName,
          }));
        }
      }
    } catch {
      // quietly keep account usable even if selector data failed
    }
  }

  useEffect(() => {
    const storedProfile = readProfileFromStorage();
    const draft = readCheckoutDraft();
    const configs = readSavedConfigurations();

    const initialProfile: ProfileDraft = {
      ...emptyProfile(),
      ...(storedProfile ?? {}),
      email: storedProfile?.email ?? draft?.customer.email ?? "",
      phone: storedProfile?.phone ?? draft?.customer.phone ?? "",
    };

    setProfile(initialProfile);
    setProfileDraft(initialProfile);
    setSavedConfigs(configs);
    setCartItems(readCart());

    void loadData(initialProfile.email, initialProfile.phone);
    void bootstrapVehicleData(initialProfile, configs);

    const onStorageRefresh = () => {
      setSavedConfigs(readSavedConfigurations());
      setCartItems(readCart());
    };

    window.addEventListener("storage", onStorageRefresh);
    window.addEventListener("autoconfig:cart-updated", onStorageRefresh as EventListener);

    return () => {
      window.removeEventListener("storage", onStorageRefresh);
      window.removeEventListener("autoconfig:cart-updated", onStorageRefresh as EventListener);
    };
  }, []);

  useEffect(() => {
    const brandId = profileDraft.primaryVehicleBrandId;
    if (!isEditModalOpen) return;

    if (!brandId) {
      setModels([]);
      setYears([]);
      setBodyTypes([]);
      return;
    }

    void fetchModelsByBrand(brandId)
      .then((data) => {
        setModels(Array.isArray(data) ? data : []);
      })
      .catch(() => setModels([]));
  }, [profileDraft.primaryVehicleBrandId, isEditModalOpen]);

  useEffect(() => {
    const modelId = profileDraft.primaryVehicleModelId;
    if (!isEditModalOpen) return;

    if (!modelId) {
      setYears([]);
      setBodyTypes([]);
      return;
    }

    void fetchYearsByModel(modelId)
      .then((data) => {
        setYears(Array.isArray(data.years) ? data.years : []);
      })
      .catch(() => setYears([]));
  }, [profileDraft.primaryVehicleModelId, isEditModalOpen]);

  useEffect(() => {
    const modelId = profileDraft.primaryVehicleModelId;
    const year = profileDraft.primaryVehicleYear;
    if (!isEditModalOpen) return;

    if (!modelId || !year) {
      setBodyTypes([]);
      return;
    }

    void fetchBodyTypesByModelYear(modelId, year)
      .then((data) => {
        setBodyTypes(Array.isArray(data.body_types) ? data.body_types : []);
      })
      .catch(() => setBodyTypes([]));
  }, [profileDraft.primaryVehicleModelId, profileDraft.primaryVehicleYear, isEditModalOpen]);

  const openEditModal = () => {
    setProfileDraft(profile);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setProfileDraft(profile);
    setIsEditModalOpen(false);
  };

  const handleSaveProfile = () => {
    const brandName =
      brandNameById.get(profileDraft.primaryVehicleBrandId ?? -1) ||
      profileDraft.primaryVehicleBrandName;
    const modelName =
      modelNameById.get(profileDraft.primaryVehicleModelId ?? -1) ||
      profileDraft.primaryVehicleModelName;

    const nextProfile: ProfileDraft = {
      fullName: profileDraft.fullName.trim(),
      email: profileDraft.email.trim(),
      phone: profileDraft.phone.trim(),
      primaryVehicleBrandId: profileDraft.primaryVehicleBrandId,
      primaryVehicleBrandName: brandName,
      primaryVehicleModelId: profileDraft.primaryVehicleModelId,
      primaryVehicleModelName: modelName,
      primaryVehicleYear: profileDraft.primaryVehicleYear,
      primaryVehicleBodyType: profileDraft.primaryVehicleBodyType,
      primaryVehicleText: buildVehicleText({
        brandName,
        modelName,
        year: profileDraft.primaryVehicleYear,
        bodyType: profileDraft.primaryVehicleBodyType,
      }),
    };

    setProfile(nextProfile);
    writeProfileToStorage(nextProfile);
    setIsEditModalOpen(false);
    void loadData(nextProfile.email, nextProfile.phone);
  };

  const openConfigInEditor = (config: SavedConfig) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        EDITABLE_CONFIGURATION_KEY,
        JSON.stringify(config)
      );
    }
    router.push("/configurator?resume=1");
  };

  const addConfigToCart = (config: SavedConfig, index: number) => {
    const configTitle = getConfigTitle(config);
    const configPrice = getConfigPrice(config);
    const configurationId = config.configurationId ?? configUniqueKey(config, index);

    addToCart(
      {
        id: getConfigCartId(config, index),
        title: configTitle,
        category: "Конфигурация",
        brand: resolveBrandName(config.brandId) || "Автомобиль",
        price: configPrice,
        sourceType: "configuration",
        configurationId,
        configurationData: config as unknown as Record<string, unknown>,
        vehicleContext: {
          brandId: config.brandId ?? null,
          modelId: config.modelId ?? null,
          year: config.year ?? null,
          bodyType: config.bodyType ?? "",
        },
      },
      1
    );

    setCartItems(readCart());
  };

  const deleteConfig = (index: number) => {
    const next = savedConfigs.filter((_, currentIndex) => currentIndex !== index);
    setSavedConfigs(next);
    writeSavedConfigurations(next);
  };

  const resolveBrandName = (brandId?: number | null) => {
    if (!brandId) return "";
    return brandNameById.get(brandId) ?? `Марка #${brandId}`;
  };

  const resolveModelName = (config: SavedConfig) => {
    if (!config.modelId) return "";
    if (
      profile.primaryVehicleModelId &&
      profile.primaryVehicleModelId === config.modelId &&
      profile.primaryVehicleModelName
    ) {
      return profile.primaryVehicleModelName;
    }
    return modelNameById.get(config.modelId) ?? `Модель #${config.modelId}`;
  };

  const getConfigTitle = (config: SavedConfig) => {
    const brandName = resolveBrandName(config.brandId);
    const modelName = resolveModelName(config);
    const year = config.year ? String(config.year) : "";
    const bodyType = config.bodyType?.trim() || "";

    const titleParts = [brandName, modelName, year, bodyType].filter(Boolean);
    return titleParts.length ? titleParts.join(" • ") : "Сохранённая конфигурация";
  };

  const renderConfigDescription = (config: SavedConfig) => {
    const parts: string[] = [];

    if (config.engineId) parts.push(`двигатель ${config.engineId}`);
    if (config.transmissionId) parts.push(`трансмиссия ${config.transmissionId}`);
    if (config.wheelId) parts.push(`диски ${config.wheelId}`);
    if (config.paintId) parts.push(`цвет ${config.paintId}`);
    if (config.interiorId) parts.push(`салон ${config.interiorId}`);
    if (config.panorama) parts.push("панорама");
    if (config.assistPack) parts.push("ассистенты");
    if (config.adaptiveLights) parts.push("адаптивный свет");

    return parts.length ? parts.join(" · ") : "Без дополнительных опций";
  };

  return (
    <main className={styles.page}>
      <div className="page-shell">
        <MainNav active="account" />

        <section className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.profileCard}>
              <div className={styles.avatarWrap}>
                <div className={styles.avatar}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </div>

              <div className={styles.profileName}>{displayName}</div>

              <div className={styles.profileList}>
                <div className={styles.profileItem}>
                  <span>Email</span>
                  <b>{profile.email || "Не указан"}</b>
                </div>

                <div className={styles.profileItem}>
                  <span>Телефон</span>
                  <b>{profile.phone || "Не указан"}</b>
                </div>

                <div className={styles.profileItem}>
                  <span>Основной автомобиль</span>
                  <b>{currentVehicleText}</b>
                </div>
              </div>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={openEditModal}
              >
                Редактировать данные
              </button>
            </div>
          </aside>

          <section className={styles.content}>
            <header className={styles.header}>
              <h1 className={styles.title}>Личный кабинет</h1>
              <p className={styles.welcome}>{welcomeText}</p>
            </header>

            <nav className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === "current" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("current")}
              >
                Текущие заказы
              </button>

              <button
                type="button"
                className={`${styles.tab} ${activeTab === "completed" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("completed")}
              >
                Завершённые заказы
              </button>

              <button
                type="button"
                className={`${styles.tab} ${activeTab === "configs" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("configs")}
              >
                Сохранённые конфигурации
              </button>

              <button
                type="button"
                className={`${styles.tab} ${activeTab === "service" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("service")}
              >
                Заявки на установку
              </button>
            </nav>

            {error ? <div className={styles.errorBox}>{error}</div> : null}
            {loading ? <div className={styles.loading}>Загрузка данных...</div> : null}

            {activeTab === "current" && (
              <div className={styles.cardsGrid}>
                {currentOrders.length > 0 ? (
                  currentOrders.map((order) => (
                    <article key={order.id} className={styles.card}>
                      <div className={styles.cardHead}>
                        <div>
                          <div className={styles.cardTitle}>Заказ #{order.id}</div>
                          <div className={styles.cardMeta}>{formatDate(order.created_at)}</div>
                        </div>

                        <div className={styles.cardPrice}>{formatPrice(order.total)}</div>
                      </div>

                      <div className={styles.cardStatus}>
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
                  <div className={styles.emptyState}>Текущих заказов пока нет.</div>
                )}
              </div>
            )}

            {activeTab === "completed" && (
              <div className={styles.cardsGrid}>
                {completedOrders.length > 0 ? (
                  completedOrders.map((order) => (
                    <article key={order.id} className={styles.card}>
                      <div className={styles.cardHead}>
                        <div>
                          <div className={styles.cardTitle}>Заказ #{order.id}</div>
                          <div className={styles.cardMeta}>{formatDate(order.created_at)}</div>
                        </div>

                        <div className={styles.cardPrice}>{formatPrice(order.total)}</div>
                      </div>

                      <div className={styles.cardStatus}>
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
                  <div className={styles.emptyState}>Завершённых заказов пока нет.</div>
                )}
              </div>
            )}

            {activeTab === "configs" && (
              <div className={styles.cardsGrid}>
                {savedConfigs.length > 0 ? (
                  savedConfigs.map((config, configIndex) => {
                    const inCart = isConfigInCart(config, configIndex);
                    const title = getConfigTitle(config);
                    const description = renderConfigDescription(config);
                    const price = getConfigPrice(config);

                    return (
                      <article
                        key={configUniqueKey(config, configIndex)}
                        className={styles.card}
                      >
                        <div className={styles.cardHead}>
                          <div>
                            <div className={styles.cardTitle}>{title}</div>
                            <div className={styles.cardMeta}>{description}</div>
                            <div className={styles.cardMeta}>
                              Сохранено: {formatDate(config.savedAt)}
                            </div>
                          </div>

                          <div className={styles.configHeadRight}>
                            {inCart ? (
                              <span className={styles.inCartBadge}>В корзине</span>
                            ) : null}
                            <div className={styles.cardPrice}>
                              {price > 0 ? formatPrice(price) : "Цена не сохранена"}
                            </div>
                          </div>
                        </div>

                        <div className={styles.configActions}>
                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => openConfigInEditor(config)}
                          >
                            Открыть
                          </button>

                          <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => addConfigToCart(config, configIndex)}
                            disabled={inCart}
                          >
                            {inCart ? "Уже в корзине" : "В корзину"}
                          </button>

                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => deleteConfig(configIndex)}
                          >
                            Удалить
                          </button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className={styles.emptyState}>
                    Сохранённых конфигураций пока нет.
                  </div>
                )}
              </div>
            )}

            {activeTab === "service" && (
              <div className={styles.cardsGrid}>
                {serviceRequests.length > 0 ? (
                  serviceRequests.map((request) => (
                    <article key={request.id} className={styles.card}>
                      <div className={styles.cardHead}>
                        <div>
                          <div className={styles.cardTitle}>{request.itemTitle}</div>
                          <div className={styles.cardMeta}>{formatDate(request.created_at)}</div>
                        </div>

                        <div className={styles.statusPill}>
                          {requestStatusLabel(request.status)}
                        </div>
                      </div>

                      <div className={styles.serviceInfo}>Сервис: {request.serviceCenter}</div>
                      <div className={styles.serviceInfo}>Телефон: {request.phone}</div>
                      <div className={styles.serviceInfo}>
                        Комментарий: {request.comment || "нет"}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    Заявок на установку пока нет.
                  </div>
                )}
              </div>
            )}
          </section>
        </section>

        {isEditModalOpen ? (
          <div className={styles.modalOverlay} onClick={closeEditModal}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>Редактирование данных</h2>
                </div>

                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={closeEditModal}
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalFields}>
                <label className={styles.field}>
                  <span>Имя</span>
                  <input
                    className={styles.input}
                    value={profileDraft.fullName}
                    onChange={(e) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    placeholder="Ваше имя"
                  />
                </label>

                <label className={styles.field}>
                  <span>Email</span>
                  <input
                    className={styles.input}
                    value={profileDraft.email}
                    onChange={(e) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="example@email.com"
                  />
                </label>

                <label className={styles.field}>
                  <span>Телефон</span>
                  <input
                    className={styles.input}
                    value={profileDraft.phone}
                    onChange={(e) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="+375..."
                  />
                </label>

                <div className={styles.vehicleGrid}>
                  <label className={styles.field}>
                    <span>Марка</span>
                    <select
                      className={styles.input}
                      value={profileDraft.primaryVehicleBrandId ?? ""}
                      onChange={(e) => {
                        const nextBrandId = e.target.value ? Number(e.target.value) : null;
                        const nextBrandName =
                          brands.find((brand) => brand.id === nextBrandId)?.name ?? "";

                        setProfileDraft((prev) => ({
                          ...prev,
                          primaryVehicleBrandId: nextBrandId,
                          primaryVehicleBrandName: nextBrandName,
                          primaryVehicleModelId: null,
                          primaryVehicleModelName: "",
                          primaryVehicleYear: null,
                          primaryVehicleBodyType: "",
                          primaryVehicleText: "",
                        }));
                      }}
                    >
                      <option value="">Выберите марку</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Модель</span>
                    <select
                      className={styles.input}
                      value={profileDraft.primaryVehicleModelId ?? ""}
                      onChange={(e) => {
                        const nextModelId = e.target.value ? Number(e.target.value) : null;
                        const nextModelName =
                          models.find((model) => model.id === nextModelId)?.name ?? "";

                        setProfileDraft((prev) => ({
                          ...prev,
                          primaryVehicleModelId: nextModelId,
                          primaryVehicleModelName: nextModelName,
                          primaryVehicleYear: null,
                          primaryVehicleBodyType: "",
                          primaryVehicleText: "",
                        }));
                      }}
                      disabled={!profileDraft.primaryVehicleBrandId}
                    >
                      <option value="">Выберите модель</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Год</span>
                    <select
                      className={styles.input}
                      value={profileDraft.primaryVehicleYear ?? ""}
                      onChange={(e) => {
                        const nextYear = e.target.value ? Number(e.target.value) : null;
                        setProfileDraft((prev) => ({
                          ...prev,
                          primaryVehicleYear: nextYear,
                          primaryVehicleBodyType: "",
                          primaryVehicleText: "",
                        }));
                      }}
                      disabled={!profileDraft.primaryVehicleModelId}
                    >
                      <option value="">Выберите год</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Кузов</span>
                    <select
                      className={styles.input}
                      value={profileDraft.primaryVehicleBodyType}
                      onChange={(e) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          primaryVehicleBodyType: e.target.value,
                          primaryVehicleText: "",
                        }))
                      }
                      disabled={!profileDraft.primaryVehicleYear}
                    >
                      <option value="">Выберите кузов</option>
                      {bodyTypes.map((bodyType) => (
                        <option key={bodyType} value={bodyType}>
                          {bodyType}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={styles.vehiclePreview}>
                  {buildVehicleText({
                    brandName:
                      brandNameById.get(profileDraft.primaryVehicleBrandId ?? -1) ||
                      profileDraft.primaryVehicleBrandName,
                    modelName:
                      modelNameById.get(profileDraft.primaryVehicleModelId ?? -1) ||
                      profileDraft.primaryVehicleModelName,
                    year: profileDraft.primaryVehicleYear,
                    bodyType: profileDraft.primaryVehicleBodyType,
                  }) || "Основной автомобиль пока не выбран"}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeEditModal}
                >
                  Отменить
                </button>

                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={handleSaveProfile}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}