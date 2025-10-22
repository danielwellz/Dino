const RAW_API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

const absoluteUrl = (path: string): string => {
  if (!path) return path;
  if (/^https?:/i.test(path)) {
    return path;
  }
  const base = RAW_API_BASE_URL;
  if (!base) {
    return path.startsWith("/") ? path : `/${path}`;
  }
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
};

const uploadEndpoint = (): string => {
  if (!RAW_API_BASE_URL) {
    return "/api/uploads";
  }
  return `${RAW_API_BASE_URL}/api/uploads`;
};

export type UploadResponse = {
  url: string;
  relativeUrl?: string;
  fileName: string;
  fileType?: string | null;
  fileSize?: number | null;
  thumbnailURL?: string | null;
};

export async function uploadFile(
  file: File,
  token?: string | null,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(uploadEndpoint(), {
    method: "POST",
    body: formData,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Upload failed");
  }

  const payload = await response.json();
  const relativeUrl: string | undefined = payload.url ?? payload.fileURL;

  return {
    url: absoluteUrl(relativeUrl ?? ""),
    relativeUrl,
    fileName: payload.fileName ?? file.name,
    fileType: payload.fileType ?? file.type ?? null,
    fileSize:
      typeof payload.fileSize === "number" ? payload.fileSize : file.size ?? null,
    thumbnailURL: payload.thumbnailURL ?? null,
  };
}
