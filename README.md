# Eatzy — Food Delivery Microservices Backend

A food delivery backend built as a set of independent Node.js microservices behind a single API gateway. Each service owns its database, services communicate over HTTP and an asynchronous event queue, and a JWT issued by the auth service flows through the gateway as a trusted identity header to every downstream service.

## Architecture

```
                         ┌─────────────────────────┐
        Client  ───────▶ │   Gateway  (port 3000)  │
                         │  JWT verify + x-user-id  │
                         └────────────┬─────────────┘
                                      │ reverse proxy
        ┌──────────────┬──────────────┼──────────────┬──────────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼              ▼
     auth          restaurants     orders         payments       delivery     notifications
    (3001)           (3002)        (3003)          (3004)         (3005)          (3006)
        │              │              │              │              │              │
        └──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
                      PostgreSQL (one database per service)   +   Redis (event queue)
```

| Service        | Port | Responsibility                                                        |
| -------------- | ---- | --------------------------------------------------------------------- |
| gateway        | 3000 | Single entry point. Verifies JWTs, injects identity, reverse-proxies. |
| auth           | 3001 | Registration, login, JWT issuance, user lookup.                       |
| restaurants    | 3002 | Restaurants, menus, reviews, and ownership.                           |
| orders         | 3003 | Cart/order placement and the order lifecycle.                         |
| payments       | 3004 | Stripe payments, refunds, and webhooks.                               |
| delivery       | 3005 | Delivery assignment, driver location, and status.                     |
| notifications  | 3006 | Event-driven email notifications.                                     |

## Tech Stack

- **Runtime:** Node.js 22, TypeScript
- **Framework:** Fastify 5
- **Data:** PostgreSQL with Prisma 7 (driver adapter `@prisma/adapter-pg`)
- **Messaging:** Redis with BullMQ
- **Auth:** `@fastify/jwt` (HS256), bcrypt password hashing
- **Gateway proxy:** `@fastify/http-proxy`, `@fastify/cors`, `@fastify/rate-limit`
- **Payments:** Stripe (with a local mock fallback)
- **Email:** Nodemailer (SMTP / SendGrid, with an Ethereal fallback)

## Authentication and Authorization

1. The auth service issues an HS256 JWT with the payload `{ id, email, role }`, signed with `JWT_SECRET`.
2. The gateway verifies the JWT, strips any client-supplied identity headers, and forwards the user id and role to downstream services as `x-user-id` and `x-user-role`.
3. Downstream services trust those headers for authorization. They never parse the token themselves.

`JWT_SECRET` must be identical for the gateway and the auth service, or token verification fails.

**Roles:** `CUSTOMER`, `OWNER`, `DELIVERY`, `ADMIN`.

**Public routes** (no token required): `POST /auth/register`, `POST /auth/login`, `GET` restaurant reads, and `POST /payments/webhook` (verified by Stripe signature instead). Everything else requires a valid token.

## Event-Driven Notifications

State changes are published to a Redis (BullMQ) queue and consumed asynchronously by the notifications service, which resolves the recipient's email, renders a template, and sends it. Publishing is fire-and-forget, so a broker or email outage never affects the main request flow.

| Event                  | Published by | When                          |
| ---------------------- | ------------ | ----------------------------- |
| `ORDER_PLACED`         | orders       | An order is created.          |
| `ORDER_STATUS_CHANGED` | orders       | An order's status changes.    |
| `PAYMENT_SUCCEEDED`    | payments     | A payment webhook succeeds.   |
| `PAYMENT_REFUNDED`     | payments     | A payment is refunded.        |
| `DELIVERY_ASSIGNED`    | delivery     | A driver takes a delivery.    |

## Getting Started with Docker (recommended)

Requires Docker Desktop.

```bash
docker compose up --build
```

This starts all seven services plus PostgreSQL and Redis, creates the per-service databases, syncs each schema, and waits for dependencies to be healthy. The gateway is then available at `http://localhost:3000`.

