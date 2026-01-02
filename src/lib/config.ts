export const searchRelays =
  import.meta.env.VITE_SEARCH_RELAYS?.split(",") || [];
export const regularRelays =
  import.meta.env.VITE_REGULAR_RELAYS?.split(",") || [];
export const relays = [...searchRelays, ...regularRelays];
