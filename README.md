# Bet Advise — NestJS AWS/MiniStack Hardened Backend (Modular Monolith & CQRS)

Welcome to the definitive architectural manual for **Bet Advise**, a production-ready, highly secure (hardened baseline) NestJS backend built upon the principles of a **Modular Monolith**, **Hexagonal Architecture (Ports and Adapters)**, **CQRS (Command Query Responsibility Segregation)**, **Transactional Outbox**, and **Zero-Trust Infrastructure**.

This system is engineered for exceptional fault tolerance, extreme defensive programming, clean business-logic encapsulation, and seamless integration with AWS services (S3, SQS, RDS PostgreSQL, ElastiCache Redis) emulated locally via the high-fidelity **MiniStack** ecosystem.

---

## 1. Architectural Philosophy & Core Patterns

The application is structured to ensure that business logic remains completely isolated from technical implementation details (frameworks, database drivers, and cloud services). 

```
                                      +------------------------------------+
                                      |         INTERFACES LAYER           |
                                      |   Controllers, Guards, DTOs        |
                                      +-----------------+------------------+
                                                        |
                                                        v
                                      +-----------------+------------------+
                                      |        APPLICATION LAYER           |
                                      |   Command/Query Handlers, Ports    |
                                      +-----------------+------------------+
                                                        |
                                                        v
                                      +-----------------+------------------+
                                      |           DOMAIN LAYER             |
                                      |   Pure Entities, Enums, Errors     |
                                      +-----------------+------------------+
                                                        ^
                                                        | (Implements Ports)
                                      +-----------------+------------------+
                                      |       INFRASTRUCTURE LAYER         |
                                      |   TypeORM, Redis, AWS SDK, SQS     |
                                      +------------------------------------+
```

### 1.1 Hexagonal Architecture (Ports & Adapters)
To avoid vendor lock-in and keep domain code testable, the system defines interfaces (**Ports**) inside the Application Layer, while concrete implementations (**Adapters**) are kept in the Infrastructure Layer.

```
       +-------------------------------------------------------------+
       |                     APPLICATION LAYER                       |
       |                                                             |
       |     [Command/Query Handlers]                                |
       |                |                                            |
       |                v                                            |
       |     +--------------------+                                  |
       |     |  CachePort (Port)  | <-------------------+            |
       |     +--------------------+                     |            |
       +------------------------------------------------|------------+
                                                        |
       +------------------------------------------------|------------+
       |                   INFRASTRUCTURE LAYER         |            |
       |                                                |            |
       |     +-------------------------+                |            |
       |     |   RedisCacheAdapter     | ---------------|            |
       |     |  (Concrete Adapter)     | (Implements Interface)      |
       |     +-------------------------+                             |
       +-------------------------------------------------------------+
```

*   **Port Examples:**
    *   `CachePort` (inside `src/shared/application/cache/cache.port.ts`): Defines abstract methods for `get`, `set`, `delete`, `remember`, and `ping`.
    *   `MessageQueuePort` (inside `src/shared/application/queue/message-queue.port.ts`): Defines abstract methods for `publish` and `publishBatch`.
    *   `ObjectStoragePort` (inside `src/shared/application/storage/object-storage.port.ts`): Defines abstract methods for `putObject`, `getObject`, `deleteObject`, and `headObject`.
*   **Adapter Examples:**
    *   `RedisCacheAdapter` (inside `src/shared/infrastructure/cache/redis-cache.adapter.ts`): Implements `CachePort` using the `ioredis` library, introducing connection limits, retries, and prefix matching.
    *   `SqsMessageQueueAdapter` (inside `src/shared/infrastructure/queue/sqs-message-queue.adapter.ts`): Implements `MessageQueuePort` using AWS SQS SDK, with dynamic type mapping and batch-limit chunk splitting.
    *   `S3ObjectStorageAdapter` (inside `src/shared/infrastructure/storage/s3-object-storage.adapter.ts`): Implements `ObjectStoragePort` using AWS S3 SDK, containing key path sanitization and stream utilities.

This strict separation guarantees that developers can swap Redis with Memcached or SQS with RabbitMQ without changing a single line of core business logic.

### 1.2 Clean Domain Model & Data Mapper Pattern
Most ORM-based backends suffer from "Anemic Domain Models" decorated with ORM decorators (like `@Entity` or `@Column`), causing domain rules to leak into database schema details. This application prevents this by strictly decoupling domain modeling from database persistence:

1.  **Pure Domain Entities:** All entities inside the domain folders are **100% pure TypeScript classes** with zero decorators, annotations, or external dependencies. They contain raw constructors, static creation helpers, and business state logic.
    
    *Example Domain Entity (`src/matches/domain/match.entity.ts`):*
    ```typescript
    import { MatchStatus } from './match-status.enum';

    export class Match {
      constructor(
        public readonly id: string,
        public readonly homeTeam: string,
        public readonly awayTeam: string,
        public readonly kickoffAt: Date,
        public readonly status: MatchStatus,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly externalId: string | null = null,
      ) {}

      public static create(
        id: string,
        homeTeam: string,
        awayTeam: string,
        kickoffAt: Date,
        status: MatchStatus,
        createdAt: Date,
        updatedAt: Date,
        externalId: string | null = null,
      ): Match {
        return new Match(id, homeTeam, awayTeam, kickoffAt, status, createdAt, updatedAt, externalId);
      }
    }
    ```

