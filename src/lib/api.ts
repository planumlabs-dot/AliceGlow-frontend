const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("aliceglow_token");
}

function base64UrlDecode(input: string): string {
  // JWT usa base64url ("-" e "_"), diferente do base64 padrão.
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
  return atob(padded);
}

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (!payload?.exp) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    return nowSec >= payload.exp;
  } catch {
    // Se não conseguir parsear, não bloqueia — deixa o backend decidir.
    return false;
  }
}

function redirectToLoginAndClearToken() {
  localStorage.removeItem("aliceglow_token");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isLoginRequest = path === "/auth/login";
  const token = isLoginRequest ? null : getToken();
  if (!isLoginRequest && token && isJwtExpired(token)) {
    redirectToLoginAndClearToken();
    throw new Error("Unauthorized");
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (!isLoginRequest) {
      redirectToLoginAndClearToken();
    }
    // No login, 401 deve virar mensagem amigável.
    throw new Error(isLoginRequest ? "Credenciais inválidas" : "Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || body.detail || body.title || `Request failed: ${res.status}`) as Error & {
      status?: number;
      body?: unknown;
    };
    err.status = res.status;
    err.body = body;
    throw err;
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Products
  getProducts: (params?: { active?: boolean; includeInactive?: boolean }) => {
    if (!params) return request<Product[]>("/products");
    const queryParts: string[] = [];
    if (typeof params.active === "boolean") queryParts.push(`active=${encodeURIComponent(String(params.active))}`);
    if (typeof params.includeInactive === "boolean") queryParts.push(`includeInactive=${encodeURIComponent(String(params.includeInactive))}`);
    const query = queryParts.length ? `?${queryParts.join("&")}` : "";
    return request<Product[]>(`/products${query}`);
  },
  createProduct: (data: { name: string; costPrice: number; salePrice: number; stock: number }) =>
    request<Product>("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: number, data: { name?: string; costPrice?: number; salePrice?: number; stock?: number }) =>
    request<Product>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  activateProduct: (id: number) =>
    request<Product>(`/products/${id}/activate`, { method: "PATCH" }),
  deactivateProduct: (id: number) =>
    request<Product>(`/products/${id}/deactivate`, { method: "PATCH" }),
  deleteProduct: (id: number) =>
    request<void>(`/products/${id}`, { method: "DELETE" }),

  // Sales
  getSales: () => request<Sale[]>("/sales"),
  getSalesByPeriod: (start: string, end: string) =>
    request<Sale[]>(`/sales?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
  getSale: (id: number) => request<SaleDetail>(`/sales/${id}`),
  createSale: (data: { client: string; paymentMethod: string; status?: "PENDING" | "PAID"; saleItems: { productId: number; quantity: number; unitPrice: number }[] }) =>
    request<Sale>("/sales", { method: "POST", body: JSON.stringify(data) }),
  cancelSale: (id: number) =>
    request<void>(`/sales/${id}/cancel`, { method: "PATCH" }),
  paySale: (id: number) =>
    request<void>(`/sales/${id}/pay`, { method: "PATCH" }),

  // Users
  getUsers: () => request<User[]>("/users"),
  createUser: (data: { name: string; email: string; password: string; perfils: string[] }) =>
    request<User>("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: number, data: Partial<{ name: string; email: string; password: string; perfils: string[] }>) =>
    request<User>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUser: (id: number) =>
    request<void>(`/users/${id}`, { method: "DELETE" }),

  // Reports
  getInvoicingTotal: () => request<number>("/reports/invoicing"),
  getProfitTotal: () => request<number>("/reports/profit"),
  getProfitPeriod: (params: { start: string; end: string } | { month: number; year: number }) => {
    const query = "start" in params
      ? `start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`
      : `month=${encodeURIComponent(String(params.month))}&year=${encodeURIComponent(String(params.year))}`;
    return request<number>(`/reports/profit/period?${query}`);
  },
  getInvoicingPeriod: (start: string, end: string) =>
    request<number>(`/reports/invoicing/period?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),

  getRevenue: async (): Promise<RevenueData> => {
    const total = await request<number>("/reports/invoicing");
    const startOfDay = new Date().toISOString().split("T")[0] + "T00:00:00";
    const endNow = new Date().toISOString();
    const today = await request<number>(`/reports/invoicing/period?start=${encodeURIComponent(startOfDay)}&end=${encodeURIComponent(endNow)}`);
    return { total, today, thisMonth: 0, thisYear: 0 };
  },
  getProfit: async (): Promise<ProfitData> => {
    const total = await request<number>("/reports/profit");
    const revenue = await request<number>("/reports/invoicing");
    // Calcula lucro de hoje via /sales (não existe endpoint por período documentado)
    const sales = await request<Sale[]>("/sales");
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = sales
      .filter((s) => ((s.createdAt ?? s.date ?? "").slice(0, 10) === todayStr) && s.status !== "CANCELED")
      .reduce((sum, s) => sum + (s.profit ?? 0), 0);

    const margin = revenue > 0 ? total / revenue : 0;
    return { total, today, thisMonth: 0, thisYear: 0, margin };
  },

  getTopProducts: () => request<TopProduct[]>("/reports/top-products"),
  getProductMargins: () => request<ProductMargin[]>("/reports/product-margins"),
  getProductsSalesStatus: (params: { start: string; end: string } | { month: number; year: number }) => {
    const query = "start" in params
      ? `start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`
      : `month=${encodeURIComponent(String(params.month))}&year=${encodeURIComponent(String(params.year))}`;
    return request<ProductSalesStatus[]>(`/reports/products/sales-status?${query}`);
  },
  getCashOutflows: (params: { start: string; end: string } | { month: number; year: number }) => {
    const query = "start" in params
      ? `start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`
      : `month=${encodeURIComponent(String(params.month))}&year=${encodeURIComponent(String(params.year))}`;
    return request<CashOutflowsReport>(`/reports/cash-outflows?${query}`);
  },

  // Cash Boxes (ADMIN)
  createCashBox: (data: { businessDate: string; balance: number }) =>
    request<CashBox>("/cash-boxes", { method: "POST", body: JSON.stringify(data) }),
  getCashBoxes: () => request<CashBox[]>("/cash-boxes"),
  getCashBoxesPage: (params?: { page?: number; size?: number; sort?: string }) => {
    const page = params?.page ?? 0;
    const size = params?.size ?? 20;
    const sort = params?.sort ?? "businessDate,desc";
    return request<Page<CashBox>>(`/cash-boxes/page?page=${encodeURIComponent(String(page))}&size=${encodeURIComponent(String(size))}&sort=${encodeURIComponent(sort)}`);
  },
  getCashBoxById: (id: number) => request<CashBox>(`/cash-boxes/${id}`),
  getCashBoxByDate: (date: string) => request<CashBox>(`/cash-boxes?date=${encodeURIComponent(date)}`),
  updateCashBox: (id: number, data: { balance: number }) =>
    request<CashBox>(`/cash-boxes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  addCashBoxOutflow: (cashBoxId: number, data: { description: string; amount: number; occurredAt: string }) =>
    request<CashOutflow>(`/cash-boxes/${cashBoxId}/outflows`, { method: "POST", body: JSON.stringify(data) }),

  // Stock Purchases (ADMIN)
  createStockPurchase: (data: { purchaseDate: string; description: string }) =>
    request<StockPurchase>("/stock-purchases", { method: "POST", body: JSON.stringify(data) }),
  getStockPurchases: (params: { start: string; end: string } | { month: number; year: number }) => {
    const query = "start" in params
      ? `start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`
      : `month=${encodeURIComponent(String(params.month))}&year=${encodeURIComponent(String(params.year))}`;
    return request<StockPurchase[]>(`/stock-purchases?${query}`);
  },
};

// Types
export interface Product {
  id: number;
  name: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  active?: boolean;
}

export interface Sale {
  id: number;
  client: string;
  createdAt?: string;
  // Compat: alguns lugares antigos ainda usam date/totalValue
  date?: string;
  total?: number;
  totalValue?: number;
  costTotal?: number;
  profit?: number;
  status: string; // PENDING | PAID | CANCELED
  paymentMethod?: string;
  paidAt?: string | null;
}

export interface SaleDetail extends Sale {
  saleItems?: {
    id: number;
    saleId: number;
    productId: number;
    productName?: string;
    quantity: number;
    unitPrice: number;
    unitCostPrice?: number;
    subtotal?: number;
    costSubtotal?: number;
  }[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  perfils: string[];
}

export interface RevenueData {
  total: number;
  today: number;
  thisMonth: number;
  thisYear: number;
  byDay?: { date: string; amount: number }[];
  bySale?: { saleId: number; amount: number; date: string }[];
}

export interface ProfitData {
  total: number;
  today: number;
  thisMonth: number;
  thisYear: number;
  margin: number;
  byDay?: { date: string; profit: number }[];
}

export interface TopProduct {
  productName: string;
  totalSold: number;
}

export interface ProductMargin {
  productId?: number;
  productName?: string;
  name?: string;
  costPrice: number;
  salePrice: number;
  margin?: number;
}

export interface ProductSalesStatus {
  productId?: number;
  productName?: string;
  name?: string;
  soldQuantity: number;
  sold: boolean;
}

export interface CashOutflow {
  id?: number;
  description: string;
  amount: number;
  occurredAt: string;
  createdAt?: string;
}

export interface CashOutflowsReport {
  total: number;
  outflows: CashOutflow[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CashBox {
  id: number;
  businessDate: string;
  balance: number;
  createdAt?: string;
  updatedAt?: string;
  outflows?: CashOutflow[];
}

export interface StockPurchase {
  id?: number;
  purchaseDate: string;
  description: string;
}
