/** Supabase client configuration for extension */

import type {
  Comment,
  DomainShareRule,
  Highlight,
  PageNote,
  PageVisit,
  Workspace,
  WorkspaceSettings,
} from './types';

// Types for Supabase responses
export interface SupabaseAuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

export interface SupabaseWorkspace extends Omit<Workspace, 'settings'> {
  settings: WorkspaceSettings;
}

export interface SupabaseVisit extends PageVisit {}
export interface SupabaseHighlight extends Highlight {}
export interface SupabaseComment extends Comment {}
export interface SupabasePageNote extends PageNote {}

// Supabase client (lazy initialization)
let supabaseClient: any = null;

export function getSupabaseClient(): any {
  if (supabaseClient) return supabaseClient;

  // In production, this would use @supabase/supabase-js
  // For now, return a mock that uses fetch directly
  supabaseClient = {
    auth: {
      signInWithOAuth: async (options: { provider: string; options: { redirectTo: string } }) => {
        // Handled by chrome.identity in background
        return { data: null, error: null };
      },
      exchangeCodeForSession: async (code: string) => {
        return { data: { session: null }, error: null };
      },
      refreshSession: async (refreshToken: string) => {
        return { data: { session: null }, error: null };
      },
      getUser: async (jwt: string) => {
        return { data: { user: null }, error: null };
      },
    },
    from: (table: string) => createTableClient(table),
    channel: (name: string) => createRealtimeChannel(name),
    functions: {
      invoke: async (name: string, options: { body: any }) => {
        return invokeEdgeFunction(name, options.body);
      },
    },
  };

  return supabaseClient;
}

function createTableClient(table: string): any {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

  return {
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: async () => {
          const response = await fetch(
            `${baseUrl}/rest/v1/${table}?${column}=eq.${value}&select=${columns || '*'}`,
            {
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
              },
            }
          );
          return response.json();
        },
        order: (col: string, options?: { ascending: boolean }) => ({
          limit: (n: number) => ({
            then: async (callback: (result: any) => any) => {
              const url = `${baseUrl}/rest/v1/${table}?${column}=eq.${value}&select=${columns || '*'}&order=${col}.${options?.ascending ? 'asc' : 'desc'}&limit=${n}`;
              const response = await fetch(url, {
                headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
              });
              return callback(await response.json());
            },
          }),
        }),
      }),
      gte: (column: string, value: any) => ({
        lte: (col: string, val: any) => ({
          order: (c: string, opts?: { ascending: boolean }) => ({
            then: async (callback: (result: any) => any) => {
              const url = `${baseUrl}/rest/v1/${table}?${column}=gte.${value}&${col}=lte.${val}&order=${c}.${opts?.ascending ? 'asc' : 'desc'}&select=${columns || '*'}`;
              const response = await fetch(url, {
                headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
              });
              return callback(await response.json());
            },
          }),
        }),
      }),
    }),
    insert: (data: any) => ({
      select: (columns?: string) => ({
        single: async () => {
          const response = await fetch(`${baseUrl}/rest/v1/${table}?select=${columns || '*'}`, {
            method: 'POST',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify(data),
          });
          return response.json();
        },
      }),
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        select: (columns?: string) => ({
          single: async () => {
            const response = await fetch(`${baseUrl}/rest/v1/${table}?${column}=eq.${value}`, {
              method: 'PATCH',
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              },
              body: JSON.stringify(data),
            });
            return response.json();
          },
        }),
      }),
    }),
    delete: () => ({
      eq: (column: string, value: any) => ({
        then: async (callback: (result: any) => any) => {
          const response = await fetch(`${baseUrl}/rest/v1/${table}?${column}=eq.${value}`, {
            method: 'DELETE',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
            },
          });
          return callback(await response.json());
        },
      }),
    }),
    upsert: (data: any, options?: { onConflict: string }) => ({
      select: (columns?: string) => ({
        single: async () => {
          const response = await fetch(
            `${baseUrl}/rest/v1/${table}?on_conflict=${options?.onConflict || 'id'}`,
            {
              method: 'POST',
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation,resolution=merge-duplicates',
              },
              body: JSON.stringify(data),
            }
          );
          return response.json();
        },
      }),
    }),
  };
}

function createRealtimeChannel(name: string): any {
  // In production, this would use supabase.realtime
  return {
    on: (event: string, filter: any, callback: (payload: any) => void) => {
      // Mock implementation
      return { unsubscribe: () => {} };
    },
    subscribe: () => {},
    unsubscribe: () => {},
  };
}

