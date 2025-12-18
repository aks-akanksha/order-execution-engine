// Test mocks for database and Redis

import { Pool } from 'pg';
import Redis from 'ioredis';

// Mock PostgreSQL Pool
export function createMockPool(): jest.Mocked<Pool> {
  return {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  } as unknown as jest.Mocked<Pool>;
}

// Mock Redis
export function createMockRedis(): jest.Mocked<Redis> {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
    ping: jest.fn(),
  } as unknown as jest.Mocked<Redis>;
}

