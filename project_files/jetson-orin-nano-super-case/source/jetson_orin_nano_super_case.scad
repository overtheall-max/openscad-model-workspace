/*
 * NVIDIA Jetson Orin Nano Super Developer Kit full enclosure
 *
 * Orientation used throughout this file:
 * - X: left to right while the front I/O faces the user
 * - Y: front I/O to rear/fan side
 * - Z: bottom to top
 *
 * Primary mechanical references:
 * - NVIDIA P3768 carrier board specification v1.3
 * - NVIDIA P3768 A04 Allegro board data
 * - NVIDIA P3766 developer-kit STEP model (2023-03-20)
 *
 * User-controlled dimensions:
 * - Bare PCB: 100 x 79 mm
 * - Rear wall thickness: 2.7 mm
 * - Two rear bulkhead antenna holes: diameter 6.17 mm
 *
 * Select one of: "print_set", "base", "lid", "assembly", "rear_review", "mockup".
 */

part = "print_set";

$fn = 64;
epsilon = 0.04;

// Printer and shell tuning
pcb_fit_clearance = 1.60;       // 0.80 mm per side; user requested +0.50 mm per inner face
wall = 2.70;                    // includes the explicitly required 2.7 mm rear wall
floor_thickness = 2.40;
top_thickness = 2.70;
case_corner_radius = 4.50;
print_gap = 12.0;

// NVIDIA P3768 mechanical data
pcb_size = [100.0, 79.0, 1.60];
pcb_under_clearance = 4.60;     // official 4.30 mm max + 0.30 mm print allowance
mount_hole_d = 2.75;
mount_holes_from_pcb_lower_left = [
    [4.0, 17.0],
    [96.0, 17.0],
    [4.0, 75.0],
    [96.0, 75.0]
];

// The PCB sits closely inside the enclosure, with symmetric print clearance.
inner_size = [
    pcb_size[0] + pcb_fit_clearance,
    pcb_size[1] + pcb_fit_clearance
];
outer_size = [inner_size[0] + 2 * wall, inner_size[1] + 2 * wall];
pcb_origin = [wall + pcb_fit_clearance / 2, wall + pcb_fit_clearance / 2];

pcb_bottom_z = floor_thickness + pcb_under_clearance;
pcb_top_z = pcb_bottom_z + pcb_size[2];

// The top exterior is exactly flush with the stock fan top in the official STEP envelope.
fan_top_above_pcb_bottom = 30.50;
fan_top_z = pcb_bottom_z + fan_top_above_pcb_bottom;
case_top_z = fan_top_z;
top_inner_z = case_top_z - top_thickness;

// The shells meet at a simple butt seam. Registration comes from the four peg joints.
shell_seam_z = 10.00;
base_wall_top_z = shell_seam_z;
lid_wall_bottom_z = shell_seam_z;

// Fan center is from the official P3766 STEP transform, relative to PCB lower-left.
fan_center_from_pcb_lower_left = [48.132, 59.116];
fan_center = [
    pcb_origin[0] + fan_center_from_pcb_lower_left[0],
    pcb_origin[1] + fan_center_from_pcb_lower_left[1]
];
heatsink_size = [63.0, 44.0];
heatsink_window_clearance = 0.60;
heatsink_opening = [
    heatsink_size[0] + heatsink_window_clearance,
    heatsink_size[1] + heatsink_window_clearance
];

// Screwless through-PCB registration and glue joint.
standoff_d = 6.40;
base_peg_d = 2.35;
base_peg_above_pcb = 6.00;
base_peg_top_z = pcb_top_z + base_peg_above_pcb;
lid_post_d = 6.50;
lid_post_bottom_z = pcb_top_z + 0.35;
lid_socket_d = 2.70;
lid_socket_depth = 7.00;

mount_holes = [
    for (p = mount_holes_from_pcb_lower_left)
        [pcb_origin[0] + p[0], pcb_origin[1] + p[1]]
];

