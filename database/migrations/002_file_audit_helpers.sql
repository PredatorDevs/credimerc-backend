-- 002_file_audit_helpers.sql
-- Helper para registrar eventos de archivos en audit_logs

DELIMITER $$

CREATE PROCEDURE usp_audit_file_event (
    IN p_company_id BIGINT UNSIGNED,
    IN p_user_id BIGINT UNSIGNED,
    IN p_company_user_id BIGINT UNSIGNED,
    IN p_action VARCHAR(100),
    IN p_entity_id BIGINT UNSIGNED,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent VARCHAR(500),
    IN p_attachment_public_id CHAR(36),
    IN p_owner_type VARCHAR(50),
    IN p_owner_id BIGINT UNSIGNED,
    IN p_category VARCHAR(50),
    IN p_object_key VARCHAR(1024),
    IN p_mime_type VARCHAR(100),
    IN p_size_bytes BIGINT UNSIGNED
)
BEGIN
    INSERT INTO audit_logs (
        company_id,
        user_id,
        company_user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        created_at
    )
    VALUES (
        p_company_id,
        p_user_id,
        p_company_user_id,
        p_action,
        'attachment',
        p_entity_id,
        NULL,
        JSON_OBJECT(
            'attachment_public_id', p_attachment_public_id,
            'owner_type', p_owner_type,
            'owner_id', p_owner_id,
            'category', p_category,
            'object_key', p_object_key,
            'mime_type', p_mime_type,
            'size_bytes', p_size_bytes
        ),
        p_ip_address,
        p_user_agent,
        CURRENT_TIMESTAMP
    );
END$$

DELIMITER ;
