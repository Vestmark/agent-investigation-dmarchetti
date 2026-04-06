import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

// ===== Schema + Seed =====

export async function initDb(): Promise<void> {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS holdings (
      id           SERIAL PRIMARY KEY,
      symbol       TEXT NOT NULL,
      stock_name   TEXT NOT NULL DEFAULT '',
      person_name  TEXT NOT NULL DEFAULT '',
      household    TEXT NOT NULL DEFAULT '',
      positions    DOUBLE PRECISION NOT NULL DEFAULT 0,
      strike_price DOUBLE PRECISION NOT NULL DEFAULT 0
    );
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS calendar (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      event_date  TEXT NOT NULL,
      event_time  TEXT NOT NULL DEFAULT '',
      reminder    INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS alerts (
      id             SERIAL PRIMARY KEY,
      symbol         TEXT NOT NULL,
      alert_type     TEXT NOT NULL,
      threshold      DOUBLE PRECISION NOT NULL DEFAULT 0,
      person_name    TEXT NOT NULL DEFAULT '',
      household      TEXT NOT NULL DEFAULT '',
      enabled        INTEGER NOT NULL DEFAULT 1,
      last_triggered TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS reports (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      report_type TEXT NOT NULL DEFAULT 'daily',
      content     TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seed holdings if empty
  const [{ c }] = await sql<[{ c: string }]>`SELECT COUNT(*)::int AS c FROM holdings`;
  if (Number(c) === 0) {
    await seedHoldings();
  }
}

async function seedHoldings(): Promise<void> {
  const STOCK_NAMES: Record<string, string> = {
    AAPL: "Apple Inc.",
    MSFT: "Microsoft Corp.",
    NVDA: "NVIDIA Corp.",
    AMZN: "Amazon.com Inc.",
    META: "Meta Platforms Inc.",
    GOOGL: "Alphabet Inc.",
    TSLA: "Tesla Inc.",
    "BRK-B": "Berkshire Hathaway Inc.",
    AVGO: "Broadcom Inc.",
    LLY: "Eli Lilly & Co.",
    JPM: "JPMorgan Chase & Co.",
    UNH: "UnitedHealth Group Inc.",
    GS: "Goldman Sachs Group Inc.",
    HD: "Home Depot Inc.",
    AMGN: "Amgen Inc.",
    CAT: "Caterpillar Inc.",
    MCD: "McDonald's Corp.",
    V: "Visa Inc.",
    CRM: "Salesforce Inc.",
    COST: "Costco Wholesale Corp.",
    NFLX: "Netflix Inc.",
    SAP: "SAP SE",
    "^GSPC": "S&P 500 Index",
    "^DJI": "Dow Jones Industrial Average",
    "^IXIC": "NASDAQ Composite",
  };

  const assignments = [
    { person: "Alice Chen", household: "Evergreen", symbols: ["AAPL", "MSFT", "NVDA", "GOOGL", "META"] },
    { person: "Bob Martinez", household: "Evergreen", symbols: ["TSLA", "AMZN", "NFLX", "CRM"] },
    { person: "Carol Johnson", household: "Evergreen", symbols: ["SAP", "BRK-B", "JPM", "V", "GS"] },
    { person: "David Kim", household: "Pinnacle", symbols: ["AVGO", "LLY", "UNH", "COST"] },
    { person: "Emily Wright", household: "Pinnacle", symbols: ["AAPL", "HD", "MCD", "CAT", "AMGN"] },
    { person: "Frank Patel", household: "Pinnacle", symbols: ["MSFT", "META", "NVDA", "NFLX", "CRM"] },
    { person: "Grace Thompson", household: "Pinnacle", symbols: ["TSLA", "AMZN", "GOOGL"] },
    { person: "Henry Nakamura", household: "Horizon", symbols: ["JPM", "GS", "V", "BRK-B", "UNH"] },
    { person: "Irene Costa", household: "Horizon", symbols: ["LLY", "AVGO", "HD", "COST", "SAP"] },
    { person: "James Sullivan", household: "Horizon", symbols: ["MCD", "CAT", "AMGN", "TSLA", "AMZN", "NFLX"] },
  ];

  const rng = (seed: number) => {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  };
  const rand = rng(42);

  await sql.begin(async (tx) => {
    // Insert indexes
    for (const sym of ["^GSPC", "^DJI", "^IXIC"]) {
      await tx`INSERT INTO holdings (symbol, stock_name, person_name, household, positions, strike_price)
               VALUES (${sym}, ${STOCK_NAMES[sym] ?? sym}, '', '', 0, 0)`;
    }

    // Insert people's holdings
    for (const a of assignments) {
      for (const sym of a.symbols) {
        const positions = Math.round(rand() * 490 + 10);
        const basePrice: Record<string, number> = {
          AAPL: 185, MSFT: 420, NVDA: 880, AMZN: 185, META: 500,
          GOOGL: 170, TSLA: 250, "BRK-B": 415, AVGO: 170, LLY: 780,
          JPM: 200, UNH: 520, GS: 470, HD: 370, AMGN: 290,
          CAT: 350, MCD: 290, V: 280, CRM: 300, COST: 740,
          NFLX: 630, SAP: 200,
        };
        const strike = +((basePrice[sym] ?? 100) * (0.85 + rand() * 0.3)).toFixed(2);
        await tx`INSERT INTO holdings (symbol, stock_name, person_name, household, positions, strike_price)
                 VALUES (${sym}, ${STOCK_NAMES[sym] ?? sym}, ${a.person}, ${a.household}, ${positions}, ${strike})`;
      }
    }
  });

  console.log("Database seeded with holdings data.");
}

// ===== Types =====

export interface Holding {
  id: number;
  symbol: string;
  stock_name: string;
  person_name: string;
  household: string;
  positions: number;
  strike_price: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  reminder: number;
  created_at: string;
}

export interface Alert {
  id: number;
  symbol: string;
  alert_type: string;
  threshold: number;
  person_name: string;
  household: string;
  enabled: number;
  last_triggered: string | null;
  created_at: string;
}

export interface Report {
  id: number;
  title: string;
  report_type: string;
  content: string;
  created_at: string;
}

// ===== Holdings helpers =====

export async function getAllHoldings(): Promise<Holding[]> {
  return await sql<Holding[]>`SELECT * FROM holdings ORDER BY household, person_name, symbol`;
}

export async function getHoldingsByHousehold(household: string): Promise<Holding[]> {
  return await sql<Holding[]>`SELECT * FROM holdings WHERE household = ${household} ORDER BY person_name, symbol`;
}

export async function getHoldingsByPerson(person: string): Promise<Holding[]> {
  return await sql<Holding[]>`SELECT * FROM holdings WHERE person_name = ${person} ORDER BY symbol`;
}

export async function getUniqueSymbols(): Promise<string[]> {
  const rows = await sql<{ symbol: string }[]>`SELECT DISTINCT symbol FROM holdings ORDER BY symbol`;
  return rows.map((r) => r.symbol);
}

export async function getHouseholds(): Promise<string[]> {
  const rows = await sql<{ household: string }[]>`SELECT DISTINCT household FROM holdings WHERE household != '' ORDER BY household`;
  return rows.map((r) => r.household);
}

export async function getPeople(): Promise<string[]> {
  const rows = await sql<{ person_name: string }[]>`SELECT DISTINCT person_name FROM holdings WHERE person_name != '' ORDER BY person_name`;
  return rows.map((r) => r.person_name);
}

export async function addHolding(h: Omit<Holding, "id">): Promise<Holding[]> {
  await sql`INSERT INTO holdings (symbol, stock_name, person_name, household, positions, strike_price)
            VALUES (${h.symbol}, ${h.stock_name}, ${h.person_name}, ${h.household}, ${h.positions}, ${h.strike_price})`;
  return getAllHoldings();
}

export async function removeHolding(id: number): Promise<Holding[]> {
  await sql`DELETE FROM holdings WHERE id = ${id}`;
  return getAllHoldings();
}

export async function removeSymbolHoldings(symbol: string): Promise<void> {
  await sql`DELETE FROM holdings WHERE symbol = ${symbol.toUpperCase()}`;
}

export async function addSymbolToDb(symbol: string, stockName?: string): Promise<void> {
  const existing = await sql`SELECT id FROM holdings WHERE symbol = ${symbol} LIMIT 1`;
  if (existing.length === 0) {
    await sql`INSERT INTO holdings (symbol, stock_name, person_name, household, positions, strike_price)
              VALUES (${symbol}, ${stockName ?? symbol}, '', '', 0, 0)`;
  }
}

// ===== Calendar helpers =====

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  return await sql<CalendarEvent[]>`SELECT * FROM calendar ORDER BY event_date, event_time`;
}

export async function addCalendarEvent(e: Omit<CalendarEvent, "id" | "created_at">): Promise<CalendarEvent> {
  const [row] = await sql<CalendarEvent[]>`
    INSERT INTO calendar (title, description, event_date, event_time, reminder)
    VALUES (${e.title}, ${e.description}, ${e.event_date}, ${e.event_time}, ${e.reminder ? 1 : 0})
    RETURNING *`;
  return row;
}

export async function deleteCalendarEvent(id: number): Promise<void> {
  await sql`DELETE FROM calendar WHERE id = ${id}`;
}

// ===== Alerts helpers =====

export async function getAllAlerts(): Promise<Alert[]> {
  return await sql<Alert[]>`SELECT * FROM alerts ORDER BY symbol, alert_type`;
}

export async function getEnabledAlerts(): Promise<Alert[]> {
  return await sql<Alert[]>`SELECT * FROM alerts WHERE enabled = 1 ORDER BY symbol`;
}

export async function addAlert(a: Omit<Alert, "id" | "created_at" | "last_triggered">): Promise<Alert> {
  const [row] = await sql<Alert[]>`
    INSERT INTO alerts (symbol, alert_type, threshold, person_name, household, enabled)
    VALUES (${a.symbol}, ${a.alert_type}, ${a.threshold}, ${a.person_name}, ${a.household}, ${a.enabled})
    RETURNING *`;
  return row;
}

export async function removeAlert(id: number): Promise<void> {
  await sql`DELETE FROM alerts WHERE id = ${id}`;
}

export async function updateAlertTriggered(id: number): Promise<void> {
  await sql`UPDATE alerts SET last_triggered = NOW() WHERE id = ${id}`;
}

export async function toggleAlert(id: number, enabled: boolean): Promise<void> {
  await sql`UPDATE alerts SET enabled = ${enabled ? 1 : 0} WHERE id = ${id}`;
}

// ===== Reports helpers =====

export async function getReports(limit = 20): Promise<Report[]> {
  return await sql<Report[]>`SELECT * FROM reports ORDER BY created_at DESC LIMIT ${limit}`;
}

export async function addReport(r: Omit<Report, "id" | "created_at">): Promise<Report> {
  const [row] = await sql<Report[]>`
    INSERT INTO reports (title, report_type, content)
    VALUES (${r.title}, ${r.report_type}, ${r.content})
    RETURNING *`;
  return row;
}

export async function removeReport(id: number): Promise<void> {
  await sql`DELETE FROM reports WHERE id = ${id}`;
}

// ===== Cleanup =====

export async function closeDb(): Promise<void> {
  await sql.end();
}
