import axios from "axios";
import { create } from "zustand";
import { api } from "@/lib/api";

export type InquiryStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";

export type Inquiry = {
  id: string;
  customer_name: string;
  contact_method: string;
  contact: string;
  subject: string;
  status: InquiryStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type User = {
  id: string;
  role: "ADMIN" | "STAFF";
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type InquiryInput = {
  customerName: string;
  contactMethod: "PHONE" | "EMAIL" | "WHATSAPP";
  contact: string;
  subject: string;
  description: string;
  confirmDuplicate?: boolean;
};

type InquiryStore = {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  inquiries: Inquiry[];
  pagination: Pagination;
  counts: Record<InquiryStatus, number>;
  page: number;
  search: string;
  status: InquiryStatus | "";
  isLoading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadInquiries: () => Promise<void>;
  createInquiry: (input: InquiryInput) => Promise<void>;
  advanceStatus: (inquiry: Inquiry) => Promise<void>;
  setSearch: (search: string) => void;
  setStatus: (status: InquiryStatus | "") => void;
  setPage: (page: number) => void;
  clearError: () => void;
};

const emptyCounts: Record<InquiryStatus, number> = {
  NEW: 0,
  IN_PROGRESS: 0,
  RESOLVED: 0,
};

export const useInquiryStore = create<InquiryStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,
  authError: null,
  inquiries: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  counts: emptyCounts,
  page: 1,
  search: "",
  status: "",
  isLoading: false,
  error: null,

  bootstrap: async () => {
    set({ isAuthLoading: true, authError: null });
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.data.user, isAuthenticated: true });
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        set({
          isAuthLoading: false,
          authError: "Unable to connect to the server. Check your API configuration and try again.",
        });
        return;
      }

      try {
        const { data } = await api.post("/auth/refresh");
        set({ user: data.data.user, isAuthenticated: true });
      } catch (refreshError) {
        if (
          axios.isAxiosError(refreshError) &&
          refreshError.response?.status === 401
        ) {
          set({ user: null, isAuthenticated: false });
        } else {
          set({
            authError: "Unable to connect to the server. Check your API configuration and try again.",
          });
        }
      }
    } finally {
      set({ isAuthLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    set({
      user: data.data.user,
      isAuthenticated: true,
      authError: null,
      error: null,
      page: 1,
    });
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        inquiries: [],
        counts: emptyCounts,
        error: null,
      });
    }
  },

  loadInquiries: async () => {
    const { page, search, status } = get();
    set({ isLoading: true, error: null });

    try {
      const [listResponse, ...countResponses] = await Promise.all([
        api.get("/inquiries", {
          params: { page, limit: 10, search: search || undefined, status: status || undefined },
        }),
        ...(["NEW", "IN_PROGRESS", "RESOLVED"] as const).map((currentStatus) =>
          api.get("/inquiries", {
            params: { page: 1, limit: 1, status: currentStatus },
          }),
        ),
      ]);

      set({
        inquiries: listResponse.data.data,
        pagination: listResponse.data.pagination,
        counts: {
          NEW: countResponses[0].data.pagination.total,
          IN_PROGRESS: countResponses[1].data.pagination.total,
          RESOLVED: countResponses[2].data.pagination.total,
        },
      });
    } catch (error) {
      set({
        error: axios.isAxiosError(error) && error.response?.status === 401
          ? "Your session has expired. Please sign in again."
          : axios.isAxiosError<{ message?: string }>(error)
            ? error.response?.data?.message ?? "Could not load inquiries. Please try again."
            : "Could not load inquiries. Please try again.",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  createInquiry: async (input) => {
    await api.post("/inquiries", input);
    set({ page: 1 });
    await get().loadInquiries();
  },

  advanceStatus: async (inquiry) => {
    const nextStatus: Record<InquiryStatus, InquiryStatus | null> = {
      NEW: "IN_PROGRESS",
      IN_PROGRESS: "RESOLVED",
      RESOLVED: null,
    };
    const status = nextStatus[inquiry.status];
    if (!status) return;

    const { data } = await api.get(`/inquiries/${inquiry.id}`);
    await api.patch(`/inquiries/${inquiry.id}/status`, {
      status,
      version: data.data.version,
    });
    await get().loadInquiries();
  },

  setSearch: (search) => set({ search, page: 1 }),
  setStatus: (status) => set({ status, page: 1 }),
  setPage: (page) => set({ page }),
  clearError: () => set({ error: null }),
}));
