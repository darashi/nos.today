export const searchRelays: string[] =
  import.meta.env.VITE_SEARCH_RELAYS?.split(",") || [];
export const regularRelays: string[] =
  import.meta.env.VITE_REGULAR_RELAYS?.split(",") || [];
export const relays = [...searchRelays, ...regularRelays];
