import { setAuthTokenGetter, setBaseUrl } from "./custom-fetch";
import { useAuth } from '@clerk/nextjs';

export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter, customFetch } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

setBaseUrl('http://localhost:8080')