// Official P3768 front connector centers, converted to PCB-lower-left coordinates.
// The physical-board photo confirms that J16 (DC) is also on this front edge.
// Openings are intentionally larger than the receptacles to admit molded cable plugs.
front_openings = [
    // center X, width, bottom Z, height
    [6.000, 11.0, pcb_bottom_z - 0.50, 13.5],  // DC barrel jack + molded plug
    [22.760, 20.0, pcb_bottom_z - 0.50, 11.0],  // DisplayPort
    [51.100, 32.0, pcb_bottom_z - 0.50, 18.5],  // both stacked USB-A receptacles
    [76.950, 18.0, pcb_bottom_z - 0.50, 18.0],  // RJ45 latch and molded boot
    [91.975, 13.0, pcb_bottom_z - 0.50, 9.0]    // USB-C: close the wall above the plug
];

// Left-side service geometry for the two CSI connectors.
csi_window_y0 = pcb_origin[1] + 25.0;
csi_window_y1 = pcb_origin[1] + 69.0;
csi_window_z0 = pcb_bottom_z - 0.50;
csi_original_upper_z1 = pcb_top_z + 15.5;
csi_window_z1 = lid_wall_bottom_z +
    (csi_original_upper_z1 - lid_wall_bottom_z) / 2;

// Rear service window for only the user-marked horizontal pin-header region.
// The annotated rear photograph places it in this approximately 40 mm span;
// the rest of the rear wall must remain closed.
rear_service_x0 = pcb_origin[0] + 18.0;
rear_service_x1 = pcb_origin[0] + 58.0;
rear_service_z0 = pcb_bottom_z - 0.50;
rear_service_original_z1 = pcb_top_z + 9.5;
rear_service_z1 = lid_wall_bottom_z +
    (rear_service_original_z1 - lid_wall_bottom_z) / 2;

// User-specified rear antenna geometry. The 6.17 mm value is only the narrow
// threaded section through the wall; the external antenna base is about 10 mm.
// Centers follow the two purple marks in the annotated rear photograph.
antenna_hole_d = 6.17;
antenna_external_body_d = 10.0;
antenna_centers_x = [pcb_origin[0] + 13.0, pcb_origin[0] + 87.0];
antenna_center_z = pcb_top_z + 19.5;

// Conservative top-cooling envelope used for rear bulkhead collision checks.
heatsink_envelope_x0 = fan_center[0] - heatsink_size[0] / 2;
heatsink_envelope_x1 = fan_center[0] + heatsink_size[0] / 2;

// Top-right cable exit above the right-side 40-pin/ribbon breakout region.
// The connector lies directly between the two right support posts, so the slot
// is centered on their X axis and stops clear of each post along Y.
ribbon_exit_width = lid_post_d + 1.0;
ribbon_post_end_clearance = 0.50;
ribbon_exit_x0 = mount_holes[1][0] - ribbon_exit_width / 2;
ribbon_exit_x1 = mount_holes[1][0] + ribbon_exit_width / 2;
ribbon_exit_y0 = mount_holes[1][1] + lid_post_d / 2 + ribbon_post_end_clearance;
ribbon_exit_y1 = mount_holes[3][1] - lid_post_d / 2 - ribbon_post_end_clearance;

assert(abs(wall - 2.70) < 0.001, "Rear wall must remain 2.7 mm");
assert(abs(antenna_hole_d - 6.17) < 0.001, "Antenna holes must remain 6.17 mm");
assert(base_peg_d < mount_hole_d, "Base pegs must pass through the PCB holes");
assert(lid_socket_d > base_peg_d, "Lid sockets need glue and print clearance");
assert(base_peg_top_z < lid_post_bottom_z + lid_socket_depth,
       "Base pegs must fit inside the blind lid sockets");
assert(case_top_z > pcb_top_z, "Case top must sit above the PCB");
assert(abs(case_top_z - fan_top_z) < 0.001,
       "Enclosure top must remain exactly flush with the stock fan top");
assert(abs(heatsink_opening[0] - 63.60) < 0.001 &&
       abs(heatsink_opening[1] - 44.60) < 0.001,
       "Top opening must fit the complete heatsink assembly, not only the fan blades");
assert(ribbon_exit_x0 <= mount_holes[1][0] - lid_post_d / 2 - 0.25 &&
       ribbon_exit_x1 >= mount_holes[1][0] + lid_post_d / 2 + 0.25,
       "Right ribbon slot must be slightly wider than the support-post diameter");
assert(ribbon_exit_y0 >= mount_holes[1][1] + lid_post_d / 2 + 0.50 &&
       ribbon_exit_y1 <= mount_holes[3][1] - lid_post_d / 2 - 0.50,
       "Right ribbon slot must remain between the two right support posts");
