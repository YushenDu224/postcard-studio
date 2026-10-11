#pragma once
// Pure numerical API. No UI, browser, Qt, database, or network dependencies.
extern "C" {
double pc_to_mm(double value, int unit, double dpi);
int pc_pixels(double mm, double dpi);
double pc_cover_scale(double image_w, double image_h, double area_w, double area_h);
double pc_effective_dpi(double image_w, double image_h, double area_w_mm, double area_h_mm, double zoom);
}
