-- Creates one database per service. Runs once, on first initialization of the
-- Postgres data volume (mounted into /docker-entrypoint-initdb.d). Each service
-- then syncs its own schema with `prisma db push` on startup.
CREATE DATABASE auth;
CREATE DATABASE restaurants;
CREATE DATABASE orders;
CREATE DATABASE payments;
CREATE DATABASE delivery;
CREATE DATABASE notifications;
