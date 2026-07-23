# Change log

## 2026-07-23 - Project completed and archived

- Marked the Jetson Orin Nano Super enclosure project complete.
- Moved the final binary print-set STL to `historical_stl/jetson-orin-nano-super-case/print-set.stl`.
- Preserved the user-generated 3MF at `process/slicer/print-set.3mf`.
- Cleared the active project pointer and disabled live OpenSCAD export until a new project starts.

## 2026-07-23 - Reduced lid-post diameter

- Reduced all four lid support posts from 6.5 mm to 5.4 mm diameter.
- Kept the blind sockets at 2.7 mm diameter, leaving 1.35 mm radial post wall thickness.
- Preserved the top ribbon opening at 7.5 x 52.5 mm and added a 0.05 mm geometric gap so neither right post is exposed through the slot.

## 2026-07-23 - Corrected mounting-gusset orientation

- Flipped both continuous triangular skirt gussets from below the base to the top surface.
- The vertical triangle edge now joins the enclosure side wall and the slope descends outward across the inner 5 mm of each skirt.

## 2026-07-23 - Re-exported current model as binary STL

- Re-exported the unchanged combined print model as a 369 KB binary STL after the ASCII STL could not be opened in the user's target application.
- Verified the fresh file by importing it back into OpenSCAD; all 7,560 triangles were read successfully.
- Updated the live-export helper and documented command so future automatic STL exports remain binary.

## 2026-07-23 - Added left/right base mounting skirts

- Added centered 15 x 60 mm mounting skirts to both sides of the base at the same 2.4 mm thickness as the closed floor.
- Reinforced the inner 5 mm of each skirt with a continuous right-triangle gusset against the enclosure side wall.
- Added two 2.2 mm M2 clearance holes per skirt in the remaining 10 x 60 mm flat area, with 50 mm center spacing.
- Repositioned the lid above the widened base in the combined print layout to prevent overlap.

## 2026-07-23 - Expanded cooling opening by 0.5 mm per edge

- Expanded all four heatsink-opening edges outward by 0.5 mm without moving its center.
- Increased the opening from 59.6 x 40.6 mm to 60.6 x 41.6 mm.

## 2026-07-23 - Antenna, ribbon-slot, and cooling-opening adjustment

- Enlarged both rear antenna holes from 6.17 mm to 7.17 mm without moving their centers.
- Kept the top ribbon-slot width at 7.5 mm and lengthened it by 1 mm toward each right support post, 2 mm total.
- Moved all four heatsink-opening edges inward by 2 mm, reducing the centered opening from 63.6 x 44.6 mm to 59.6 x 40.6 mm.

## 2026-07-23 - Reduced upper rear-service opening

- Halved only the upper-shell height of the rear pin-header/ribbon service opening.
- Kept the lower-shell opening, 40 mm opening width, and both antenna holes unchanged.

## 2026-07-23 - Corrected main-ribbon top-slot alignment

- Moved the right-side main-ribbon top slot from beside the support posts onto the actual connector line directly between them.
- Set the slot width to 7.5 mm, only 1.0 mm wider than the 6.5 mm support posts.
- Stopped both slot ends 0.5 mm clear of the support-post edges while keeping the right roof edge and side wall closed.

## 2026-07-23 - Cooling fit, port-height, and clearance correction

- Halved only the upper-shell height of the left CSI service opening while retaining its span across both CSI connectors.
- Split the former combined RJ45/USB-C front cutout and reduced the USB-C opening height to 9 mm.
- Replaced the incorrect 35.6 x 35.6 fan-only roof opening with a 63.6 x 44.6 mm opening for the complete 63 x 44 mm heatsink/fan assembly.
- Converted the right 40-pin/ribbon opening from an edge-breaking notch into an internal roof slot, restoring the right roof edge and fully enclosing both right support posts.
- Increased PCB clearance from 0.30 to 0.80 mm per side and expanded the outer shell correspondingly without changing wall thickness.

## 2026-07-22 - Annotated-photo rear correction

- Corrected the previously over-wide 78 mm rear opening to the approximately 40 mm pin-header span explicitly circled in red by the user.
- Repositioned the antenna centers near the two purple marks at PCB-local X=13/87 mm and 19.5 mm above the PCB top.
- Distinguished the exact 6.17 mm threaded through-hole from the approximately 10 mm external antenna body and added both to the placement mockup.
- Added clearance assertions for the threaded sections, the full external antenna bodies, the rear opening, and rear corner structure.

## 2026-07-22 - Photo-verified rear clearance correction

- Recentered and widened the rear header service opening from PCB-local X=15-69 mm to X=11-89 mm after reviewing physical rear/top photographs.
- Moved the two 6.17 mm antenna holes outward from X=18/82 mm to X=11/89 mm and raised their centers by 3 mm.
- Added a conservative 10 mm antenna nut/washer keep-out and assertions that it clears the heatsink envelope and retains at least 3 mm of solid wall above the rear opening.
- Added a dedicated rear-review preview orientation.

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
