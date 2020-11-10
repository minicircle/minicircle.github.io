const aids = {
  noAid: { boost: 0, exCubeCost: 0 },
  augAid10: { boost: 0.1, exCubeCost: 0 },
  augAid30: { boost: 0.3, exCubeCost: 20 },
  augAid40: { boost: 0.4, exCubeCost: 100 },
};

const BASE_SUCCESS_PROBABILITIES = [1, 0.9, 0.85, 0.7, 0.6, 0.55, 0.4, 0.3];

const calculateUpslotCost = (
  percentage,
  trials,
  initialSlotCount,
  goalSlotCount,
  numberOfSSAs,
  aidsUsed
) => {
  let exCubesExpendedTotal = 0; // running total of ex-cubes spent

  for (let trial = 0; trial < trials; trial++) {
    let slotCount = initialSlotCount;
    while (slotCount < goalSlotCount) {
      // simulate upslot attempts
      const successProbability =
        BASE_SUCCESS_PROBABILITIES[slotCount] +
        percentage / 100 +
        aids[aidsUsed[slotCount]].boost;
      const exCubeCost = aids[aidsUsed[slotCount]].exCubeCost;

      let newSlotCount = numberOfSSAs; // all SSAs are guaranteed to be affixed
      // determine how many non-SSA augments were successfully affixed during this upslot attempt
      for (let slot = 0; slot < slotCount + 1 - numberOfSSAs; slot++) {
        newSlotCount += +(Math.random() < successProbability);
      }

      slotCount = newSlotCount;
      exCubesExpendedTotal += exCubeCost;
    }
  }

  return { percentage, trials, exCubesExpendedTotal };
};

onmessage = (e) => {
  const {
    percentage,
    trials,
    initialSlotCount,
    goalSlotCount,
    numberOfSSAs,
    aidsUsed,
  } = e.data;
  postMessage(
    calculateUpslotCost(
      percentage,
      trials,
      initialSlotCount,
      goalSlotCount,
      numberOfSSAs,
      aidsUsed
    )
  );
};