async function invokeEdgeFunction(name: string, body: any): Promise<{ data: any; error: any }> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

  try {
    const response = await fetch(`${baseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return { data, error: response.ok ? null : data };
  } catch (error) {
    return { data: null, error };
  }
}

// Auth helpers
export async function signInWithGoogle(): Promise<SupabaseAuthResponse | null> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async (googleToken) => {
      if (chrome.runtime.lastError || !googleToken) {
        reject(new Error(chrome.runtime.lastError?.message || 'Google auth failed'));
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.functions.invoke('auth/google', {
          body: { googleToken },
        });

        if (error) throw error;
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  });
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('auth/refresh', {
    body: { refreshToken },
  });

  if (error) return null;
  return data;
}

// Workspace helpers
export async function createWorkspace(
  name: string,
  ownerId: string,
  hmacSecret: string
): Promise<Workspace | null> {
  const supabase = getSupabaseClient();
  const inviteCode = await generateInviteCode();

  const workspace = {
    name,
    owner_id: ownerId,
    invite_code: inviteCode,
    invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    invite_revoked: false,
    hmac_secret: hmacSecret,
    settings: {
      default_share_level: 'hidden',
      blocked_domains: [],
      max_room_size: 20,
      digest_enabled: false,
      digest_time: '09:00',
      heatmap_enabled: false,
    },
  };

  const { data, error } = await supabase.from('workspaces').insert(workspace).select().single();
  if (error) throw error;
  return data;
}

export async function joinWorkspace(inviteCode: string, userId: string): Promise<Workspace | null> {
  const supabase = getSupabaseClient();

  // First, find workspace by invite code
  const { data: workspace, error: findError } = await supabase
    .from('workspaces')
    .select()
    .eq('invite_code', inviteCode)
    .single();

  if (findError || !workspace) throw new Error('Invalid invite code');

  if (workspace.invite_revoked) throw new Error('Invite code has been revoked');

  if (new Date(workspace.invite_expires_at) < new Date())
    throw new Error('Invite code has expired');

  // Add user as member
  const { error: memberError } = await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: 'member',
  });

  if (memberError) throw memberError;

  return workspace;
}

export async function getWorkspacesForUser(userId: string): Promise<Workspace[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace:workspaces(*)')
    .eq('user_id', userId);

  if (error) throw error;
  return data.map((d: any) => d.workspace).filter(Boolean);
}

// Invite code generation
async function generateInviteCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

// Visit recording
export async function recordVisit(visit: Omit<PageVisit, 'id'>): Promise<PageVisit | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('visits')
    .insert({
      ...visit,
      timestamp: new Date(visit.timestamp).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recordVisitsBatch(visits: Omit<PageVisit, 'id'>[]): Promise<PageVisit[]> {
  const supabase = getSupabaseClient();

  const visitsWithTimestamp = visits.map((v) => ({
    ...v,
    timestamp: new Date(v.timestamp).toISOString(),
  }));

  const { data, error } = await supabase.from('visits').insert(visitsWithTimestamp).select();
  if (error) throw error;
  return data;
}

export async function getVisitsFeed(
  workspaceId: string,
  options?: {
    pageKey?: string;
    userId?: string;
    limit?: number;
    cursor?: string;
  }
): Promise<PageVisit[]> {
  const supabase = getSupabaseClient();

  let query = supabase.from('visits').select().eq('workspace_id', workspaceId);

  if (options?.pageKey) query = query.eq('page_key', options.pageKey);
  if (options?.userId) query = query.eq('user_id', options.userId);

  query = query.order('timestamp', { ascending: false }).limit(options?.limit || 50);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Highlights
export async function createHighlight(highlight: Omit<Highlight, 'id'>): Promise<Highlight | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('highlights')
    .insert({
      ...highlight,
      created_at: new Date(highlight.createdAt).toISOString(),
      updated_at: new Date(highlight.updatedAt).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getHighlightsForPage(
  pageKey: string,
  workspaceId: string
): Promise<Highlight[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('highlights')
    .select()
    .eq('page_key', pageKey)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateHighlight(
  highlightId: string,
  updates: Partial<Highlight>
): Promise<Highlight | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('highlights')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', highlightId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHighlight(highlightId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('highlights')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', highlightId);

  if (error) throw error;
}

// Comments
export async function createComment(comment: Omit<Comment, 'id'>): Promise<Comment | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('comments')
    .insert({
      ...comment,
      created_at: new Date(comment.createdAt).toISOString(),
      updated_at: new Date(comment.updatedAt).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCommentsForHighlight(highlightId: string): Promise<Comment[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('comments')
    .select()
    .eq('highlight_id', highlightId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateComment(commentId: string, content: string): Promise<Comment | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteComment(commentId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);

  if (error) throw error;
}

// Page Notes
export async function createPageNote(note: Omit<PageNote, 'id'>): Promise<PageNote | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('page_notes')
    .upsert(
      {
        ...note,
        created_at: new Date(note.createdAt).toISOString(),
        updated_at: new Date(note.updatedAt).toISOString(),
      },
      { onConflict: 'workspace_id,page_key,user_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPageNotes(pageKey: string, workspaceId: string): Promise<PageNote[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('page_notes')
    .select()
    .eq('page_key', pageKey)
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Search
export async function searchWorkspace(
  workspaceId: string,
  query: string,
  options?: {
    userId?: string;
    domain?: string;
    contentType?: 'visit' | 'highlight' | 'comment' | 'note';
    hasComments?: boolean;
    dateFrom?: number;
    dateTo?: number;
    limit?: number;
  }
): Promise<any[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke('search', {
    body: { workspaceId, query, ...options },
  });

  if (error) throw error;
  return data;
}

// Notifications
export async function getNotifications(
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<any[]> {
  const supabase = getSupabaseClient();

  let query = supabase.from('notifications').select().eq('user_id', userId);

  if (options?.unreadOnly) query = query.eq('read', false);
  query = query.order('created_at', { ascending: false }).limit(options?.limit || 50);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

// Domain Rules
export async function getDomainRules(workspaceId: string): Promise<DomainShareRule[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('domain_rules')
    .select()
    .eq('workspace_id', workspaceId);

  if (error) throw error;
  return data;
}

export async function upsertDomainRule(
  workspaceId: string,
  rule: Omit<DomainShareRule, 'id'>
): Promise<DomainShareRule | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('domain_rules')
    .upsert(
      {
        workspace_id: workspaceId,
        ...rule,
      },
      { onConflict: 'workspace_id,domain' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDomainRule(workspaceId: string, domain: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('domain_rules')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('domain', domain);

  if (error) throw error;
}