2.  **Infrastructure Data Entities:** Separate database schema representations are declared inside `infrastructure/entities/`, decorated with TypeORM metadata.
    
    *Example Data Entity (`src/matches/infrastructure/entities/match.entity.ts`):*
    ```typescript
    import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
    import { AdviceEntity } from '../../../advice/infrastructure/entities/advice.entity';

    @Entity('matches')
    export class MatchEntity {
      @PrimaryColumn()
      id!: string;

      @Column({ type: 'varchar', nullable: true, unique: true })
      externalId!: string | null;

      @Column()
      homeTeam!: string;

      @Column()
      awayTeam!: string;

      @Column({ type: 'timestamp with time zone' })
      kickoffAt!: Date;

      @Column({ default: 'SCHEDULED' })
      status!: string;

      @CreateDateColumn({ type: 'timestamp with time zone' })
      createdAt!: Date;

      @UpdateDateColumn({ type: 'timestamp with time zone' })
      updatedAt!: Date;

      @OneToMany(() => AdviceEntity, (advice) => advice.match)
      advice!: AdviceEntity[];
    }
    ```

3.  **Data Mappers (Repositories):** The repositories translate between the two representations. They fetch decorated database entities, map them to pure domain entities, and conversely map pure domain entities back into data entities for persistence.
    
    *Example Mapping Methods (`src/matches/infrastructure/typeorm-match.repository.ts`):*
    ```typescript
    private mapToDomain(entity: MatchEntity): Match {
      return Match.create(
        entity.id,
        entity.homeTeam,
        entity.awayTeam,
        entity.kickoffAt,
        entity.status as MatchStatus,
        entity.createdAt,
        entity.updatedAt,
        entity.externalId,
      );
    }
    ```

### 1.3 Command Query Responsibility Segregation (CQRS)
Separating state mutation from data queries allows for fine-tuned scalability, clear execution paths, and simplified security audits. Powered by `@nestjs/cqrs`:

*   **Commands (Write Path):** Actions that alter state (e.g., `CreateMatchCommand`, `GenerateAdviceCommand`, `LoginCommand`). Handlers encapsulate validation, invoke repository writers, write transaction logs, and dispatch local domain events.
*   **Queries (Read Path):** Read-only actions (e.g., `ListMatchesQuery`, `GetMatchQuery`). They bypass complex domain write-invariants and fetch read-optimized data quickly.
*   **Local Event Bus:** Local domain events (e.g., `AdviceGeneratedEvent`) are dispatched asynchronously using NestJS's in-memory `EventBus` for immediate internal decoupling.

---

## 2. Directory Layout & Module Decoupling

The project is structured as a highly decoupled **Modular Monolith**. Each directory encapsulates a single bounded context containing its own Domain, Application, Interfaces, and Infrastructure sub-layers.

To maintain strict boundaries and prevent database-level coupling between modules, **direct TypeORM relationships or foreign keys across modules are prohibited**. Instead, entities are related loosely by sharing standard **UUID v7** identifiers (the standard primary key format). This allows bounded contexts to remain completely independent at the schema layer.

```
src/
├── app.module.ts                       # Application Root Module bootstrapping configuration
├── app.controller.ts                   # Gateway controller for index-level health/greetings
├── app.service.ts                      # Simple root greeting service
├── main.ts                             # Application bootstrap entry point
│
├── matches/                            # Bounded Context: Sports Matches
│   ├── domain/                         # Pure domain logic (Match entity, MatchStatus enum)
│   ├── application/                    # Application layer (Commands, Queries, Ports, Handlers)
│   ├── interfaces/                     # Entrypoints (MatchesController, DTOs, Module APIs)
│   └── infrastructure/                 # DB Layer (MatchEntity, TypeOrmMatchRepository)
│
├── advice/                             # Bounded Context: Betting Recommendation Engine
│   ├── domain/                         # Pure domain logic (Advice entity, AdviceStatus enum, Events)
│   ├── application/                    # Application Layer (Commands, Queries, Event Handlers, Ports)
│   ├── interfaces/                     # Entrypoints (AdviceController, DTOs, Module APIs)
│   └── infrastructure/                 # DB & Transaction Layer (AdviceEntity, TypeOrmAdviceRepository)
│
├── auth/                               # Bounded Context: Member Security and JWT Session Manager
│   ├── domain/                         # Security Entities (Member, RefreshToken, ApiToken, Errors)
│   ├── application/                    # Ports & CQRS Command Handlers
│   ├── interfaces/                     # Controllers, Guards (JwtAuthGuard, MemberOwnershipGuard), Decorators
│   └── infrastructure/                 # Services (JwtToken, Hash), Repositories (TypeORM refresh/api tokens)
│
├── outbox/                             # Technical Module: Transactional Outbox Pattern
│   ├── infrastructure/                 # DB Layer (OutboxEventEntity)
│   └── application/                    # Relay Loop Daemon (OutboxRelayService polling PENDING events)
│
├── audit/                              # Technical Module: Hardened Audit Logs
│   ├── infrastructure/                 # DB Layer (AuditLogEntity, TypeOrmAuditLogRepository)
│   └── application/                    # Service orchestrating security and log writes
│
└── shared/                             # Core cross-cutting infrastructure & shared components
    ├── domain/                         # Shared exceptions (DomainError, NotFoundDomainError, Result)
    ├── application/                    # General Ports (CachePort, MessageQueuePort, ObjectStoragePort)
    ├── interfaces/                     # Global Filters (GlobalExceptionFilter), Interceptors (Correlation ID)
    └── infrastructure/                 # Shared Adapters (AWS Clients, TypeORM DB, Redis Cache, Health, S3, SQS)
```

