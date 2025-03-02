// Option 1: Create or update env.d.ts in your project root
// File: env.d.ts
interface ImportMeta {
    readonly env: {
      readonly VITE_SUPABASE_URL: string;
      readonly VITE_SUPABASE_ANON_KEY: string;
      // Add other environment variables you're using
      readonly [key: string]: string | undefined;
    };
  }
  
  // End of Selection