import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError, RateLimitError } from "../services/api-client";
import * as authService from "../services/auth-service";
import { useAuthStore } from "../store/auth-store";
import { I18nProvider } from "../i18n/I18nProvider";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { LoginPage } from "./LoginPage";
import { ResetPasswordPage } from "./ResetPasswordPage";

vi.mock("../services/auth-service");

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">{`${location.pathname}${location.search}`}</div>
  );
}

function renderRoutes(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>,
  );
}

describe("password reset pages", () => {
  beforeEach(() => {
    vi.mocked(authService.requestPasswordReset).mockReset();
    vi.mocked(authService.confirmPasswordReset).mockReset();
    useAuthStore.setState({ accessToken: null, user: null });
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => cleanup());

  it("shows the same neutral confirmation for any requested email", async () => {
    vi.mocked(authService.requestPasswordReset)
      .mockResolvedValueOnce({ message: "Email sent" })
      .mockResolvedValueOnce({ message: "No matching account" });
    const user = userEvent.setup();

    for (const email of ["known@example.test", "unknown@example.test"]) {
      renderRoutes("/forgot-password");
      await user.type(screen.getByLabelText(/email/i), email);
      await user.click(
        screen.getByRole("button", { name: /send reset link/i }),
      );
      expect(await screen.findByRole("status")).toHaveTextContent(
        "If an account exists for that email, a password reset link is on its way.",
      );
      cleanup();
    }
  });

  it("shows a countdown for a rate-limited reset request", async () => {
    vi.mocked(authService.requestPasswordReset).mockRejectedValue(
      new RateLimitError("Too many requests", 30, {}),
    );
    const user = userEvent.setup();
    renderRoutes("/forgot-password");

    await user.type(screen.getByLabelText(/email/i), "person@example.test");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Try again in 30 seconds.",
    );
    expect(
      screen.getByRole("button", { name: /send reset link/i }),
    ).toBeDisabled();
  });

  it("makes no request without a token and removes a bad token from the URL", async () => {
    const user = userEvent.setup();
    renderRoutes("/reset-password");
    expect(screen.getByRole("alert")).toHaveTextContent(
      /invalid or missing its token/i,
    );
    expect(authService.confirmPasswordReset).not.toHaveBeenCalled();
    cleanup();

    vi.mocked(authService.confirmPasswordReset).mockRejectedValue(
      new ApiError("Invalid link", 400),
    );
    renderRoutes("/reset-password?token=private-reset-token");
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/reset-password",
      ),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent(
      "private-reset-token",
    );
    await user.type(screen.getByLabelText(/new password/i), "password123");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByText("This link is invalid or has expired."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /request a new reset link/i }),
    ).toBeInTheDocument();
    expect(authService.confirmPasswordReset).toHaveBeenCalledWith(
      "private-reset-token",
      "password123",
    );
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("clears an existing session on success and returns to login with a notice", async () => {
    useAuthStore.setState({
      accessToken: "existing-session-token",
      user: {
        id: "user-1",
        email: "person@example.test",
        role: "patient",
        createdAt: "",
        updatedAt: "",
      },
    });
    vi.mocked(authService.confirmPasswordReset).mockResolvedValue({
      message: "Password updated",
    });
    const user = userEvent.setup();
    renderRoutes("/reset-password?token=reset-token");

    await user.type(
      await screen.findByLabelText(/new password/i),
      "password123",
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your password has been updated. Sign in with your new password.",
    );
    expect(authService.confirmPasswordReset).toHaveBeenCalledWith(
      "reset-token",
      "password123",
    );
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
