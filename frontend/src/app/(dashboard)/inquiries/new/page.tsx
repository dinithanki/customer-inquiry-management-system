"use client";

import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangle, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { checkDuplicateInquiries, createInquiry } from "@/services/inquiry.service";
import type { InquiryDuplicate } from "@/types/inquiry";
import { getApiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { inquirySchema, type InquiryValues } from "@/schemas/inquiry.schema";

const DUPLICATE_PREVIEW_LIMIT = 3;

export default function NewInquiryPage() {
  const router = useRouter();
  const [duplicates, setDuplicates] = useState<InquiryDuplicate[]>([]);
  const [showAllDuplicates, setShowAllDuplicates] = useState(false);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InquiryValues>({
    resolver: zodResolver(inquirySchema),
  });

  const submit = async (values: InquiryValues) => {
    setServerError("");
    try {
      if (duplicates.length === 0) {
        const result = await checkDuplicateInquiries(values.contact, values.contactMethod);
        if (result.hasDuplicates) {
          setShowAllDuplicates(false);
          setDuplicates(result.data);
          return;
        }
      }
      await createInquiry({ ...values, confirmDuplicate: duplicates.length > 0 });
      reset();
      setDuplicates([]);
      setShowAllDuplicates(false);
      router.push("/inquiries");
    } catch (error) {
      if (axios.isAxiosError<{ duplicates?: InquiryDuplicate[] }>(error) && error.response?.status === 409) {
        setShowAllDuplicates(false);
        setDuplicates(error.response.data.duplicates ?? []);
      }
      setServerError(getApiErrorMessage(error));
    }
  };

  const visibleDuplicates = showAllDuplicates ? duplicates : duplicates.slice(0, DUPLICATE_PREVIEW_LIMIT);

  return (
    <>
      <PageHeader title="New Inquiry" description="Create a customer inquiry." />
      <section className="mb-4 rounded-xl border border-border bg-card pb-[18px] shadow-card">
        {serverError && <div className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 px-3 py-[11px] text-xs leading-[1.5] text-red-700">{serverError}</div>}
        {duplicates.length > 0 && (
          <div className="mx-5 my-4 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm" role="alert" aria-labelledby="duplicate-inquiries-title">
            <div className="flex items-start gap-3 bg-amber-50/80 px-4 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id="duplicate-inquiries-title" className="m-0 text-sm font-bold text-amber-950">Potential duplicate inquiries found</h2>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                    {duplicates.length} {duplicates.length === 1 ? "match" : "matches"}
                  </span>
                </div>
                <p className="mb-0 mt-1 text-xs leading-[1.5] text-amber-900/80">
                  These inquiries use the same contact information.
                </p>
              </div>
            </div>
            <ul id="duplicate-inquiries-list" className="m-0 divide-y divide-slate-100 p-0">
              {visibleDuplicates.map((item) => (
                <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={item.id}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500" aria-hidden="true">
                      <FileText size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-[13px] font-semibold text-slate-800">{item.customer_name}</p>
                      <p className="mb-0 mt-0.5 truncate text-xs text-slate-500">{item.subject}</p>
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
            {duplicates.length > DUPLICATE_PREVIEW_LIMIT && (
              <button
                className="mx-auto my-2 flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-50"
                type="button"
                aria-controls="duplicate-inquiries-list"
                aria-expanded={showAllDuplicates}
                onClick={() => setShowAllDuplicates((showAll) => !showAll)}
              >
                {showAllDuplicates ? "Show fewer" : `Show all ${duplicates.length} matches`}
                {showAllDuplicates ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
              </button>
            )}
            <p className="m-0 border-t border-amber-100 bg-amber-50/50 px-4 py-3 text-xs leading-[1.5] text-amber-900">
              Review the matches, then submit again to confirm creation.
            </p>
          </div>
        )}
        <form className="grid gap-[14px] px-5 pt-[18px]" onSubmit={handleSubmit(submit)} noValidate>
          <label className="grid gap-[7px] text-xs font-semibold text-slate-600">Customer name
            <input className="h-[42px] w-full rounded-lg border border-border bg-white px-[11px] text-[13px] font-normal text-text" {...register("customerName")} />
            {errors.customerName && <span className="text-[11px] font-normal text-error">{errors.customerName.message}</span>}
          </label>
          <div className="grid grid-cols-2 gap-[14px] max-[760px]:grid-cols-1">
            <label className="grid gap-[7px] text-xs font-semibold text-slate-600">Contact method
              <select className="h-[42px] w-full rounded-lg border border-border bg-white px-[11px] text-[13px] font-normal text-text" {...register("contactMethod")}><option value="PHONE">Phone</option><option value="EMAIL">Email</option><option value="WHATSAPP">WhatsApp</option></select>
            </label>
            <label className="grid gap-[7px] text-xs font-semibold text-slate-600">Contact information
              <input className="h-[42px] w-full rounded-lg border border-border bg-white px-[11px] text-[13px] font-normal text-text" {...register("contact")} />
              {errors.contact && <span className="text-[11px] font-normal text-error">{errors.contact.message}</span>}
            </label>
          </div>
          <label className="grid gap-[7px] text-xs font-semibold text-slate-600">Subject
            <input className="h-[42px] w-full rounded-lg border border-border bg-white px-[11px] text-[13px] font-normal text-text" {...register("subject")} />
            {errors.subject && <span className="text-[11px] font-normal text-error">{errors.subject.message}</span>}
          </label>
          <label className="grid gap-[7px] text-xs font-semibold text-slate-600">Description
            <textarea className="min-h-[130px] w-full resize-y rounded-lg border border-border bg-white px-[11px] py-2.5 text-[13px] font-normal text-text" {...register("description")} />
            {errors.description && <span className="text-[11px] font-normal text-error">{errors.description.message}</span>}
          </label>
          <div className="mt-1 flex justify-end gap-2 border-t border-border pt-[14px]">
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-[14px] text-[13px] font-semibold text-text hover:border-slate-300 hover:bg-surface-muted" type="button" onClick={() => router.back()} disabled={isSubmitting}>Cancel</button>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-[14px] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.16)] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : duplicates.length > 0 ? "Confirm & Create" : "Create Inquiry"}</button>
          </div>
        </form>
      </section>
    </>
  );
}
