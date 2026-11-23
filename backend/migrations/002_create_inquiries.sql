
CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    customer_name VARCHAR(150) NOT NULL,

    contact_method VARCHAR(30) NOT NULL
        CHECK (contact_method IN ('PHONE', 'EMAIL', 'WHATSAPP')),

    contact VARCHAR(255) NOT NULL,

    normalized_contact VARCHAR(255) NOT NULL,

    subject VARCHAR(200) NOT NULL,

    description TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'NEW'
        CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),

    created_by UUID NOT NULL
        REFERENCES users(id),

    updated_by UUID
        REFERENCES users(id),

    resolved_by UUID
        REFERENCES users(id),

    version INTEGER NOT NULL DEFAULT 1
        CHECK (version > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inquiries_status
    ON inquiries(status);

CREATE INDEX idx_inquiries_created_at
    ON inquiries(created_at DESC);

CREATE INDEX idx_inquiries_normalized_contact
    ON inquiries(normalized_contact);
