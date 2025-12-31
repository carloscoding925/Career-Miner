import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import styles from "./tailwind.css?url"
import "./tailwind.css";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: styles }
];

export default function App() {
    return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <main className="pt-16 p-4 container mx-auto">
      <div className="flex flex-row w-full place-content-center font-bold text-lg">
        Error Boundary
      </div>
    </main>
  );
}