assert(ribbon_exit_x1 < outer_size[0] - wall,
       "Right ribbon slot must leave the top edge and side wall closed");
assert(antenna_centers_x[0] + antenna_hole_d / 2 <= heatsink_envelope_x0,
       "Left antenna threaded section must clear the heatsink envelope");
assert(antenna_centers_x[1] - antenna_hole_d / 2 >= heatsink_envelope_x1,
       "Right antenna threaded section must clear the heatsink envelope");
assert(antenna_center_z - antenna_external_body_d / 2 - rear_service_z1 >= 4.5,
       "The 10 mm antenna body needs at least 4.5 mm of solid wall above the rear opening");
assert(antenna_centers_x[0] - antenna_external_body_d / 2 >= wall + 2.0 &&
       antenna_centers_x[1] + antenna_external_body_d / 2 <= outer_size[0] - wall - 2.0,
       "External antenna bodies must stay away from the rear corner columns");
assert(antenna_centers_x[0] - mount_holes[2][0] -
       (antenna_external_body_d + lid_post_d) / 2 >= 0.70 &&
       mount_holes[3][0] - antenna_centers_x[1] -
       (antenna_external_body_d + lid_post_d) / 2 >= 0.70,
       "The 10 mm external antenna bodies must not overlap the rear support-post projections");

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

module rounded_xy_cutout(center, size, height, radius, z) {
    translate([center[0] - size[0] / 2, center[1] - size[1] / 2, z])
        rounded_prism(size, height, radius);
}

module front_service_cutouts() {
    for (opening = front_openings)
        translate([
            pcb_origin[0] + opening[0] - opening[1] / 2,
            -epsilon,
            opening[2]
        ])
            cube([opening[1], wall + 2 * epsilon, opening[3]]);
}

module left_service_cutouts() {
    // One continuous service window gives fingers room to unlock and route both CSI FFCs.
    translate([-epsilon, csi_window_y0, csi_window_z0])
        cube([
            wall + 2 * epsilon,
            csi_window_y1 - csi_window_y0,
            csi_window_z1 - csi_window_z0
        ]);
}

module rear_service_cutouts() {
    // Low header-access window; material remains above it for the antenna bulkheads.
    translate([
        rear_service_x0,
        outer_size[1] - wall - epsilon,
        rear_service_z0
    ])
        cube([
            rear_service_x1 - rear_service_x0,
            wall + 2 * epsilon,
            rear_service_z1 - rear_service_z0
        ]);

    // Exact user-specified holes through the 2.7 mm rear wall.
    for (x = antenna_centers_x)
        translate([x, outer_size[1] + epsilon, antenna_center_z])
            rotate([90, 0, 0])
                cylinder(h = wall + 2 * epsilon, d = antenna_hole_d);
}

module top_service_cutouts() {
    // The complete 63 x 44 mm heatsink/fan assembly embeds through the roof.
    rounded_xy_cutout(
        fan_center,
        heatsink_opening,
        top_thickness + 2 * epsilon,
        1.4,
        top_inner_z - epsilon
    );

    // Internal ribbon slot centered between the two right support posts.
    exit_size = [
        ribbon_exit_x1 - ribbon_exit_x0,
        ribbon_exit_y1 - ribbon_exit_y0
    ];
    rounded_xy_cutout(
        [ribbon_exit_x0 + exit_size[0] / 2, ribbon_exit_y0 + exit_size[1] / 2],
        exit_size,
        top_thickness + 2 * epsilon,
        1.8,
        top_inner_z - epsilon
    );
}

module base_shell_body() {
    difference() {
        rounded_prism(outer_size, base_wall_top_z, case_corner_radius);

        // Closed floor with a shallow wall rising just above PCB height.
        translate([wall, wall, floor_thickness])
            rounded_prism(
                inner_size,
                base_wall_top_z - floor_thickness + epsilon,
                max(case_corner_radius - wall, 1.0)
            );

        front_service_cutouts();
        left_service_cutouts();
        rear_service_cutouts();
    }
}

module base_shell() {
    union() {
        base_shell_body();

