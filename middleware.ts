import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

function isOperator(token: any) {
  return token?.role === "OPERATOR";
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;
    const isApiRoute = pathname.startsWith("/api/");
    const isItemsExportApi = pathname.startsWith("/api/items/export");

    if (!isOperator(token)) {
      if (isApiRoute && !isItemsExportApi) {
        const res = NextResponse.next();
        res.headers.set("Content-Type", "application/json; charset=utf-8");
        return res;
      }
      return NextResponse.next();
    }

    const isHomePage = pathname === "/";
    const isPrintPage = pathname === "/print";
    const isPrintEasyPage = pathname === "/print-easy";
    const isPrintVoicePage = pathname === "/print-voice";
    const isPrintMagicPage = pathname === "/print-magic";
    const isPrintApi = pathname.startsWith("/api/prints");
    const isItemsReadApi = pathname.startsWith("/api/items") && req.method === "GET";

    if (isHomePage || isPrintPage || isPrintEasyPage || isPrintVoicePage || isPrintMagicPage || isPrintApi || isItemsReadApi) {
      if (isApiRoute && !isItemsExportApi) {
        const res = NextResponse.next();
        res.headers.set("Content-Type", "application/json; charset=utf-8");
        return res;
      }
      return NextResponse.next();
    }

    if (isApiRoute) {
      return NextResponse.json({ error: "forbidden" }, {
        status: 403,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    return NextResponse.redirect(new URL("/", req.url));
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: ["/((?!api/auth|api/password|api/register|api/checkout|api/stripe/webhook|_next/static|_next/image|favicon.ico|login|register|forgot-password|reset-password|billing).*)"],
};
