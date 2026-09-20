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
  baseUrl?: string;
  chatModels: Model[];
  embeddingModels: Model[];
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
