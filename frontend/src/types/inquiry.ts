export type InquiryStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";
export type ContactMethod = "PHONE" | "EMAIL" | "WHATSAPP";

export type InquiryListItem = {
  id: string;
  customer_name: string;
  contact_method: ContactMethod;
  contact: string;
  subject: string;
  status: InquiryStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InquiryDuplicate = {
  id: string;
  customer_name: string;
  subject: string;
  status: InquiryStatus;
  created_at: string;
};

export type InquiryStatusHistoryItem = {
  id: string;
  from_status: InquiryStatus | null;
  to_status: InquiryStatus;
  changed_at: string;
  changed_by: string;
  changed_by_name: string;
};

export type InquiryDetails = InquiryListItem & {
  description: string;
  created_by_name: string;
  updated_by: string | null;
  updated_by_name: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  version: number;
  history: InquiryStatusHistoryItem[];
};

export type InquiryFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: InquiryStatus;
  sortBy?: "created_at" | "customer_name";
  sortOrder?: "asc" | "desc";
};
