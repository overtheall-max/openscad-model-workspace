# Jetson Orin Nano Super Developer Kit enclosure

This directory contains a parameterized, full six-face OpenSCAD enclosure for the NVIDIA Jetson Orin Nano Super Developer Kit. The base and lid remain separate physical parts, but the default STL places both on one print plate.

## Files

- `source/jetson_orin_nano_super_case.scad` - editable source model
- `../../current_stl/jetson_orin_nano_super_case_print_set.stl` - current base and lid in one print-ready STL
- `process/previews/jetson_orin_nano_super_case_v2_assembly.png` - assembled preview
- `process/previews/jetson_orin_nano_super_case_v2_rear_review.png` - rear antenna/header clearance review
- `process/previews/jetson_orin_nano_super_case_v2_print_set.png` - one-plate print preview
- `CHANGELOG.md` - design change record
- `SOURCES.md` - reproducible reference links

## Verified mechanical references

- P3768 PCB: 100 x 79 mm
- Main mounting holes: 2.75 mm diameter, 92 x 58 mm pitch
- Complete developer-kit envelope: 103 x 90.5 x 34.77 mm
- Fan center: extracted from the official P3766 STEP assembly transform
- Complete heatsink/fan assembly footprint used for the top fit: 63 x 44 mm
- Rear wall: 2.70 mm
- Rear antenna bulkhead holes: 7.17 mm diameter

The main mounting-hole centers, expressed from the PCB lower-left corner, are:

```text
(4, 17)   (96, 17)
(4, 75)   (96, 75)
```

## Orientation and openings

With the front I/O facing the user, X runs left-to-right and Y runs front-to-back:

- Front: separate local windows for the DC barrel jack, DisplayPort, four USB-A ports, RJ45, and USB-C. The USB-C opening is only 9 mm high rather than sharing the RJ45 height. The windows include clearance for molded cable plugs but do not remove the entire wall.
- Left: a service window for both CSI ribbon connectors; its upper-shell opening height is half the previous design. There is no DC opening on this wall.
- Rear: a 40 mm wide low service window covers only the horizontal pin-header span marked in red on the user's annotated photograph; only its upper-shell portion is reduced to half the previous height, while the lower-shell opening remains unchanged. Two 7.17 mm antenna holes sit near the two purple marks at PCB-local X=13 and 87 mm.
- Right: the wall remains closed.
- Top: the centered heatsink opening is 59.6 x 40.6 mm after moving all four former 63.6 x 44.6 mm opening edges inward by 2 mm. The right-side ribbon/40-pin opening remains 7.5 mm wide and is lengthened by 1 mm toward each right support post, 2 mm total.
- Bottom: fully closed.

The exterior top surface and cooling-assembly top share the exact same Z plane, 30.50 mm above the PCB bottom. The inner footprint now adds 0.80 mm clearance per PCB side, 0.50 mm more than the preceding revision; the outer dimensions expand by the same amount while all wall thicknesses remain unchanged.

## Screwless assembly

Four solid 2.35 mm base pegs grow from 6.4 mm PCB-support shoulders. The pegs pass upward through the official 2.75 mm PCB holes. Four long lid posts contain 2.70 mm blind sockets that slide over the peg ends. Add a small amount of suitable adhesive inside the blind sockets after the fit has been checked.

There are no opposing screws and no exterior screw holes. If later disassembly is required, cut the glued printed joint rather than forcing the PCB.

The rear antenna centers sit 19.5 mm above the PCB top and remain unchanged. The wall openings are 7.17 mm diameter, while the placement mockup uses a 10 mm diameter external antenna body. The full 10 mm external bodies retain at least 5 mm of solid rear wall above the header opening.

## OpenSCAD use

Change `part` at the top of `source/jetson_orin_nano_super_case.scad`:

```scad
part = "print_set"; // base and lid together in one STL
part = "base";      // base only
part = "lid";       // lid only, already flipped for printing
part = "assembly";  // assembled visual and collision check
```

The combined STL occupies 226 x 86 mm and places both parts flat on the same build plate. The lid prints exterior-face-down so its walls and blind-socket posts grow upward without support. Suggested first print: PLA or PETG, 0.20 mm layers, 4 perimeters, 25-35% infill.

Before applying adhesive, dry-fit the PCB, check all cable plugs, confirm the CSI latch is reachable, and verify the two 7.17 mm antenna bulkheads. Printer shrinkage and aftermarket cable shells can vary.

Export updated parts from the workspace root, always overwriting the stable filenames:

```bash
arch -arm64 /Applications/Utilities/OpenSCAD.app/Contents/MacOS/OpenSCAD \
  -D 'part="print_set"' \
  -o current_stl/jetson_orin_nano_super_case_print_set.stl \
  project_files/jetson-orin-nano-super-case/source/jetson_orin_nano_super_case.scad
```

Do not create version-suffixed STL filenames. Record design history in `CHANGELOG.md` and Git commits.

## NVIDIA sources

- [Jetson Orin Nano Developer Kit Carrier Board Specification](https://developer.nvidia.com/downloads/assets/embedded/secure/jetson/orin_nano/docs/jetson_orin_nano_devkit_carrier_board_specification_sp.pdf)
- [Jetson Orin Nano Developer Kit hardware layout](https://docs.nvidia.com/jetson/orin-nano-devkit/user-guide/latest/hardware_layout.html)
- [Jetson Download Center](https://developer.nvidia.com/embedded/downloads)

Downloaded vendor files live in `references/vendor/` and are intentionally ignored by Git because the extracted design data includes a file larger than GitHub's 100 MB per-file limit.
