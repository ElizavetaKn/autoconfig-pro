import Link from "next/link";
import { notFound } from "next/navigation";
import { MainNav } from "@/components/ui/MainNav";
import { NotifyButton } from "@/components/part/NotifyButton";
import { PartActions } from "@/components/part/PartActions";
import { PartInfoRow } from "@/components/part/PartInfoRow";
import { fetchPart } from "@/lib/api";
import styles from "./part.module.css";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type PartImageLike = {
  image?: string;
  image_url?: string;
};

type FitmentLike = {
  model_id: number;
  year_from: number;
  year_to: number;
  body_type?: string | null;
  brand_name?: string | null;
  model_name?: string | null;
};

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

function translateCategory(value: string) {
  const key = value.trim().toLowerCase();
  return CATEGORY_RU[key] || value;
}

function buildQueryString(search: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(search)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) params.append(key, item);
      }
      continue;
    }

    if (value) params.set(key, value);
  }

  return params.toString();
}

function readNumber(value: string | string[] | undefined) {
  if (Array.isArray(value)) return readNumber(value[0]);
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " р.";
}

function formatCondition(value: string) {
  if (value === "new") return "Новая";
  if (value === "used") return "Б/у";
  return value || "Не указано";
}

function formatOriginality(value: string) {
  if (value === "oem") return "Оригинал";
  if (value === "analog") return "Аналог";
  return value || "Не указано";
}

function formatFitmentRange(yearFrom: number, yearTo: number) {
  return yearFrom === yearTo ? String(yearFrom) : `${yearFrom}–${yearTo}`;
}

function getImageUrl(part: PartImageLike) {
  return part.image || part.image_url || "";
}

function formatFitmentLabel(fitment: FitmentLike) {
  const brand = fitment.brand_name?.trim() || "";
  const model = fitment.model_name?.trim() || "";
  const years = formatFitmentRange(fitment.year_from, fitment.year_to);
  const bodyType = fitment.body_type?.trim() || "";

  const modelTitle =
    brand && model
      ? `${brand} ${model}`
      : model || brand || `Модель #${fitment.model_id}`;

  return `${modelTitle} • ${years}${bodyType ? ` • ${bodyType}` : ""}`;
}

