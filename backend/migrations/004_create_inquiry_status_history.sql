
CREATE TABLE inquiry_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    inquiry_id UUID NOT NULL
        REFERENCES inquiries(id) ON DELETE CASCADE,

    changed_by UUID NOT NULL
        REFERENCES users(id),

    from_status VARCHAR(20),

    to_status VARCHAR(20) NOT NULL
        CHECK (to_status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),

    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_from_status CHECK (
        from_status IS NULL OR
        from_status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')
    )
);

CREATE INDEX idx_inquiry_status_history_inquiry
    ON inquiry_status_history(inquiry_id, changed_at DESC);

CREATE INDEX idx_inquiry_status_history_changed_by
    ON inquiry_status_history(changed_by);
