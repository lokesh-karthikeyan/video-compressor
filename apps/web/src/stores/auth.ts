import { eden } from "$lib";
import type { AuthState, AuthResponse } from "$lib/types";
import { writable, get } from "svelte/store";

const AUTH_KEY = "auth";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function loadFromStorage(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { user: null, accessToken: null, refreshToken: null };
    const state = JSON.parse(raw);
    if (
      state.accessToken &&
      state.refreshToken &&
      isTokenExpired(state.accessToken) &&
      isTokenExpired(state.refreshToken)
    ) {
      localStorage.removeItem(AUTH_KEY);
      return { user: null, accessToken: null, refreshToken: null };
    }
    return state;
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

function saveToStorage(state: AuthState): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
}

const createAuthStore = () => {
  const store = writable<AuthState>(loadFromStorage());

  const { subscribe, set } = store;

  const apply = (data: AuthResponse): void => {
    const { user, accessToken, refreshToken } = data;
    const state = { user, accessToken, refreshToken };
    set(state);
    saveToStorage(state);
  };

  return {
    subscribe,

    apply,

    isAuthenticated: (): boolean => !!get(store).user,

    async login(email: string, password: string) {
      const response = await eden.auth.login.post({ email, password });
      if (response.error) {
        const err = response.error as any;
        throw new Error(err.value?.message ?? err.message ?? "Login failed");
      }

      apply(response.data);
    },

    async register(email: string, name: string, password: string) {
      const response = await eden.auth.register.post({ email, name, password });
      if (response.error) {
        const err = response.error as any;
        throw new Error(err.value?.message ?? err.message ?? "Register failed");
      }

      apply(response.data);
    },

    logout: () => {
      set({ user: null, accessToken: null, refreshToken: null });
      localStorage.removeItem(AUTH_KEY);
    },
  };
};

export const auth = createAuthStore();
