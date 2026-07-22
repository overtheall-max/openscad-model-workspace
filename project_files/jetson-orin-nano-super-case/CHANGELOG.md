# Change log

## 2026-07-22 - Physical-board front-I/O correction

- Corrected the DC barrel jack from the left wall to the far-left position on the front wall after checking the user's physical-board photograph.
- Confirmed the front order as DC, DisplayPort, two dual-stack USB-A blocks, RJ45, and USB-C.
- Removed the erroneous left-wall DC opening while retaining the left CSI service opening.

## 2026-07-22 - Full six-face enclosure redesign

- Replaced the opposing top/bottom M2.5 screw scheme with four solid through-PCB base pegs and four blind lid sockets intended for a dry fit followed by adhesive.
- Removed all exterior screw holes and retained the official 100 x 79 mm P3768 PCB and 92 x 58 mm mounting pattern.
- Changed the bottom to a fully closed floor and extended the lid into a full-height protective shell.
- Added plug-clearanced local front windows for DisplayPort, four USB-A ports, RJ45, and USB-C without opening the entire front wall.
- Added a left DC opening and combined CSI ribbon service window.
- Added a rear header service window in a 2.70 mm wall and two user-specified 6.17 mm antenna bulkhead holes on opposite fan sides.
- Replaced the partial circular fan opening with a close-fitting 35.6 x 35.6 mm square opening for the complete stock fan.
- Added a top-right rectangular ribbon/40-pin cable exit while leaving the right wall closed.
- Set the enclosure top flush with the stock fan top using the official developer-kit envelope.
- Replaced the two separate current STL exports with one 224 x 85 mm print-set STL containing both parts.
- Verified the base, lid, and combined print set independently as simple closed manifolds with OpenSCAD `Status: NoError`.

## 2026-07-22 - Initial printable model

- Created a two-piece base and lid for the NVIDIA Jetson Orin Nano Super Developer Kit.
- Used the official 100 x 79 mm PCB outline and 92 x 58 mm mounting-hole pitch.
- Added a fully open 42 x 40 mm fan window positioned from the official P3766 STEP assembly.
- Added five bottom intake slots and five lid exhaust slots.
- Added four M2.5 clamping posts and blind base pilots for M2.5 x 40 mm screws.
- Verified both STL exports as closed manifolds with OpenSCAD `Status: NoError`.
- Reorganized the workspace so updated STL files keep fixed names and Git stores prior versions.
