// Starts the Django dev server with the project's virtualenv Python (Windows, macOS and Linux).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const venvPython = process.platform === "win32" ? join(root, ".venv", "Scripts", "python.exe") : join(root, ".venv", "bin", "python");
const python = existsSync(venvPython) ? venvPython : "python";

const server = spawn(python, ["manage.py", "runserver", "8000"], { cwd: root, stdio: "inherit" });
server.on("exit", (code) => process.exit(code ?? 0));
