import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

jest.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  version: "test",
}));

jest.mock("./Login", () => function MockLogin() {
  return <div>Login Screen</div>;
});

jest.mock("./firebase", () => ({
  auth: {},
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("./services/userLibrary", () => ({
  loadUserLibrary: jest.fn(),
  saveUserLibrary: jest.fn(),
}));

const { onAuthStateChanged } = require("firebase/auth");
const { loadUserLibrary } = require("./services/userLibrary");

describe("App", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the login screen when no user is signed in", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return () => {};
    });

    render(<App />);

    expect(await screen.findByText("Login Screen")).toBeInTheDocument();
  });

  it("shows the dashboard when a user is signed in", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({
        uid: "user-1",
        email: "student@example.com",
        displayName: "Student",
      });
      return () => {};
    });

    loadUserLibrary.mockResolvedValue({
      savedCards: [],
      studyHistory: [],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Piggle Dashboard")).toBeInTheDocument();
    });
  });
});
