async function request(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error ?? `Request failed: ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export const api = {
  getTree: () => request("/api/tree"),
  getFile: (path) => request(`/api/file?path=${encodeURIComponent(path)}`),
  saveFile: (path, content, expectedMtime) =>
    request(`/api/file?path=${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, expectedMtime }),
    }),
  createFile: (folder, title) =>
    request("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder, title }),
    }),
  deleteFile: (path) => request(`/api/file?path=${encodeURIComponent(path)}`, { method: "DELETE" }),
  createFolder: (title, order) =>
    request("/api/folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, order }),
    }),
  deleteFolder: (path) => request(`/api/folder?path=${encodeURIComponent(path)}`, { method: "DELETE" }),
  uploadImage: (file) =>
    request("/api/image", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: file,
    }),
  reorderNode: (path, direction) =>
    request("/api/node/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, direction }),
    }),
};
