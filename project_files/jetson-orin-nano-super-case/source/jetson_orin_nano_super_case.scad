/*
 * NVIDIA Jetson Orin Nano Super Developer Kit enclosure
 *
 * Mechanical references:
 * - NVIDIA P3768 carrier board specification v1.3
 * - NVIDIA P3768 A04 Allegro / NC drill data
 * - NVIDIA P3766 developer kit STEP model (2023-03-20)
 *
 * Confirmed source dimensions (mm):
 * - PCB outline: 100 x 79
 * - Main NPTH mounting holes: diameter 2.75, pitch 92 x 58
 * - Complete developer-kit envelope: 103 x 90.5 x 34.77
 * - Fan assembly center in PCB coordinates: [48.132, 59.116]
 *
 * Select one of: "assembly", "base", "lid", "both", "mockup".
 */

part = "assembly";

$fn = 56;
epsilon = 0.02;

// Printer / fit tuning
xy_clearance = 1.5;
wall = 2.4;
floor_thickness = 2.4;
lid_thickness = 2.4;
corner_radius = 6.0;
base_rim_height = 7.0;
bottom_component_clearance = 5.2;
lid_underside_z = 40.0;
lid_skirt_drop = 5.0;

// NVIDIA mechanical data
pcb_size = [100.0, 79.0, 1.60];
devkit_envelope = [103.0, 90.5, 34.77];
mount_hole_d = 2.75;
mount_holes_from_pcb_lower_left = [
    [4.0, 17.0],
    [96.0, 17.0],
    [4.0, 75.0],
    [96.0, 75.0]
];

// Case placement. The extra front allowance covers the connector overhang.
case_size = [111.0, 98.5];
pcb_lower_left = [5.5, 15.0];
pcb_bottom_z = floor_thickness + bottom_component_clearance;
pcb_top_z = pcb_bottom_z + pcb_size[2];

// Derived from the official P3766 STEP assembly transforms.
fan_center_from_pcb_lower_left = [48.132, 59.116];
fan_center = [
    pcb_lower_left[0] + fan_center_from_pcb_lower_left[0],
    pcb_lower_left[1] + fan_center_from_pcb_lower_left[1]
];
fan_opening = [42.0, 40.0];
fan_opening_radius = 5.0;

// Fasteners: four M2.5 x 40 mm screws from the lid into the base pilots.
standoff_od = 7.6;
base_pilot_d = 2.10;
lid_clearance_d = 2.90;
lid_post_gap = 0.20;
lid_post_length = lid_underside_z - pcb_top_z - lid_post_gap;

mount_holes = [
    for (p = mount_holes_from_pcb_lower_left)
        [pcb_lower_left[0] + p[0], pcb_lower_left[1] + p[1]]
];

assert(case_size[0] >= devkit_envelope[0] + 2 * xy_clearance,
       "Case is too narrow for the official developer-kit envelope");
assert(case_size[1] >= devkit_envelope[1] + 2 * xy_clearance,
       "Case is too shallow for the official developer-kit envelope");
assert(lid_post_length > 0, "Lid height must be above the PCB");

module rounded_rect_2d(size, radius) {
    rr = min(radius, min(size[0], size[1]) / 2);
    translate([size[0] / 2, size[1] / 2])
        offset(r = rr)
            square([size[0] - 2 * rr, size[1] - 2 * rr], center = true);
}

module rounded_prism(size, height, radius) {
    linear_extrude(height = height)
        rounded_rect_2d(size, radius);
}

module rounded_cutout(center, size, height, radius, z = 0) {
    translate([center[0] - size[0] / 2, center[1] - size[1] / 2, z])
        rounded_prism(size, height, radius);
}

module slot_cutout(center, length, width, height, z = 0) {
    assert(length >= width, "Slot length must be at least its width");
    translate([center[0] - length / 2 + width / 2, center[1], z])
        hull() {
            cylinder(h = height, d = width);
            translate([length - width, 0, 0])
                cylinder(h = height, d = width);
        }
}

