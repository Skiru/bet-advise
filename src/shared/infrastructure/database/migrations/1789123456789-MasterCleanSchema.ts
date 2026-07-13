import { MigrationInterface, QueryRunner } from 'typeorm';

export class MasterCleanSchema1789123456789 implements MigrationInterface {
  name = 'MasterCleanSchema1789123456789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "advice" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "matches" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "outbox_events" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "processed_messages" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "inbox_messages" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "providers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "odds" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "models" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analysis_runs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupon_drafts" CASCADE`);

    // Create Matches Table with external_id, home_team, and away_team
    await queryRunner.query(`
      CREATE TABLE "matches" (
        "id" UUID PRIMARY KEY,
        "tenant_id" VARCHAR(255) NOT NULL,
        "external_id" VARCHAR(255) NULL UNIQUE,
        "home_team" VARCHAR(255) NOT NULL,
        "away_team" VARCHAR(255) NOT NULL,
        "sport" VARCHAR(100) NOT NULL,
        "competition" VARCHAR(100) NOT NULL,
        "participants" JSONB NOT NULL,
        "scheduled_start" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" VARCHAR(50) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "version" INT NOT NULL DEFAULT 1
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_matches_tenant_sport" ON "matches" ("tenant_id", "sport")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_matches_tenant_start" ON "matches" ("tenant_id", "scheduled_start")`,
    );

