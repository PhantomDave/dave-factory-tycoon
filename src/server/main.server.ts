import { getRemotes } from "shared/remotes";
import { startMiningLoop } from "server/miner";

print("🚀 Server starting...");

// Initialize networking
const remotes = getRemotes();
print("✅ Remotes initialized");

// Start passive income loop
task.spawn(() => startMiningLoop());
print("✅ Mining loop started");