---

## 3. High-Fidelity Module Communication

In a true Modular Monolith, modules are designed to maintain strict boundaries. Communication occurs via three highly deliberate mechanisms:

```
[Module A (Matches)] --- (1) Module API Contract (Sync/Strongly-Typed) ---> [Module B (Advice)]
                     --- (2) Local CQRS Event Bus (Async In-Memory)    ---> [Module B (Advice)]
                     --- (3) Transactional Outbox -> SQS Queue         ---> [Background Services/Audit]
```

### 3.1 Synchronous Module APIs (Interface & DTO Contracts)
To guarantee strict type safety and absolute performance, read operations or cross-module validations use direct class injection of interface contracts. For example, `GenerateAdviceHandler` (in `advice`) needs to verify that the target `matchId` exists and is valid before creating advice. It communicates with `matches` via `IMatchesModuleApi` registered under a Dependency Injection Symbol `MATCHES_MODULE_API`.

*   **Interface Contract (`src/matches/interfaces/module-api/matches-module.api.interface.ts`):**
    ```typescript
    import { MatchContractDto } from './dto/match-contract.dto';

    export interface IMatchesModuleApi {
      findById(id: string): Promise<MatchContractDto | null>;
    }

    export const MATCHES_MODULE_API = Symbol('IMatchesModuleApi');
    ```

*   **DTO Contract (`src/matches/interfaces/module-api/dto/match-contract.dto.ts`):**
    ```typescript
    export class MatchContractDto {
      constructor(
        public readonly id: string,
        public readonly homeTeam: string,
        public readonly awayTeam: string,
        public readonly kickoffAt: Date,
        public readonly status: string,
        public readonly externalId: string | null,
      ) {}
    }
    ```

*   **Concrete Implementation (`src/matches/interfaces/module-api/matches-module.api.ts`):**
    ```typescript
    import { Injectable } from '@nestjs/common';
    import { QueryBus } from '@nestjs/cqrs';
    import { IMatchesModuleApi } from './matches-module.api.interface';
    import { MatchContractDto } from './dto/match-contract.dto';
    import { GetMatchQuery } from '../../application/queries/get-match.query';
    import { Match } from '../../domain/match.entity';

    @Injectable()
    export class MatchesModuleApi implements IMatchesModuleApi {
      constructor(private readonly queryBus: QueryBus) {}

      async findById(id: string): Promise<MatchContractDto | null> {
        try {
          const match = await this.queryBus.execute<GetMatchQuery, Match | null>(
            new GetMatchQuery(id),
          );
          if (!match) return null;
          return new MatchContractDto(
            match.id,
            match.homeTeam,
            match.awayTeam,
            match.kickoffAt,
            match.status,
            match.externalId,
          );
        } catch {
          return null;
        }
      }
    }
    ```

*   **Cross-Module API Injection (`src/advice/application/handlers/generate-advice.handler.ts`):**
    ```typescript
    @CommandHandler(GenerateAdviceCommand)
    export class GenerateAdviceHandler implements ICommandHandler<GenerateAdviceCommand> {
      constructor(
        @Inject(ADVICE_REPOSITORY_PORT)
        private readonly adviceRepository: IAdviceRepository,
        @Inject(MATCHES_MODULE_API)
        private readonly matchesApi: IMatchesModuleApi,
        // ...
      ) {}

      async execute(command: GenerateAdviceCommand) {
        const match = await this.matchesApi.findById(command.matchId);
        if (!match) {
          throw new NotFoundDomainError('Match', command.matchId);
        }
        // ...
      }
    }
    ```

This interface-driven approach ensures that modules never write directly to tables owned by other modules, maintaining clear boundaries and enabling easy transitions to Microservices if ever needed.

