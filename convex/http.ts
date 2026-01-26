import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

const siteUrl = process.env.SITE_URL;
const additionalAllowedOrigins =
  process.env.ADDITIONAL_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const allowedOrigins = [siteUrl, ...additionalAllowedOrigins].filter(
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
