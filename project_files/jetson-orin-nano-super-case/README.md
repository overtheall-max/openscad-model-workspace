# Jetson Orin Nano Super Developer Kit enclosure

This directory contains a parameterized, two-piece OpenSCAD enclosure for the NVIDIA Jetson Orin Nano Super Developer Kit.

## Files

- `source/jetson_orin_nano_super_case.scad` - editable source model
- `../../current_stl/jetson_orin_nano_super_case_base.stl` - current print-ready base
- `../../current_stl/jetson_orin_nano_super_case_lid.stl` - current print-ready lid
- `process/previews/jetson_orin_nano_super_case_preview.png` - assembled preview
- `CHANGELOG.md` - design change record
- `SOURCES.md` - reproducible reference links

## Verified mechanical references

- P3768 PCB: 100 x 79 mm
- Main mounting holes: 2.75 mm diameter, 92 x 58 mm pitch
- Complete developer-kit envelope: 103 x 90.5 x 34.77 mm
- Fan center: extracted from the official P3766 STEP assembly transform

The main mounting-hole centers, expressed from the PCB lower-left corner, are:

```text
(4, 17)   (96, 17)
(4, 75)   (96, 75)
```

## OpenSCAD use

Change `part` at the top of `source/jetson_orin_nano_super_case.scad`:

```scad
part = "base";      // base STL
part = "lid";       // lid STL, already flipped for printing
part = "assembly";  // assembled visual check
```

Suggested first print: PLA or PETG, 0.20 mm layers, 4 perimeters, 25-35% infill. The lid is designed to print exterior-face-down without support. Four M2.5 x 40 mm screws pass through the lid posts and PCB holes into the blind base pilots.

Before a long final print, print a 2-3 layer outline or a cropped mounting-hole test and compare it against the physical board. Developer-kit tolerances, printer shrinkage, and aftermarket accessories can vary.

Export updated parts from the workspace root, always overwriting the stable filenames:

```bash
arch -arm64 /Applications/Utilities/OpenSCAD.app/Contents/MacOS/OpenSCAD \
  -D 'part="base"' \
  -o current_stl/jetson_orin_nano_super_case_base.stl \
  project_files/jetson-orin-nano-super-case/source/jetson_orin_nano_super_case.scad

arch -arm64 /Applications/Utilities/OpenSCAD.app/Contents/MacOS/OpenSCAD \
  -D 'part="lid"' \
  -o current_stl/jetson_orin_nano_super_case_lid.stl \
  project_files/jetson-orin-nano-super-case/source/jetson_orin_nano_super_case.scad
```

Do not create version-suffixed STL filenames. Record design history in `CHANGELOG.md` and Git commits.

## NVIDIA sources

- [Jetson Orin Nano Developer Kit Carrier Board Specification](https://developer.nvidia.com/downloads/assets/embedded/secure/jetson/orin_nano/docs/jetson_orin_nano_devkit_carrier_board_specification_sp.pdf)
- [Jetson Orin Nano Developer Kit hardware layout](https://docs.nvidia.com/jetson/orin-nano-devkit/user-guide/latest/hardware_layout.html)
- [Jetson Download Center](https://developer.nvidia.com/embedded/downloads)

Downloaded vendor files live in `references/vendor/` and are intentionally ignored by Git because the extracted design data includes a file larger than GitHub's 100 MB per-file limit.
