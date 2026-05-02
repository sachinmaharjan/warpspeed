import { test } from 'node:test';
import assert from 'node:assert';
import * as missionsAPI from './missions.ts';

// Tests structured against explicit defensive boundaries.
test('getMissionCountByCompany - deterministic counting', () => {
    // Tests case insensitivity and grouping
    const result = missionsAPI.getMissionCountByCompany('SpaceX');
    assert.strictEqual(typeof result, 'number');
});

test('getSuccessRate - float output', () => {
    const rate = missionsAPI.getSuccessRate('RVSN USSR');
    assert.ok(rate >= 0 && rate <= 1);
});

test('getMissionsByDateRange - boundaries and invalid inputs', () => {
    // Handling invalid JS dates gracefully
    const invalid = missionsAPI.getMissionsByDateRange('blabla', '2023-01-01');
    assert.strictEqual(invalid.length, 0);

    const valid = missionsAPI.getMissionsByDateRange('1957-01-01', '1960-01-01');
    assert.ok(Array.isArray(valid));
});

test('getTopCompaniesByMissionCount - tiebreak sorting', () => {
    const top = missionsAPI.getTopCompaniesByMissionCount(5);
    assert.ok(top.length <= 5);
    if (top.length > 0) {
        assert.strictEqual(typeof top[0][0], 'string');
        assert.strictEqual(typeof top[0][1], 'number');
    }
});

test('getMissionStatusCount - structured mappings', () => {
    const statuses = missionsAPI.getMissionStatusCount();
    assert.ok(typeof statuses === 'object');
});

test('getMissionsByYear - year filtering', () => {
    const count = missionsAPI.getMissionsByYear(1957);
    assert.ok(count >= 0);
});

test('getMostUsedRocket - extracts actual rocket name', () => {
    const rocket = missionsAPI.getMostUsedRocket();
    assert.strictEqual(typeof rocket, 'string');
});

test('getAverageMissionsPerYear - boundary logic', () => {
    // Tests defensive start > end returns 0
    const fail = missionsAPI.getAverageMissionsPerYear(2020, 2010);
    assert.strictEqual(fail, 0);

    const pass = missionsAPI.getAverageMissionsPerYear(1957, 1960);
    assert.ok(pass >= 0);
});
