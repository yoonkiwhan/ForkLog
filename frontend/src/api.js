/**
 * API client for ForkLog backend. Uses Vite proxy: /api -> Django.
 * Sends Authorization: Token <token> when getToken() returns a value.
 */

const BASE = "/api";

function getToken() {
  return localStorage.getItem("forklog_token");
}

async function request(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) headers["Authorization"] = `Token ${token}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.detail || res.statusText);
  return data;
}

export const api = {
  auth: {
    login: (username, password) =>
      request("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    register: (username, password) =>
      request("/auth/register/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    me: () => request("/auth/me/"),
  },
  recipes: {
    list: () => request("/recipes/"),
    get: (slug) => request(`/recipes/${slug}/`),
    create: (body) =>
      request("/recipes/", { method: "POST", body: JSON.stringify(body) }),
    update: (slug, body) =>
      request(`/recipes/${slug}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (slug) => request(`/recipes/${slug}/`, { method: "DELETE" }),
  },
  versions: {
    list: (slug) => request(`/recipes/${slug}/versions/`),
    get: (slug, id) => request(`/recipes/${slug}/versions/${id}/`),
    create: (slug, body) =>
      request(`/recipes/${slug}/versions/`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (slug, id, body) =>
      request(`/recipes/${slug}/versions/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (slug, id) =>
      request(`/recipes/${slug}/versions/${id}/`, { method: "DELETE" }),
  },
  sessions: {
    list: (slug) => request(`/recipes/${slug}/sessions/`),
    get: (slug, id) => request(`/recipes/${slug}/sessions/${id}/`),
    create: (slug, body) =>
      request(`/recipes/${slug}/sessions/`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (slug, id, body) =>
      request(`/recipes/${slug}/sessions/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    listMine: () => request(`/sessions/`),
  },
  ai: {
    guide: (body) =>
      request("/ai/guide/", { method: "POST", body: JSON.stringify(body) }),
    import: (source) =>
      request("/ai/import/", {
        method: "POST",
        body: JSON.stringify({ source }),
      }),
    importFromWebpage: (url, content, language = "en") =>
      request("/ai/import/", {
        method: "POST",
        body: JSON.stringify({ url, content, language }),
      }),
  },
};

export { getToken };
