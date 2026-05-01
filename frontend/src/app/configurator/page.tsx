"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchBodyTypesByModelYear,
  fetchBrands,
  fetchModelsByBrand,
  fetchYearsByModel,
  type BodyTypesOut,
  type Brand,
  type Model,
  type YearsOut,
} from "@/lib/api";
import {
  addToCart,
  clearEditableConfiguration,
  readEditableConfiguration,
} from "@/lib/cart";
import { MainNav } from "@/components/ui/MainNav";
import styles from "./page.module.css";

const Car3DScene = dynamic(
  () =>
    import("@/components/configurator/Car3DScene").then(
      (mod) => mod.Car3DScene
    ),
  {
    ssr: false,
    loading: () => <div className={styles.sceneLoading}>Загрузка 3D-сцены...</div>,
  }
);

type StepKey = "vehicle" | "engine" | "transmission" | "wheels" | "interior";

type EngineOption = {
  id: string;
  label: string;
  power: string;
  priceDelta: number;
};

type TransmissionOption = {
  id: string;
  label: string;
  note: string;
  priceDelta: number;
};

type WheelOption = {
  id: "17-silver" | "18-black" | "19-performance";
  label: string;
  size: string;
  priceDelta: number;
};

type InteriorOption = {
  id: "black" | "beige" | "red";
  label: string;
  priceDelta: number;
};

type PaintOption = {
  id: string;
  label: string;
  color: string;
  priceDelta: number;
};

const STEPS: Array<{ key: StepKey; title: string }> = [
  { key: "vehicle", title: "Описание" },
  { key: "engine", title: "Двигатель" },
  { key: "transmission", title: "Трансмиссия" },
  { key: "wheels", title: "Колеса" },
  { key: "interior", title: "Опции" },
];

const ENGINE_OPTIONS: EngineOption[] = [
  { id: "petrol-20", label: "2.0 бензин", power: "184 л.с.", priceDelta: 0 },
  { id: "petrol-30", label: "3.0 бензин", power: "374 л.с.", priceDelta: 9800 },
  { id: "diesel-20", label: "2.0 дизель", power: "190 л.с.", priceDelta: 6200 },
  { id: "hybrid", label: "Plug-in hybrid", power: "292 л.с.", priceDelta: 12400 },
];

const TRANSMISSION_OPTIONS: TransmissionOption[] = [
  {
    id: "at-rwd",
    label: "АКПП · задний привод",
    note: "Комфортный дорожный режим",
    priceDelta: 0,
  },
  {
    id: "at-awd",
    label: "АКПП · полный привод",
    note: "Универсальная конфигурация",
    priceDelta: 5200,
  },
  {
    id: "sport-awd",
    label: "Sport AT · полный привод",
    note: "Более резкий отклик",
    priceDelta: 8400,
  },
];

const WHEEL_OPTIONS: WheelOption[] = [
  { id: "17-silver", label: "17 Aero Silver", size: '17"', priceDelta: 0 },
  { id: "18-black", label: "18 Aero Black", size: '18"', priceDelta: 2100 },
  { id: "19-performance", label: "19 Performance", size: '19"', priceDelta: 4200 },
];

const INTERIOR_OPTIONS: InteriorOption[] = [
  { id: "black", label: "Чёрный салон", priceDelta: 0 },
  { id: "beige", label: "Бежевый салон", priceDelta: 1500 },
  { id: "red", label: "Красный салон", priceDelta: 2200 },
];

const PAINT_OPTIONS: PaintOption[] = [
  { id: "emerald", label: "Изумрудный", color: "#0e8c7d", priceDelta: 0 },
  { id: "graphite", label: "Графит", color: "#5c6673", priceDelta: 1200 },
  { id: "white", label: "Перламутр", color: "#d9dde5", priceDelta: 1800 },
  { id: "red", label: "Бордовый", color: "#7f1f32", priceDelta: 2000 },
];

const CONFIG_DRAFT_KEY = "autoconfig_configurator_draft_v1";
const CONFIG_HISTORY_KEY = "autoconfig_configurator_history_v1";

function makeConfigurationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cfg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatPrice(v: number) {
  return new Intl.NumberFormat("ru-RU").format(v) + " р.";
}

function getBrandName(brands: Brand[], brandId: number | null) {
  return brands.find((item) => item.id === brandId)?.name ?? "Марка";
}

function getModelName(models: Model[], modelId: number | null) {
  return models.find((item) => item.id === modelId)?.name ?? "Модель";
}

export default function ConfiguratorPage() {
  const router = useRouter();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);

  const [brandId, setBrandId] = useState<number | null>(null);
  const [modelId, setModelId] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [bodyType, setBodyType] = useState<string>("");

  const [step, setStep] = useState<StepKey>("vehicle");

  const [engineId, setEngineId] = useState<string>(ENGINE_OPTIONS[0].id);
  const [transmissionId, setTransmissionId] = useState<string>(
    TRANSMISSION_OPTIONS[0].id
  );
  const [wheelId, setWheelId] = useState<WheelOption["id"]>(WHEEL_OPTIONS[0].id);
  const [paintId, setPaintId] = useState<string>(PAINT_OPTIONS[0].id);
  const [interiorId, setInteriorId] = useState<InteriorOption["id"]>(
    INTERIOR_OPTIONS[0].id
  );

  const [panorama, setPanorama] = useState<boolean>(true);
  const [assistPack, setAssistPack] = useState<boolean>(false);
  const [adaptiveLights, setAdaptiveLights] = useState<boolean>(true);

  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const [configurationId, setConfigurationId] = useState<string>(makeConfigurationId());
  const [configurationCartId, setConfigurationCartId] = useState<number>(Date.now());

  useEffect(() => {
    try {
      const editable = readEditableConfiguration();
      const rawDraft = window.localStorage.getItem(CONFIG_DRAFT_KEY);
      const fallbackDraft = rawDraft ? JSON.parse(rawDraft) : null;
      const source = editable ?? fallbackDraft;

      if (!source || typeof source !== "object") return;

      const data = source as Record<string, unknown>;

      if (typeof data.brandId === "number") setBrandId(data.brandId);
      if (typeof data.modelId === "number") setModelId(data.modelId);
      if (typeof data.year === "number") setYear(data.year);
      if (typeof data.bodyType === "string") setBodyType(data.bodyType);
      if (typeof data.engineId === "string") setEngineId(data.engineId);
      if (typeof data.transmissionId === "string") setTransmissionId(data.transmissionId);
      if (typeof data.wheelId === "string") setWheelId(data.wheelId as WheelOption["id"]);
      if (typeof data.paintId === "string") setPaintId(data.paintId);
      if (typeof data.interiorId === "string") {
        setInteriorId(data.interiorId as InteriorOption["id"]);
      }
      if (typeof data.panorama === "boolean") setPanorama(data.panorama);
      if (typeof data.assistPack === "boolean") setAssistPack(data.assistPack);
      if (typeof data.adaptiveLights === "boolean") setAdaptiveLights(data.adaptiveLights);
      if (typeof data.configurationId === "string") setConfigurationId(data.configurationId);
      if (typeof data.configurationCartId === "number") {
        setConfigurationCartId(data.configurationCartId);
      }

      clearEditableConfiguration();
      setStatusText("Конфигурация загружена для редактирования.");
      window.setTimeout(() => setStatusText(""), 2200);
    } catch {
      // ignore malformed draft
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBrandsData() {
      try {
        const data = await fetchBrands();
        if (cancelled) return;
        setBrands(Array.isArray(data) ? data : []);
        setBrandId((prev) => prev ?? data?.[0]?.id ?? null);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Не удалось загрузить марки автомобилей.");
        }
      }
    }

    void loadBrandsData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadModelsData() {
      if (!brandId) {
        setModels([]);
        setModelId(null);
        return;
      }

      try {
        const data = await fetchModelsByBrand(brandId);
        if (cancelled) return;
        setModels(Array.isArray(data) ? data : []);
        setModelId((prev) =>
          prev && data.some((item) => item.id === prev) ? prev : data?.[0]?.id ?? null
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Не удалось загрузить модели.");
        }
      }
    }

    void loadModelsData();

    return () => {
      cancelled = true;
    };
  }, [brandId]);

  useEffect(() => {
    let cancelled = false;

    async function loadYearsData() {
      if (!modelId) {
        setYears([]);
        setYear(null);
        return;
      }

      try {
        const data: YearsOut = await fetchYearsByModel(modelId);
        if (cancelled) return;
        const nextYears = Array.isArray(data?.years) ? data.years : [];
        setYears(nextYears);
        setYear((prev) =>
          prev && nextYears.includes(prev) ? prev : nextYears[0] ?? null
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Не удалось загрузить годы выпуска.");
        }
      }
    }

    void loadYearsData();

    return () => {
      cancelled = true;
    };
  }, [modelId]);

  useEffect(() => {
    let cancelled = false;

    async function loadBodyTypesData() {
      if (!modelId || !year) {
        setBodyTypes([]);
        setBodyType("");
        return;
      }

      try {
        const data: BodyTypesOut = await fetchBodyTypesByModelYear(modelId, year);
        if (cancelled) return;
        const nextBodyTypes = Array.isArray(data?.body_types) ? data.body_types : [];
        setBodyTypes(nextBodyTypes);
        setBodyType((prev) =>
          prev && nextBodyTypes.includes(prev) ? prev : nextBodyTypes[0] ?? ""
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Не удалось загрузить типы кузова.");
        }
      }
    }

    void loadBodyTypesData();

    return () => {
      cancelled = true;
    };
  }, [modelId, year]);

  const engine =
    ENGINE_OPTIONS.find((item) => item.id === engineId) ?? ENGINE_OPTIONS[0];
  const transmission =
    TRANSMISSION_OPTIONS.find((item) => item.id === transmissionId) ??
    TRANSMISSION_OPTIONS[0];
  const wheels =
    WHEEL_OPTIONS.find((item) => item.id === wheelId) ?? WHEEL_OPTIONS[0];
  const interior =
    INTERIOR_OPTIONS.find((item) => item.id === interiorId) ??
    INTERIOR_OPTIONS[0];
  const paint =
    PAINT_OPTIONS.find((item) => item.id === paintId) ?? PAINT_OPTIONS[0];

  const brandName = getBrandName(brands, brandId);
  const modelName = getModelName(models, modelId);

  const totalPrice = useMemo(() => {
    return (
      118000 +
      engine.priceDelta +
      transmission.priceDelta +
      wheels.priceDelta +
      paint.priceDelta +
      interior.priceDelta +
      (panorama ? 1800 : 0) +
      (assistPack ? 2600 : 0) +
      (adaptiveLights ? 1400 : 0)
    );
  }, [engine, transmission, wheels, paint, interior, panorama, assistPack, adaptiveLights]);

  const currentStepIndex = Math.max(
    0,
    STEPS.findIndex((item) => item.key === step)
  );

  const canGoNextFromVehicle = Boolean(brandId && modelId && year && bodyType);
  const canGoNext = step !== "vehicle" || canGoNextFromVehicle;

  const configSnapshot = {
    savedAt: new Date().toISOString(),
    configurationId,
    configurationCartId,
    brandId,
    modelId,
    year,
    bodyType,
    engineId,
    transmissionId,
    wheelId,
    paintId,
    interiorId,
    panorama,
    assistPack,
    adaptiveLights,
  };

  const showStatus = (text: string) => {
    setStatusText(text);
    window.setTimeout(() => setStatusText(""), 2000);
  };

  const saveConfiguration = () => {
    try {
      const raw = window.localStorage.getItem(CONFIG_HISTORY_KEY);
      const history = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(history) ? history : [];
      const next = [configSnapshot, ...list].slice(0, 12);

      window.localStorage.setItem(CONFIG_DRAFT_KEY, JSON.stringify(configSnapshot));
      window.localStorage.setItem(CONFIG_HISTORY_KEY, JSON.stringify(next));
      showStatus("Конфигурация сохранена.");
    } catch {
      showStatus("Не удалось сохранить конфигурацию.");
    }
  };

  const addConfigurationToCart = () => {
    addToCart({
      id: configurationCartId,
      title: `${brandName} ${modelName} ${year ?? ""}`.trim(),
      category: "Конфигурация",
      brand: brandName,
      price: totalPrice,
      condition: "new",
      originality: "oem",
      cross_brand: false,
      sourceType: "configuration",
      configurationId,
      configurationData: configSnapshot,
      vehicleContext: {
        brandId,
        modelId,
        year,
        bodyType,
      },
    });

    showStatus("Конфигурация добавлена в корзину.");
  };

  const exportConfiguration = () => {
    const lines = [
      "AutoConfig PRO",
      `Марка: ${brandName}`,
      `Модель: ${modelName}`,
      `Год: ${year ?? "—"}`,
      `Кузов: ${bodyType || "—"}`,
      `Двигатель: ${engine.label}`,
      `Трансмиссия: ${transmission.label}`,
      `Колёса: ${wheels.label}`,
      `Цвет кузова: ${paint.label}`,
      `Салон: ${interior.label}`,
      `Панорама: ${panorama ? "да" : "нет"}`,
      `Ассистенты: ${assistPack ? "да" : "нет"}`,
      `Адаптивный свет: ${adaptiveLights ? "да" : "нет"}`,
      `Итог: ${formatPrice(totalPrice)}`,
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `autoconfig-${brandName}-${modelName}-${year ?? "draft"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const goToCatalog = () => {
    const sp = new URLSearchParams();
    if (brandId) sp.set("brand_id", String(brandId));
    if (modelId) sp.set("model_id", String(modelId));
    if (year) sp.set("year", String(year));
    if (bodyType) sp.set("body_type", bodyType);
    router.push(`/catalog?${sp.toString()}`);
  };

  const goNext = () => {
    if (step === "vehicle" && !canGoNextFromVehicle) return;
    const nextStep = STEPS[currentStepIndex + 1];
    if (nextStep) setStep(nextStep.key);
  };

  const goPrev = () => {
    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep) setStep(prevStep.key);
  };

  const renderVehiclePanel = () => (
    <>
      <div className={styles.panelTitle}>01 • ВЫБОР АВТОМОБИЛЯ</div>

      <label className={styles.field}>
        <span>Марка</span>
        <select
          className={styles.select}
          value={brandId ?? ""}
          onChange={(e) => setBrandId(Number(e.target.value))}
        >
          {brands.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Модель</span>
        <select
          className={styles.select}
          value={modelId ?? ""}
          onChange={(e) => setModelId(Number(e.target.value))}
          disabled={!models.length}
        >
          {models.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Год выпуска</span>
        <select
          className={styles.select}
          value={year ?? ""}
          onChange={(e) => setYear(Number(e.target.value))}
          disabled={!years.length}
        >
          {years.map((yearValue) => (
            <option key={yearValue} value={yearValue}>
              {yearValue}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Тип кузова</span>
        <select
          className={styles.select}
          value={bodyType}
          onChange={(e) => setBodyType(e.target.value)}
          disabled={!bodyTypes.length}
        >
          {bodyTypes.map((bodyTypeValue) => (
            <option key={bodyTypeValue} value={bodyTypeValue}>
              {bodyTypeValue}
            </option>
          ))}
        </select>
      </label>
    </>
  );

  const renderEnginePanel = () => (
    <>
      <div className={styles.panelTitle}>02 • ДВИГАТЕЛЬ</div>
      <div className={styles.choiceList}>
        {ENGINE_OPTIONS.map((engineOption) => (
          <button
            key={engineOption.id}
            type="button"
            className={`${styles.choiceCard} ${
              engineId === engineOption.id ? styles.choiceCardActive : ""
            }`}
            onClick={() => setEngineId(engineOption.id)}
          >
            <div className={styles.choiceTitle}>{engineOption.label}</div>
            <div className={styles.choiceMeta}>{engineOption.power}</div>
            <div className={styles.choicePrice}>
              {engineOption.priceDelta
                ? `+ ${formatPrice(engineOption.priceDelta)}`
                : "В базе"}
            </div>
          </button>
        ))}
      </div>
    </>
  );

  const renderTransmissionPanel = () => (
    <>
      <div className={styles.panelTitle}>03 • ТРАНСМИССИЯ</div>
      <div className={styles.choiceList}>
        {TRANSMISSION_OPTIONS.map((transmissionOption) => (
          <button
            key={transmissionOption.id}
            type="button"
            className={`${styles.choiceCard} ${
              transmissionId === transmissionOption.id ? styles.choiceCardActive : ""
            }`}
            onClick={() => setTransmissionId(transmissionOption.id)}
          >
            <div className={styles.choiceTitle}>{transmissionOption.label}</div>
            <div className={styles.choiceMeta}>{transmissionOption.note}</div>
            <div className={styles.choicePrice}>
              {transmissionOption.priceDelta
                ? `+ ${formatPrice(transmissionOption.priceDelta)}`
                : "В базе"}
            </div>
          </button>
        ))}
      </div>
    </>
  );

  const renderWheelsPanel = () => (
    <>
      <div className={styles.panelTitle}>04 • КОЛЕСА</div>

      <div className={styles.sectionLabel}>Диски</div>
      <div className={styles.choiceList}>
        {WHEEL_OPTIONS.map((wheelOption) => (
          <button
            key={wheelOption.id}
            type="button"
            className={`${styles.choiceCard} ${
              wheelId === wheelOption.id ? styles.choiceCardActive : ""
            }`}
            onClick={() => setWheelId(wheelOption.id)}
          >
            <div className={styles.choiceTitle}>{wheelOption.label}</div>
            <div className={styles.choiceMeta}>Размер: {wheelOption.size}</div>
            <div className={styles.choicePrice}>
              {wheelOption.priceDelta
                ? `+ ${formatPrice(wheelOption.priceDelta)}`
                : "В базе"}
            </div>
          </button>
        ))}
      </div>

      <div className={styles.sectionLabel}>Цвет кузова</div>
      <div className={styles.paintList}>
        {PAINT_OPTIONS.map((paintOption) => (
          <button
            key={paintOption.id}
            type="button"
            className={`${styles.paintButton} ${
              paintId === paintOption.id ? styles.paintButtonActive : ""
            }`}
            onClick={() => setPaintId(paintOption.id)}
          >
            <span
              className={styles.paintDot}
              style={{ background: paintOption.color }}
            />
            <span>{paintOption.label}</span>
          </button>
        ))}
      </div>
    </>
  );

  const renderInteriorPanel = () => (
    <>
      <div className={styles.panelTitle}>05 • ОПЦИИ</div>

      <div className={styles.sectionLabel}>Салон</div>
      <div className={styles.choiceList}>
        {INTERIOR_OPTIONS.map((interiorOption) => (
          <button
            key={interiorOption.id}
            type="button"
            className={`${styles.choiceCard} ${
              interiorId === interiorOption.id ? styles.choiceCardActive : ""
            }`}
            onClick={() => setInteriorId(interiorOption.id)}
          >
            <div className={styles.choiceTitle}>{interiorOption.label}</div>
            <div className={styles.choicePrice}>
              {interiorOption.priceDelta
                ? `+ ${formatPrice(interiorOption.priceDelta)}`
                : "В базе"}
            </div>
          </button>
        ))}
      </div>

      <div className={styles.toggles}>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={panorama}
            onChange={(e) => setPanorama(e.target.checked)}
          />
          Панорамная крыша
        </label>

        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={assistPack}
            onChange={(e) => setAssistPack(e.target.checked)}
          />
          Пакет ассистентов
        </label>

        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={adaptiveLights}
            onChange={(e) => setAdaptiveLights(e.target.checked)}
          />
          Адаптивный свет
        </label>
      </div>
    </>
  );

  const renderStepPanel = () => {
    if (step === "vehicle") return renderVehiclePanel();
    if (step === "engine") return renderEnginePanel();
    if (step === "transmission") return renderTransmissionPanel();
    if (step === "wheels") return renderWheelsPanel();
    return renderInteriorPanel();
  };

  return (
    <main className={styles.page}>
      <MainNav active="configurator" />

      <div className={styles.shell}>
        {error ? <div className={styles.errorBox}>{error}</div> : null}

        <section className={styles.configuratorFrame}>
          <div className={styles.stepsRow}>
            {STEPS.map((stepItem, stepIndex) => {
              const isActive = stepItem.key === step;
              const isPassed = stepIndex < currentStepIndex;

              return (
                <button
                  key={stepItem.key}
                  type="button"
                  className={styles.stepButton}
                  onClick={() => setStep(stepItem.key)}
                >
                  <span
                    className={`${styles.stepCircle} ${
                      isActive ? styles.stepCircleActive : ""
                    } ${isPassed ? styles.stepCirclePassed : ""}`}
                  >
                    {stepIndex + 1}
                  </span>
                  <span
                    className={`${styles.stepLabel} ${
                      isActive ? styles.stepLabelActive : ""
                    }`}
                  >
                    {stepItem.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.mainRow}>
            <section className={styles.sceneColumn}>
              <div className={styles.vehicleTop}>
                <div>
                  <div className={styles.brandTitle}>{brandName}</div>
                  <div className={styles.modelLine}>
                    {modelName} • {year ?? "—"} • {bodyType || "—"}
                  </div>
                </div>

                <div className={styles.sceneHint}>
                  ЛКМ — вращение, колесо — масштаб
                </div>
              </div>

              <div className={styles.viewerCard}>
                <div className={styles.viewerWrap}>
                  <Car3DScene
                    paintColor={paint.color}
                    wheelPreset={wheelId}
                    interiorTone={interiorId}
                    headlightsOn={adaptiveLights}
                    panorama={panorama}
                    assistPack={assistPack}
                    brandName={brandName}
                    modelName={modelName}
                    bodyType={bodyType}
                  />
                </div>
              </div>
            </section>

            <aside className={styles.optionsColumn}>
              <div className={styles.optionsScroll}>
                {renderStepPanel()}

                <div className={styles.panelNav}>
                  <button
                    type="button"
                    className={styles.panelNavGhost}
                    onClick={goPrev}
                    disabled={currentStepIndex === 0}
                  >
                    Назад
                  </button>

                  <button
                    type="button"
                    className={styles.panelNavPrimary}
                    onClick={goNext}
                    disabled={currentStepIndex === STEPS.length - 1 || !canGoNext}
                  >
                    Далее
                  </button>
                </div>
              </div>
            </aside>
          </div>

          <div className={styles.bottomBar}>
            <div className={styles.priceBlock}>
              <span>Текущая конфигурация</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>

            <div className={styles.actionsGrid}>
              <button
                type="button"
                className={styles.actionGhost}
                onClick={saveConfiguration}
              >
                Сохранить конфигурацию
              </button>

              <button
                type="button"
                className={styles.actionGhost}
                onClick={exportConfiguration}
              >
                Экспорт TXT
              </button>

              <button
                type="button"
                className={styles.actionGhost}
                onClick={addConfigurationToCart}
              >
                Добавить в корзину
              </button>

              <button
                type="button"
                className={styles.actionGhost}
                onClick={() => {
                  addConfigurationToCart();
                  router.push("/cart");
                }}
              >
                Купить
              </button>
            </div>
          </div>

          <div className={styles.catalogRow}>
            <button
              type="button"
              className={styles.catalogButton}
              onClick={goToCatalog}
            >
              Подобрать запчасти
            </button>
          </div>

          {statusText ? <div className={styles.statusText}>{statusText}</div> : null}
        </section>
      </div>
    </main>
  );
}