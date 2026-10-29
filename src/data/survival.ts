// Survival, health and time tuning (DESIGN section 4).
export const survival = {
  /** real seconds per game day */
  daySeconds: 2160,
  startHour: 6,
  phases: { dawn: 5.5, day: 6.5, dusk: 18.5, night: 19.5 },
  hp: 100,
  bleed: { light: 0.2, heavy: 1.0, clot: 90 },
  needs: {
    satiety: 4, hydration: 5, energy: 5, energySleep: 12.5,
    satietySleep: 2, hydrationSleep: 2.5,
    sprintMul: 1.5, hotMul: 1.2,
    low: 20, starveHp: 2, thirstHp: 5,
  },
  /** energy recovered sleeping rough, relative to a bed (U-013) */
  roughRest: 0.6,
  heal: { awake: 1, asleep: 3, minNeeds: 30 },
  injury: {
    sprainHours: 36, fractureDays: 7, painkillerHours: 4,
    limitsSprain: { sprint: false, jump: 0.5 },
    fractureMantle: 1.0,
    sickHours: 12, vomitEveryHours: 3, vomitLoss: 15,
  },
  collapse: { wakeEnergy: 40 },
};
