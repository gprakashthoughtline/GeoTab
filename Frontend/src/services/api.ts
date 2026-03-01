import type { Driver } from "@/data/mockDrivers";

export const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface FleetStats {
    totalDrivers: number;
    high: number;
    mod: number;
    mild: number;
    stable: number;
    avgBurnoutScore: number;
    driversAtRisk: number;
    volatilityAlerts: number;
    driftDistribution: {
        stable: number;
        mild: number;
        moderate: number;
        high: number;
    };
}

export interface OverviewResponse {
    stats: FleetStats;
    drivers: Driver[];
}

export async function fetchOverview(): Promise<OverviewResponse> {
    const res = await fetch(`${API_BASE_URL}/api/overview`);
    if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

export async function fetchMockOverview(): Promise<OverviewResponse> {
    const res = await fetch(`${API_BASE_URL}/api/mock/overview`);
    if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}
