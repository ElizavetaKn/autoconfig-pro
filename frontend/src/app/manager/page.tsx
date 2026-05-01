"use client";

import { useEffect, useMemo, useState } from "react";
import { MainNav } from "@/components/ui/MainNav";
import {
  createFitment,
  createPart,
  deleteFitment,
  deletePart,
  fetchBodyTypesByModelYear,
  fetchBrands,
  fetchModelsByBrand,
  fetchParts,
  fetchYearsByModel,
  updateFitment,
  updatePart,
  type BodyTypesOut,
  type Brand,
  type Condition,
  type Model,
  type Originality,
  type Part,
  type PartFitment,
  type PartFormInput,
  type YearsOut,
} from "@/lib/api";
import styles from "./page.module.css";

type ManagerTab = "catalog";

type FitmentForm = {
  id?: number;
  model_id: number | null;
  year_from: number | null;
  year_to: number | null;
  body_type: string;
};

const EMPTY_PART_FORM: PartFormInput = {
  title: "",
  category: "",
  price: 0,
  brand: "",
  condition: "new",
  originality: "oem",
  cross_brand: false,
  image_url: "",
};

const EMPTY_FITMENT_FORM: FitmentForm = {
  model_id: null,
  year_from: null,
  year_to: null,
  body_type: "",
};

function normalizePartForm(input?: Partial<PartFormInput> | null): PartFormInput {
  return {
    title: typeof input?.title === "string" ? input.title : "",
    category: typeof input?.category === "string" ? input.category : "",
    price:
      typeof input?.price === "number" && Number.isFinite(input.price)
        ? input.price
        : 0,
    brand: typeof input?.brand === "string" ? input.brand : "",
    condition:
      input?.condition === "used" || input?.condition === "new"
        ? input.condition
        : "new",
    originality:
      input?.originality === "analog" || input?.originality === "oem"
        ? input.originality
        : "oem",
    cross_brand: Boolean(input?.cross_brand),
    image_url: typeof input?.image_url === "string" ? input.image_url : "",
  };
}

function normalizeFitmentForm(input?: Partial<FitmentForm> | null): FitmentForm {
  return {
    id: typeof input?.id === "number" ? input.id : undefined,
    model_id: typeof input?.model_id === "number" ? input.model_id : null,
    year_from: typeof input?.year_from === "number" ? input.year_from : null,
    year_to: typeof input?.year_to === "number" ? input.year_to : null,
    body_type: typeof input?.body_type === "string" ? input.body_type : "",
  };
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " р.";
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

function translateCategory(value: string) {
  const map: Record<string, string> = {
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

  const key = String(value || "").trim().toLowerCase();
  return map[key] || value || "—";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }
      reject(new Error("Не удалось прочитать файл изображения."));
    };

    reader.onerror = () => reject(new Error("Ошибка чтения файла."));
    reader.readAsDataURL(file);
  });
}

function humanizeManagerError(error: any) {
  const raw = String(error?.message ?? "").toLowerCase();

  if (raw.includes("failed to fetch")) {
    return "Не удалось подключиться к серверу. Проверь, запущен ли backend на localhost:8000.";
  }

  if (raw.includes("networkerror")) {
    return "Ошибка сети. Проверь подключение и backend.";
  }

  return error?.message ?? "Произошла ошибка. Попробуй ещё раз.";
}

