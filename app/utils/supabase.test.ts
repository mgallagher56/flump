import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, test, vi } from 'vitest';

import supabase, { getSupabaseAnonKey, getSupaBaseUrl } from './supabase';

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      auth: {},
      from: {},
      rpc: {},
      schema: {},
      storage: {},
      table: {},
      user: {}
    })
  } as unknown as SupabaseClient;
});

const mockSupabaseUrl = 'http://localhost:8000';

describe('createClient()', () => {
  vi.stubEnv('SUPABASE_URL', mockSupabaseUrl);
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
  test('createClient() returns a Supabase client', () => {
    expect(supabase).toBeDefined();
    expect(supabase).toHaveProperty('auth');
    expect(supabase).toHaveProperty('from');
    expect(supabase).toHaveProperty('rpc');
    expect(supabase).toHaveProperty('schema');
    expect(supabase).toHaveProperty('storage');
    expect(supabase).toHaveProperty('table');
    expect(supabase).toHaveProperty('user');
  });
});

describe('getSupaBaseUrl()', () => {
  test('getSupaBaseUrl() returns the SUPABASE_URL env var', () => expect(getSupaBaseUrl(true)).toBe(mockSupabaseUrl));
  test('getSupaBaseUrl() returns the SUPABASE_URL window.env var', () =>
    expect(getSupaBaseUrl(false)).toBe(mockSupabaseUrl));
});

describe('getSupabaseAnonKey()', () => {
  test('getSupabaseAnonKey() returns the SUPABASE_ANON_KEY env var', () =>
    expect(getSupabaseAnonKey(true)).toBe('anon-key'));
  test('getSupabaseAnonKey() returns the SUPABASE_ANON_KEY window.env var', () =>
    expect(getSupabaseAnonKey(false)).toBe('anon-key'));
});
