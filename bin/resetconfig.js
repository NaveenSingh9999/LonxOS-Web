// /bin/resetconfig.js

/**
 * Deletes the global configuration file and instructs the user to reboot.
 * This will trigger the onboarding wizard on the next boot.
 */
export default function main(args, lonx) {
  // In a real implementation, we'd use a more robust method
  // than directly accessing localStorage, but for this simulation, it's fine.
  localStorage.removeItem("/etc/config.json");
  lonx.shell.print("Global config reset. Please refresh your browser to re-run the onboarding wizard.");
}

// yo
