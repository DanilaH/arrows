# Theme welcome0.37.1 checkpoint

Base077305b; owner requested removal of bottom navigation from first theme selection. Normal Home retains its existing nav. No data/rules/SDK/signing changes. Earlier0.37full CI now SUCCESS516browser/256unit/21JVM.

Local256unit/31files/type/build/38analytics schemas/16brand resources +sync PASS. Corrected70browser +2A1-targeted cases PASS; final4repeat after QA-only atomic seed/full-height assertion updates PASS. Distinct final affected cases72. Existing welcome checks assert hidden first-visit nav/full-height viewport and visible nav after Play/menu return/reload, including failed preference writes. No new mirror unit tests for this presentation-only adjustment.

Initial36-browser run28PASS/8FAIL: old Settings scenarios tried to open Home Settings directly on the newly nav-free welcome. Tests now explicitly prepare ordinary preferences for menu/Settings checks, while the fresh-profile test follows Play→game Settings. Also adapted the same ordinary-menu assumption in typography/modal/feedback/A1 QA observers. This does not bypass welcome tests; first-visit cases remain clean. A settings-write fault fixture seeds preferences and installs its failure within the same init script so the rejected write remains the actual user change. Initial run is not called green.

Compatible .playtest53 and actual signed-APK web recording pending. Physical phone/install-update/haptics/FPS/live SDK/dashboard/money/production IDs: NOT RUN. KIT IMPACT NONE; no kit/store publication.
