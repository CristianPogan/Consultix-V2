#!/usr/bin/env python3
"""
Consultix V2 — Update Credits & Billing Configuration

Updates:
1. billing_plans — Set credits_monthly per tier (admin-managed, consumed on platform use)
2. signup_access_tokens — Default new user signup credits to 300
3. system_settings — Add default_signup_credits for platform-wide default

Run: python scripts/update_credits_and_billing.py
"""

import os
import sys

try:
    import psycopg2
except ImportError:
    print("Error: psycopg2 required. Run: pip install psycopg2-binary")
    sys.exit(1)

# Database config — override with env vars in production
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "cbhnv71uilek74.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "dbname": os.getenv("DB_NAME", "da9fpsg176u1ef"),
    "user": os.getenv("DB_USER", "u2bsp865bnr7av"),
    "password": os.getenv("DB_PASSWORD", "p56534f4c962e9c3113135d3ff5d92b64ac9c427edc3b5996134471401606280e"),
    "sslmode": "require",
}

# Credit defaults per billing tier (admin can change these in the DB)
CREDITS_PER_PLAN = {
    "free": 300,
    "starter": 500,
    "growth": 2000,
    "scale": 5000,
    "enterprise": 50000,
}

DEFAULT_SIGNUP_CREDITS = 300

# Default signup token code (universal token for open signups)
DEFAULT_SIGNUP_TOKEN = "AAAAAAA"


def run_migrations(conn):
    """Apply all credit and billing updates."""
    cur = conn.cursor()
    changes = []

    try:
        # 1. Update billing_plans.credits_monthly for each tier (admin-managed, Stripe-linked)
        for tier, credits in CREDITS_PER_PLAN.items():
            cur.execute(
                """
                UPDATE billing_plans
                SET credits_monthly = %s, updated_at = now()
                WHERE tier = %s::plan_tier
                RETURNING id, name, tier, credits_monthly;
                """,
                (credits, tier),
            )
            rows = cur.fetchall()
            if rows:
                for r in rows:
                    changes.append(f"  billing_plans: {r[1]} ({r[2]}) → {r[3]} credits/month")
            else:
                changes.append(f"  billing_plans: tier '{tier}' not found (seeded at deploy)")

        # 2. Update signup_access_tokens — set default token to 300 credits for new users
        cur.execute(
            """
            UPDATE signup_access_tokens
            SET assigned_credits = %s, updated_at = now()
            WHERE token = %s
            RETURNING id, token, assigned_credits, type, status;
            """,
            (DEFAULT_SIGNUP_CREDITS, DEFAULT_SIGNUP_TOKEN),
        )
        rows = cur.fetchall()
        if rows:
            changes.append(f"  signup_access_tokens: token '{DEFAULT_SIGNUP_TOKEN}' → assigned_credits={rows[0][2]}")
        else:
            # Token might not exist — we can't create without admin_user, so just note it
            cur.execute("SELECT COUNT(*) FROM signup_access_tokens WHERE token = %s", (DEFAULT_SIGNUP_TOKEN,))
            if cur.fetchone()[0] == 0:
                changes.append(f"  signup_access_tokens: token '{DEFAULT_SIGNUP_TOKEN}' not found — create it manually if needed")

        # 3. Upsert system_settings for default_signup_credits (platform-wide default)
        cur.execute(
            """
            INSERT INTO system_settings (category, key, value, value_type, description, is_sensitive)
            VALUES ('limits', 'default_signup_credits', '300', 'integer', 'Default credits for new orgs on signup (when no token specifies otherwise)', false)
            ON CONFLICT (category, key) DO UPDATE SET
                value = '300'::jsonb,
                description = EXCLUDED.description,
                updated_at = now()
            """,
        )
        changes.append("  system_settings: limits.default_signup_credits = 300")

        # 4. Ensure organisations created without a plan get 300 credits on first grant
        # (This is handled by application logic / signup flow — we've set the token and system setting)

        conn.commit()
        return changes

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()


def main():
    print("Consultix V2 — Credits & Billing Update")
    print("=" * 50)
    print(f"Connecting to {DB_CONFIG['host']}...")

    try:
        conn = psycopg2.connect(
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
            dbname=DB_CONFIG["dbname"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            sslmode=DB_CONFIG["sslmode"],
        )
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

    print("Connected.\n")
    print("Applying updates...")

    try:
        changes = run_migrations(conn)
        print("\nUpdates applied:")
        for c in changes:
            print(c)
        print("\nDone.")
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
