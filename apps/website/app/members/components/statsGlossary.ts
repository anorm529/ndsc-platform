export type StatInfo = {
  label: string;
  definition: string;
  calc?: string;
};

export const STAT_INFO: Record<string, StatInfo> = {
  GP: { label: "Games Played", definition: "Total games played.", calc: "sum(games)" },
  INN: { label: "Innings", definition: "Total innings played.", calc: "sum(innings)" },
  "1B": { label: "First Base", definition: "Total singles (1B).", calc: "sum(1B)" },
  "2B": { label: "Second Base", definition: "Total doubles (2B).", calc: "sum(2B)" },
  "3B": { label: "Third Base", definition: "Total triples (3B).", calc: "sum(3B)" },
  HR: { label: "Home Runs", definition: "Total home runs.", calc: "sum(HR)" },
  BB: { label: "Walks", definition: "Total batters walked.", calc: "sum(BB)" },
  OBP: { label: "On-base %", definition: "How often a player reaches base.", calc: "OB / AB" },
  AVG: { label: "Batting Average", definition: "How often a player gets a hit.", calc: "Hits / AB" },
  SLG: {
    label: "Slugging",
    definition: "Power metric weighting extra-base hits.",
    calc: "(1B + 2x2B + 3x3B + 4xHR) / AB",
  },
  AB: { label: "At Bats", definition: "Total official at-bats.", calc: "sum(AB)" },
  OPS: { label: "OPS", definition: "Combined on-base and slugging.", calc: "OBP + SLG" },
  H: { label: "Hits", definition: "Total hits.", calc: "sum(hits)" },
  R: { label: "Runs", definition: "Total runs scored.", calc: "sum(runs)" },
  RBI: { label: "RBI", definition: "Runs batted in.", calc: "sum(RBI)" },
  UAO: { label: "Unassisted Outs", definition: "Outs without another fielder involved.", calc: "sum(uao)" },
  AO: { label: "Assisted Outs", definition: "Outs with another fielder involved.", calc: "sum(ao)" },
  OUTS: { label: "Outs", definition: "Combined outs.", calc: "UAO + AO" },
  OB: { label: "On Base", definition: "Total times a player reaches base safely.", calc: "hits + walks" },
  BO: { label: "Batter Out", definition: "Total batter outs recorded.", calc: "sum(BO)" },
};
