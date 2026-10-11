#include "postcard.h"
#include <cmath>
#include <iostream>
#include <stdexcept>
void check(bool condition) { if (!condition) throw std::runtime_error("Core check failed"); }
int main() {
    check(std::abs(pc_to_mm(6, 2, 300) - 152.4) < 1e-9);
    check(pc_to_mm(1500, 3, 300) == 127);
    check(pc_to_mm(-1, 0, 300) == -1);
    check(pc_pixels(156, 300) == 1843);
    check(pc_pixels(106, 300) == 1252);
    check(pc_pixels(0, 300) == -1);
    check(std::abs(pc_cover_scale(4000, 3000, 150, 100) - .0375) < 1e-9);
    check(std::abs(pc_effective_dpi(4000, 3000, 150, 100, 2) - 338.6666666667) < 1e-7);
    std::cout << "C++ core: all checks passed\n";
}
