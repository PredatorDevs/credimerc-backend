-- 001_attachments.sql
-- Modulo de adjuntos para CrediMerc (MySQL 8+)

CREATE TABLE IF NOT EXISTS attachments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    public_id CHAR(36) NOT NULL,

    owner_type ENUM('USER', 'COMPANY_USER', 'CUSTOMER', 'LOAN_PAYMENT', 'COLLECTION_VISIT') NOT NULL,
    owner_id BIGINT UNSIGNED NOT NULL,

    category ENUM(
        'PROFILE_PHOTO',
        'ID_FRONT',
        'ID_BACK',
        'SELFIE_VERIFICATION',
        'SUPPORTING_DOCUMENT'
    ) NOT NULL,

    storage_provider ENUM('S3') NOT NULL DEFAULT 'S3',
    bucket_name VARCHAR(120) NOT NULL,
    object_key VARCHAR(1024) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_extension VARCHAR(20) NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    checksum_sha256 CHAR(64) NULL,

    visibility ENUM('PRIVATE', 'INTERNAL') NOT NULL DEFAULT 'PRIVATE',
    status ENUM('UPLOADING', 'ACTIVE', 'REJECTED', 'DELETED') NOT NULL DEFAULT 'UPLOADING',

    uploaded_by_company_user_id BIGINT UNSIGNED NULL,
    reviewed_by_company_user_id BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    review_notes VARCHAR(500) NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_attachments_public_id (public_id),
    UNIQUE KEY uq_attachments_company_id_id (company_id, id),
    UNIQUE KEY uq_attachments_bucket_object (bucket_name, object_key),
    KEY idx_attachments_company_owner (company_id, owner_type, owner_id),
    KEY idx_attachments_company_category (company_id, category),
    KEY idx_attachments_company_status (company_id, status),

    CONSTRAINT fk_attachments_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id),

    CONSTRAINT fk_attachments_uploaded_by
        FOREIGN KEY (company_id, uploaded_by_company_user_id)
        REFERENCES company_users(company_id, id),

    CONSTRAINT fk_attachments_reviewed_by
        FOREIGN KEY (company_id, reviewed_by_company_user_id)
        REFERENCES company_users(company_id, id),

    CONSTRAINT chk_attachments_size
        CHECK (size_bytes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permisos RBAC sugeridos para modulo de archivos
INSERT INTO permissions (code, module, action, description) VALUES
('files.profile.upload', 'files', 'upload_profile', 'Subir foto de perfil'),
('files.profile.view', 'files', 'view_profile', 'Ver foto de perfil'),
('files.profile.delete', 'files', 'delete_profile', 'Eliminar foto de perfil'),
('files.id.upload', 'files', 'upload_id', 'Subir documento de identidad'),
('files.id.view', 'files', 'view_id', 'Ver documento de identidad'),
('files.id.review', 'files', 'review_id', 'Revisar y aprobar documento de identidad'),
('files.id.delete', 'files', 'delete_id', 'Eliminar documento de identidad'),
('files.supporting.upload', 'files', 'upload_support', 'Subir documento de respaldo'),
('files.supporting.view', 'files', 'view_support', 'Ver documento de respaldo'),
('files.supporting.delete', 'files', 'delete_support', 'Eliminar documento de respaldo')
ON DUPLICATE KEY UPDATE
    module = VALUES(module),
    action = VALUES(action),
    description = VALUES(description);
