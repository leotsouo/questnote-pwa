import test from 'node:test';
import assert from 'node:assert/strict';
import { raceSceneFrame, RACE_SCENE_MS, RACE_SCRIPTS, pickRaceScript } from '../src/dailyRaceScene.js';

test('all four scripts preserve each saved winner throughout their full timeline', () => {
  for (const script of RACE_SCRIPTS) for (let winner = 0; winner < 4; winner++) {
    let crossed = false;
    for (let tick = 0; tick <= 1000; tick++) {
      const state = raceSceneFrame(tick / 1000, winner, script.id);
      state.positions.forEach((position, index) => {
        assert.ok(position >= 0 && position <= 1);
        if (position >= state.finish) { assert.equal(index, winner, script.id); crossed = true; }
      });
    }
    assert.ok(crossed, script.id);
  }
});

test('twenty-second scripts give all five commentary beats four seconds each', () => {
  assert.equal(RACE_SCENE_MS, 20000);
  for (const script of RACE_SCRIPTS) {
    const durations = new Map();
    for (let tick = 0; tick < 2000; tick++) {
      const state = raceSceneFrame(tick / 2000, 0, script.id);
      durations.set(state.phase, (durations.get(state.phase) || 0) + 10);
      assert.deepEqual(state, raceSceneFrame(tick / 2000, 0, script.id));
    }
    assert.equal(durations.size, 5);
    for (const duration of durations.values()) assert.equal(duration, 4000);
  }
});

test('uniform random bytes map equally to the four scripts without race or bet inputs', () => {
  const counts = new Map(RACE_SCRIPTS.map(s => [s.id, 0]));
  for (let byte = 0; byte < 256; byte++) {
    const id = pickRaceScript(() => byte); counts.set(id, counts.get(id) + 1);
  }
  assert.deepEqual([...counts.values()], [64, 64, 64, 64]);
  assert.throws(() => pickRaceScript(() => 256));
  assert.throws(() => raceSceneFrame(.5, -1));
  assert.throws(() => raceSceneFrame(.5, 0, 'unknown'));
});

test('sleep pauses the leader, wrong-way reverses everyone, only the eye wanders', () => {
  for (let winner = 0; winner < 4; winner++) {
    const asleep = raceSceneFrame(.45, winner, 'nap');
    const later = raceSceneFrame(.55, winner, 'nap');
    assert.notEqual(asleep.sleepingIndex, winner);
    assert.equal(asleep.positions[asleep.sleepingIndex], later.positions[asleep.sleepingIndex]);
    const early = raceSceneFrame(.22, winner, 'wrong-way');
    const late = raceSceneFrame(.38, winner, 'wrong-way');
    assert.ok(early.backwards && late.backwards);
    assert.ok(late.positions.every((p, i) => p < early.positions[i]));
  }
  for (const id of ['normal', 'nap', 'wrong-way']) {
    for (let tick = 0; tick <= 100; tick++) assert.equal(raceSceneFrame(tick / 100, 0, id).finish, .9);
  }
  let last = raceSceneFrame(0, 0), turns = 0, direction = 0;
  for (let tick = 1; tick <= 1000; tick++) {
    const current = raceSceneFrame(tick / 1000, 0);
    const next = Math.sign(current.finish - last.finish);
    if (next && direction && next !== direction) turns++;
    if (next) direction = next;
    last = current;
  }
  assert.ok(turns >= 5);
});
