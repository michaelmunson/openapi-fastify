import app, { $ } from "./app";
import "./routes";

export const initialized = $.initialize();

export { app, $ };

