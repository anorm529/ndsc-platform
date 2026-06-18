export type Team = {
  key: string;
  name: string;
  tag: string;
  desc: string;

  badge: string;      // logo image path in /public
  captain: string;
  division: string;
  lastSeason: string;
  about: string;
  teamPhoto: string;  // team photo path in /public
};

export const teams: Team[] = [
  {
    key: "buccaneers",
    name: "Buccaneers",
    tag: "Division A",
    desc: "Our flagship competitive mixed team, battling it out in the top division of the Softball Ulster league.",
    badge: "/teams/buccaneers-badge.png",
    captain: "Caz Walker",
    division: "Division A",
    lastSeason: "6th",
    about: "The Buccaneers are North Down Softball Club’s flagship competitive squad, competing at the highest level within the league. Known for their experience, tactical awareness, and relentless work ethic, they set the standard for performance across the club. With a strong blend of seasoned players and emerging talent, the Buccaneers combine disciplined defence with powerful, consistent batting to compete week in, week out.",
    teamPhoto: "/teams/buccaneers-team.png",
  },
  {
    key: "barracudas",
    name: "Barracudas",
    tag: "Division B",
    desc: "A highly competitive squad and recent runners-up, always pushing for promotion to Division A.",
    badge: "/teams/barracudas-badge.png",
    captain: "Marc Taylor",
    division: "Division B",
    lastSeason: "2nd",
    about:
      "Fast, focused, and fiercely competitive — the Barracudas are a driven Division B squad within North Down Softball Club. With a strong defensive backbone and explosive batting potential, they aim to compete hard every week while continuing to grow together as a unit.",
    teamPhoto: "/teams/barracudas-team.png",
  },
  // add the rest...
  {
    key: "sluggers",
    name: "Sluggers",
    tag: "Division B",
    desc: "Our development team giving newer players a taste of competitive softball in a supportive environment.",
    badge: "/teams/sluggers-badge.png",
    captain: "Pete Maxwell",
    division: "Division B",
    lastSeason: "7th",
    about:
      "Fast, focused, and fiercely competitive — the Sluggers are a driven Division B squad within North Down Softball Club. With a strong defensive backbone and explosive batting potential, they aim to compete hard every week while continuing to grow together as a unit.",
    teamPhoto: "/teams/sluggers-team.png",
  },
  {
   key: "nightmares",
    name: "Nightmares",
    tag: "Women's only team",
    desc: "Our women's softball Northern Ireland squad focused on skill growth, confidence, and competitive fixtures.",
    badge: "/teams/nightmares-badge.png",
    captain: "Charlotte Turpitt",
    division: "Women's only team",
    lastSeason: "Friendlies only",
    about:
      "The Nightmares are NDSC’s women’s squad, bringing intensity and unity to every fixture. With a focus on skill progression and team chemistry, they play fearless softball while championing opportunity and inclusion for female athletes within the club.",
    teamPhoto: "/teams/nightmares-team.jpeg", 
  },
  {
   key: "stallions",
    name: "Stallions",
    tag: "Mens only team",
    desc: "Our men's softball Northern Ireland side built around athletic defence, big bats, and fast-paced development.",
    badge: "/teams/stallions-badge.png",
    captain: "Matty Connor",
    division: "Mens only team",
    lastSeason: "Friendlies only",
    about:
      "The Stallions are one of North Down Softball Club’s most dynamic and competitive squads. Built on power hitting, aggressive base running, and a strong defensive core, they bring intensity and confidence to every fixture. With a blend of experienced players and rising talent, the Stallions play fearless softball and are always pushing to compete at the highest level.",
    teamPhoto: "/teams/stallions-team.jpeg",  
  }
  
];
