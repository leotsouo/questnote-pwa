import test from 'node:test';
import assert from 'node:assert/strict';
import { raceSceneFrame, RACE_SCENE_MS } from '../src/dailyRaceScene.js';

test('every saved winner is the sole finisher across the complete animation', () => {
  for (let winner = 0; winner < 4; winner++) {
    let crossed = false;
    for (let tick = 0; tick <= 1000; tick++) {
      const state = raceSceneFrame(tick / 1000, winner);
      state.positions.forEach((position, index) => {
        assert.ok(position >= 0 && position <= 1);
        if (position >= state.finish) { assert.equal(index, winner); crossed = true; }
      });
    }
    assert.ok(crossed);
  }
});

test('the chase changes leaders and replays the same choreography', () => {
  for (let winner = 0; winner < 4; winner++) {
    const leaders = new Set([.29, .60, .73, .94].map(t => {
      const a = raceSceneFrame(t, winner);
      assert.deepEqual(a, raceSceneFrame(t, winner));
      return a.positions.indexOf(Math.max(...a.positions));
    }));
    assert.equal(leaders.size, 4);
  }
  assert.equal(raceSceneFrame(1, 0).phase, 'sprint');
  assert.equal(RACE_SCENE_MS, 30000);
  assert.throws(() => raceSceneFrame(.5, -1));
});

test('each commentary has five seconds and the finish changes direction repeatedly', () => {
  const durations = new Map(); let last = raceSceneFrame(0, 0), turns = 0, direction = 0;
  for (let tick = 0; tick < 3000; tick++) {
    const frame = raceSceneFrame(tick / 3000, 0);
    durations.set(frame.phase, (durations.get(frame.phase) || 0) + 10);
    const next = Math.sign(frame.finish - last.finish);
    if (next && direction && next !== direction) turns++;
    if (next) direction = next;
    last = frame;
  }
  assert.equal(durations.size, 6);
  for (const duration of durations.values()) assert.equal(duration, 5000);
  assert.ok(turns >= 5);
});
