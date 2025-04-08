declare module "http/server" {
  export interface ServeInit {
    port?: number;
    hostname?: string;
  }

  export type Handler = (request: Request) => Response | Promise<Response>;

  export function serve(handler: Handler, options?: ServeInit): void;
} 