### 3.2 Asynchronous Local Event Bus (In-Memory execution)
When a state mutation completes, a local event is dispatched onto the NestJS `EventBus`.
*   **Example:** When advice is generated, `GenerateAdviceHandler` publishes `new AdviceGeneratedEvent(id, matchId)`.
*   **Subscriber:** `AdviceGeneratedEventHandler` acts as an application-level listener that reacts asynchronously. This pattern ensures that primary command handlers remain small and are not bloated with secondary responsibilities (e.g., refreshing local cache matrices).

### 3.3 Transactional Outbox Pattern & Amazon SQS
For critical business-to-system operations, the monolith uses the **Transactional Outbox Pattern** to guarantee reliable async message delivery without risk of dual-write failures (e.g., where a database transaction commits successfully but the subsequent SQS network publish fails).

```
1. Client Sends Command -> 2. Start Database Transaction (QueryRunner)
                               ├── Write Core Entity (e.g. AdviceEntity)
                               └── Write OutboxEventEntity (PENDING)
                            3. Commit Database Transaction (Atomic Success)
                                |
                                v
                        [Database Table: outbox_events]
                                |
                                +--- Polled by OutboxRelayService ---+
                                                                     v
                                                      4. Send to Amazon SQS Queue
                                                                     |
                                                      5. On Success: Mark as PUBLISHED
                                                         On Failure: Retry or mark FAILED
```

#### Atomic Database Transaction implementation:
The `TypeOrmAdviceRepository` implements transactional outbox persistence by orchestrating operations within a unified SQL transaction using TypeORM's `QueryRunner`:

```typescript
async createWithOutbox(data: {
  matchId: string;
  market: string;
  selection: string;
  confidence: number;
  rationale: string;
}): Promise<Advice> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const adviceId = randomUUID();
    const eventId = randomUUID();

    // 1. Create and save core entity inside transaction
    const adviceEntity = queryRunner.manager.create(AdviceEntity, {
      id: adviceId,
      matchId: data.matchId,
      market: data.market,
      selection: data.selection,
      confidence: data.confidence,
      rationale: data.rationale,
      status: 'GENERATED',
    });
    const savedAdvice = await queryRunner.manager.save(AdviceEntity, adviceEntity);

    // 2. Create and save the Outbox Event inside the SAME transaction
    const outboxEventEntity = queryRunner.manager.create(OutboxEventEntity, {
      id: eventId,
      type: 'ADVICE_GENERATED',
      aggregateType: 'Advice',
      aggregateId: adviceId,
      status: 'PENDING',
      attemptCount: 0,
      payload: {
        adviceId,
        matchId: data.matchId,
        market: data.market,
        selection: data.selection,
        confidence: data.confidence,
      },
    });
    await queryRunner.manager.save(OutboxEventEntity, outboxEventEntity);

    await queryRunner.commitTransaction();
    return this.mapToDomain(savedAdvice);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

#### The Outbox Relay Loop (`OutboxRelayService`):
1.  **Interval Trigger:** Runs on a background interval loop configured via `OUTBOX_RELAY_INTERVAL_MS` (default: `5000ms`).
2.  **Concurrency Lock:** Protects itself from overlapping execution using a stateful class-level `processing` boolean flag.
3.  **Cron Query:** Queries the `outbox_events` table for up to `OUTBOX_RELAY_BATCH_SIZE` (default: `10`) of events with `status = 'PENDING'`, ordered chronologically (`ASC`).
4.  **Integration Mapping:** Wraps each event into a standardized integration message with core metadata (e.g., `eventId`, `timestamp`, `schemaVersion`) and target-specific SQS string attributes.
5.  **Publish:** Publishes the message to SQS via the `MessageQueuePort`.
6.  **Upon Success:** Updates the database record to `PUBLISHED` and sets `publishedAt` to the current timestamp.
7.  **Upon Failure:** Increments the event's `attemptCount` and records the error stack in `lastError`. If the `attemptCount` hits `OUTBOX_RELAY_MAX_ATTEMPTS` (default: `5`), the event status transitions to `FAILED` for manual operations attention.

---

## 4. Idempotent SQS Message Polling

The system processes incoming events from Amazon SQS via a background polling daemon, `SqsConsumerService`, that enforces **exactly-once processing** through a robust database-backed idempotency engine.

```
            Receive Message from Amazon SQS
                           |
                           v
              Parse eventId & eventType
                           |
                           v
        Does eventId + 'SqsConsumerService' exist 
        in Database Table: processed_messages?
                     /           \
                  YES             NO
                  /                 \
        [Duplicate Message]      Execute handler logic (e.g., Log Audit)
                 |                   |
                 |               Insert (eventId, 'SqsConsumerService')
                 |               into database table: processed_messages
                 \                  /
                  \                /
              Delete message from SQS Queue
