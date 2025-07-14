import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierApi, agentApi, metricsApi, auditApi, activityApi } from '../api/strandsApi';
import { Supplier } from '../types';

// Query keys
export const queryKeys = {
  suppliers: ['suppliers'] as const,
  supplier: (id: string) => ['suppliers', id] as const,
  agents: ['agents'] as const,
  agent: (id: string) => ['agents', id] as const,
  metrics: ['metrics'] as const,
  complianceData: ['compliance-data'] as const,
  auditEvents: ['audit-events'] as const,
  recentActivity: ['recent-activity'] as const,
};

// Supplier hooks
export function useSuppliers() {
  return useQuery({
    queryKey: queryKeys.suppliers,
    queryFn: async () => {
      const response = await supplierApi.getSuppliers();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: queryKeys.supplier(id),
    queryFn: async () => {
      const response = await supplierApi.getSupplier(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Supplier> }) => {
      const response = await supplierApi.updateSupplier(id, updates);
      return response.data;
    },
    onSuccess: (data) => {
      // Update the specific supplier in cache
      queryClient.setQueryData(queryKeys.supplier(data.id), data);
      
      // Update the suppliers list cache
      queryClient.setQueryData(queryKeys.suppliers, (old: Supplier[] | undefined) => {
        if (!old) return [data];
        return old.map(supplier => supplier.id === data.id ? data : supplier);
      });
    },
  });
}

// Agent hooks
export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents,
    queryFn: async () => {
      const response = await agentApi.getAgents();
      return response.data;
    },
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
    staleTime: 30 * 1000,
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: queryKeys.agent(id),
    queryFn: async () => {
      const response = await agentApi.getAgent(id);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 30 * 1000,
    staleTime: 30 * 1000,
  });
}

// Metrics hooks
export function useMetrics() {
  return useQuery({
    queryKey: queryKeys.metrics,
    queryFn: async () => {
      const response = await metricsApi.getMetrics();
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useComplianceData() {
  return useQuery({
    queryKey: queryKeys.complianceData,
    queryFn: async () => {
      const response = await metricsApi.getComplianceData();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Audit hooks
export function useAuditEvents(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...queryKeys.auditEvents, { page, pageSize }],
    queryFn: async () => {
      return await auditApi.getAuditEvents(page, pageSize);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Activity hooks
export function useRecentActivity() {
  return useQuery({
    queryKey: queryKeys.recentActivity,
    queryFn: async () => {
      const response = await activityApi.getRecentActivity();
      return response.data;
    },
    refetchInterval: 60 * 1000, // Refetch every minute
    staleTime: 60 * 1000,
  });
}