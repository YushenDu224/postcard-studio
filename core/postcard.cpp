#include "postcard.h"
#include <algorithm>
#include <cmath>
#include <limits>

double pc_to_mm(double value, int unit, double dpi) {
    if (!std::isfinite(value) || value <= 0) return -1;
    switch (unit) {
    case 0: return value;
    case 1: return value * 10;
    case 2: return value * 25.4;
    case 3: return dpi > 0 && std::isfinite(dpi) ? value * 25.4 / dpi : -1;
    default: return -1;
    }
}
int pc_pixels(double mm, double dpi) {
    if (!std::isfinite(mm) || !std::isfinite(dpi) || mm <= 0 || dpi <= 0) return -1;
    double value = mm / 25.4 * dpi;
    if (value > std::numeric_limits<int>::max() - 0.5) return -1;
    return std::max(1, static_cast<int>(std::floor(value + 0.5)));
}
double pc_cover_scale(double iw, double ih, double aw, double ah) {
    if (!(iw > 0 && ih > 0 && aw > 0 && ah > 0)) return -1;
    return std::max(aw / iw, ah / ih);
}
double pc_effective_dpi(double iw, double ih, double aw, double ah, double zoom) {
    const double scale = pc_cover_scale(iw, ih, aw, ah);
    return scale > 0 && zoom >= 1 ? 25.4 / (scale * zoom) : -1;
}