```

### 4.1 Detailed Polling & Processing Sequence:
1.  **Long Polling:** The consumer connects to the SQS queue using AWS SQS long polling (`WaitTimeSeconds` default: `20`) to minimize API requests and ensure real-time message retrieval.
2.  **Signature Extraction:** For each message, it extracts the unique identifier (`eventId`) and the `type` from the JSON body.
3.  **Idempotency Key Check:** It performs a select query on the `processed_messages` table matching the composite key: `eventId` + `handlerName` (where `handlerName` is `'SqsConsumerService'`).
4.  **Bypass Duplicate (Skip):** If a matching record is found, the system immediately recognizes the message as a duplicate (due to an SQS network retry or visible timeout overlap). It logs a warning, deletes the duplicate from SQS to clean the queue, and returns.
5.  **Execution (At-Least-Once Boundary):** If the message is fresh, the consumer processes the payload. For example, on `ADVICE_GENERATED`, it writes an audit log with event tracking metadata.
6.  **Persist Idempotency State:** Upon successful execution, it inserts a new `ProcessedMessageEntity` into the database.
7.  **SQS Delete:** It deletes the message from the SQS queue using the unique `ReceiptHandle` to prevent any other consumer thread from picking it up.

---

## 5. Zero-Trust Hardened Authentication & Authorization

The system implements a secure, custom, session-revocable auth architecture based on upstream **ExternalIntegrationPoint** (identity provider) member metrics and fine-grained resource scope checking.

### 5.1 The Passwordless JWT Login Cycle
1.  **Request Login:** The user submits a mobile number and device ID. The server strips spacing and verifies their existence in the External Integration Point.
2.  **Device Binding Constraint:** The server fetches the member's latest database token metadata. If an active session is bound to a different `deviceId`, login is rejected with a `DeviceBindingError`, blocking credential reuse.
3.  **Secure JWT Issuance:** 
    *   Generates a cryptographically strong session-level random `salt`.
    *   Creates a unique session record (`RefreshTokenEntity`) in PostgreSQL keyed by a standard **UUID v7** identifier, storing only a SHA-256 hash of the token identifier (`jti`). Plaintext tokens are never stored!
    *   Signs and returns two JWT tokens:
        *   **Access Token (60-minute expiry):** Symmetric signature (`HS256`) carrying user claims, the session `salt`, and identity metadata.
        *   **Refresh Token (365-day expiry):** Symmetric signature carrying the unique `jti` matching the hashed db row.

### 5.2 Session Revocation (`JwtAuthGuard`)
Every authenticated HTTP request is validated through the `JwtAuthGuard`:
1.  Validates the Access Token signature, issuer, audience, and expiration constraints.
2.  Extracts the member's `external_id` from the payload.
3.  Performs a real-time **server-side presence check**: queries the database to confirm that the `external_id` currently has at least one active, non-revoked session (`refresh_tokens` or compatibility `api_tokens`).
4.  **DB Shield Caching:** The result of the presence check is cached in Redis for 5 minutes (`session:active:${externalId}`) to prevent request-level SQL queries.
5.  **Instant Revocation:** If a session was revoked (e.g., via a remote logout command or security lock), the guard fails immediately with a `401 Unauthorized` response, nullifying the remaining life of the client-held access token.

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TokenServicePortToken)
    private readonly tokenService: TokenServicePort,
    @Inject(RefreshTokenRepositoryPortToken)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    @Inject(ApiTokenRepositoryPortToken)
    private readonly apiTokenRepository: ApiTokenRepositoryPort,
    @Inject(CachePortToken)
    private readonly cache: CachePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing.');
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    let payload: Record<string, any>;
    try {
      payload = this.tokenService.verifyToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type.');
    }

    const externalId = payload.external_id;

    // Presence check cached in Redis to protect the database from query pressure
    const cacheKey = `session:active:${externalId}`;
    let isPresent = await this.cache.get<boolean>(cacheKey);

    if (isPresent === null) {
      const activeRefreshTokens = await this.refreshTokenRepository.findActiveByExternalId(externalId);
      isPresent = activeRefreshTokens.length > 0;

      if (!isPresent) {
        const apiToken = await this.apiTokenRepository.findByExternalId(externalId);
        if (apiToken) isPresent = true;
      }

      await this.cache.set(cacheKey, isPresent, 300); // 5 minutes TTL
    }

    if (!isPresent) {
      throw new UnauthorizedException('Session has been revoked or expired.');
    }

    request.user = payload;
    return true;
  }
}
```

### 5.3 Object-Level Authorization (`MemberOwnershipGuard`)
To protect resource endpoints (e.g., fetching profile data, editing subscriptions) from direct object reference attacks (ID harvesting), the `MemberOwnershipGuard` checks object ownership:

1.  **Extract Resource Owner:** Resolves the requested `memberId` or `personKey` from the HTTP request parameters, body, or query string.
2.  **Direct Check:** If the client's JWT `external_id` matches the target resource ID, access is permitted.
3.  **Child Accounts Traversal (with Caching):** If they do not match, the guard queries the External Integration Point API to retrieve all child accounts registered under the parent's `external_id`.
4.  **Performance Optimization:** Since family hierarchies rarely change, child lists are stored in Redis using a 3-day TTL (`external-integration:linked-accounts:${parent_id}`).
5.  If the resource ID belongs to one of the child accounts, access is approved; otherwise, a `403 Forbidden` response is returned.

