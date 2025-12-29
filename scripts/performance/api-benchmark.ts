
import { performance } from 'node:perf_hooks';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

interface BenchmarkResult {
    endpoint: string;
    method: string;
    status: number;
    timeMs: number;
    success: boolean;
}

async function measure(endpoint: string, method: string = 'GET', body?: unknown): Promise<BenchmarkResult> {
    const url = `${BASE_URL}${endpoint}`;
    const start = performance.now();
    let status = 0;
    let success = false;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        status = res.status;
        success = res.ok;
        // Ensure body is consumed
        await res.text();
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
    }

    const end = performance.now();
    const timeMs = end - start;

    return { endpoint, method, status, timeMs, success };
}

async function run() {
    console.log(`Starting API Benchmark against ${BASE_URL}...\n`);

    const results: BenchmarkResult[] = [];

    // 1. Get Jobs List
    results.push(await measure('/api/jobs', 'GET'));

    // 2. Get Candidates List
    results.push(await measure('/api/candidates-list', 'GET'));

    // 3. Get Companies List
    results.push(await measure('/api/companies-list', 'GET'));

    // 4. Get a specific Job (we need an ID, so we fetch the list first and pick one if available)
    // Re-fetch jobs to get an ID
    try {
        const jobsRes = await fetch(`${BASE_URL}/api/jobs`);
        if (jobsRes.ok) {
            const jobsData = await jobsRes.json();
            const jobs = jobsData.jobs || jobsData; // Handle potential different response structures
            if (Array.isArray(jobs) && jobs.length > 0) {
                const jobId = jobs[0]._id || jobs[0].id;
                if (jobId) {
                    results.push(await measure(`/api/jobs/${jobId}`, 'GET'));
                }
            }
        }
    } catch {
        console.log("Could not fetch job details for dynamic ID test");
    }


    console.log('\n--- Results ---');
    console.table(results.map(r => ({
        Method: r.method,
        Endpoint: r.endpoint,
        Status: r.status,
        'Time (ms)': r.timeMs.toFixed(2),
        Success: r.success ? '✅' : '❌'
    })));
}

run();