The stack runs with no configuration. To override defaults (secrets, Stripe, SMTP), copy `.env.example` to `.env` and edit it.

Notes:
- PostgreSQL is published on host port `5433` and Redis on `6380` to avoid clashing with local instances. Services reach them internally on the standard ports.
- With no Stripe key, payments run in mock mode. With no SMTP host, notifications use an Ethereal test account.

## Running Locally without Docker

Requires Node.js 22, a local PostgreSQL (default `postgres` / `1234` on `5432`), and a local Redis on `6379`.

1. Create one database per service: `auth`, `restaurants`, `orders`, `payments`, `delivery`, `notifications`.
2. Create a `.env` file in each service directory (see Environment Variables below).
3. For each service:

   ```bash
   cd <service>
   npm install
   npx prisma generate     # Prisma services only
   npx prisma db push      # Prisma services only
   npm start               # builds, then starts on the service's port
   ```

The gateway has no database. Start it with `npm run build && npm start`.

Start order does not matter for boot, but cross-service calls require the dependencies to be running, so start the gateway after the backends.

## Environment Variables

Environment files are not committed. Each service reads its own `.env`.

| Service       | Variables                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------- |
| gateway       | `PORT`, `HOST`, `JWT_SECRET`, `AUTH_URL`, `RESTAURANTS_URL`, `ORDERS_URL`, `PAYMENTS_URL`, `DELIVERY_URL`, `NOTIFICATIONS_URL` |
| auth          | `DATABASE_URL`, `JWT_SECRET`                                                                        |
| restaurants   | `DATABASE_URL`                                                                                      |
| orders        | `DATABASE_URL`, `RESTAURANTS_URL`, `REDIS_URL`                                                      |
| payments      | `DATABASE_URL`, `ORDERS_URL`, `REDIS_URL`, `PAYMENT_CURRENCY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| delivery      | `DATABASE_URL`, `ORDERS_URL`, `REDIS_URL`                                                           |
| notifications | `DATABASE_URL`, `REDIS_URL`, `AUTH_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |

## API Reference

All routes are accessed through the gateway at `http://localhost:3000`.

### Auth
| Method | Path             | Access  | Description                  |
| ------ | ---------------- | ------- | ---------------------------- |
| POST   | `/auth/register` | Public  | Create a user, returns a JWT |
| POST   | `/auth/login`    | Public  | Authenticate, returns a JWT  |
| GET    | `/auth/me`       | Auth    | Current user profile         |

### Restaurants
| Method | Path                | Access | Description              |
| ------ | ------------------- | ------ | ------------------------ |
| GET    | `/restaurants`      | Public | List restaurants (paged) |
| POST   | `/restaurant`       | Owner  | Create a restaurant      |
| GET    | `/restaurant/:id`   | Public | Get a restaurant         |
| PUT    | `/restaurant/:id`   | Owner  | Update a restaurant      |
| DELETE | `/restaurant/:id`   | Owner  | Delete (cascades)        |
| GET    | `/my-restaurant`    | Owner  | The caller's restaurants |

### Menu, Reviews, Owner
| Method | Path                                    | Access | Description        |
| ------ | --------------------------------------- | ------ | ------------------ |
| GET    | `/restaurant/:id/menu`                  | Public | List menu items    |
| POST   | `/restaurant/:id/menu`                  | Owner  | Add a menu item    |
| PUT    | `/restaurant/:id/menu/:menuId`          | Owner  | Update a menu item |
| DELETE | `/restaurant/:id/menu/:menuId`          | Owner  | Delete a menu item |
| GET    | `/restaurant/:id/reviews`               | Public | List reviews       |
| POST   | `/restaurant/:id/reviews`               | Auth   | Add a review       |
| DELETE | `/restaurant/:id/reviews/:reviewId`     | Owner  | Delete a review    |
| GET    | `/restaurant/:id/owner`                 | Public | Get the owner      |
| POST   | `/restaurant/:id/owner`                 | Auth   | Claim ownership    |
| PUT    | `/restaurant/:id/owner`                 | Owner  | Update owner       |
| DELETE | `/restaurant/:id/owner`                 | Owner  | Remove owner       |