        for (p = mount_holes) {
            // The shoulder supports the PCB without entering its component keep-out.
            translate([p[0], p[1], floor_thickness])
                cylinder(h = pcb_bottom_z - floor_thickness, d = standoff_d);

            // Solid pin passes upward through the PCB and into the lid's blind socket.
            translate([p[0], p[1], floor_thickness])
                cylinder(h = base_peg_top_z - floor_thickness, d = base_peg_d);
        }
    }
}

module lid_shell_body() {
    difference() {
        translate([0, 0, lid_wall_bottom_z])
            rounded_prism(
                outer_size,
                case_top_z - lid_wall_bottom_z,
                case_corner_radius
            );

        // Hollow cap; the remaining roof is exactly top_thickness.
        translate([wall, wall, lid_wall_bottom_z - epsilon])
            rounded_prism(
                inner_size,
                top_inner_z - lid_wall_bottom_z + 2 * epsilon,
                max(case_corner_radius - wall, 1.0)
            );
    }
}

module lid_assembled() {
    difference() {
        union() {
            lid_shell_body();

            // Four posts descend over the official mounting-hole keep-outs.
            for (p = mount_holes)
                translate([p[0], p[1], lid_post_bottom_z])
                    cylinder(h = top_inner_z - lid_post_bottom_z, d = lid_post_d);
        }

        front_service_cutouts();
        left_service_cutouts();
        rear_service_cutouts();
        top_service_cutouts();

        // Blind glue sockets: no through-holes or screw heads on the exterior.
        for (p = mount_holes)
            translate([p[0], p[1], lid_post_bottom_z - epsilon])
                cylinder(h = lid_socket_depth + epsilon, d = lid_socket_d);
    }
}

module developer_kit_mockup() {
    // Official 100 x 79 mm PCB and four 2.75 mm NPTH mounting holes.
    color([0.08, 0.36, 0.16, 0.90])
        difference() {
            translate([pcb_origin[0], pcb_origin[1], pcb_bottom_z])
                rounded_prism([pcb_size[0], pcb_size[1]], pcb_size[2], 0.6);
            for (p = mount_holes)
                translate([p[0], p[1], pcb_bottom_z - epsilon])
                    cylinder(h = pcb_size[2] + 2 * epsilon, d = mount_hole_d);
        }

    // Complete cooling assembly envelope, ending flush with the enclosure roof.
    color([0.035, 0.035, 0.040, 1.0])
        translate([
            fan_center[0] - heatsink_size[0] / 2,
            fan_center[1] - heatsink_size[1] / 2,
            pcb_top_z + 3.0
        ])
            cube([
                heatsink_size[0],
                heatsink_size[1],
                case_top_z - (pcb_top_z + 3.0)
            ]);

    // Rear antenna assembly: exact 6.17 mm threaded wall section plus the
    // approximately 10 mm external antenna base from the user's photograph.
    color([0.72, 0.72, 0.74, 1.0])
        for (x = antenna_centers_x) {
            translate([x, outer_size[1] + 8.0, antenna_center_z])
                rotate([90, 0, 0])
                    cylinder(h = 8.0, d = antenna_external_body_d);
            translate([x, outer_size[1] + epsilon, antenna_center_z])
                rotate([90, 0, 0])
                    cylinder(h = wall + 2 * epsilon, d = antenna_hole_d);
        }
}

module assembled_view() {
    color([0.10, 0.16, 0.24, 1.0]) base_shell();
    developer_kit_mockup();
    color([0.12, 0.22, 0.34, 0.62]) lid_assembled();
}

module rear_review_view() {
    // Rotate the assembled model so the rear wall faces the standard preview camera.
    translate([outer_size[0], outer_size[1], 0])
        rotate([0, 0, 180])
            assembled_view();
}

module lid_print_orientation() {
    // Exterior roof lies on the print bed; posts and walls grow upward without support.
    translate([0, outer_size[1], case_top_z])
        rotate([180, 0, 0])
            lid_assembled();
}

module print_set() {
    base_shell();
    translate([outer_size[0] + print_gap, 0, 0])
        lid_print_orientation();
}

if (part == "base") {
    base_shell();
} else if (part == "lid") {
    lid_print_orientation();
} else if (part == "assembly") {
    assembled_view();
} else if (part == "rear_review") {
    rear_review_view();
} else if (part == "mockup") {
    developer_kit_mockup();
} else {
    print_set();
}
