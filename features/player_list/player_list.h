//============ Copyright ImMagic, All rights reserved ============//
//
// Purpose: Player List window
//
//================================================================//

#pragma once

#include <imgui/imgui.h>
#include <string>
#include <vector>
#include <cstdint>

namespace PlayerList
{
    void Render();
    void SetVisible(bool visible);
    bool IsVisible();
}