### Orders
| Method | Path                              | Access      | Description                |
| ------ | --------------------------------- | ----------- | -------------------------- |
| POST   | `/orders`                         | Customer    | Place an order             |
| GET    | `/orders`                         | Auth        | The caller's orders        |
| GET    | `/orders/:id`                     | Auth        | Get an order               |
| GET    | `/orders/restaurant/:restaurantId`| Owner/Admin | Orders for a restaurant    |
| PATCH  | `/orders/:id/status`              | Role-based  | Advance the order status   |

Order lifecycle: `PLACED → ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`, plus `CANCELLED`. Amounts are taken from the authoritative restaurant menu, never from the client.

### Payments
| Method | Path                       | Access | Description                       |
| ------ | -------------------------- | ------ | --------------------------------- |
| POST   | `/payments`                | Auth   | Create a payment for an order     |
| GET    | `/payments`                | Auth   | The caller's payments             |
| GET    | `/payments/:id`            | Auth   | Get a payment                     |
| GET    | `/payments/order/:orderId` | Auth   | Payments for an order             |
| POST   | `/payments/:id/refund`     | Auth   | Full or partial refund            |
| POST   | `/payments/webhook`        | Public | Stripe webhook (signature-verified) |

### Delivery
| Method | Path                            | Access       | Description                  |
| ------ | ------------------------------- | ------------ | ---------------------------- |
| POST   | `/deliveries`                   | Owner/Admin  | Create a delivery for an order |
| GET    | `/deliveries`                   | Auth         | The caller's deliveries      |
| GET    | `/deliveries/available`         | Driver/Admin | Unassigned deliveries        |
| GET    | `/deliveries/:id`               | Auth         | Get a delivery               |
| GET    | `/deliveries/order/:orderId`    | Auth         | Delivery for an order        |
| POST   | `/deliveries/:id/assign`        | Driver/Admin | Assign / self-claim          |
| PATCH  | `/deliveries/:id/status`        | Driver/Admin | Advance the delivery status  |
| PATCH  | `/deliveries/:id/location`      | Driver/Admin | Update driver location       |

Delivery lifecycle: `PENDING → ASSIGNED → PICKED_UP → DELIVERED`, plus `CANCELLED`. Reaching `PICKED_UP` and `DELIVERED` syncs the corresponding order status.

### Notifications
| Method | Path                  | Access | Description                |
| ------ | --------------------- | ------ | -------------------------- |
| GET    | `/notifications`      | Auth   | The caller's notifications |
| GET    | `/notifications/:id`  | Auth   | Get a notification         |

## Testing

A Postman collection is included: `eatzy.postman_collection.json`. Import it into Postman, then run the requests top to bottom. Authentication requests capture per-role tokens and create requests capture resource ids into collection variables, so the requests chain automatically. The base URL is a collection variable. Destructive deletes are isolated in a Cleanup folder.

## Project Structure

```
.
├── gateway/          # API gateway (JWT, proxy, rate limit, CORS)
├── auth/             # Users and authentication
├── restaurants/      # Restaurants, menus, reviews, owners
├── orders/           # Orders and lifecycle
├── payments/         # Stripe payments and refunds
├── delivery/         # Delivery assignment and tracking
├── notifications/    # Event-driven email
├── docker/           # Postgres init script
├── docker-compose.yml
├── eatzy.postman_collection.json
└── .env.example
```

Each service follows the same layout: `src/routes` (route registration), `src/controllers` (handlers), `src/schemas` (request validation), `src/plugins` (Prisma, sensible, etc.), `src/utils` (helpers and cross-service clients), and `prisma/schema.prisma`.
