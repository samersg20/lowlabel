import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

function isOperator(token: any) {
  return token?.role === "OPERATOR";
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    if (!isOperator(token)) return NextResponse.next();

    const isHomePage = pathname === "/";
    const isPrintPage = pathname === "/print";
    const isPrintApi = pathname.startsWith("/api/prints");
    const isItemsReadApi = pathname.startsWith("/api/items") && req.method === "GET";

    if (isHomePage || isPrintPage || isPrintApi || isItemsReadApi) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/print", req.url));
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: ["/((?!api/auth|api/password|_next/static|_next/image|favicon.ico|login|forgot-password|reset-password).*)"],
};
