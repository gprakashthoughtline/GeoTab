import { useQuery } from "@tanstack/react-query";
import { fetchMockOverview } from "@/services/api";
import type { FleetStats } from "@/services/api";
import type { Driver } from "@/data/mockDrivers";

export interface MockFleetData {
    drivers: Driver[];
    fleetStats: FleetStats;
    isLoading: boolean;
    error: Error | null;
}

export function useMockFleetData(): MockFleetData {
    const { data, isLoading, error } = useQuery({
        queryKey: ["mock-fleet-overview"],
        queryFn: fetchMockOverview,
        refetchInterval: 60000,
        staleTime: 30000,
    });

    return {
        drivers: data?.drivers ?? [],
        fleetStats: data?.stats ?? {
            totalDrivers: 0,
            high: 0,
            mod: 0,
            mild: 0,
            stable: 0,
            avgBurnoutScore: 0,
            driversAtRisk: 0,
            volatilityAlerts: 0,
            driftDistribution: { stable: 0, mild: 0, moderate: 0, high: 0 },
        },
        isLoading,
        error: error as Error | null,
    };
}
