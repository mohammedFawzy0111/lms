# Remove the unused static `print` window from tauri.conf.json

- STATUS: OPEN
- PRIORITY: 40
- TAGS: cleanup

tauri.conf.json declares a second hidden window labelled `print`. Nothing in the code uses that label (print windows are created at runtime as print_*, receipt_*, print_batch_*), so it only costs memory and startup time on a low-end machine. Remove it and check that printing a report, a batch and a receipt still works. Also check the capabilities file: runtime window labels (print_*, receipt_*, print_batch_*) should be listed if closing them from JS needs permissions.
