// Enable / disable webcl.
//  -1: Prompt before allowing access to WebCL functionality (default).
//   0: Disabled, no prompt.
//   1: Enabled, no prompt.
pref("extensions.webcl.allowed", 1);

// Enable / disable WebCL validator. true=enabled, false=disabled.
pref("extensions.webcl.enable-validator", true);

// Set explicit OpenCL library file with path. Default is "": autodetect.
pref("extensions.webcl.opencllib", "");

// Logging and debug messages
pref("extensions.webcl.log", true);
pref("extensions.webcl.debug", true);
pref("extensions.webcl.trace", true);
pref("extensions.webcl.trace-resources", true);
pref("extensions.webcl.os-console-output", true);

