declare module 'https://deno.land/std@0.131.0/http/server.ts' {
  export function serve(handler: (req: Request) => Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(supabaseUrl: string, supabaseKey: string): SupabaseClient;
  
  interface QueryBuilder {
    select(query: string): QueryBuilder;
    eq(column: string, value: any): QueryBuilder;
    single(): Promise<{ data: any, error: any }>;
  }

  interface SupabaseClient {
    auth: {
      getUser(token: string): Promise<{ data: { user: any }, error: any }>;
    };
    from(table: string): QueryBuilder;
    storage: {
      from(bucket: string): {
        download(path: string): Promise<{ data: Blob | null, error: any }>;
      };
    };
  }
}

declare module 'npm:docxtemplater' {
  export default class Docxtemplater {
    constructor(zip: any, options?: { paragraphLoop?: boolean; linebreaks?: boolean });
    setData(data: Record<string, any>): void;
    render(): void;
    getZip(): any;
  }
}

declare module 'npm:pizzip' {
  export default class PizZip {
    constructor(content: ArrayBuffer);
    generate(options: { type: 'arraybuffer' }): ArrayBuffer;
  }
}

// Add Deno namespace declaration
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  export const env: Env;
} 