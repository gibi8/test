//============ Copyright ImMagic, All rights reserved ============//
//
// Purpose: ESP Preview window showing live ESP settings on player avatar
//
//================================================================//

#pragma once

#include <imgui/imgui.h>
#include <memory>

class ESPPreview
{
public:
    static void Render();
    static ImVec2 g_window_pos;
    static bool g_visible;
};
