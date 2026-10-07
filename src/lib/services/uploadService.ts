export async function uploadDroppedFiles(selectedFiles: File[]): Promise<any[]> {
  const data = new FormData();

  selectedFiles.forEach((file) => {
    data.append('files', file);
  });

  const embeddingModelProvider = localStorage.getItem('embeddingModelProviderId');
  const embeddingModel = localStorage.getItem('embeddingModelKey');

  if (!embeddingModelProvider || !embeddingModel) {
    throw new Error('Please select an embedding model in settings before uploading.');
  }

  data.append('embedding_model_provider_id', embeddingModelProvider);
  data.append('embedding_model_key', embeddingModel);

  const res = await fetch(`/api/uploads`, {
    method: 'POST',
    body: data,
  });

  const resData = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(resData.message || 'Failed to upload file(s).');
  }

  if (!Array.isArray(resData.files)) {
    throw new Error('Invalid upload response from server.');
  }

  return resData.files;
}
