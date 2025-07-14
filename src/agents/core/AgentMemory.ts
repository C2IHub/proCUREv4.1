import { AgentMemoryEntry } from '../../types';

interface CompressedEntry {
  data: string;
  compressed: boolean;
  originalSize: number;
}

export class AgentMemory {
  private memory = new Map<string, AgentMemoryEntry>();
  private readonly maxMemorySize = 100 * 1024 * 1024; // 100MB
  private readonly maxEntries = 10000;
  private readonly compressionThreshold = 10000; // 10KB

  constructor(private agentId: string) {
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const timestamp = new Date().toISOString();
    const serialized = JSON.stringify(value);
    
    // Compress large values
    const shouldCompress = serialized.length > this.compressionThreshold;
    let finalValue: unknown = value;
    let compressed = false;

    if (shouldCompress) {
      try {
        const compressedData = await this.compress(serialized);
        finalValue = compressedData;
        compressed = true;
      } catch (error) {
        // If compression fails, store uncompressed
        console.warn(`Failed to compress data for key ${key}:`, error);
      }
    }

    const entry: AgentMemoryEntry = {
      key,
      value: finalValue,
      timestamp,
      ttl,
      compressed
    };

    this.memory.set(key, entry);

    // Ensure memory limits
    await this.enforceMemoryLimits();
  }

  async get(key: string): Promise<AgentMemoryEntry | null> {
    const entry = this.memory.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.memory.delete(key);
      return null;
    }

    // Decompress if needed
    if (entry.compressed) {
      try {
        const decompressed = await this.decompress(entry.value as CompressedEntry);
        return {
          ...entry,
          value: decompressed,
          compressed: false
        };
      } catch (error) {
        console.error(`Failed to decompress data for key ${key}:`, error);
        this.memory.delete(key);
        return null;
      }
    }

    return entry;
  }

  async delete(key: string): Promise<boolean> {
    return this.memory.delete(key);
  }

  async clear(): Promise<void> {
    this.memory.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.memory.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.memory.delete(key);
      return false;
    }

    return true;
  }

  async keys(): Promise<string[]> {
    const validKeys: string[] = [];
    
    for (const [key, entry] of this.memory.entries()) {
      if (!this.isExpired(entry)) {
        validKeys.push(key);
      } else {
        this.memory.delete(key);
      }
    }

    return validKeys;
  }

  async size(): Promise<number> {
    // Clean up expired entries first
    await this.cleanup();
    return this.memory.size;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    totalEntries: number;
    totalSize: number;
    compressedEntries: number;
    oldestEntry: string | null;
    newestEntry: string | null;
  } {
    let totalSize = 0;
    let compressedEntries = 0;
    let oldestTimestamp = new Date().toISOString();
    let newestTimestamp = '';
    let oldestKey: string | null = null;
    let newestKey: string | null = null;

    for (const [key, entry] of this.memory.entries()) {
      // Calculate size
      const entrySize = this.calculateEntrySize(entry);
      totalSize += entrySize;

      if (entry.compressed) {
        compressedEntries++;
      }

      // Track oldest and newest
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
        newestKey = key;
      }
    }

    return {
      totalEntries: this.memory.size,
      totalSize,
      compressedEntries,
      oldestEntry: oldestKey,
      newestEntry: newestKey
    };
  }

  private isExpired(entry: AgentMemoryEntry): boolean {
    if (!entry.ttl) return false;
    
    const entryTime = new Date(entry.timestamp).getTime();
    const now = Date.now();
    return (now - entryTime) > (entry.ttl * 1000);
  }

  private async cleanup(): Promise<void> {
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memory.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.memory.delete(key);
    }
  }

  private async enforceMemoryLimits(): Promise<void> {
    // Remove entries if we exceed the maximum number
    if (this.memory.size > this.maxEntries) {
      await this.evictOldestEntries(this.memory.size - this.maxEntries);
    }

    // Remove entries if we exceed the maximum memory size
    const stats = this.getMemoryStats();
    if (stats.totalSize > this.maxMemorySize) {
      await this.evictLargestEntries();
    }
  }

  private async evictOldestEntries(count: number): Promise<void> {
    const entries = Array.from(this.memory.entries());
    entries.sort(([, a], [, b]) => a.timestamp.localeCompare(b.timestamp));

    for (let i = 0; i < count && i < entries.length; i++) {
      this.memory.delete(entries[i][0]);
    }
  }

  private async evictLargestEntries(): Promise<void> {
    const entries = Array.from(this.memory.entries());
    entries.sort(([, a], [, b]) => this.calculateEntrySize(b) - this.calculateEntrySize(a));

    let freedSpace = 0;
    const targetFreeSpace = this.maxMemorySize * 0.2; // Free 20% of max memory

    for (const [key, entry] of entries) {
      const entrySize = this.calculateEntrySize(entry);
      this.memory.delete(key);
      freedSpace += entrySize;

      if (freedSpace >= targetFreeSpace) {
        break;
      }
    }
  }

  private calculateEntrySize(entry: AgentMemoryEntry): number {
    return JSON.stringify(entry).length * 2; // Rough estimate (UTF-16)
  }

  private async compress(data: string): Promise<CompressedEntry> {
    // Simple compression using built-in TextEncoder/Decoder
    // In a real implementation, you might use a proper compression library like pako
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    
    // For simplicity, we'll just base64 encode (not real compression)
    // In production, use actual compression algorithms
    const compressed = btoa(String.fromCharCode(...bytes));
    
    return {
      data: compressed,
      compressed: true,
      originalSize: data.length
    };
  }

  private async decompress(compressedEntry: CompressedEntry): Promise<unknown> {
    if (!compressedEntry.compressed) {
      return compressedEntry.data;
    }

    try {
      // Reverse the "compression" (base64 decode)
      const binaryString = atob(compressedEntry.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const decoder = new TextDecoder();
      const decompressed = decoder.decode(bytes);
      
      return JSON.parse(decompressed);
    } catch (error) {
      throw new Error(`Failed to decompress data: ${error}`);
    }
  }

  /**
   * Export memory contents for debugging
   */
  async exportMemory(): Promise<Record<string, unknown>> {
    const exported: Record<string, unknown> = {};
    
    for (const [key, entry] of this.memory.entries()) {
      if (!this.isExpired(entry)) {
        const actualEntry = await this.get(key);
        if (actualEntry) {
          exported[key] = {
            value: actualEntry.value,
            timestamp: actualEntry.timestamp,
            ttl: actualEntry.ttl,
            compressed: entry.compressed
          };
        }
      }
    }

    return exported;
  }

  /**
   * Import memory contents (for testing or migration)
   */
  async importMemory(data: Record<string, AgentMemoryEntry>): Promise<void> {
    for (const [key, entry] of Object.entries(data)) {
      await this.set(key, entry.value, entry.ttl);
    }
  }
}