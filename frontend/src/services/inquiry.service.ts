import { api } from "@/lib/api";
import type {
  InquiryDetails,
  InquiryFilters,
  InquiryListItem,
  InquiryStatus,
  Pagination,
  InquiryDuplicate,
  ContactMethod,
} from "@/types/inquiry";

export async function listInquiries(filters: InquiryFilters = {}) {
  const { data } = await api.get<{ success: boolean; data: InquiryListItem[]; pagination: Pagination }>("/inquiries", {
    params: filters,
  });
  return data;
}

export type CreateInquiryInput = {
  customerName: string;
  contactMethod: ContactMethod;
  contact: string;
  subject: string;
  description: string;
  confirmDuplicate?: boolean;
};

export async function checkDuplicateInquiries(contact: string, contactMethod: ContactMethod) {
  const { data } = await api.post<{
    success: boolean;
    hasDuplicates: boolean;
    data: InquiryDuplicate[];
  }>("/inquiries/check-duplicates", { contact, contactMethod });
  return data;
}

export async function createInquiry(input: CreateInquiryInput) {
  const { data } = await api.post<{ success: boolean; data: InquiryListItem }>("/inquiries", input);
  return data.data;
}

export async function getInquiry(id: string) {
  const { data } = await api.get<{ success: boolean; data: InquiryDetails }>(`/inquiries/${id}`);
  return data.data;
}

export async function updateInquiryStatus(id: string, status: InquiryStatus, version: number) {
  const { data } = await api.patch<{ success: boolean; data: InquiryDetails }>(
    `/inquiries/${id}/status`,
    { status, version },
  );
  return data.data;
}

export async function deleteInquiry(id: string) {
  await api.delete(`/inquiries/${id}`);
}