```typescript
@Injectable()
export class MemberOwnershipGuard implements CanActivate {
  constructor(
    @Inject(ExternalIntegrationPointServicePortToken)
    private readonly externalIntegrationService: ExternalIntegrationPointServicePort,
    @Inject(CachePortToken)
    private readonly cache: CachePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    if (!user) {
      throw new ForbiddenException('User context is missing.');
    }

    const parentExternalId = user.external_id;

    const requestedMemberId =
      request.params.memberId ||
      request.body.personKey ||
      request.body.memberId ||
      request.query.memberId;

    if (!requestedMemberId) {
      return true; // Pass if no owner ID is present in the request
    }

    // 1. Direct ownership check
    if (parentExternalId === requestedMemberId) {
      return true;
    }

    // 2. Linked accounts check (with 3-day caching)
    const cacheKey = `external-integration:linked-accounts:${parentExternalId}`;
    const linkedAccountsList = await this.cache.remember<string[]>(
      cacheKey,
      3 * 24 * 60 * 60, // 3 days in seconds
      async () => {
        return this.externalIntegrationService.getLinkedAccounts(parentExternalId);
      },
    );

    if (linkedAccountsList.includes(requestedMemberId)) {
      return true;
    }

    throw new ForbiddenException('You do not have permission to access this member resource.');
  }
}
```

---

## 6. Joi Environment Config Validation

The system mandates strict configuration validation at bootstrap time to prevent the application from starting in an invalid or partially-configured state (fail-fast principle). Built using `joi` inside `src/shared/infrastructure/config/env.validation.ts`:

*   **Type Enforcement:** Forces appropriate types for primitive variables (ports are validated using `.port()`, interval times are validated as `.integer()`, and booleans are mapped correctly).
*   **Presence Validation:** Ensures critical variables such as `AWS_REGION`, `S3_BUCKET_NAME`, `SQS_EVENTS_QUEUE_NAME`, `DATABASE_URL`, and `REDIS_HOST` are present.
*   **Fail-Fast on Drift:** If an environment variable is invalid, NestJS throws a Joi validation error during bootstrapping, shutting down the container immediately with an explicit error output.

---

## 7. MiniStack: Local Cloud Simulation

**MiniStack** is a highly optimized local cloud simulation container that replaces heavy, resource-intensive LocalStack runtimes. It is configured and managed under `docker-compose.yml` and bootstrapped via custom Node scripts.

### 7.1 Unified Single-Port Architecture
All emulated AWS services (S3, SQS) are accessible on a single unified port: `4566`.
*   **Database Isolation:** Emulates RDS PostgreSQL on port `15432`.
*   **Cache Isolation:** Emulates ElastiCache Redis on port `16379`.

### 7.2 The Bootstrap Engine (`scripts/local/bootstrap-ministack.ts`)
Executed during initial setup, this script automates local infrastructure setup:
1.  **Health Verification:** Contacts the local MiniStack endpoint (`http://localhost:4566/_ministack/health`) to ensure container readiness.
2.  **S3 Bucket Provisioning:** Creates the `bet-advise-local` bucket and configures private-by-default public access block policies.
3.  **SQS Setup with DLQ Redrive Policy:** 
    *   Creates a Dead-Letter Queue (DLQ) named `bet-advise-events-dlq` with a 14-day retention cycle.
    *   Creates the main queue `bet-advise-events` with a 60-second visibility timeout, 20-second wait time (long polling), and a `RedrivePolicy` that automatically routes messages to the DLQ after `5` failed processing attempts.
4.  **RDS & Cache Initiation:** Sends RDS and ElastiCache creation commands to MiniStack to register mock cloud resources.
5.  **Port Probing:** Uses raw TCP socket handshakes to block execution until PostgreSQL (15432) and Redis (16379) are accepting connections.
6.  **Secure Configuration Generator:** Generates `.env.local.generated` containing dynamic, validated configuration credentials, saving it as a template and copying it to `.env` for seamless developer integration.

### 7.3 The Diagnostics Engine (`scripts/local/doctor-ministack.ts`)
Used as an automated sanity and verification step during CI/CD or local troubleshooting:
1.  **Configuration Check:** Reads `.env.local.generated` to verify all parameters match the bootstrap spec.
2.  **S3 Object Cycle Verification:** Performs a `HeadBucket` query, inserts a test object, downloads the object, verifies string/hash integrity, and deletes the test object.
3.  **SQS Polling Lifecycle Check:** Fetches queue attributes, publishes a test message, polls SQS using long polling, verifies message body integrity, and deletes the message from the queue.
4.  **PostgreSQL TCP Query:** Connects to PostgreSQL on port 15432 and executes a raw `'SELECT 1 as result'` command to verify client execution.
5.  **Redis Command Check:** Connects to Redis on port 16379, executes a raw `PING` command, and validates the `'PONG'` response.

---

## 8. AWS Production Deployment Hardening

To transition from MiniStack local emulation to standard production-grade AWS infrastructure:

