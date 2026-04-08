-- WhatsApp Receptionist MVP - Initial Postgres Schema
-- Run with psql against an existing database, for example:
--   psql -U postgres -d sunbronze -f DB/001_initial_postgres_schema.sql
--
-- Optional database creation step:
--   CREATE DATABASE sunbronze;

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS app;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_state') THEN
        CREATE TYPE app.conversation_state AS ENUM (
            'start',
            'choose_service',
            'choose_barber',
            'choose_date',
            'choose_time',
            'confirm_booking',
            'reschedule_lookup',
            'reschedule_choose_time',
            'confirm_reschedule',
            'cancel_lookup',
            'confirm_cancellation',
            'faq',
            'waiting_human',
            'done'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_intent') THEN
        CREATE TYPE app.conversation_intent AS ENUM (
            'book',
            'reschedule',
            'cancel',
            'faq',
            'hours',
            'services',
            'location',
            'human_help',
            'unknown'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        CREATE TYPE app.appointment_status AS ENUM (
            'pending',
            'confirmed',
            'checked_in',
            'completed',
            'cancelled',
            'no_show'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_source') THEN
        CREATE TYPE app.appointment_source AS ENUM (
            'whatsapp',
            'admin_console',
            'walk_in',
            'manual'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_direction') THEN
        CREATE TYPE app.message_direction AS ENUM (
            'inbound',
            'outbound'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
        CREATE TYPE app.message_status AS ENUM (
            'received',
            'queued',
            'sent',
            'delivered',
            'read',
            'failed'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_kind') THEN
        CREATE TYPE app.message_kind AS ENUM (
            'text',
            'template',
            'interactive',
            'image',
            'document',
            'system'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_status') THEN
        CREATE TYPE app.reminder_status AS ENUM (
            'pending',
            'processing',
            'sent',
            'cancelled',
            'failed'
        );
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.sync_appointment_reserved_times()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.reserved_start_at := NEW.scheduled_start_at - (NEW.buffer_before_minutes * INTERVAL '1 minute');
    NEW.reserved_end_at := NEW.scheduled_end_at + (NEW.buffer_after_minutes * INTERVAL '1 minute');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.validate_appointment_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_requires_barber boolean;
    v_requires_resource boolean;
BEGIN
    SELECT
        s.requires_barber,
        s.requires_resource
    INTO
        v_requires_barber,
        v_requires_resource
    FROM app.services s
    WHERE s.id = NEW.service_id;

    IF v_requires_barber IS NULL THEN
        RAISE EXCEPTION 'Service % does not exist', NEW.service_id;
    END IF;

    IF v_requires_barber AND NEW.barber_id IS NULL THEN
        RAISE EXCEPTION 'Service requires a barber';
    END IF;

    IF NOT v_requires_barber AND NEW.barber_id IS NOT NULL THEN
        RAISE EXCEPTION 'Service does not require a barber';
    END IF;

    IF v_requires_resource AND NEW.resource_id IS NULL THEN
        RAISE EXCEPTION 'Service requires a resource';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS app.locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    phone_e164 text,
    email text,
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    postal_code text,
    country_code char(2),
    time_zone text NOT NULL DEFAULT 'America/Costa_Rica',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.barbers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id uuid REFERENCES app.locations(id),
    code text NOT NULL UNIQUE,
    first_name text NOT NULL,
    last_name text,
    display_name text NOT NULL,
    email text,
    phone_e164 text,
    time_zone text NOT NULL DEFAULT 'America/Costa_Rica',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.system_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id uuid REFERENCES app.locations(id),
    barber_id uuid UNIQUE REFERENCES app.barbers(id) ON DELETE SET NULL,
    email text NOT NULL UNIQUE,
    password_hash text,
    first_name text NOT NULL,
    last_name text,
    display_name text NOT NULL,
    phone_e164 text,
    is_active boolean NOT NULL DEFAULT true,
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.user_roles (
    user_id uuid NOT NULL REFERENCES app.system_users(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES app.roles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS app.services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    requires_barber boolean NOT NULL DEFAULT true,
    requires_resource boolean NOT NULL DEFAULT false,
    duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
    buffer_before_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
    buffer_after_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0),
    price_cents integer CHECK (price_cents >= 0),
    currency_code char(3) NOT NULL DEFAULT 'USD',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id uuid NOT NULL REFERENCES app.locations(id) ON DELETE CASCADE,
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    resource_type text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.barber_services (
    barber_id uuid NOT NULL REFERENCES app.barbers(id) ON DELETE CASCADE,
    service_id uuid NOT NULL REFERENCES app.services(id) ON DELETE CASCADE,
    custom_duration_minutes integer CHECK (custom_duration_minutes > 0),
    custom_price_cents integer CHECK (custom_price_cents >= 0),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY (barber_id, service_id)
);

CREATE TABLE IF NOT EXISTS app.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_phone_e164 text NOT NULL UNIQUE,
    first_name text,
    last_name text,
    display_name text,
    preferred_barber_id uuid REFERENCES app.barbers(id),
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.barber_working_hours (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id uuid NOT NULL REFERENCES app.barbers(id) ON DELETE CASCADE,
    weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time time NOT NULL,
    end_time time NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time),
    UNIQUE (barber_id, weekday, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS app.barber_time_off (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    barber_id uuid NOT NULL REFERENCES app.barbers(id) ON DELETE CASCADE,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    reason text,
    is_all_day boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS app.resource_working_hours (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid NOT NULL REFERENCES app.resources(id) ON DELETE CASCADE,
    weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time time NOT NULL,
    end_time time NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time),
    UNIQUE (resource_id, weekday, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS app.resource_time_off (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id uuid NOT NULL REFERENCES app.resources(id) ON DELETE CASCADE,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    reason text,
    is_all_day boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS app.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
    whatsapp_chat_id text NOT NULL UNIQUE,
    state app.conversation_state NOT NULL DEFAULT 'start',
    active_intent app.conversation_intent NOT NULL DEFAULT 'unknown',
    state_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    handed_off_to_human boolean NOT NULL DEFAULT false,
    assigned_staff_user_id uuid REFERENCES app.system_users(id) ON DELETE SET NULL,
    last_inbound_at timestamptz,
    last_outbound_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES app.customers(id),
    barber_id uuid REFERENCES app.barbers(id),
    resource_id uuid REFERENCES app.resources(id),
    service_id uuid NOT NULL REFERENCES app.services(id),
    conversation_id uuid REFERENCES app.conversations(id),
    source app.appointment_source NOT NULL DEFAULT 'whatsapp',
    status app.appointment_status NOT NULL DEFAULT 'pending',
    scheduled_start_at timestamptz NOT NULL,
    scheduled_end_at timestamptz NOT NULL,
    buffer_before_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
    buffer_after_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0),
    reserved_start_at timestamptz NOT NULL,
    reserved_end_at timestamptz NOT NULL,
    notes text,
    internal_notes text,
    cancelled_reason text,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CHECK (scheduled_end_at > scheduled_start_at),
    CHECK (reserved_end_at > reserved_start_at)
);

CREATE TABLE IF NOT EXISTS app.appointment_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id uuid NOT NULL REFERENCES app.appointments(id) ON DELETE CASCADE,
    event_name text NOT NULL,
    actor_type text NOT NULL,
    actor_id text,
    actor_user_id uuid REFERENCES app.system_users(id) ON DELETE SET NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.whatsapp_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES app.conversations(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES app.customers(id) ON DELETE SET NULL,
    appointment_id uuid REFERENCES app.appointments(id) ON DELETE SET NULL,
    direction app.message_direction NOT NULL,
    status app.message_status NOT NULL DEFAULT 'received',
    kind app.message_kind NOT NULL DEFAULT 'text',
    provider_name text NOT NULL DEFAULT 'meta_cloud_api',
    provider_message_id text UNIQUE,
    template_name text,
    body text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_message text,
    sent_at timestamptz,
    delivered_at timestamptz,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.reminder_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id uuid NOT NULL REFERENCES app.appointments(id) ON DELETE CASCADE,
    reminder_type text NOT NULL,
    scheduled_for timestamptz NOT NULL,
    status app.reminder_status NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    sent_message_id uuid REFERENCES app.whatsapp_messages(id),
    last_error text,
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE (appointment_id, reminder_type, scheduled_for)
);

CREATE TABLE IF NOT EXISTS app.audit_log (
    id bigserial PRIMARY KEY,
    entity_type text NOT NULL,
    entity_id uuid,
    action text NOT NULL,
    actor_type text NOT NULL,
    actor_id text,
    actor_user_id uuid REFERENCES app.system_users(id) ON DELETE SET NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barbers_location_id
    ON app.barbers (location_id);

CREATE INDEX IF NOT EXISTS idx_system_users_location_id
    ON app.system_users (location_id);

CREATE INDEX IF NOT EXISTS idx_system_users_barber_id
    ON app.system_users (barber_id);

CREATE INDEX IF NOT EXISTS idx_resources_location_id
    ON app.resources (location_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id
    ON app.user_roles (role_id);

CREATE INDEX IF NOT EXISTS idx_barber_services_service_id
    ON app.barber_services (service_id);

CREATE INDEX IF NOT EXISTS idx_customers_preferred_barber_id
    ON app.customers (preferred_barber_id);

CREATE INDEX IF NOT EXISTS idx_barber_working_hours_barber_weekday
    ON app.barber_working_hours (barber_id, weekday);

CREATE INDEX IF NOT EXISTS idx_barber_time_off_barber_starts_at
    ON app.barber_time_off (barber_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_resource_working_hours_resource_weekday
    ON app.resource_working_hours (resource_id, weekday);

CREATE INDEX IF NOT EXISTS idx_resource_time_off_resource_starts_at
    ON app.resource_time_off (resource_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_conversations_customer_id
    ON app.conversations (customer_id);

CREATE INDEX IF NOT EXISTS idx_conversations_state
    ON app.conversations (state);

CREATE INDEX IF NOT EXISTS idx_conversations_assigned_staff_user_id
    ON app.conversations (assigned_staff_user_id);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_id
    ON app.appointments (customer_id);

CREATE INDEX IF NOT EXISTS idx_appointments_barber_id
    ON app.appointments (barber_id);

CREATE INDEX IF NOT EXISTS idx_appointments_resource_id
    ON app.appointments (resource_id);

CREATE INDEX IF NOT EXISTS idx_appointments_service_id
    ON app.appointments (service_id);

CREATE INDEX IF NOT EXISTS idx_appointments_start_at
    ON app.appointments (scheduled_start_at);

CREATE INDEX IF NOT EXISTS idx_appointments_status
    ON app.appointments (status);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at
    ON app.whatsapp_messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_customer_id_created_at
    ON app.whatsapp_messages (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminder_jobs_status_scheduled_for
    ON app.reminder_jobs (status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
    ON app.audit_log (entity_type, entity_id, created_at DESC);

ALTER TABLE app.appointments
    DROP CONSTRAINT IF EXISTS appointments_no_overlap;

ALTER TABLE app.appointments
    ADD CONSTRAINT appointments_no_overlap
    EXCLUDE USING gist (
        barber_id WITH =,
        tstzrange(reserved_start_at, reserved_end_at, '[)') WITH &&
    )
    WHERE (barber_id IS NOT NULL AND status IN ('pending', 'confirmed', 'checked_in'));

ALTER TABLE app.appointments
    DROP CONSTRAINT IF EXISTS appointments_resource_no_overlap;

ALTER TABLE app.appointments
    ADD CONSTRAINT appointments_resource_no_overlap
    EXCLUDE USING gist (
        resource_id WITH =,
        tstzrange(reserved_start_at, reserved_end_at, '[)') WITH &&
    )
    WHERE (resource_id IS NOT NULL AND status IN ('pending', 'confirmed', 'checked_in'));

DROP TRIGGER IF EXISTS trg_locations_set_updated_at ON app.locations;
CREATE TRIGGER trg_locations_set_updated_at
BEFORE UPDATE ON app.locations
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_barbers_set_updated_at ON app.barbers;
CREATE TRIGGER trg_barbers_set_updated_at
BEFORE UPDATE ON app.barbers
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_system_users_set_updated_at ON app.system_users;
CREATE TRIGGER trg_system_users_set_updated_at
BEFORE UPDATE ON app.system_users
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_roles_set_updated_at ON app.roles;
CREATE TRIGGER trg_roles_set_updated_at
BEFORE UPDATE ON app.roles
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_roles_set_updated_at ON app.user_roles;
CREATE TRIGGER trg_user_roles_set_updated_at
BEFORE UPDATE ON app.user_roles
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_services_set_updated_at ON app.services;
CREATE TRIGGER trg_services_set_updated_at
BEFORE UPDATE ON app.services
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_resources_set_updated_at ON app.resources;
CREATE TRIGGER trg_resources_set_updated_at
BEFORE UPDATE ON app.resources
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_barber_services_set_updated_at ON app.barber_services;
CREATE TRIGGER trg_barber_services_set_updated_at
BEFORE UPDATE ON app.barber_services
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_set_updated_at ON app.customers;
CREATE TRIGGER trg_customers_set_updated_at
BEFORE UPDATE ON app.customers
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_barber_working_hours_set_updated_at ON app.barber_working_hours;
CREATE TRIGGER trg_barber_working_hours_set_updated_at
BEFORE UPDATE ON app.barber_working_hours
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_barber_time_off_set_updated_at ON app.barber_time_off;
CREATE TRIGGER trg_barber_time_off_set_updated_at
BEFORE UPDATE ON app.barber_time_off
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_resource_working_hours_set_updated_at ON app.resource_working_hours;
CREATE TRIGGER trg_resource_working_hours_set_updated_at
BEFORE UPDATE ON app.resource_working_hours
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_resource_time_off_set_updated_at ON app.resource_time_off;
CREATE TRIGGER trg_resource_time_off_set_updated_at
BEFORE UPDATE ON app.resource_time_off
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_conversations_set_updated_at ON app.conversations;
CREATE TRIGGER trg_conversations_set_updated_at
BEFORE UPDATE ON app.conversations
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_appointments_set_updated_at ON app.appointments;
CREATE TRIGGER trg_appointments_set_updated_at
BEFORE UPDATE ON app.appointments
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS trg_appointments_sync_reserved_times ON app.appointments;
CREATE TRIGGER trg_appointments_sync_reserved_times
BEFORE INSERT OR UPDATE OF scheduled_start_at, scheduled_end_at, buffer_before_minutes, buffer_after_minutes
ON app.appointments
FOR EACH ROW
EXECUTE FUNCTION app.sync_appointment_reserved_times();

DROP TRIGGER IF EXISTS trg_appointments_validate_assignment ON app.appointments;
CREATE TRIGGER trg_appointments_validate_assignment
BEFORE INSERT OR UPDATE OF service_id, barber_id, resource_id
ON app.appointments
FOR EACH ROW
EXECUTE FUNCTION app.validate_appointment_assignment();

DROP TRIGGER IF EXISTS trg_reminder_jobs_set_updated_at ON app.reminder_jobs;
CREATE TRIGGER trg_reminder_jobs_set_updated_at
BEFORE UPDATE ON app.reminder_jobs
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

INSERT INTO app.roles (code, name, description)
VALUES
    ('owner', 'Owner', 'Full business and configuration access'),
    ('admin', 'Admin', 'Administrative access to schedules, customers, and reporting'),
    ('receptionist', 'Receptionist', 'Can manage conversations, bookings, and customer support'),
    ('barber', 'Barber', 'Can view and manage their own schedule')
ON CONFLICT (code) DO NOTHING;

COMMIT;
