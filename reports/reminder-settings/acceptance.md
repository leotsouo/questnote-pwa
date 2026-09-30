# Reminder settings visual acceptance

The daily reminder card now uses a prominent time panel, themed accessible switches, a clearly marked illustrative notification preview, compact consent/privacy disclosure, one primary save action when enabled and a separate delivery/tools area. Backend, reminder rules and data synchronization behavior are unchanged.

Validation: maintained npm test passed; isolated reminder browser flow passed all 8 scenarios. The visual scenario checked default/sweet/twilight at 320, 393, 430 and 768px with no document overflow, keyboard switch operation, title-preview privacy and enabled action hierarchy. Screenshot evidence records the 393px enabled state using mock subscription/in-memory D1. No production push was sent. iPhone native time-picker presentation remains device-dependent.