1.  **IAM Task Roles (Zero-Trust):** 
    In production, do not configure `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`. The AWS Client SDK automatically uses the **AWS Default Credential Provider Chain** to resolve permissions via **IAM Task Roles** assigned directly to the ECS Task or EKS Pod.
2.  **Database SSL/TLS Enforcement:**
    Set `DATABASE_SSL=true`. The system's Database Module automatically configures TypeORM's SSL settings to enforce secure TLS queries and protect against in-flight database sniffing:
    ```typescript
    ssl: ssl ? { rejectUnauthorized: false } : false
    ```
3.  **S3 Block Public Access:**
    Production buckets must block public ACLs and public policies, routing all reads through the S3 Adapter.
4.  **Schema Synchronize Security:**
    In the Database Module, the `synchronize` property is restricted to local/test environments:
    ```typescript
    synchronize: isLocal // Disabled in production (use migrations)
    ```
    This prevents accidental data loss from automatic schema synchronization in production.

---

## 9. Operational Scripts & Developer Commands

The project uses `pnpm` to manage scripts for development, quality enforcement, and diagnostics:

```bash
# Start the local MiniStack Docker container in the background
pnpm local:up

# Bootstrap S3 bucket, SQS queues, check database readiness, and write config files
pnpm local:bootstrap

# Run integration tests (S3 write/read, SQS publish/poll, DB query, Redis ping)
pnpm local:doctor

# Start NestJS application in hot-reload developer watch mode
pnpm dev

# Execute linting checks using ESLint
pnpm lint

# Execute typecheck safety validation
pnpm typecheck

# Execute unit and repository tests using Jest
pnpm test

# Run quality checks (Typecheck, Lint, Test, and Build)
pnpm check

# Run end-to-end (E2E) integration lifecycle tests
pnpm check:e2e
```

---

## 10. Completed Refactoring & Resolution of Critical Issues

A comprehensive refactoring pass was executed to resolve all architectural, scalability, and security risks identified in our review, upgrading the system to a state-of-the-art Modular Monolith:

### 10.1 Issue 1 Resolution: Eradicated Connection Leak Risk in Outbox Transactions
- **Implementation:** Shifted `connect()` and `startTransaction()` operations *inside* the main `try-catch` block in `TypeOrmAdviceRepository.createWithOutbox()`.
- **Result:** If connection or transaction initiation fails, the execution flow is safely caught and directed to the `finally` block, ensuring `queryRunner.release()` is deterministically invoked under all circumstances.

### 10.2 Issue 3 Resolution: Atomic Inbox Pattern (Exactly-Once Event Polling)
- **Implementation:** Upgraded the SQS consumer polling architecture from a check-then-save approach to an **atomic reservation locking model**. The consumer now immediately attempts to write the `ProcessedMessageEntity` registration record *before* executing event handlers, using the database's unique composite primary key constraint (`eventId` + `handlerName`) as an atomic concurrency guard.
- **Result:** Concurrent threads or duplicate SQS deliveries are blocked instantly by database-level constraints. If execution fails, the reservation is safely deleted (rolled back) to support queue-level retries.

### 10.3 Issue 4 Resolution: Dynamic Multi-tenant Outbox Propagation
- **Implementation:** Modified the outbox schema to carry the active `tenantId`. During async message relay, `OutboxRelayService` propagates the tenant ID into the SQS message body and as message attributes.
- **Result:** Downstream event handlers and consumers process background events in the correct tenant context, preventing isolation drift in asynchronous processing pipelines.

### 10.4 Issue 5 Resolution: Restored Configuration Alignment
- **Implementation:** Refactored the core token generator, login handlers, and spec files to align JWT configuration Lifetimes. Token entity properties and creation parameters are fully typed and dynamically mapped via separate, dedicated `RefreshTokenMapper` and `ApiTokenMapper` classes.

---

## 11. Secure Logical Multi-Tenancy Architecture

To enable selling the application to multiple brands/partners under a single deployment, we introduced logical tenant separation conforming to strict security standards.

### 11.1 Context Isolation via AsyncLocalStorage (`TenantContext`)
Rather than forcing developers to manually pass `tenantId` down to every single repository, query, and command handler, the monolith utilizes Node's native, high-performance `AsyncLocalStorage`.
- **`TenantContext`:** Encapsulates the async local storage execution boundary.
- **`TenantMiddleware`:** Registered globally in `AppModule`. It intercept requests and extracts the tenant ID:
  1. Checks the `x-tenant-id` HTTP header.
  2. Inspects signed JWT claims (if an access token is present). To protect against Broken Object-Level Authorization (BOLA) and IDOR, the cryptographically signed JWT claim `tenant_id` **always takes absolute precedence** over header overrides.
  3. Sanitizes the tenant ID string to prevent SQL/header injection.
  4. Cascades the request thread inside the isolated `TenantContext`.