    // Create Providers Table
    await queryRunner.query(`
      CREATE TABLE "providers" (
        "id" UUID PRIMARY KEY,
        "tenant_id" VARCHAR(255) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "capabilities" JSONB NOT NULL,
        "health_state" VARCHAR(50) NOT NULL,
        "rate_limit_state" JSONB NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Create Odds Table
    await queryRunner.query(`
      CREATE TABLE "odds" (
        "id" UUID PRIMARY KEY,
        "tenant_id" VARCHAR(255) NOT NULL,
        "provider_id" VARCHAR(100) NOT NULL,
        "bookmaker_id" VARCHAR(100) NOT NULL,
        "event_id" VARCHAR(255) NOT NULL,
        "market_id" VARCHAR(100) NOT NULL,
        "outcome_id" VARCHAR(100) NOT NULL,
        "decimal_odds" NUMERIC(10,4) NOT NULL,
        "captured_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "received_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "is_suspended" BOOLEAN NOT NULL DEFAULT FALSE,
        "stale" BOOLEAN NOT NULL DEFAULT FALSE,
        "stale_reason" VARCHAR(255) NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_odds_tenant_event_market" ON "odds" ("tenant_id", "event_id", "market_id")`,
    );

    // Create Models Table
    await queryRunner.query(`
      CREATE TABLE "models" (
        "id" UUID PRIMARY KEY,
        "tenant_id" VARCHAR(255) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "version" VARCHAR(50) NOT NULL,
        "commit_sha" VARCHAR(100) NOT NULL,
        "hyperparameters" JSONB NOT NULL,
        "approval_status" VARCHAR(50) NOT NULL,
        "approved_at" TIMESTAMP WITH TIME ZONE NULL,
        "approved_by" VARCHAR(255) NULL
      )
    `);

    // Create Analysis Runs Table
    await queryRunner.query(`
      CREATE TABLE "analysis_runs" (
        "id" UUID PRIMARY KEY,
        "tenant_id" VARCHAR(255) NOT NULL,
        "match_id" UUID NOT NULL,
        "cutoff_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "features" JSONB NOT NULL,
        "predictions" JSONB NOT NULL,
        "data_quality_score" NUMERIC(5,4) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Create Advice Table
    await queryRunner.query(`
      CREATE TABLE "advice" (
        "id" UUID PRIMARY KEY,
        "tenant_id" VARCHAR(255) NOT NULL,
        "match_id" UUID NOT NULL,
        "market" VARCHAR(100) NOT NULL,
        "selection" VARCHAR(100) NOT NULL,
        "decision" VARCHAR(50) NOT NULL,
        "rejection_reason" VARCHAR(255) NULL,
        "expected_value" NUMERIC(10,4) NULL,
        "edge" NUMERIC(10,4) NULL,
        "calibrated_probability" NUMERIC(5,4) NULL,
        "model_version" VARCHAR(50) NULL,
        "odds_quote_id" UUID NULL,
        "rationale" TEXT NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_advice_tenant_match" ON "advice" ("tenant_id", "match_id")`,
    );

    // Create Coupon Drafts Table
    await queryRunner.query(`
      CREATE TABLE "coupon_drafts" (
        "id" UUID PRIMARY KEY,
        "tenant_id" VARCHAR(255) NOT NULL,
        "legs" JSONB NOT NULL,
        "combined_odds" NUMERIC(10,4) NOT NULL,
        "expected_value" NUMERIC(10,4) NOT NULL,
        "risk_decision" VARCHAR(50) NOT NULL,
        "rejection_reasons" JSONB NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    // Create Audit Logs Table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" UUID PRIMARY KEY,
        "tenant_id" VARCHAR(255) NOT NULL,
        "action" VARCHAR(100) NOT NULL,
        "entity_name" VARCHAR(100) NOT NULL,
        "entity_id" VARCHAR(100) NOT NULL,
        "actor" VARCHAR(100) NOT NULL,
        "payload" JSONB NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Create Outbox Events Table
    await queryRunner.query(`
      CREATE TABLE "outbox_events" (
        "id" UUID PRIMARY KEY,
        "tenant_id" VARCHAR(255) NOT NULL,
        "event_type" VARCHAR(255) NOT NULL,
        "schema_version" VARCHAR(50) NOT NULL,
        "aggregate_type" VARCHAR(100) NOT NULL,
        "aggregate_id" VARCHAR(100) NOT NULL,
        "payload" JSONB NOT NULL,
        "payload_checksum" VARCHAR(100) NOT NULL,
        "correlation_id" VARCHAR(100) NOT NULL,
        "causation_id" VARCHAR(100) NOT NULL,
        "status" VARCHAR(50) NOT NULL,
        "attempt_count" INT NOT NULL DEFAULT 0,
        "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "claim_owner" VARCHAR(255) NULL,
        "claimed_at" TIMESTAMP WITH TIME ZONE NULL,
        "lease_until" TIMESTAMP WITH TIME ZONE NULL,
        "published_at" TIMESTAMP WITH TIME ZONE NULL,
        "last_error_code" VARCHAR(100) NULL,
        "last_error_summary" TEXT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_outbox_status_next" ON "outbox_events" ("status", "next_attempt_at")`,
    );

    // Create Inbox Messages Table
    await queryRunner.query(`
      CREATE TABLE "inbox_messages" (
        "id" VARCHAR(255) PRIMARY KEY,
        "tenant_id" VARCHAR(255) NOT NULL,
        "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Enable PostgreSQL Row-Level Security
    const tablesToRLS = [
      'matches',
      'providers',
      'odds',
      'models',
      'analysis_runs',
      'advice',
      'coupon_drafts',
      'audit_logs',
      'outbox_events',
      'inbox_messages',
    ];

    for (const table of tablesToRLS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`,
      );
      await queryRunner.query(`
        CREATE POLICY tenant_isolation_policy ON "${table}"
        USING (tenant_id = current_setting('app.current_tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true))
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tablesToRLS = [
      'matches',
      'providers',
      'odds',
      'models',
      'analysis_runs',
      'advice',
      'coupon_drafts',
      'audit_logs',
      'outbox_events',
      'inbox_messages',
    ];

    for (const table of tablesToRLS) {
      await queryRunner.query(
        `DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`,
      );
    }

    await queryRunner.query(`DROP TABLE "inbox_messages"`);
    await queryRunner.query(`DROP TABLE "outbox_events"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "coupon_drafts"`);
    await queryRunner.query(`DROP TABLE "advice"`);
    await queryRunner.query(`DROP TABLE "analysis_runs"`);
    await queryRunner.query(`DROP TABLE "models"`);
    await queryRunner.query(`DROP TABLE "odds"`);
    await queryRunner.query(`DROP TABLE "providers"`);
    await queryRunner.query(`DROP TABLE "matches"`);
  }
}
