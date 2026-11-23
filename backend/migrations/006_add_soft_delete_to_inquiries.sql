
ALTER TABLE inquiries
ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE inquiries
ADD COLUMN deleted_by UUID REFERENCES users(id);

ALTER TABLE inquiries
ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE inquiries
ADD CONSTRAINT chk_inquiries_soft_delete_metadata
CHECK (
    (is_deleted = FALSE AND deleted_by IS NULL AND deleted_at IS NULL)
    OR
    (is_deleted = TRUE AND deleted_by IS NOT NULL AND deleted_at IS NOT NULL)
);

CREATE INDEX idx_inquiries_active_created_at
ON inquiries(created_at DESC)
WHERE is_deleted = FALSE;

CREATE INDEX idx_inquiries_active_normalized_contact
ON inquiries(normalized_contact)
WHERE is_deleted = FALSE;
