import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

const siteUrl = process.env.SITE_URL;
const additionalAllowedOrigins =
  process.env.ADDITIONAL_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

// CORS_ALLOWED_ORIGINS: comma-separated frontend origins (e.g. https://yotes.vercel.app,http://localhost:4000)
// If unset, falls back to SITE_URL + ADDITIONAL_ALLOWED_ORIGINS
const corsOrigins =
  process.env.CORS_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [siteUrl, ...additionalAllowedOrigins];

const allowedOrigins = corsOrigins.filter(
  (origin): origin is string => Boolean(origin),
);

authComponent.registerRoutes(http, createAuth, {
  cors:
    allowedOrigins.length > 0
      ? {
          allowedOrigins,
          allowedHeaders: ["Content-Type", "Authorization", "Better-Auth-Cookie"],
          exposedHeaders: ["Set-Better-Auth-Cookie"],
        }
      : true,
});

export default http;
