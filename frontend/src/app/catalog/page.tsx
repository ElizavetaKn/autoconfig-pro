"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchBodyTypesByModelYear,
  fetchBrands,
  fetchCategories,
  fetchModelsByBrand,
  fetchParts,
  fetchYearsByModel,
  type BodyTypesOut,
  type Brand,
  type Model,
  type YearsOut,
} from "@/lib/api";
import { MainNav } from "@/components/ui/MainNav";
import styles from "./catalog.module.css";

type PartFitment = {
  model_id?: number | null;
  year_from?: number | null;
  year_to?: number | null;
  body_type?: string | null;
};

type CatalogPart = {
  id: number;
  title: string;
  category: string;
  price: number;
  brand: string;
  condition: string;
  originality: string;
  cross_brand?: boolean;
  crossBrand?: boolean;
  image?: string;
  image_url?: string;
  fitments?: PartFitment[];
};

type CategoryLike =
  | string
  | {
      id?: number;
      name?: string;
      title?: string;
      slug?: string;
    };

type StoredDefaultVehicle = {
  brandId?: number | null;
  modelId?: number | null;
  year?: number | null;
  bodyType?: string;
};

type CatalogFiltersState = {
  brandId: number | null;
  modelId: number | null;
  year: number | null;
  bodyType: string;
  query: string;
  priceFrom: string;
  priceTo: string;
  conditionFilter: string;
  originalityFilter: string;
  crossBrandOnly: boolean;
};

const CATALOG_FILTERS_SESSION_KEY = "autoconfig_catalog_filters_v1";
const CATALOG_FILTER_KEYS = [
  "brand_id",
  "model_id",
  "year",
  "body_type",
  "q",
  "price_from",
  "price_to",
  "condition",
  "originality",
  "cross_brand",
];

function hasCatalogFilterParams(searchParams: { get: (key: string) => string | null }) {
  return CATALOG_FILTER_KEYS.some((key) => Boolean(searchParams.get(key)));
}

function emptyCatalogFilters(): CatalogFiltersState {
  return {
    brandId: null,
    modelId: null,
    year: null,
    bodyType: "",
    query: "",
    priceFrom: "",
    priceTo: "",
    conditionFilter: "all",
    originalityFilter: "all",
    crossBrandOnly: false,
  };
}

function readStoredCatalogFilters(): CatalogFiltersState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(CATALOG_FILTERS_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CatalogFiltersState>;

    return {
      brandId: typeof parsed.brandId === "number" ? parsed.brandId : null,
      modelId: typeof parsed.modelId === "number" ? parsed.modelId : null,
      year: typeof parsed.year === "number" ? parsed.year : null,
      bodyType: typeof parsed.bodyType === "string" ? parsed.bodyType : "",
      query: typeof parsed.query === "string" ? parsed.query : "",
      priceFrom: typeof parsed.priceFrom === "string" ? parsed.priceFrom : "",
      priceTo: typeof parsed.priceTo === "string" ? parsed.priceTo : "",
      conditionFilter:
        typeof parsed.conditionFilter === "string" && parsed.conditionFilter
          ? parsed.conditionFilter
          : "all",
      originalityFilter:
        typeof parsed.originalityFilter === "string" && parsed.originalityFilter
          ? parsed.originalityFilter
          : "all",
      crossBrandOnly: Boolean(parsed.crossBrandOnly),
    };
  } catch {
    return null;
  }
}

function readInitialCatalogFilters(
  searchParams: { get: (key: string) => string | null }
): CatalogFiltersState {
  if (!hasCatalogFilterParams(searchParams)) {
    return readStoredCatalogFilters() ?? emptyCatalogFilters();
  }

  return {
    brandId: readNumber(searchParams.get("brand_id")),
    modelId: readNumber(searchParams.get("model_id")),
    year: readNumber(searchParams.get("year")),
    bodyType: searchParams.get("body_type") || "",
    query: searchParams.get("q") || "",
    priceFrom: searchParams.get("price_from") || "",
    priceTo: searchParams.get("price_to") || "",
    conditionFilter: searchParams.get("condition") || "all",
    originalityFilter: searchParams.get("originality") || "all",
    crossBrandOnly: searchParams.get("cross_brand") === "1",
  };
}