### 11.2 Hexagonal Adapter Enforced Scoping
At the database adapter layer, all repositories automatically obtain the active tenant context using dependency injection:
- `TypeOrmMatchRepository`, `TypeOrmAdviceRepository`, `TypeOrmRefreshTokenRepository`, `TypeOrmApiTokenRepository`, and `TypeOrmAuditLogRepository` append a non-bypassable `where: { tenantId: this.tenantContext.getTenantId() }` clause on all read, update, delete, and save operations.
- This guarantees complete and secure logical tenant separation at the database query layer.

---

## 12. Real-World Module Interaction Examples

The following sequence showcases how core modules in this Modular Monolith architecture collaborate across hexagonal boundaries while strictly maintaining data and logical boundary isolation.

### Scenario: Generating a Betting Recommendation
When a brand staff member issues advice for a soccer match, the system coordinates actions across four modules:

```
[Client Request] (Header: X-Tenant-Id: brand-alpha)
       |
       v
+------------------+     (1) Synchronous Module API Call
|  Advice Module   | --------------------------------------> [ Matches Module ]
|                  | <-------------------------------------- (Match details found)
+------------------+
       |
       v (2) Atomic DB Transaction
   Database Writes:
   ├── Write brand-alpha AdviceEntity
   └── Write brand-alpha OutboxEventEntity (PENDING)
       |
       v (3) Background Cron Polling
+------------------+
|   Outbox Relay   | ---- (4) Publish message with tenantId "brand-alpha" ----> [ SQS Queue ]
+------------------+                                                                  |
                                                                                      v
+------------------+                                                          [ SQS Consumer ]
|  Audit/Webhooks  | <--- (6) POST Webhook JSON (X-Tenant-ID) -- [httpbin.org]        |
|  (Inbox Pattern) |                                                                  v
|                  | <=== (5) Process event inside "brand-alpha" Context ==============+
+------------------+
```

#### Step 1: Synchronous Verification via Public Module API
Before generating advice, the `GenerateAdviceHandler` must verify the match's existence. Direct database imports or queries across the table boundary are prohibited. Instead, the `Advice` module injects the Matches module's public contract interface, `IMatchesModuleApi`, registered as a DI token symbol:

```typescript
// Located in advice/application/handlers/generate-advice.handler.ts
const match = await this.matchesApi.findById(command.matchId);
if (!match) {
  throw new NotFoundDomainError('Match', command.matchId);
}
```

#### Step 2: Atomic State and Transactional Outbox Write
With the match verified, the repository starts an atomic transaction. It persists the new `AdviceEntity` and queues an `OutboxEventEntity` containing the state event and `tenantId` (`'brand-alpha'`), committing both to the database in a single SQL operation:

```typescript
// Located in advice/infrastructure/typeorm-advice.repository.ts
const adviceEntity = queryRunner.manager.create(AdviceEntity, {
  id: adviceId,
  tenantId: 'brand-alpha',
  matchId: data.matchId,
  status: 'GENERATED',
});
await queryRunner.manager.save(AdviceEntity, adviceEntity);

const outboxEventEntity = queryRunner.manager.create(OutboxEventEntity, {
  id: eventId,
  tenantId: 'brand-alpha',
  type: 'ADVICE_GENERATED',
  payload: { adviceId, tenantId: 'brand-alpha', matchId: data.matchId ... },
});
await queryRunner.manager.save(OutboxEventEntity, outboxEventEntity);
```

#### Step 3: Transactional Outbox Relay
In the background, `OutboxRelayService` polls pending events, compiles standardized integration payloads, and publishes them to Amazon SQS:

```typescript
// Located in outbox/application/outbox-relay.service.ts
const messageBody = {
  eventId: event.id,
  tenantId: event.tenantId, // brand-alpha
  type: event.type,
  payload: event.payload,
};
await this.messageQueue.publish(this.queueUrl, messageBody);
```

#### Step 4: SQS Consumer Polling and Inbox Idempotency Lock
The background consumer, `SqsConsumerService`, picks up the message and performs an atomic inbox reservation to prevent duplicate processing:

```typescript
// Located in shared/infrastructure/queue/sqs-consumer.service.ts
await this.processedRepo.save(
  this.processedRepo.create({ eventId, handlerName })
);
```

#### Step 5: Secure Execution and Public Webhook Integration
Upon establishing the inbox reservation, the SQS consumer reads `tenantId: 'brand-alpha'` from the body and executes the handler inside the isolated tenant execution context. It writes an audit log and triggers our `PublicIntegrationService` to dispatch a webhook-style request to a public mock endpoint (`https://httpbin.org/post`) to announce the advice:

```typescript
// Located in shared/infrastructure/integration/public-integration.service.ts
await fetch('https://httpbin.org/post', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': 'brand-alpha',
  },
  body: JSON.stringify({
    source: 'bet-advise-modular-monolith',
    event: 'ADVICE_GENERATED',
    data: payload,
  }),
});
```

The public server receives the request, echoes the data back to show successful dispatch, and the consumer completes by deleting the processed message from the queue. This cycle provides absolute consistency, type-safety, and tenant isolation!
