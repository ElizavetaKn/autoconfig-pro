export const API_BASE = "http://localhost:8000/api";

export type Condition = "new" | "used";
export type Originality = "oem" | "analog";

export type Brand = {
  id: number;
  name: string;
};

export type Model = {
  id: number;
  name: string;
  brand_id?: number;
  brand_name?: string;
};

export type YearsOut = {
  model_id: number;
  years: number[];
};

export type BodyTypesOut = {
  model_id: number;
  year: number;
  body_types: string[];
};

export type PartFitment = {
  id: number;
  part_id: number;
  model_id: number;
  year_from: number;
  year_to: number;
  body_type?: string | null;
  brand_id?: number | null;
  brand_name?: string | null;
  model_name?: string | null;
};

export type Part = {
  id: number;
  title: string;
  category: string;
  price: number;
  brand: string;
  condition: Condition;
  originality: Originality;
  cross_brand: boolean;
  image_url?: string | null;
  image?: string | null;
  fitments?: PartFitment[];
};

export type PartFormInput = {
  title: string;
  category: string;
  price: number;
  brand: string;
  condition: Condition;
  originality: Originality;
  cross_brand: boolean;
  image_url?: string | null;
};

export type PartsSearchResponse = {
  items: Part[];
  total: number;
};

export type VehicleContextPayload = {
  brandId?: number | null;
  modelId?: number | null;
  year?: number | null;
  bodyType?: string;
  query?: string;
  condition?: string;
  originality?: string;
  crossBrand?: boolean;
};

export type CheckoutCustomerPayload = {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  street: string;
  house: string;
  apartment?: string;
  postalCode?: string;
  comment?: string;
};

export type OrderItemPayload = {
  id: number;
  title: string;
  category: string;
  brand: string;
  price: number;
  qty: number;
  condition?: string | null;
  originality?: string | null;
  cross_brand?: boolean;
  sourceType?: string;
  vehicleContext?: VehicleContextPayload | null;
};

export type CreateOrderPayload = {
  customer: CheckoutCustomerPayload;
  items: OrderItemPayload[];
  total: number;
};

export type OrderCreatedOut = {
  order_id: number;
  status: string;
  created_at: string;
};

export type OrderItemOut = {
  id: number;
  part_id?: number | null;
  title: string;
  category: string;
  brand: string;
  price: number;
  qty: number;
  condition?: string | null;
  originality?: string | null;
  cross_brand: boolean;
  sourceType: string;
  vehicleContext?: Record<string, unknown> | null;
};

export type OrderOut = {
  id: number;
  status: string;
  total: number;
  created_at: string;
  customer: CheckoutCustomerPayload;
  items: OrderItemOut[];
};

export type CreateServiceRequestPayload = {
  serviceCenter: string;
  customerName: string;
  phone: string;
  comment?: string;
  itemId?: number | null;
  itemTitle: string;
  vehicleContext?: VehicleContextPayload | null;
};

export type ServiceRequestOut = {
  id: number;
  status: string;
  created_at: string;
  serviceCenter: string;
  customerName: string;
  phone: string;
  comment: string;
  itemId?: number | null;
  itemTitle: string;
  vehicleContext?: Record<string, unknown> | null;
};

export type AdminSummaryOut = {
  users_total: number;
  orders_total: number;
  service_requests_total: number;
  parts_total: number;
  brands_total: number;
  models_total: number;
  fitments_total: number;
  categories_total: number;
};

export type AdminUserOut = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  orders_count: number;
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Ошибка запроса";

    try {
      const data = await response.json();
      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data?.detail)) {
        message = data.detail.map((item: any) => item?.msg || "Ошибка валидации").join(", ");
      }
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;

    if (typeof value === "boolean") {
      search.set(key, value ? "1" : "0");
      return;
    }

    search.set(key, String(value));
  });

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/* =========================
   Brands / models / config
   ========================= */

export async function fetchBrands(): Promise<Brand[]> {
  return apiFetch<Brand[]>(`${API_BASE}/brands`);
}

export async function fetchModelsByBrand(brandId: number): Promise<Model[]> {
  return apiFetch<Model[]>(`${API_BASE}/brands/${brandId}/models`);
}

export async function fetchYearsByModel(modelId: number): Promise<YearsOut> {
  return apiFetch<YearsOut>(`${API_BASE}/models/${modelId}/years`);
}