function saveCatalogFiltersToSession(filters: CatalogFiltersState) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(CATALOG_FILTERS_SESSION_KEY, JSON.stringify(filters));
}

const CATEGORY_RU: Record<string, string> = {
  body: "Кузов",
  brakes: "Тормоза",
  consumables: "Расходники",
  cooling: "Система охлаждения",
  electrics: "Электрика",
  engine: "Двигатель",
  lighting: "Освещение",
  steering: "Рулевое управление",
  suspension: "Ходовая часть",
  transmission: "Трансмиссия",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

function readNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCategoryLabel(item: CategoryLike) {
  if (typeof item === "string") return item;
  return item.title || item.name || item.slug || "Категория";
}

function translateCategory(value: string) {
  const key = value.trim().toLowerCase();
  return CATEGORY_RU[key] || value;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " р.";
}

function getPartImage(part: CatalogPart) {
  return part.image || part.image_url || "";
}

function getCrossBrand(part: CatalogPart) {
  return Boolean(part.cross_brand ?? part.crossBrand);
}

function formatCondition(value: string) {
  if (value === "new") return "Новая";
  if (value === "used") return "Б/у";
  return value || "—";
}

function formatOriginality(value: string) {
  if (value === "oem") return "Оригинал";
  if (value === "analog") return "Аналог";
  return value || "—";
}

function matchesVehicle(
  part: CatalogPart,
  params: {
    modelId: number | null;
    year: number | null;
    bodyType: string;
  }
) {
  const { modelId, year, bodyType } = params;

  if (!modelId && !year && !bodyType) {
    return true;
  }

  if (!Array.isArray(part.fitments) || part.fitments.length === 0) {
    return true;
  }

  return part.fitments.some((fitment) => {
    if (modelId && fitment.model_id && fitment.model_id !== modelId) return false;

    if (year) {
      const from = fitment.year_from ?? year;
      const to = fitment.year_to ?? year;
      if (year < from || year > to) return false;
    }

    if (bodyType && fitment.body_type && fitment.body_type !== bodyType) return false;

    return true;
  });
}

function encodeSvg(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function categoryImagePath(category: string) {
  const key = category.trim().toLowerCase();
  return `/images/categories/${key}.png`;
}

function categoryIllustration(category: string) {
  const key = category.trim().toLowerCase();

  const bodySvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180">
    <defs>
      <filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#00fff0" flood-opacity="0.18"/></filter>
    </defs>
    <rect width="340" height="180" fill="none"/>
    <ellipse cx="170" cy="140" rx="78" ry="14" fill="rgba(0,255,234,0.12)"/>
    <g filter="url(#shadow)">
      <path d="M82 104c10-26 37-44 72-44h42c37 0 63 18 82 46l7 10H70l12-12Z" fill="#0c1820" stroke="rgba(25,229,223,0.34)" stroke-width="2"/>
      <path d="M113 101h110" stroke="rgba(25,229,223,0.18)" stroke-width="2"/>
      <circle cx="116" cy="120" r="16" fill="#09141a" stroke="rgba(25,229,223,0.35)" stroke-width="2"/>
      <circle cx="236" cy="120" r="16" fill="#09141a" stroke="rgba(25,229,223,0.35)" stroke-width="2"/>
    </g>
  </svg>`;

  const brakesSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180">
    <defs><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#00fff0" flood-opacity="0.18"/></filter></defs>
    <rect width="340" height="180" fill="none"/>
    <ellipse cx="170" cy="142" rx="62" ry="12" fill="rgba(0,255,234,0.12)"/>
    <g filter="url(#shadow)">
      <circle cx="152" cy="98" r="34" fill="#0b1720" stroke="rgba(25,229,223,0.34)" stroke-width="2"/>
      <circle cx="152" cy="98" r="10" fill="#081218" stroke="rgba(25,229,223,0.18)" stroke-width="2"/>
      <rect x="178" y="78" width="34" height="44" rx="8" fill="#0c1820" stroke="rgba(25,229,223,0.28)" stroke-width="2"/>
    </g>
  </svg>`;

  const consumablesSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180">
    <defs><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#00fff0" flood-opacity="0.18"/></filter></defs>
    <rect width="340" height="180" fill="none"/>
    <ellipse cx="170" cy="142" rx="68" ry="12" fill="rgba(0,255,234,0.12)"/>
    <g filter="url(#shadow)">
      <rect x="130" y="56" width="80" height="72" rx="14" fill="#0c1820" stroke="rgba(25,229,223,0.34)" stroke-width="2"/>
      <rect x="146" y="44" width="48" height="20" rx="8" fill="#0e1b23" stroke="rgba(25,229,223,0.22)" stroke-width="2"/>
      <path d="M150 92h40M150 104h40" stroke="rgba(25,229,223,0.20)" stroke-width="2"/>
    </g>
  </svg>`;

  const coolingSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180">
    <defs><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#00fff0" flood-opacity="0.18"/></filter></defs>
    <rect width="340" height="180" fill="none"/>
    <ellipse cx="170" cy="142" rx="70" ry="12" fill="rgba(0,255,234,0.12)"/>
    <g filter="url(#shadow)">
      <rect x="118" y="62" width="104" height="70" rx="10" fill="#0c1820" stroke="rgba(25,229,223,0.34)" stroke-width="2"/>
      <circle cx="170" cy="97" r="22" fill="#081218" stroke="rgba(25,229,223,0.24)" stroke-width="2"/>
      <path d="M170 75v44M148 97h44M155 82l30 30M185 82l-30 30" stroke="rgba(25,229,223,0.22)" stroke-width="2"/>
    </g>
  </svg>`;

  const electricsSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180">
    <defs><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#00fff0" flood-opacity="0.18"/></filter></defs>
    <rect width="340" height="180" fill="none"/>
    <ellipse cx="170" cy="142" rx="62" ry="12" fill="rgba(0,255,234,0.12)"/>
    <g filter="url(#shadow)">
      <rect x="132" y="60" width="76" height="68" rx="12" fill="#0c1820" stroke="rgba(25,229,223,0.34)" stroke-width="2"/>
      <path d="M165 74l-12 22h14l-10 20 29-28h-14l9-14Z" fill="rgba(25,229,223,0.82)"/>
    </g>
  </svg>`;

  const engineSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180">
    <defs><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#00fff0" flood-opacity="0.18"/></filter></defs>
    <rect width="340" height="180" fill="none"/>
    <ellipse cx="170" cy="142" rx="76" ry="14" fill="rgba(0,255,234,0.12)"/>
    <g filter="url(#shadow)">
      <path d="M110 76h96l18 14v28l-16 12h-96l-12-12V88l10-12Z" fill="#0c1820" stroke="rgba(25,229,223,0.34)" stroke-width="2"/>
      <rect x="128" y="58" width="58" height="18" rx="7" fill="#0e1b23" stroke="rgba(25,229,223,0.20)" stroke-width="2"/>
      <circle cx="132" cy="118" r="10" fill="#081218" stroke="rgba(25,229,223,0.22)" stroke-width="2"/>
      <circle cx="208" cy="118" r="10" fill="#081218" stroke="rgba(25,229,223,0.22)" stroke-width="2"/>
    </g>
  </svg>`;

  const lightingSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180">
    <defs><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#00fff0" flood-opacity="0.18"/></filter></defs>
    <rect width="340" height="180" fill="none"/>
    <ellipse cx="170" cy="142" rx="78" ry="12" fill="rgba(0,255,234,0.12)"/>
    <g filter="url(#shadow)">
      <path d="M104 96c20-28 60-42 120-30l18 8c-10 28-40 48-90 54H106c-8 0-12-8-10-16l8-16Z"
            fill="#0c1820" stroke="rgba(25,229,223,0.34)" stroke-width="2"/>
      <circle cx="168" cy="96" r="18" fill="#081218" stroke="rgba(25,229,223,0.26)" stroke-width="2"/>
      <circle cx="168" cy="96" r="8" fill="rgba(25,229,223,0.35)"/>
    </g>
  </svg>`;

  const steeringSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180">
    <defs><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#00fff0" flood-opacity="0.18"/></filter></defs>
    <rect width="340" height="180" fill="none"/>
    <ellipse cx="170" cy="142" rx="64" ry="12" fill="rgba(0,255,234,0.12)"/>
    <g filter="url(#shadow)">
      <circle cx="170" cy="94" r="32" fill="#0b1720" stroke="rgba(25,229,223,0.34)" stroke-width="2"/>
      <circle cx="170" cy="94" r="10" fill="#081218" stroke="rgba(25,229,223,0.22)" stroke-width="2"/>
      <path d="M170 94l20-18M170 94l-20-18M170 94v20" stroke="rgba(25,229,223,0.22)" stroke-width="2"/>
    </g>
  </svg>`;

  const suspensionSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180">
    <defs><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#00fff0" flood-opacity="0.18"/></filter></defs>
    <rect width="340" height="180" fill="none"/>
    <ellipse cx="170" cy="142" rx="60" ry="12" fill="rgba(0,255,234,0.12)"/>
    <g filter="url(#shadow)">
      <path d="M150 56l16 12v48l-16 12-8-8 10-10V66l-10-10 8-8Zm40 0-16 12v48l16 12 8-8-10-10V66l10-10-8-8Z"
            fill="#0c1820" stroke="rgba(25,229,223,0.22)" stroke-width="2"/>
      <path d="M160 64l20 56" stroke="rgba(25,229,223,0.34)" stroke-width="3"/>
      <path d="M150 82h40M150 96h40M150 110h40" stroke="rgba(25,229,223,0.22)" stroke-width="2"/>
    </g>
  </svg>`;

  const transmissionSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180">
    <defs><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#00fff0" flood-opacity="0.18"/></filter></defs>
    <rect width="340" height="180" fill="none"/>
    <ellipse cx="170" cy="142" rx="78" ry="12" fill="rgba(0,255,234,0.12)"/>
    <g filter="url(#shadow)">
      <path d="M110 96l26-26h62l24 24v26l-22 20h-68l-22-18V96Z"
            fill="#0c1820" stroke="rgba(25,229,223,0.34)" stroke-width="2"/>
      <rect x="222" y="94" width="26" height="20" rx="8" fill="#0e1b23" stroke="rgba(25,229,223,0.20)" stroke-width="2"/>
      <circle cx="148" cy="106" r="10" fill="#081218" stroke="rgba(25,229,223,0.22)" stroke-width="2"/>
    </g>
  </svg>`;

  const map: Record<string, string> = {
    body: bodySvg,
    brakes: brakesSvg,
    consumables: consumablesSvg,
    cooling: coolingSvg,
    electrics: electricsSvg,
    engine: engineSvg,
    lighting: lightingSvg,
    steering: steeringSvg,
    suspension: suspensionSvg,
    transmission: transmissionSvg,
  };

  return encodeSvg(map[key] || bodySvg);
}

function makePartPreview(part: CatalogPart) {
  return categoryIllustration(part.category);
}

function readProfileVehicle() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem("autoconfig_default_vehicle_v1");
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      brandId?: number | null;
      modelId?: number | null;
      year?: number | null;
      bodyType?: string;
    };

    const brandId = typeof parsed.brandId === "number" ? parsed.brandId : null;
    const modelId = typeof parsed.modelId === "number" ? parsed.modelId : null;
    const year = typeof parsed.year === "number" ? parsed.year : null;
    const bodyType = typeof parsed.bodyType === "string" ? parsed.bodyType : "";

    if (!brandId && !modelId && !year && !bodyType) {
      return null;
    }

    return { brandId, modelId, year, bodyType };
  } catch {
    return null;
  }
}

