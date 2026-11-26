export type Model = {
  name: string;
  key: string;
};

export type ModelList = {
  embedding: Model[];
  chat: Model[];
};

export type ProviderMetadata = {
  name: string;
  key: string;
};

export type MinimalProvider = {
  id: string;
  name: string;
  type?: string;
  mode?: 'offline' | 'online';
  baseUrl?: string;
  chatModels: Model[];
  embeddingModels: Model[];
  serverStatus?: {
    running: boolean;
    model?: string | null;
    port: number;
  };
};

export type ModelWithProvider = {
  key: string;
  providerId: string;
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, any>;
};
