
import { performance } from 'node:perf_hooks';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const CONCURRENT_USERS = 20; // Moderate load
const DURATION_SECONDS = 10;

async function simulateUser() {
    let requests = 0;
    let errors = 0;
    const start = performance.now();
    const end = start + (DURATION_SECONDS * 1000);
    const times: number[] = [];

    while (performance.now() < end) {
        const reqStart = performance.now();
        try {
            const res = await fetch(`${BASE_URL}/api/jobs`);
            if (!res.ok) errors++;
            await res.text(); // consume body
            requests++;
        } catch {
            errors++;
        }
        const reqEnd = performance.now();
        times.push(reqEnd - reqStart);

        // Random think time between 100ms and 500ms
        await new Promise(r => setTimeout(r, 100 + Math.random() * 400));
    }
    return { requests, errors, times };
}

async function run() {
    console.log(`Starting Load Test: ${CONCURRENT_USERS} users, ${DURATION_SECONDS} seconds...`);

    const start = performance.now();
    const promises = [];
    for (let i = 0; i < CONCURRENT_USERS; i++) {
        promises.push(simulateUser());
    }

    const results = await Promise.all(promises);
    const end = performance.now();

    const totalRequests = results.reduce((acc, r) => acc + r.requests, 0);
    const totalErrors = results.reduce((acc, r) => acc + r.errors, 0);
    const allTimes = results.flatMap(r => r.times).sort((a, b) => a - b);
    const actualDuration = (end - start) / 1000;

    const p50 = allTimes[Math.floor(allTimes.length * 0.5)] || 0;
    const p95 = allTimes[Math.floor(allTimes.length * 0.95)] || 0;
    const p99 = allTimes[Math.floor(allTimes.length * 0.99)] || 0;

    console.log('\n--- Load Test Results ---');
    console.log(`Duration: ${actualDuration.toFixed(2)}s`);
    console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`RPS: ${(totalRequests / actualDuration).toFixed(2)}`);
    console.log(`Error Rate: ${((totalErrors / totalRequests) * 100).toFixed(2)}%`);
    console.log(`Latency p50: ${p50.toFixed(2)}ms`);
    console.log(`Latency p95: ${p95.toFixed(2)}ms`);
    console.log(`Latency p99: ${p99.toFixed(2)}ms`);
}

run();
