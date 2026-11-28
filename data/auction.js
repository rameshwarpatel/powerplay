// Auction purse and squad slots after the IPL 2027 retention deadline (17 Nov 2026).
// Sources: the official IPL site's Team Purses panel (MI Rs 30.25 crore) plus news roundups for the other nine, which match it.
// Edit this file after trades or the auction.
// purse = crore rupees left; slots = open squad places (max squad 25); os = open overseas places.
window.IPL_AUCTION = {
  asof: "17 Nov 2026 (retention deadline)",
  auction: "16 December 2026, Goa",
  // countdown target: start of auction day in India (midnight IST = 18:30 UTC the day before). Change to the real start time when announced.
  when: "2026-12-15T18:30:00Z",
  purseCap: 130, squadMax: 25,
  teams: {
    LSG:  {purse: 47.45, slots: 7, os: 3},
    KKR:  {purse: 41.65, slots: 8, os: 3},
    SRH:  {purse: 40.15, slots: 7, os: 3},
    DC:   {purse: 39.50, slots: 9, os: 4},
    MI:   {purse: 30.25, slots: 9, os: 2},
    CSK:  {purse: 28.05, slots: 6, os: 2},
    RR:   {purse: 27.05, slots: 6, os: 3},
    PBKS: {purse: 18.60, slots: 6, os: 2},
    RCB:  {purse: 14.15, slots: 5, os: 1},
    GT:   {purse: 8.75,  slots: 3, os: 2}
  }
};
