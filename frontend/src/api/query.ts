import { api } from './client';
import { getAuthToken } from '../lib/supabase';

export interface QueryRequest {
  query: string;
  language: string;
  session_id?: string;
}

export interface FastModeResponse {
  answer: string;
  relevant_law: string;
  category: string;
  needs_lawyer: boolean;
  disclaimer: string;
  latency_ms: number;
  cached: boolean;
}

export interface Citation {
  index: number;
  act_name: string;
  section: string;
  case_name: string;
  court: string;
  year: string;
  excerpt: string;
  url?: string;
}

export interface VerifiedModeResponse {
  answer: string;
  citations: Citation[];
  confidence: 'high' | 'medium' | 'low';
  hallucination_guard_passed: boolean;
  latency_ms: number;
  disclaimer: string;
  accuracy?: number;
  query_type?: string;
}

export async function queryFast(
  req: QueryRequest
): Promise<FastModeResponse> {
  const token = await getAuthToken()
  
  const res = await api.post(
    '/api/v1/query/fast', 
    req,
    { headers: token ? 
      { Authorization: `Bearer ${token}` } 
      : {} }
  )
  return res as FastModeResponse
}

export async function queryVerified(
  req: QueryRequest
): Promise<VerifiedModeResponse> {
  const token = await getAuthToken()
  
  const res = await api.post(
    '/api/v1/query/verified',
    req,
    { 
      headers: token ? 
        { Authorization: `Bearer ${token}` } 
        : {}
    }
  )
  return res as VerifiedModeResponse
}