export async function fetchBodyTypesByModelYear(
  modelId: number,
  year: number
): Promise<BodyTypesOut> {
  return apiFetch<BodyTypesOut>(
    `${API_BASE}/models/${modelId}/years/${year}/body-types`
  );
}

export async function fetchConfig(params?: {
  brand_id?: number | null;
  model_id?: number | null;
  year?: number | null;
}) {
  return apiFetch<{
    brands: Brand[];
    models: Model[];
    years: number[];
    body_types: string[];
  }>(`${API_BASE}/config${buildQuery(params ?? {})}`);
}

/* =========================
   Parts / catalog
   ========================= */

export async function fetchCategories(): Promise<string[]> {
  return apiFetch<string[]>(`${API_BASE}/parts/categories`);
}

export async function fetchParts(params: Record<string, string | number | boolean | null | undefined>): Promise<PartsSearchResponse> {
  return apiFetch<PartsSearchResponse>(
    `${API_BASE}/parts/search${buildQuery(params)}`
  );
}

export async function fetchPart(partId: number): Promise<Part> {
  return apiFetch<Part>(`${API_BASE}/parts/${partId}`);
}

export async function createPart(payload: PartFormInput): Promise<Part> {
  return apiFetch<Part>(`${API_BASE}/parts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePart(
  partId: number,
  payload: Partial<PartFormInput>
): Promise<Part> {
  return apiFetch<Part>(`${API_BASE}/parts/${partId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deletePart(partId: number): Promise<{ ok: boolean; id: number }> {
  return apiFetch<{ ok: boolean; id: number }>(`${API_BASE}/parts/${partId}`, {
    method: "DELETE",
  });
}

/* =========================
   Fitments
   ========================= */

export async function createFitment(
  partId: number,
  payload: {
    model_id: number;
    year_from: number;
    year_to: number;
    body_type?: string | null;
  }
): Promise<PartFitment> {
  return apiFetch<PartFitment>(`${API_BASE}/parts/${partId}/fitments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFitment(
  fitmentId: number,
  payload: {
    model_id?: number | null;
    year_from?: number | null;
    year_to?: number | null;
    body_type?: string | null;
  }
): Promise<PartFitment> {
  return apiFetch<PartFitment>(`${API_BASE}/fitments/${fitmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteFitment(
  fitmentId: number
): Promise<{ ok: boolean; id: number }> {
  return apiFetch<{ ok: boolean; id: number }>(`${API_BASE}/fitments/${fitmentId}`, {
    method: "DELETE",
  });
}

/* =========================
   Orders
   ========================= */

export async function createOrder(payload: CreateOrderPayload): Promise<OrderCreatedOut> {
  return apiFetch<OrderCreatedOut>(`${API_BASE}/orders`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchOrders(email?: string): Promise<OrderOut[]> {
  return apiFetch<OrderOut[]>(`${API_BASE}/orders${buildQuery({ email })}`);
}

export async function fetchOrder(orderId: number): Promise<OrderOut> {
  return apiFetch<OrderOut>(`${API_BASE}/orders/${orderId}`);
}

export async function updateOrderStatus(
  orderId: number,
  status: string
): Promise<OrderOut> {
  return apiFetch<OrderOut>(`${API_BASE}/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/* =========================
   Service requests
   ========================= */

export async function createServiceRequest(
  payload: CreateServiceRequestPayload
): Promise<ServiceRequestOut> {
  return apiFetch<ServiceRequestOut>(`${API_BASE}/service-requests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchServiceRequests(phone?: string): Promise<ServiceRequestOut[]> {
  return apiFetch<ServiceRequestOut[]>(
    `${API_BASE}/service-requests${buildQuery({ phone })}`
  );
}

export async function updateServiceRequestStatus(
  requestId: number,
  status: string
): Promise<ServiceRequestOut> {
  return apiFetch<ServiceRequestOut>(
    `${API_BASE}/service-requests/${requestId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}

/* =========================
   Admin
   ========================= */

export async function fetchAdminSummary(): Promise<AdminSummaryOut> {
  return apiFetch<AdminSummaryOut>(`${API_BASE}/admin/summary`);
}

export async function fetchAdminUsers(): Promise<AdminUserOut[]> {
  return apiFetch<AdminUserOut[]>(`${API_BASE}/admin/users`);
}