function CategoryPreview({
  category,
  alt,
}: {
  category: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  const pngPath = categoryImagePath(category);
  const fallbackSvg = categoryIllustration(category);

  return (
    <img
      src={failed ? fallbackSvg : pngPath}
      alt={alt}
      className={styles.categoryImage}
      onError={() => setFailed(true)}
    />
  );
}

function PartPreview({
  part,
}: {
  part: CatalogPart;
}) {
  const [failed, setFailed] = useState(false);
  const image = getPartImage(part);

  if (!image || failed) {
    return (
      <img
        src={makePartPreview(part)}
        alt={part.title}
        className={styles.partImage}
      />
    );
  }

  return (
    <img
      src={image}
      alt={part.title}
      className={styles.partImage}
      onError={() => setFailed(true)}
    />
  );
}

export default function CatalogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilters = readInitialCatalogFilters(searchParams);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [parts, setParts] = useState<CatalogPart[]>([]);

  const [brandId, setBrandId] = useState<number | null>(initialFilters.brandId);
  const [modelId, setModelId] = useState<number | null>(initialFilters.modelId);
  const [year, setYear] = useState<number | null>(initialFilters.year);
  const [bodyType, setBodyType] = useState<string>(initialFilters.bodyType);

  const [query, setQuery] = useState<string>(initialFilters.query);
  const [priceFrom, setPriceFrom] = useState<string>(initialFilters.priceFrom);
  const [priceTo, setPriceTo] = useState<string>(initialFilters.priceTo);
  const [conditionFilter, setConditionFilter] = useState<string>(
    initialFilters.conditionFilter
  );
  const [originalityFilter, setOriginalityFilter] = useState<string>(
    initialFilters.originalityFilter
  );
  const [crossBrandOnly, setCrossBrandOnly] = useState<boolean>(
    initialFilters.crossBrandOnly
  );
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const didApplyDefaultVehicle = useRef(false);
  const [pendingDefaultVehicle, setPendingDefaultVehicle] =
    useState<StoredDefaultVehicle | null>(null);

  useEffect(() => {
    if (didApplyDefaultVehicle.current) return;

    const hasVehicleFilters =
      !!searchParams.get("brand_id") ||
      !!searchParams.get("model_id") ||
      !!searchParams.get("year") ||
      !!searchParams.get("body_type");

    if (hasVehicleFilters) {
      didApplyDefaultVehicle.current = true;
      return;
    }

    const vehicle = readProfileVehicle();
    if (!vehicle) {
      didApplyDefaultVehicle.current = true;
      return;
    }

    setPendingDefaultVehicle(vehicle);
    if (vehicle.brandId) {
      setBrandId(vehicle.brandId);
    }

    didApplyDefaultVehicle.current = true;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const [brandsData, categoriesData, partsResponse] = await Promise.all([
          fetchBrands(),
          fetchCategories(),
          fetchParts({}),
        ]);

        if (cancelled) return;

        setBrands(Array.isArray(brandsData) ? brandsData : []);
        setCategories(
          Array.isArray(categoriesData)
            ? categoriesData.map((item) => normalizeCategoryLabel(item as CategoryLike))
            : []
        );
        setParts(Array.isArray(partsResponse?.items) ? partsResponse.items : []);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Не удалось загрузить каталог.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitial();

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
        setYears([]);
        setYear(null);
        setBodyTypes([]);
        setBodyType("");
        return;
      }

      try {
        const data = await fetchModelsByBrand(brandId);
        if (cancelled) return;
        setModels(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Не удалось загрузить модели.");
      }
    }

    void loadModelsData();

    return () => {
      cancelled = true;
    };
  }, [brandId]);

  useEffect(() => {
    if (!pendingDefaultVehicle?.modelId) return;
    if (!brandId || pendingDefaultVehicle.brandId !== brandId) return;
    if (!models.length) return;
    if (modelId === pendingDefaultVehicle.modelId) return;

    const exists = models.some((item) => item.id === pendingDefaultVehicle.modelId);
    if (exists) {
      setModelId(pendingDefaultVehicle.modelId);
    }
  }, [pendingDefaultVehicle, brandId, models, modelId]);

  useEffect(() => {
    let cancelled = false;

    async function loadYearsData() {
      if (!modelId) {
        setYears([]);
        setYear(null);
        setBodyTypes([]);
        setBodyType("");
        return;
      }

      try {
        const data: YearsOut = await fetchYearsByModel(modelId);
        if (cancelled) return;

        const nextYears = Array.isArray(data?.years) ? data.years : [];
        setYears(nextYears);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Не удалось загрузить годы выпуска.");
      }
    }

    void loadYearsData();

    return () => {
      cancelled = true;
    };
  }, [modelId]);

  useEffect(() => {
    if (!pendingDefaultVehicle?.year) return;
    if (!modelId || pendingDefaultVehicle.modelId !== modelId) return;
    if (!years.length) return;
    if (year === pendingDefaultVehicle.year) return;

    const exists = years.includes(pendingDefaultVehicle.year);
    if (exists) {
      setYear(pendingDefaultVehicle.year);
    }
  }, [pendingDefaultVehicle, modelId, years, year]);

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
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Не удалось загрузить типы кузова.");
      }
    }

    void loadBodyTypesData();

    return () => {
      cancelled = true;
    };
  }, [modelId, year]);

  useEffect(() => {
    if (!pendingDefaultVehicle?.bodyType) return;
    if (!modelId || !year) return;
    if (pendingDefaultVehicle.modelId !== modelId) return;
    if (pendingDefaultVehicle.year !== year) return;
    if (!bodyTypes.length) return;
    if (bodyType === pendingDefaultVehicle.bodyType) return;

    const exists = bodyTypes.includes(pendingDefaultVehicle.bodyType);
    if (exists) {
      setBodyType(pendingDefaultVehicle.bodyType);
      setPendingDefaultVehicle(null);
    }
  }, [pendingDefaultVehicle, modelId, year, bodyTypes, bodyType]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (brandId) params.set("brand_id", String(brandId));
    if (modelId) params.set("model_id", String(modelId));
    if (year) params.set("year", String(year));
    if (bodyType) params.set("body_type", bodyType);
    if (query.trim()) params.set("q", query.trim());
    if (priceFrom.trim()) params.set("price_from", priceFrom.trim());
    if (priceTo.trim()) params.set("price_to", priceTo.trim());
    if (conditionFilter !== "all") params.set("condition", conditionFilter);
    if (originalityFilter !== "all") params.set("originality", originalityFilter);
    if (crossBrandOnly) params.set("cross_brand", "1");

    saveCatalogFiltersToSession({
      brandId,
      modelId,
      year,
      bodyType,
      query,
      priceFrom,
      priceTo,
      conditionFilter,
      originalityFilter,
      crossBrandOnly,
    });

    const qs = params.toString();
    router.replace(qs ? `/catalog?${qs}` : "/catalog", { scroll: false });
  }, [
    router,
    brandId,
    modelId,
    year,
    bodyType,
    query,
    priceFrom,
    priceTo,
    conditionFilter,
    originalityFilter,
    crossBrandOnly,
  ]);

  const activeVehicleText = useMemo(() => {
    const brandName = brands.find((item) => item.id === brandId)?.name || "Марка не выбрана";
    const modelName = models.find((item) => item.id === modelId)?.name || "модель не выбрана";

    if (!brandId && !modelId && !year && !bodyType) {
      return "Каталог доступен без выбора автомобиля";
    }

    return `${brandName} · ${modelName}${year ? ` · ${year}` : ""}${bodyType ? ` · ${bodyType}` : ""}`;
  }, [brands, models, brandId, modelId, year, bodyType]);

  const filteredParts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromValue = priceFrom.trim() ? Number(priceFrom) : null;
    const toValue = priceTo.trim() ? Number(priceTo) : null;

    return parts.filter((part) => {
      if (!matchesVehicle(part, { modelId, year, bodyType })) {
        return false;
      }

      if (q) {
        const haystack = `${part.title} ${part.category} ${part.brand}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (conditionFilter !== "all" && part.condition !== conditionFilter) return false;
      if (originalityFilter !== "all" && part.originality !== originalityFilter) return false;
      if (crossBrandOnly && !getCrossBrand(part)) return false;

      if (fromValue !== null && Number.isFinite(fromValue) && part.price < fromValue) return false;
      if (toValue !== null && Number.isFinite(toValue) && part.price > toValue) return false;

      return true;
    });
  }, [
    parts,
    query,
    conditionFilter,
    originalityFilter,
    crossBrandOnly,
    priceFrom,
    priceTo,
    modelId,
    year,
    bodyType,
  ]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();

    for (const part of filteredParts) {
      map.set(part.category, (map.get(part.category) || 0) + 1);
    }

    return map;
  }, [filteredParts]);

  const currentQueryString = useMemo(() => {
    const params = new URLSearchParams();

    if (brandId) params.set("brand_id", String(brandId));
    if (modelId) params.set("model_id", String(modelId));
    if (year) params.set("year", String(year));
    if (bodyType) params.set("body_type", bodyType);
    if (query.trim()) params.set("q", query.trim());
    if (priceFrom.trim()) params.set("price_from", priceFrom.trim());
    if (priceTo.trim()) params.set("price_to", priceTo.trim());
    if (conditionFilter !== "all") params.set("condition", conditionFilter);
    if (originalityFilter !== "all") params.set("originality", originalityFilter);
    if (crossBrandOnly) params.set("cross_brand", "1");

    return params.toString();
  }, [
    brandId,
    modelId,
    year,
    bodyType,
    query,
    priceFrom,
    priceTo,
    conditionFilter,
    originalityFilter,
    crossBrandOnly,
  ]);

  const activeFilterBadges = useMemo(() => {
    const badges: string[] = [];

    if (query.trim()) badges.push(`Поиск: ${query.trim()}`);
    if (priceFrom.trim()) badges.push(`Цена от ${priceFrom.trim()}`);
    if (priceTo.trim()) badges.push(`Цена до ${priceTo.trim()}`);
    if (conditionFilter !== "all") badges.push(`Состояние: ${formatCondition(conditionFilter)}`);
    if (originalityFilter !== "all") {
      badges.push(`Тип: ${formatOriginality(originalityFilter)}`);
    }
    if (crossBrandOnly) badges.push("Только кросс-бренд");

    return badges;
  }, [query, priceFrom, priceTo, conditionFilter, originalityFilter, crossBrandOnly]);

  const resetVehicle = () => {
    setPendingDefaultVehicle(null);
    setBrandId(null);
    setModelId(null);
    setYear(null);
    setBodyType("");
    setModels([]);
    setYears([]);
    setBodyTypes([]);
  };

  const resetPartFilters = () => {
    setQuery("");
    setPriceFrom("");
    setPriceTo("");
    setConditionFilter("all");
    setOriginalityFilter("all");
    setCrossBrandOnly(false);
  };

  return (
    <main className={styles.page}>
      <MainNav active="catalog" />

      <div className={styles.shell}>
        <div className={styles.layout}>
          <aside className={styles.vehiclePanel}>
            <div className={styles.panelTitle}>Подбор по автомобилю</div>

            <label className={styles.field}>
              <span>Марка</span>
              <select
                className={styles.select}
                value={brandId ?? ""}
                onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Все марки</option>
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
                onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : null)}
                disabled={!brandId || !models.length}
              >
                <option value="">Все модели</option>
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
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
                disabled={!modelId || !years.length}
              >
                <option value="">Любой год</option>
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
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
                disabled={!year || !bodyTypes.length}
              >
                <option value="">Любой кузов</option>
                {bodyTypes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.vehicleBadge}>{activeVehicleText}</div>

            <div className={styles.vehicleTags}>
              {brandId ? <span className={styles.tag}>Марка выбрана</span> : null}
              {modelId ? <span className={styles.tag}>Модель выбрана</span> : null}
              {year ? <span className={styles.tag}>Год указан</span> : null}
              {bodyType ? <span className={styles.tag}>Кузов указан</span> : null}
            </div>

            <button type="button" className={styles.resetButton} onClick={resetVehicle}>
              Сбросить выбор машины
            </button>
          </aside>

          <section className={styles.content}>
            <div className={styles.headerBlock}>
              <div className={styles.headerTop}>
                <div>
                  <h1 className={styles.title}>Каталог запчастей</h1>
                </div>

                <div className={styles.statsRow}>
                  <div className={styles.statCard}>
                    <span>Категории</span>
                    <b>{categories.length}</b>
                  </div>
                  <div className={styles.statCard}>
                    <span>Найдено</span>
                    <b>{loading ? "…" : filteredParts.length}</b>
                  </div>
                </div>
              </div>

              <div className={styles.searchRow}>
                <div className={styles.searchBox}>
                  <input
                    className={styles.searchInput}
                    type="text"
                    placeholder="Поиск по названию детали"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className={styles.filterToggle}
                  onClick={() => setFiltersOpen((prev) => !prev)}
                >
                  {filtersOpen ? "Скрыть фильтры" : "Фильтры запчастей"}
                </button>
              </div>

              {activeFilterBadges.length ? (
                <div className={styles.activeFiltersRow}>
                  {activeFilterBadges.map((badge) => (
                    <span key={badge} className={styles.filterBadge}>
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}

              {filtersOpen ? (
                <div className={styles.filtersDropdown}>
                  <label className={styles.inlineField}>
                    <span>Состояние</span>
                    <select
                      className={styles.select}
                      value={conditionFilter}
                      onChange={(e) => setConditionFilter(e.target.value)}
                    >
                      <option value="all">Все</option>
                      <option value="new">Новые</option>
                      <option value="used">Б/у</option>
                    </select>
                  </label>

                  <label className={styles.inlineField}>
                    <span>Происхождение</span>
                    <select
                      className={styles.select}
                      value={originalityFilter}
                      onChange={(e) => setOriginalityFilter(e.target.value)}
                    >
                      <option value="all">Все</option>
                      <option value="oem">Оригинал</option>
                      <option value="analog">Аналог</option>
                    </select>
                  </label>

                  <label className={styles.inlineField}>
                    <span>Цена от</span>
                    <input
                      className={styles.textInput}
                      type="number"
                      inputMode="numeric"
                      value={priceFrom}
                      onChange={(e) => setPriceFrom(e.target.value)}
                      placeholder="0"
                    />
                  </label>

                  <label className={styles.inlineField}>
                    <span>Цена до</span>
                    <input
                      className={styles.textInput}
                      type="number"
                      inputMode="numeric"
                      value={priceTo}
                      onChange={(e) => setPriceTo(e.target.value)}
                      placeholder="50000"
                    />
                  </label>

                  <label className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      checked={crossBrandOnly}
                      onChange={(e) => setCrossBrandOnly(e.target.checked)}
                    />
                    Только детали, подходящие к другим брендам
                  </label>

                  <button type="button" className={styles.secondaryButton} onClick={resetPartFilters}>
                    Сбросить фильтры запчастей
                  </button>
                </div>
              ) : null}
            </div>

            <div className={styles.categoriesSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Категории</h2>
                <div className={styles.sectionMeta}>
                  {categories.length ? `${categories.length} категорий` : "Категории загружаются"}
                </div>
              </div>

              <div className={styles.categoriesGrid}>
                {categories.map((category) => {
                  const count = categoryCounts.get(category) || 0;
                  const href = currentQueryString
                    ? `/catalog/${slugify(category)}?${currentQueryString}`
                    : `/catalog/${slugify(category)}`;

                  return (
                    <Link key={category} href={href} className={styles.categoryCard}>
                      <div className={styles.categoryMedia}>
                        <CategoryPreview
                          category={category}
                          alt={translateCategory(category)}
                        />
                      </div>

                      <div className={styles.categoryTitle}>{translateCategory(category)}</div>
                      <div className={styles.categoryCount}>
                        {count} {count === 1 ? "позиция" : count < 5 ? "позиции" : "позиций"}
                      </div>
                      <div className={styles.categoryAction}>Открыть категорию →</div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className={styles.partsSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Найденные позиции</h2>
                <div className={styles.sectionMeta}>
                  {loading ? "Загрузка..." : `${filteredParts.length} товаров`}
                </div>
              </div>

              {error ? <div className={styles.errorBox}>{error}</div> : null}

              {!loading && !filteredParts.length ? (
                <div className={styles.emptyState}>
                  По текущим параметрам запчасти не найдены. Попробуй убрать часть фильтров или
                  сбросить выбор автомобиля.
                </div>
              ) : null}

              <div className={styles.partsGrid}>
                {filteredParts.map((part) => {
                  const href = currentQueryString
                    ? `/parts/${part.id}?${currentQueryString}`
                    : `/parts/${part.id}`;

                  return (
                    <Link key={part.id} href={href} className={styles.partCard}>
                      <div className={styles.partMedia}>
                        <PartPreview part={part} />
                      </div>

                      <div className={styles.partInfo}>
                        <div className={styles.partCategory}>{translateCategory(part.category)}</div>
                        <div className={styles.partTitle}>{part.title}</div>

                        <div className={styles.partMeta}>
                          <span>{part.brand}</span>
                          <span>{formatCondition(part.condition)}</span>
                          <span>{formatOriginality(part.originality)}</span>
                          {getCrossBrand(part) ? <span>Кросс-бренд</span> : null}
                        </div>

                        <div className={styles.partBottomRow}>
                          <div className={styles.partPrice}>{formatPrice(part.price)}</div>
                          <div className={styles.partLink}>Открыть</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}