module base_shell() {
    difference() {
        union() {
            // Floor and shallow retaining rim.
            difference() {
                rounded_prism(case_size, base_rim_height, corner_radius);
                translate([wall, wall, floor_thickness])
                    rounded_prism(
                        [case_size[0] - 2 * wall, case_size[1] - 2 * wall],
                        base_rim_height - floor_thickness + epsilon,
                        max(corner_radius - wall, 1.0)
                    );
            }

            // PCB standoffs; OD remains inside NVIDIA's 8 mm keep-out.
            for (p = mount_holes)
                translate([p[0], p[1], floor_thickness])
                    cylinder(h = pcb_bottom_z - floor_thickness, d = standoff_od);
        }

        // Blind M2.5 self-tapping pilots sized for the specified 40 mm screws.
        // A 2.2 mm floor remains closed beneath the screw tip.
        for (p = mount_holes)
            translate([p[0], p[1], floor_thickness - 0.2])
                cylinder(
                    h = pcb_bottom_z - floor_thickness + 0.5,
                    d = base_pilot_d
                );

        // Bottom intake slots for the underside M.2 devices.
        for (y = [43.0 : 7.0 : 71.0])
            slot_cutout(
                [case_size[0] / 2, y],
                62.0,
                3.2,
                floor_thickness + 2 * epsilon,
                -epsilon
            );
    }
}

module lid_assembled() {
    difference() {
        union() {
            // Top panel.
            rounded_prism(case_size, lid_thickness, corner_radius);

            // Short locating skirt, kept outside the official 103 x 90.5 envelope.
            translate([0, 0, -lid_skirt_drop])
                difference() {
                    rounded_prism(case_size, lid_skirt_drop, corner_radius);
                    translate([wall, wall, -epsilon])
                        rounded_prism(
                            [case_size[0] - 2 * wall, case_size[1] - 2 * wall],
                            lid_skirt_drop + 2 * epsilon,
                            max(corner_radius - wall, 1.0)
                        );
                }

            // Long clamping posts land on the official mounting-hole keep-outs.
            for (p = mount_holes)
                translate([p[0], p[1], -lid_post_length])
                    cylinder(h = lid_post_length, d = standoff_od);
        }

        // Completely open fan window: no grille over the original fan.
        rounded_cutout(
            fan_center,
            fan_opening,
            lid_thickness + 2 * epsilon,
            fan_opening_radius,
            -epsilon
        );

        // Exhaust / service slots in the front half of the cover.
        for (y = [17.0 : 7.0 : 45.0])
            slot_cutout(
                [case_size[0] / 2, y],
                64.0,
                3.2,
                lid_thickness + 2 * epsilon,
                -epsilon
            );

        // M2.5 screw clearance through the top and clamping posts.
        for (p = mount_holes)
            translate([p[0], p[1], -lid_post_length - epsilon])
                cylinder(
                    h = lid_post_length + lid_thickness + 2 * epsilon,
                    d = lid_clearance_d
                );
    }
}

module developer_kit_mockup() {
    // PCB and the four verified mounting holes.
    color([0.10, 0.38, 0.18, 0.85])
        difference() {
            translate([pcb_lower_left[0], pcb_lower_left[1], pcb_bottom_z])
                rounded_prism([pcb_size[0], pcb_size[1]], pcb_size[2], 0.6);
            for (p = mount_holes)
                translate([p[0], p[1], pcb_bottom_z - epsilon])
                    cylinder(h = pcb_size[2] + 2 * epsilon, d = mount_hole_d);
        }

    // Simplified heatsink envelope for visual collision checking only.
    color([0.30, 0.32, 0.34, 0.85])
        translate([fan_center[0] - 31.5, fan_center[1] - 22.0, pcb_top_z + 4.0])
            cube([63.0, 44.0, 22.0]);

    // Approximate 35 mm original fan, centered from the official STEP model.
    color([0.04, 0.04, 0.04, 1.0])
        translate([fan_center[0] - 18.0, fan_center[1] - 18.0, pcb_top_z + 24.0])
            rounded_prism([36.0, 36.0], 5.0, 3.0);

    // Simplified front connector envelope.
    color([0.62, 0.64, 0.66, 0.90])
        translate([pcb_lower_left[0] + 6.0, 4.0, pcb_bottom_z])
            cube([88.0, 12.0, 16.0]);
}

module assembled_view() {
    color([0.12, 0.18, 0.24, 1.0]) base_shell();
    developer_kit_mockup();
    color([0.14, 0.22, 0.32, 0.72])
        translate([0, 0, lid_underside_z])
            lid_assembled();
}

module lid_print_orientation() {
    // Flip the lid so the flat exterior is on the print bed and posts point up.
    translate([0, case_size[1], lid_thickness])
        rotate([180, 0, 0])
            lid_assembled();
}

if (part == "base") {
    base_shell();
} else if (part == "lid") {
    lid_print_orientation();
} else if (part == "both") {
    base_shell();
    translate([case_size[0] + 12.0, 0, 0]) lid_print_orientation();
} else if (part == "mockup") {
    developer_kit_mockup();
} else {
    assembled_view();
}