export default function ManagerPage() {
  const [activeTab] = useState<ManagerTab>("catalog");

  const [parts, setParts] = useState<Part[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingPart, setSavingPart] = useState(false);
  const [savingFitment, setSavingFitment] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [partsSearch, setPartsSearch] = useState("");

  const [partForm, setPartForm] = useState<PartFormInput>(EMPTY_PART_FORM);
  const [editingPartId, setEditingPartId] = useState<number | null>(null);

  const [fitmentForm, setFitmentForm] = useState<FitmentForm>(EMPTY_FITMENT_FORM);
  const [editingFitmentId, setEditingFitmentId] = useState<number | null>(null);
  const [selectedPartForFitment, setSelectedPartForFitment] = useState<number | null>(null);
  const [selectedBrandIdForFitment, setSelectedBrandIdForFitment] = useState<number | null>(null);

  const currentPart = useMemo(
    () => parts.find((item) => item.id === editingPartId) ?? null,
    [parts, editingPartId]
  );

  const selectedFitmentPart = useMemo(
    () => parts.find((item) => item.id === selectedPartForFitment) ?? null,
    [parts, selectedPartForFitment]
  );

  const currentFitments = useMemo(() => currentPart?.fitments ?? [], [currentPart]);

  const filteredParts = useMemo(() => {
    const q = partsSearch.trim().toLowerCase();
    if (!q) return parts;

    return parts.filter((part) => {
      const title = String(part.title || "").toLowerCase();
      const brand = String(part.brand || "").toLowerCase();
      const categoryRu = translateCategory(part.category).toLowerCase();
      const categoryRaw = String(part.category || "").toLowerCase();

      return (
        title.includes(q) ||
        brand.includes(q) ||
        categoryRu.includes(q) ||
        categoryRaw.includes(q)
      );
    });
  }, [parts, partsSearch]);

  async function loadInitialData() {
    setLoading(true);
    setError("");

    try {
      const [partsResponse, brandsResponse] = await Promise.all([
        fetchParts({}),
        fetchBrands(),
      ]);

      setParts(Array.isArray(partsResponse?.items) ? partsResponse.items : []);
      setBrands(Array.isArray(brandsResponse) ? brandsResponse : []);
    } catch (e: any) {
      setError(humanizeManagerError(e) || "Не удалось загрузить данные панели менеджера.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadYearsData() {
      if (!fitmentForm.model_id) {
        setYears([]);
        setBodyTypes([]);
        return;
      }

      try {
        const response: YearsOut = await fetchYearsByModel(fitmentForm.model_id);
        if (cancelled) return;
        setYears(Array.isArray(response?.years) ? response.years : []);
      } catch {
        if (!cancelled) setYears([]);
      }
    }

    void loadYearsData();

    return () => {
      cancelled = true;
    };
  }, [fitmentForm.model_id]);

  useEffect(() => {
    let cancelled = false;

    async function loadBodyTypesData() {
      if (!fitmentForm.model_id || !fitmentForm.year_from) {
        setBodyTypes([]);
        return;
      }

      try {
        const response: BodyTypesOut = await fetchBodyTypesByModelYear(
          fitmentForm.model_id,
          fitmentForm.year_from
        );
        if (cancelled) return;
        setBodyTypes(Array.isArray(response?.body_types) ? response.body_types : []);
      } catch {
        if (!cancelled) setBodyTypes([]);
      }
    }

    void loadBodyTypesData();

    return () => {
      cancelled = true;
    };
  }, [fitmentForm.model_id, fitmentForm.year_from]);

  async function handleBrandChangeForFitment(brandId: number | null) {
    setSelectedBrandIdForFitment(brandId);
    setFitmentForm((prev) =>
      normalizeFitmentForm({
        ...prev,
        model_id: null,
        year_from: null,
        year_to: null,
        body_type: "",
      })
    );
    setYears([]);
    setBodyTypes([]);

    if (!brandId) {
      setModels([]);
      return;
    }

    try {
      const data = await fetchModelsByBrand(brandId);
      setModels(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(humanizeManagerError(e) || "Не удалось загрузить модели.");
      setModels([]);
    }
  }

  function resetPartEditor() {
    setPartForm(EMPTY_PART_FORM);
    setEditingPartId(null);
    setSuccess("");
    setError("");
  }

  function resetFitmentEditor() {
    setFitmentForm(EMPTY_FITMENT_FORM);
    setEditingFitmentId(null);
    setSelectedPartForFitment(null);
    setSelectedBrandIdForFitment(null);
    setModels([]);
    setYears([]);
    setBodyTypes([]);
    setSuccess("");
    setError("");
  }

  function startCreatePart() {
    resetPartEditor();
  }

  function startEditPart(part: Part) {
    setEditingPartId(part.id);
    setPartForm(
      normalizePartForm({
        title: part.title,
        category: part.category,
        price: part.price,
        brand: part.brand,
        condition: part.condition as Condition,
        originality: part.originality as Originality,
        cross_brand: part.cross_brand,
        image_url: part.image_url ?? "",
      })
    );
    setSuccess("");
    setError("");
  }

  async function submitPartForm(e: React.FormEvent) {
    e.preventDefault();
    setSavingPart(true);
    setError("");
    setSuccess("");

    try {
      const payload = normalizePartForm(partForm);

      if (!payload.title.trim()) {
        throw new Error("Укажи название запчасти.");
      }
      if (!payload.category.trim()) {
        throw new Error("Укажи категорию.");
      }
      if (!payload.brand.trim()) {
        throw new Error("Укажи бренд.");
      }
      if (!Number.isFinite(payload.price) || payload.price < 0) {
        throw new Error("Укажи корректную цену.");
      }

      if (editingPartId) {
        await updatePart(editingPartId, payload);
        setSuccess("Запчасть обновлена.");
      } else {
        await createPart(payload);
        setSuccess("Запчасть добавлена.");
      }

      await loadInitialData();
      resetPartEditor();
    } catch (e: any) {
      setError(humanizeManagerError(e) || "Не удалось сохранить запчасть.");
    } finally {
      setSavingPart(false);
    }
  }

  async function handleDeletePart(partId: number) {
    const ok = window.confirm("Удалить эту запчасть?");
    if (!ok) return;

    setError("");
    setSuccess("");

    try {
      await deletePart(partId);

      setParts((prev) => prev.filter((part) => part.id !== partId));

      if (editingPartId === partId) {
        resetPartEditor();
      }

      if (selectedPartForFitment === partId) {
        resetFitmentEditor();
      }

      await loadInitialData();
      setSuccess("Запчасть удалена.");
    } catch (e: any) {
      setError(humanizeManagerError(e) || "Не удалось удалить запчасть.");
    }
  }

  async function startCreateFitment(part: Part) {
    resetFitmentEditor();
    setSelectedPartForFitment(part.id);
    setEditingPartId(part.id);
  }

  async function startEditFitment(part: Part, fitment: PartFitment) {
    resetFitmentEditor();
    setSelectedPartForFitment(part.id);
    setEditingPartId(part.id);
    setEditingFitmentId(fitment.id);
    setFitmentForm(
      normalizeFitmentForm({
        id: fitment.id,
        model_id: fitment.model_id,
        year_from: fitment.year_from,
        year_to: fitment.year_to,
        body_type: fitment.body_type ?? "",
      })
    );

    const brandId = fitment.brand_id ?? null;
    if (brandId) {
      await handleBrandChangeForFitment(brandId);
    }
  }

  async function submitFitmentForm(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedPartForFitment) {
      setError("Сначала выбери запчасть для редактирования совместимости.");
      return;
    }

    setSavingFitment(true);
    setError("");
    setSuccess("");

    try {
      if (!fitmentForm.model_id) {
        throw new Error("Выбери модель.");
      }
      if (!fitmentForm.year_from || !fitmentForm.year_to) {
        throw new Error("Укажи диапазон годов.");
      }
      if (fitmentForm.year_from > fitmentForm.year_to) {
        throw new Error("Год начала не может быть больше года окончания.");
      }

      const payload = {
        model_id: fitmentForm.model_id,
        year_from: fitmentForm.year_from,
        year_to: fitmentForm.year_to,
        body_type: fitmentForm.body_type || null,
      };

      if (editingFitmentId) {
        await updateFitment(editingFitmentId, payload);
        setSuccess("Совместимость обновлена.");
      } else {
        await createFitment(selectedPartForFitment, payload);
        setSuccess("Совместимость добавлена.");
      }

      await loadInitialData();
      resetFitmentEditor();
    } catch (e: any) {
      setError(humanizeManagerError(e) || "Не удалось сохранить совместимость.");
    } finally {
      setSavingFitment(false);
    }
  }

  async function handleDeleteFitment(fitmentId: number) {
    const ok = window.confirm("Удалить эту совместимость?");
    if (!ok) return;

    setError("");
    setSuccess("");

    try {
      await deleteFitment(fitmentId);

      setParts((prev) =>
        prev.map((part) => ({
          ...part,
          fitments: Array.isArray(part.fitments)
            ? part.fitments.filter((fitment) => fitment.id !== fitmentId)
            : part.fitments,
        }))
      );

      if (editingFitmentId === fitmentId) {
        resetFitmentEditor();
      }

      await loadInitialData();
      setSuccess("Совместимость удалена.");
    } catch (e: any) {
      setError(humanizeManagerError(e) || "Не удалось удалить совместимость.");
    }
  }

  return (
    <main className={styles.page}>
      <MainNav active="manager" />

      <div className={styles.shell}>
        <section className={styles.header}>
          <h1 className={styles.title}>Панель менеджера</h1>
          <p className={styles.subtitle}>
            Управление каталогом запчастей и совместимостью деталей.
          </p>
        </section>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "catalog" ? styles.tabActive : ""}`}
          >
            Каталог
          </button>
        </div>

        {error ? <div className={styles.errorBox}>{error}</div> : null}
        {success ? <div className={styles.successBox}>{success}</div> : null}

        {loading ? (
          <div className={styles.loading}>Загрузка данных...</div>
        ) : (
          <div className={styles.layout}>
            <aside className={styles.editorColumn}>
              <section className={styles.editorCard}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>
                    {editingPartId ? "Редактирование запчасти" : "Добавить запчасть"}
                  </h2>
                  {editingPartId ? (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={resetPartEditor}
                    >
                      Новая форма
                    </button>
                  ) : null}
                </div>

                <form className={styles.editorForm} onSubmit={submitPartForm}>
                  <div className={styles.editorGrid}>
                    <label className={styles.field}>
                      <span>Название</span>
                      <input
                        className={styles.input}
                        value={partForm.title}
                        onChange={(e) =>
                          setPartForm((prev) =>
                            normalizePartForm({
                              ...prev,
                              title: e.target.value,
                            })
                          )
                        }
                        placeholder="Название запчасти"
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Категория</span>
                      <input
                        className={styles.input}
                        value={partForm.category}
                        onChange={(e) =>
                          setPartForm((prev) =>
                            normalizePartForm({
                              ...prev,
                              category: e.target.value,
                            })
                          )
                        }
                        placeholder="Например, brakes"
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Бренд</span>
                      <input
                        className={styles.input}
                        value={partForm.brand}
                        onChange={(e) =>
                          setPartForm((prev) =>
                            normalizePartForm({
                              ...prev,
                              brand: e.target.value,
                            })
                          )
                        }
                        placeholder="Бренд"
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Фотография запчасти</span>

                      <div className={styles.fileUploadBox}>
                        <label className={styles.fileUploadButton}>
                          <input
                            className={styles.fileInputHidden}
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              try {
                                const dataUrl = await fileToDataUrl(file);
                                setPartForm((prev) =>
                                  normalizePartForm({
                                    ...prev,
                                    image_url: dataUrl,
                                  })
                                );
                              } catch (err: any) {
                                setError(
                                  humanizeManagerError(err) || "Не удалось загрузить фотографию."
                                );
                              }
                            }}
                          />
                          Выбрать фото
                        </label>

                        <div className={styles.fileUploadHint}>
                          {partForm.image_url ? "Фото выбрано" : "PNG, JPG, WEBP"}
                        </div>
                      </div>

                      {partForm.image_url ? (
                        <div className={styles.partImagePreviewWrap}>
                          <img
                            src={partForm.image_url}
                            alt="Предпросмотр запчасти"
                            className={styles.partImagePreview}
                          />

                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() =>
                              setPartForm((prev) =>
                                normalizePartForm({
                                  ...prev,
                                  image_url: "",
                                })
                              )
                            }
                          >
                            Удалить фото
                          </button>
                        </div>
                      ) : null}
                    </label>

                    <label className={styles.field}>
                      <span>Цена</span>
                      <input
                        className={styles.input}
                        type="number"
                        min={0}
                        value={partForm.price}
                        onChange={(e) =>
                          setPartForm((prev) =>
                            normalizePartForm({
                              ...prev,
                              price: Number(e.target.value || 0),
                            })
                          )
                        }
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Состояние</span>
                      <select
                        className={styles.input}
                        value={partForm.condition}
                        onChange={(e) =>
                          setPartForm((prev) =>
                            normalizePartForm({
                              ...prev,
                              condition: e.target.value as Condition,
                            })
                          )
                        }
                      >
                        <option value="new">Новая</option>
                        <option value="used">Б/у</option>
                      </select>
                    </label>

                    <label className={styles.field}>
                      <span>Тип</span>
                      <select
                        className={styles.input}
                        value={partForm.originality}
                        onChange={(e) =>
                          setPartForm((prev) =>
                            normalizePartForm({
                              ...prev,
                              originality: e.target.value as Originality,
                            })
                          )
                        }
                      >
                        <option value="oem">Оригинал</option>
                        <option value="analog">Аналог</option>
                      </select>
                    </label>

                    <label className={styles.checkboxField}>
                      <input
                        type="checkbox"
                        checked={partForm.cross_brand}
                        onChange={(e) =>
                          setPartForm((prev) =>
                            normalizePartForm({
                              ...prev,
                              cross_brand: e.target.checked,
                            })
                          )
                        }
                      />
                      Кросс-бренд
                    </label>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={savingPart}
                    >
                      {savingPart
                        ? "Сохранение..."
                        : editingPartId
                          ? "Сохранить изменения"
                          : "Добавить запчасть"}
                    </button>
                  </div>
                </form>
              </section>

              <section className={styles.editorCard}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>
                    {editingFitmentId ? "Редактирование совместимости" : "Добавить совместимость"}
                  </h2>

                  {selectedPartForFitment ? (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={resetFitmentEditor}
                    >
                      Сбросить
                    </button>
                  ) : null}
                </div>

                <div className={styles.selectedPartHint}>
                  {selectedFitmentPart
                    ? `Выбрана запчасть: `
                    : "Сначала нажми «Совместимость» в карточке нужной запчасти"}
                </div>

                {selectedPartForFitment && currentFitments.length > 0 ? (
                  <div className={styles.fitmentsPreviewBox}>
                    <div className={styles.fitmentsPreviewTitle}>Текущая совместимость</div>
                    {currentFitments.map((fitment) => (
                      <div key={fitment.id} className={styles.fitmentsPreviewRow}>
                        {(fitment.brand_name || "Марка")} {(fitment.model_name || "Модель")}
                        {" · "}
                        {fitment.year_from === fitment.year_to
                          ? fitment.year_from
                          : `${fitment.year_from}–${fitment.year_to}`}
                        {fitment.body_type ? ` · ${fitment.body_type}` : ""}
                      </div>
                    ))}
                  </div>
                ) : null}

                <form className={styles.editorForm} onSubmit={submitFitmentForm}>
                  <div className={styles.editorGrid}>
                    <label className={styles.field}>
                      <span>Марка</span>
                      <select
                        className={styles.input}
                        value={selectedBrandIdForFitment ?? ""}
                        onChange={(e) =>
                          void handleBrandChangeForFitment(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
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
                        value={fitmentForm.model_id ?? ""}
                        onChange={(e) =>
                          setFitmentForm((prev) =>
                            normalizeFitmentForm({
                              ...prev,
                              model_id: e.target.value ? Number(e.target.value) : null,
                              year_from: null,
                              year_to: null,
                              body_type: "",
                            })
                          )
                        }
                        disabled={!models.length}
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
                      <span>Год от</span>
                      <select
                        className={styles.input}
                        value={fitmentForm.year_from ?? ""}
                        onChange={(e) =>
                          setFitmentForm((prev) =>
                            normalizeFitmentForm({
                              ...prev,
                              year_from: e.target.value ? Number(e.target.value) : null,
                            })
                          )
                        }
                        disabled={!years.length}
                      >
                        <option value="">Выберите год</option>
                        {years.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.field}>
                      <span>Год до</span>
                      <select
                        className={styles.input}
                        value={fitmentForm.year_to ?? ""}
                        onChange={(e) =>
                          setFitmentForm((prev) =>
                            normalizeFitmentForm({
                              ...prev,
                              year_to: e.target.value ? Number(e.target.value) : null,
                            })
                          )
                        }
                        disabled={!years.length}
                      >
                        <option value="">Выберите год</option>
                        {years.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.field}>
                      <span>Кузов</span>
                      <select
                        className={styles.input}
                        value={fitmentForm.body_type}
                        onChange={(e) =>
                          setFitmentForm((prev) =>
                            normalizeFitmentForm({
                              ...prev,
                              body_type: e.target.value,
                            })
                          )
                        }
                        disabled={!bodyTypes.length}
                      >
                        <option value="">Любой кузов</option>
                        {bodyTypes.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={savingFitment || !selectedPartForFitment}
                    >
                      {savingFitment
                        ? "Сохранение..."
                        : editingFitmentId
                          ? "Сохранить совместимость"
                          : "Добавить совместимость"}
                    </button>
                  </div>
                </form>
              </section>
            </aside>

            <section className={styles.listColumn}>
              <div className={styles.listToolbar}>
                <h2 className={styles.sectionTitle}>Запчасти</h2>

                <div className={styles.listToolbarRight}>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Поиск по названию, бренду или категории"
                    value={partsSearch}
                    onChange={(e) => setPartsSearch(e.target.value)}
                  />

                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      setPartsSearch("");
                      startCreatePart();
                    }}
                  >
                    Очистить форму
                  </button>
                </div>
              </div>

              {!filteredParts.length ? (
                <div className={styles.emptyState}>
                  {parts.length
                    ? "По запросу ничего не найдено."
                    : "Запчасти ещё не добавлены."}
                </div>
              ) : (
                <div className={styles.cardsGrid}>
                  {filteredParts.map((part) => (
                    <article
                      key={part.id}
                      className={`${styles.card} ${selectedPartForFitment === part.id ? styles.cardSelected : ""}`}
                    >
                      {part.image_url ? (
                        <div className={styles.partThumbWrap}>
                          <img
                            src={part.image_url}
                            alt={part.title}
                            className={styles.partThumb}
                          />
                        </div>
                      ) : null}

                      <div className={styles.cardTitle}>{part.title}</div>
                      <div className={styles.cardMeta}>{part.brand}</div>
                      <div className={styles.cardMeta}>{translateCategory(part.category)}</div>
                      <div className={styles.cardMeta}>{formatCondition(part.condition)}</div>
                      <div className={styles.cardMeta}>{formatOriginality(part.originality)}</div>
                      <div className={styles.cardPrice}>{formatPrice(part.price)}</div>

                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => startEditPart(part)}
                        >
                          Редактировать
                        </button>

                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => void startCreateFitment(part)}
                        >
                          Совместимость
                        </button>

                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => void handleDeletePart(part.id)}
                        >
                          Удалить
                        </button>
                      </div>

                      {Array.isArray(part.fitments) && part.fitments.length > 0 ? (
                        <div className={styles.fitmentsBox}>
                          <div className={styles.fitmentsTitle}>Совместимость</div>

                          {part.fitments.map((fitment) => (
                            <div key={fitment.id} className={styles.fitmentRow}>
                              <div className={styles.fitmentText}>
                                {(fitment.brand_name || "Марка")} {(fitment.model_name || "Модель")}
                                {" · "}
                                {fitment.year_from === fitment.year_to
                                  ? fitment.year_from
                                  : `${fitment.year_from}–${fitment.year_to}`}
                                {fitment.body_type ? ` · ${fitment.body_type}` : ""}
                              </div>

                              <div className={styles.fitmentActions}>
                                <button
                                  type="button"
                                  className={styles.inlineButton}
                                  onClick={() => void startEditFitment(part, fitment)}
                                >
                                  Изменить
                                </button>

                                <button
                                  type="button"
                                  className={styles.inlineDelete}
                                  onClick={() => void handleDeleteFitment(fitment.id)}
                                >
                                  Удалить
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}