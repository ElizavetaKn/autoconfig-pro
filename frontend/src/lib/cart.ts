// src/lib/cart.ts

export type VehicleContext = {
  brandId?: number | null;
  modelId?: number | null;
  year?: number | null;
  bodyType?: string;
  query?: string;
  condition?: string;
  originality?: string;
  crossBrand?: boolean;
};

export type CartItem = {
  id: number;
  title: string;
  category: string;
  brand: string;
  price: number;
  condition?: string;
  originality?: string;
  cross_brand?: boolean;
  qty: number;
  sourceType?: "part" | "configuration";
  configurationId?: string;
  configurationData?: Record<string, unknown>;
  vehicleContext?: VehicleContext;
};

export type CheckoutFormData = {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  postalCode: string;
  comment: string;
};

export type CheckoutDraft = {
  customer: CheckoutFormData;
  items: CartItem[];
  total: number;
  createdAt: string;
};

const CART_KEY = "autoconfig_cart_v1";
const CHECKOUT_DRAFT_KEY = "autoconfig_checkout_draft_v1";
const EDITABLE_CONFIGURATION_KEY = "autoconfig_current_config_v1";

export const CART_UPDATED_EVENT = "autoconfig:cart-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

function emitCartUpdated() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

export function readCart(): CartItem[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((x) => x && typeof x.id === "number" && typeof x.qty === "number")
      .map((x) => ({
        ...x,
        qty: Math.max(1, Number(x.qty) || 1),
      })) as CartItem[];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  emitCartUpdated();
}

export function addToCart(item: Omit<CartItem, "qty">, qty = 1): CartItem[] {
  const cart = readCart();
  const safeQty = Math.max(1, Number(qty) || 1);

  const found = cart.find((x) => {
    if (x.sourceType !== item.sourceType) return false;

    if (item.sourceType === "configuration") {
      return x.configurationId === item.configurationId;
    }

    return x.id === item.id;
  });

  if (found) {
    found.title = item.title;
    found.category = item.category;
    found.brand = item.brand;
    found.price = item.price;
    found.condition = item.condition;
    found.originality = item.originality;
    found.cross_brand = item.cross_brand;
    found.vehicleContext = item.vehicleContext;
    found.configurationData = item.configurationData;
    found.configurationId = item.configurationId;
    found.qty = safeQty;
  } else {
    cart.push({ ...item, qty: safeQty });
  }

  writeCart(cart);
  return cart;
}

export function removeFromCart(id: number): CartItem[] {
  const cart = readCart().filter((x) => x.id !== id);
  writeCart(cart);
  return cart;
}

export function setQty(id: number, qty: number): CartItem[] {
  const cart = readCart();
  const found = cart.find((x) => x.id === id);

  if (!found) return cart;

  found.qty = Math.max(1, Number(qty) || 1);
  writeCart(cart);
  return cart;
}

export function clearCart(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CART_KEY);
  emitCartUpdated();
}

export function calcTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function saveCheckoutDraft(data: CheckoutDraft): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(data));
}

export function readCheckoutDraft(): CheckoutDraft | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutDraft;
  } catch {
    return null;
  }
}

export function clearCheckoutDraft(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CHECKOUT_DRAFT_KEY);
}

export function saveEditableConfiguration(data: Record<string, unknown>): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(EDITABLE_CONFIGURATION_KEY, JSON.stringify(data));
}

export function readEditableConfiguration(): Record<string, unknown> | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(EDITABLE_CONFIGURATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function clearEditableConfiguration(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(EDITABLE_CONFIGURATION_KEY);
}