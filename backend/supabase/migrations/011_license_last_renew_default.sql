-- Set license_last_renew for existing venues that don't have it yet
UPDATE venues SET license_last_renew = now() WHERE license_last_renew IS NULL AND status = 'active';