export default async function PartPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = (await searchParams) ?? {};

  const partId = Number(resolvedParams.id);
  if (!Number.isFinite(partId) || partId <= 0) {
    notFound();
  }

  let part;

  try {
    part = await fetchPart(partId);
  } catch {
    notFound();
  }

  const imageUrl = getImageUrl(part as typeof part & PartImageLike);
  const query = buildQueryString(resolvedSearch);
  const backHref = query ? `/catalog?${query}` : "/catalog";
  const categoryLabel = translateCategory(part.category);

  const vehicleContext = {
    brandId: readNumber(resolvedSearch.brand_id),
    modelId: readNumber(resolvedSearch.model_id),
    year: readNumber(resolvedSearch.year),
    bodyType: readString(resolvedSearch.body_type),
    query: readString(resolvedSearch.q),
    condition: readString(resolvedSearch.condition),
    originality: readString(resolvedSearch.originality),
    crossBrand: readString(resolvedSearch.cross_brand) === "1",
  };

  const hasVehicleContext = Boolean(
    vehicleContext.brandId &&
      vehicleContext.modelId &&
      vehicleContext.year &&
      vehicleContext.bodyType
  );

  const compatibilitySummary = hasVehicleContext
    ? "Выбранный автомобиль сохранён в контексте товара. Перед добавлением в корзину проверь совпадение модели, года и кузова."
    : "Автомобиль не выбран. Перед покупкой проверь совместимость детали по параметрам автомобиля.";

  return (
    <div className={styles.page}>
      <MainNav active="catalog" />

      <div className={styles.shell}>
        <div className={styles.breadcrumbRow}>
          <div className={styles.breadcrumbs}>
            <Link href={backHref} className={styles.backLink}>
              ← Назад в каталог
            </Link>
            <span className={styles.breadcrumbDivider}>/</span>
            <span className={styles.breadcrumbText}>{categoryLabel}</span>
            <span className={styles.breadcrumbDivider}>/</span>
            <span className={styles.breadcrumbCurrent}>{part.title}</span>
          </div>
        </div>

        <section className={styles.heroCard}>
          <div className={styles.heroGrid}>
            <div className={styles.photoPanel}>
              <div className={styles.photoFrame}>
                {imageUrl ? (
                  <img src={imageUrl} alt={part.title} className={styles.photoImage} />
                ) : (
                  <div className={styles.photoPlaceholder}>
                    <div className={styles.placeholderGlow} />
                    <div className={styles.placeholderPartShape} />
                  </div>
                )}
              </div>

              <div className={styles.photoMetaGrid}>
                <div className={styles.metaCard}>
                  <span>Артикул</span>
                  <b>#{part.id}</b>
                </div>

                <div className={styles.metaCard}>
                  <span>Уведомление</span>
                  <div className={styles.notifyWrap}>
                    <NotifyButton partId={part.id} title={part.title} />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.infoPanel}>
              <div className={styles.overline}>{part.brand}</div>

              <div className={styles.badges}>
                <span className={styles.badge}>{categoryLabel}</span>
                <span className={styles.badge}>{formatCondition(part.condition)}</span>
                <span className={styles.badge}>{formatOriginality(part.originality)}</span>
                {part.cross_brand ? <span className={styles.badgeAccent}>Кросс-бренд</span> : null}
              </div>

              <h1 className={styles.title}>{part.title}</h1>

              <div className={styles.fitmentBanner}>
                <div className={styles.fitmentTitle}>Совместимость</div>
                <div className={styles.fitmentText}>{compatibilitySummary}</div>
              </div>

              <div className={styles.quickSpecs}>
                <div className={styles.quickSpec}>
                  <span>Бренд</span>
                  <b>{part.brand}</b>
                </div>
                <div className={styles.quickSpec}>
                  <span>Категория</span>
                  <b>{categoryLabel}</b>
                </div>
                <div className={styles.quickSpec}>
                  <span>Состояние</span>
                  <b>{formatCondition(part.condition)}</b>
                </div>
                <div className={styles.quickSpec}>
                  <span>Цена</span>
                  <b>{formatPrice(part.price)}</b>
                </div>
              </div>
            </div>

            <aside className={styles.buyPanel}>
              <div className={styles.priceBox}>
                <div className={styles.priceLabel}>Цена</div>
                <div className={styles.priceValue}>{formatPrice(part.price)}</div>
                <div className={styles.priceHint}>Стоимость за 1 единицу товара</div>
              </div>

              <div className={styles.buyCompatibility}>
                <b>
                  {hasVehicleContext
                      ? "Совместимость подтверждена для выбранного автомобиля."
                      : "Автомобиль не выбран. Совместимость не подтверждена."}
                </b>
              </div>

              <PartActions item={part} vehicleContext={vehicleContext}/>
            </aside>
          </div>
        </section>

        <section className={styles.lowerGrid}>
          <div className={styles.mainColumn}>
            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Характеристики детали</h2>
              <div className={styles.infoGrid}>
                <PartInfoRow label="Название" value={part.title} />
                <PartInfoRow label="Бренд" value={part.brand} />
                <PartInfoRow label="Категория" value={categoryLabel} />
                <PartInfoRow label="Состояние" value={formatCondition(part.condition)} />
                <PartInfoRow label="Исполнение" value={formatOriginality(part.originality)} />
                <PartInfoRow
                  label="Кросс-бренд"
                  value={part.cross_brand ? "Да" : "Нет"}
                  emphasized={part.cross_brand}
                />
              </div>
            </div>

            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Совместимые варианты</h2>
              <div className={styles.infoRows}>
                {Array.isArray(part.fitments) && part.fitments.length > 0 ? (
                  part.fitments.map((fitment: FitmentLike, index: number) => (
                    <PartInfoRow
                      key={`${fitment.model_id}-${fitment.year_from}-${fitment.year_to}-${fitment.body_type ?? "any"}-${index}`}
                      label={`Вариант ${index + 1}`}
                      value={formatFitmentLabel(fitment)}
                    />
                  ))
                ) : (
                  <PartInfoRow
                    label="Совместимость"
                    value="Для этой детали данные совместимости в каталоге не заполнены. Нужна ручная проверка по VIN или по точному каталогу."
                  />
                )}
              </div>
            </div>
          </div>

          <div className={styles.sideColumn}>
            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Перед заказом проверь</h2>
              <ul className={styles.checkList}>
                <li>Марку и модель автомобиля.</li>
                <li>Год выпуска.</li>
                <li>Тип кузова.</li>
                <li>Нужна ли установка сразу после покупки.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}