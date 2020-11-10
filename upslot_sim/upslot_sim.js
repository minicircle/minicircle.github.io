// quick script to simulate expenses for upslotting ray weapons to 8 slots

const upslotSim = {
  FIELDS: [
    `maxTrials`,
    `initialSlotCount`,
    `goalSlotCount`,
    `numberOfSSAs`,
    `boostWeekPercentage`,
    `exCubeValue`,
    `upslot0`,
    `upslot1`,
    `upslot2`,
    `upslot3`,
    `upslot4`,
    `upslot5`,
    `upslot6`,
    `upslot7`,
  ],
  BASE_SUCCESS_PROBABILITIES: [1, 0.9, 0.85, 0.7, 0.6, 0.55, 0.4, 0.3],
  AIDS: {
    noAid: { boost: 0, exCubeCost: 0 },
    augAid10: { boost: 0.1, exCubeCost: 0 },
    augAid30: { boost: 0.3, exCubeCost: 20 },
    augAid40: { boost: 0.4, exCubeCost: 100 },
  },
  POSSIBLE_AUGMENTATION_AIDS: new Map([
    [`No Aid`, `noAid`],
    [`Augmentation Aid +10%`, `augAid10`],
    [`Augmentation Aid +30%`, `augAid30`],
    [`Augmentation Aid +40%`, `augAid40`],
  ]),
  workerPool: [
    new Worker(`./upslot_sim_worker.js`),
    new Worker(`./upslot_sim_worker.js`),
    new Worker(`./upslot_sim_worker.js`),
    new Worker(`./upslot_sim_worker.js`),
  ],
  waiting: [],
  init: () => {
    upslotSim.setInitialState();
    upslotSim.addInputListeners();
  },
  setInitialState: () => {
    if (!upslotSim.state) {
      upslotSim.state = {};
    }
    upslotSim.FIELDS.map((field) => {
      if (field.includes(`upslot`)) {
        if (!upslotSim.state.aidsUsed) {
          upslotSim.state.aidsUsed = {};
        }
        const slotNumber = field.replace(`upslot`, ``);
        upslotSim.state.aidsUsed[slotNumber] = document.getElementById(
          field
        ).value;
        document.getElementById(`prob${slotNumber}`).innerText = `${Math.min(
          100,
          (upslotSim.BASE_SUCCESS_PROBABILITIES[slotNumber] +
            Number(document.getElementById(`boostWeekPercentage`).value) / 100 +
            upslotSim.AIDS[document.getElementById(field).value].boost) *
            100
        ).toFixed()}%`;
      } else {
        upslotSim.state[field] = Number(document.getElementById(field).value);
      }
    });
  },
  addInputListeners: () => {
    upslotSim.FIELDS.map((field) => {
      document.getElementById(field).addEventListener(`input`, (event) => {
        upslotSim.updateState(field, event.target.value);
      });
    });
    document
      .getElementById(`simulateBtn`)
      .addEventListener(`click`, upslotSim.simulate);
  },
  validateFieldValue: (field, value) => {
    if (field.includes(`upslot`)) {
      return value;
    }
    if (field === `maxTrials`) {
      value = Math.min(Number(value), 1000000) || 1000000;
    }
    if (field.includes(`slotCount`) || field === `numberOfSSAs`) {
      value = Math.min(Number(value), 8) || 0;
    }
    return Math.max(0, Number(value)) || 0;
  },
  updateState: (field, value) => {
    if (field.includes(`upslot`)) {
      if (!upslotSim.state.aidsUsed) {
        upslotSim.state.aidsUsed = {};
      }
      const slotNumber = field.replace(`upslot`, ``);
      upslotSim.state.aidsUsed[slotNumber] = value;
      document.getElementById(`prob${slotNumber}`).innerText = `${Math.min(
        100,
        (upslotSim.BASE_SUCCESS_PROBABILITIES[slotNumber] +
          Number(document.getElementById(`boostWeekPercentage`).value) / 100 +
          upslotSim.AIDS[value].boost) *
          100
      ).toFixed()}%`;
    } else {
      upslotSim.state[field] = upslotSim.validateFieldValue(field, value);
    }
  },
  renderResult: (text) => {
    document.getElementById(`result`).innerText += `${text}\n`;
  },
  simulate: () => {
    document.getElementById(`result`).innerText = ``;
    const {
      maxTrials,
      initialSlotCount,
      goalSlotCount,
      numberOfSSAs,
      boostWeekPercentage,
      exCubeValue,
      aidsUsed,
    } = upslotSim.state;
    let batchCount = 32;

    if (numberOfSSAs > initialSlotCount) {
      upslotSim.renderResult(
        `Error: number of SSAs affixed to weapon cannot be greater than total number of augments on weapon`
      );
      return console.error(
        `number of SSAs affixed to weapon cannot be greater than total number of augments on weapon`
      );
    }

    if (initialSlotCount >= goalSlotCount) {
      upslotSim.renderResult(
        `Error: initial slot count should be lower than goal slot count`
      );
      return console.error(
        `initial slot count should be lower than goal slot count`
      );
    }

    upslotSim.renderResult(`Simulator Configuration:
Number of trials: ${maxTrials}
Initial slot count: ${initialSlotCount}
Goal slot count: ${goalSlotCount}
Number of SSAs affixed: ${numberOfSSAs}
Boost Week Percentage: ${boostWeekPercentage}\n`);

    const finalResults = [
      `Final results for simulating upslotting of ${initialSlotCount}s weapon with ${numberOfSSAs} SSAs to ${goalSlotCount}s:`,
    ];

    const results = {};

    const processBatch = (trials, worker) => {
      const percentage = boostWeekPercentage;
      worker.postMessage({
        percentage,
        trials,
        initialSlotCount,
        goalSlotCount,
        numberOfSSAs,
        aidsUsed,
      });
      worker.onmessage = (e) => {
        const resultData = e.data;
        if (!results[resultData.percentage]) {
          results[resultData.percentage] = {
            exCubesExpendedTotal: resultData.exCubesExpendedTotal,
          };
        } else {
          results[resultData.percentage].exCubesExpendedTotal +=
            resultData.exCubesExpendedTotal;
        }
        batchCount--;

        if (!batchCount) {
          finalResults.push(`(${percentage}% boost week)
average ex-cubes expended: ${Math.floor(
            results[percentage].exCubesExpendedTotal / maxTrials
          ).toLocaleString()}
ex-cube meseta value (if 1 ex-cube = ${exCubeValue} meseta): ${Math.floor(
            (results[percentage].exCubesExpendedTotal * exCubeValue) / maxTrials
          ).toLocaleString()}`);
          finalResults.push(
            `Elapsed time: ${(Date.now() - startTime).toLocaleString()} ms`
          );
          upslotSim.renderResult(finalResults.flat().join(`\n\n`));
        }

        if (upslotSim.waiting.length) {
          console.log(`assigning worker to batch from queue`);
          upslotSim.waiting.shift()(worker);
        } else {
          upslotSim.workerPool.push(worker);
        }
      };
    };

    upslotSim.renderResult(
      `Simulating upslotting of ${initialSlotCount}s weapon with ${numberOfSSAs} SSAs to ${goalSlotCount}s...`
    );
    const startTime = Date.now();

    const trials = maxTrials / batchCount;
    for (let batch = 0; batch < batchCount; batch++) {
      if (upslotSim.workerPool.length) {
        console.log(`processing batch`);
        processBatch(trials, upslotSim.workerPool.shift());
      } else {
        console.log(`added batch to queue`);
        upslotSim.waiting.push((worker) => processBatch(trials, worker));
      }
    }
  },
};

document.addEventListener(`DOMContentLoaded`, upslotSim.init);
