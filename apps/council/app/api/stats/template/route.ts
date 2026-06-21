import { NextResponse } from "next/server";

const TEMPLATE_HEADERS = [
  "year", "team", "opponent", "game_date", "home_away",
  "player", "innings", "rbi", "runs", "bb",
  "1b", "2b", "3b", "hr",
  "batter_outs", "ab", "unassisted_outs", "assisted_outs",
].join(",");

const EXAMPLE_ROW = [
  "2025", "Barracudas", "Red Sox", "2025-05-15", "home",
  "Jane Smith", "3", "1", "2", "0",
  "1", "0", "0", "0",
  "2", "4", "1", "0",
].join(",");

export async function GET() {
  const csv = `${TEMPLATE_HEADERS}\n${EXAMPLE_ROW}\n`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="game-stats-template.csv"`,
    },
  });
}
