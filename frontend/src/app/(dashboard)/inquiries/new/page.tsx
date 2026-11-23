"use client";

import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { checkDuplicateInquiries, createInquiry } from "@/services/inquiry.service";
import type { InquiryDuplicate } from "@/types/inquiry";
import { getApiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { inquirySchema, type InquiryValues } from "@/schemas/inquiry.schema";

export default function NewInquiryPage() {
  const router = useRouter();
  const [duplicates, setDuplicates] = useState<InquiryDuplicate[]>([]);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InquiryValues>({
    resolver: zodResolver(inquirySchema),
  });

  const submit = async (values: InquiryValues) => {
    setServerError("");
    setSuccess("");
    try {
      if (duplicates.length === 0) {
        const result = await checkDuplicateInquiries(values.contact, values.contactMethod);
        if (result.hasDuplicates) {
          setDuplicates(result.data);
          return;
        }
      }
      await createInquiry({ ...values, confirmDuplicate: duplicates.length > 0 });
      reset();
      setDuplicates([]);
      setSuccess("Inquiry created successfully.");
      router.push("/inquiries");
    } catch (error) {
      if (axios.isAxiosError<{ duplicates?: InquiryDuplicate[] }>(error) && error.response?.status === 409) {
        setDuplicates(error.response.data.duplicates ?? []);
      }
      setServerError(getApiErrorMessage(error));
    }
  };

  return (
    <>
      <PageHeader title="New Inquiry" description="Create a customer inquiry." />
      <section className="panel form-panel">
        {serverError && <div className="error-banner">{serverError}</div>}
        {success && <div className="success-banner">{success}</div>}
        {duplicates.length > 0 && (
          <div className="warning-banner">
            <strong>Potential duplicate inquiries found</strong>
            <ul>{duplicates.map((item) => <li key={item.id}>{item.customer_name} - {item.subject} ({item.status})</li>)}</ul>
            <span>Review the matches, then submit again to confirm creation.</span>
          </div>
        )}
        <form className="inquiry-form" onSubmit={handleSubmit(submit)} noValidate>
          <label className="form-label">Customer name
            <input className="form-input" {...register("customerName")} />
            {errors.customerName && <span className="field-error">{errors.customerName.message}</span>}
          </label>
          <div className="form-row">
            <label className="form-label">Contact method
              <select className="form-input" {...register("contactMethod")}><option value="PHONE">Phone</option><option value="EMAIL">Email</option><option value="WHATSAPP">WhatsApp</option></select>
            </label>
            <label className="form-label">Contact information
              <input className="form-input" {...register("contact")} />
              {errors.contact && <span className="field-error">{errors.contact.message}</span>}
            </label>
          </div>
          <label className="form-label">Subject
            <input className="form-input" {...register("subject")} />
            {errors.subject && <span className="field-error">{errors.subject.message}</span>}
          </label>
          <label className="form-label">Description
            <textarea className="form-textarea" {...register("description")} />
            {errors.description && <span className="field-error">{errors.description.message}</span>}
          </label>
          <div className="modal-actions">
            <button className="button button-secondary" type="button" onClick={() => router.back()} disabled={isSubmitting}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : duplicates.length > 0 ? "Confirm & Create" : "Create Inquiry"}</button>
          </div>
        </form>
      </section>
    </>
  );
}
