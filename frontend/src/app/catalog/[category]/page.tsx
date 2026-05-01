"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import styles from "./category.module.css";

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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

function unslugify(value: string) {
  return value.replace(/-/g, " ").trim();
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

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " р.";
}

function getPartImage(part: CatalogPart) {
  return part.image || part.image_url || "";
}

function getCrossBrand(part: CatalogPart) {
  return Boolean(part.cross_brand ?? part.crossBrand);
}

function getConditionLabel(value: string) {
  if (value === "new") return "Новая";
  if (value === "used") return "Б/у";
  return value || "Не указано";
}

function getOriginalityLabel(value: string) {
  if (value === "oem") return "Оригинал";
  if (value === "aftermarket") return "Аналог";
  return value || "Не указано";
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

export default function CatalogCategoryPage() {
  const router = useRouter();
  const params = useParams<{ category: string }>();
  const searchParams = useSearchParams();

  const slug = typeof params?.category === "string" ? params.category : "";
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
          setError(e?.message || "Не удалось загрузить страницу категории.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryLabel = useMemo(() => {
    const found = categories.find((item) => slugify(item) === slug);
    return found || unslugify(slug) || "Категория";
  }, [categories, slug]);

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
        setYears(Array.isArray(data?.years) ? data.years : []);
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
        setBodyTypes(Array.isArray(data?.body_types) ? data.body_types : []);
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
    const paramsObj = new URLSearchParams();

    if (brandId) paramsObj.set("brand_id", String(brandId));
    if (modelId) paramsObj.set("model_id", String(modelId));
    if (year) paramsObj.set("year", String(year));
    if (bodyType) paramsObj.set("body_type", bodyType);
    if (query.trim()) paramsObj.set("q", query.trim());
    if (priceFrom.trim()) paramsObj.set("price_from", priceFrom.trim());
    if (priceTo.trim()) paramsObj.set("price_to", priceTo.trim());
    if (conditionFilter !== "all") paramsObj.set("condition", conditionFilter);
    if (originalityFilter !== "all") paramsObj.set("originality", originalityFilter);
    if (crossBrandOnly) paramsObj.set("cross_brand", "1");

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

    const qs = paramsObj.toString();
    router.replace(qs ? `/catalog/${slug}?${qs}` : `/catalog/${slug}`, { scroll: false });
  }, [
    router,
    slug,
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

  const filteredParts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromValue = priceFrom.trim() ? Number(priceFrom) : null;
    const toValue = priceTo.trim() ? Number(priceTo) : null;

    return parts.filter((part) => {
      if (slugify(part.category) !== slug) return false;

      if (!matchesVehicle(part, { modelId, year, bodyType })) {
        return false;
      }

      if (q) {
        const haystack = `${part.title} ${part.brand} ${part.category}`.toLowerCase();
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
    slug,
    query,
    priceFrom,
    priceTo,
    conditionFilter,
    originalityFilter,
    crossBrandOnly,
    modelId,
    year,
    bodyType,
  ]);

  const currentQueryString = useMemo(() => {
    const paramsObj = new URLSearchParams();

    if (brandId) paramsObj.set("brand_id", String(brandId));
    if (modelId) paramsObj.set("model_id", String(modelId));
    if (year) paramsObj.set("year", String(year));
    if (bodyType) paramsObj.set("body_type", bodyType);
    if (query.trim()) paramsObj.set("q", query.trim());
    if (priceFrom.trim()) paramsObj.set("price_from", priceFrom.trim());
    if (priceTo.trim()) paramsObj.set("price_to", priceTo.trim());
    if (conditionFilter !== "all") paramsObj.set("condition", conditionFilter);
    if (originalityFilter !== "all") paramsObj.set("originality", originalityFilter);
    if (crossBrandOnly) paramsObj.set("cross_brand", "1");

    return paramsObj.toString();
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

  const resetVehicle = () => {
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

  const backToCatalog = currentQueryString ? `/catalog?${currentQueryString}` : "/catalog";
  const selectedBrand = brands.find((item) => item.id === brandId)?.name || "";
  const selectedModel = models.find((item) => item.id === modelId)?.name || "";
  const activeVehicleText =
    !brandId && !modelId && !year && !bodyType
      ? "Категория открыта без выбранного автомобиля"
      : `${selectedBrand || "Марка"} · ${selectedModel || "модель"}${year ? ` · ${year}` : ""}${bodyType ? ` · ${bodyType}` : ""}`;

  return (
    <main className={styles.page}>
      <MainNav active="catalog" />

      <div className={styles.shell}>
        <div className={styles.layout}>
          <aside className={styles.vehiclePanel}>
            <div className={styles.panelTitle}>Выбранный автомобиль</div>



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
              {selectedBrand ? <span className={styles.tag}>{selectedBrand}</span> : null}
              {selectedModel ? <span className={styles.tag}>{selectedModel}</span> : null}
              {year ? <span className={styles.tag}>{year}</span> : null}
              {bodyType ? <span className={styles.tag}>{bodyType}</span> : null}
            </div>

            <button type="button" className={styles.resetButton} onClick={resetVehicle}>
              Сбросить выбор машины
            </button>
          </aside>

          <section className={styles.content}>
            <div className={styles.headerBlock}>
              <div className={styles.headerTop}>
                <div>
                  <Link href={backToCatalog} className={styles.backLink}>
                    ← Назад в каталог
                  </Link>
                  <h1 className={styles.title}>{categoryLabel}</h1>

                </div>

                <div className={styles.statsCard}>
                  <div className={styles.statsValue}>{filteredParts.length}</div>
                  <div className={styles.statsLabel}>деталей в категории</div>
                </div>
              </div>

              <div className={styles.searchRow}>
                <div className={styles.searchBox}>
                  <input
                    className={styles.searchInput}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Поиск в категории «${categoryLabel}»`}
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
                    <span>Тип детали</span>
                    <select
                      className={styles.select}
                      value={originalityFilter}
                      onChange={(e) => setOriginalityFilter(e.target.value)}
                    >
                      <option value="all">Все</option>
                      <option value="oem">Оригинал</option>
                      <option value="aftermarket">Аналог</option>
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
                    <span>Только кросс-бренд</span>
                  </label>

                  <button type="button" className={styles.secondaryButton} onClick={resetPartFilters}>
                    Сбросить фильтры деталей
                  </button>
                </div>
              ) : null}

              <div className={styles.summaryRow}>
                <div className={styles.summaryText}>{activeVehicleText}</div>
                <div className={styles.summaryText}>
                  {loading
                    ? "Загрузка категории..."
                    : `Найдено ${filteredParts.length} ${filteredParts.length === 1 ? "позиция" : filteredParts.length < 5 ? "позиции" : "позиций"}`}
                </div>
              </div>
            </div>

            {error ? <div className={styles.errorBox}>{error}</div> : null}

            {!loading && !filteredParts.length ? (
              <div className={styles.emptyState}>
                В этой категории не найдено подходящих позиций по текущим параметрам.
              </div>
            ) : null}

            {loading ? (
              <div className={styles.emptyState}>Загрузка списка деталей...</div>
            ) : (
              <div className={styles.partsGrid}>
                {filteredParts.map((part) => {
                  const href = currentQueryString
                    ? `/parts/${part.id}?${currentQueryString}`
                    : `/parts/${part.id}`;

                  const image = getPartImage(part);

                  return (
                    <Link key={part.id} href={href} className={styles.partCard}>
                      <div className={styles.partMedia}>
                        {image ? (
                          <img src={image} alt={part.title} className={styles.partImage} />
                        ) : (
                          <div className={styles.partPlaceholder}>
                            <span>{part.category}</span>
                          </div>
                        )}
                      </div>

                      <div className={styles.partInfo}>
                        <div className={styles.partCategory}>{part.category}</div>
                        <div className={styles.partTitle}>{part.title}</div>

                        <div className={styles.partMeta}>
                          <span>{part.brand}</span>
                          <span>{getConditionLabel(part.condition)}</span>
                          <span>{getOriginalityLabel(part.originality)}</span>
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
            )}
          </section>
        </div>
      </div>
    </main>
  );
}