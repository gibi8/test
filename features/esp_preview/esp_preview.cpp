//============ Copyright ImMagic, All rights reserved ============//
//
// Purpose: ESP Preview window showing live ESP settings on player avatar
//
//================================================================//

#include "esp_preview.h"
#include "features/avatarmanager/avatarmanager.h"
#include "cache/cache.h"
#include "memory/memory.h"
#include "sdk/offsets.h"
#include "settings.h"
#include <imgui/imgui.h>
#include <imgui/imgui_internal.h>

ImVec2 ESPPreview::g_window_pos = ImVec2(1400, 100);
bool ESPPreview::g_visible = true;

void ESPPreview::Render()
{
    ImGui::SetNextWindowSize(ImVec2(350, 500), ImGuiCond_FirstUseEver);
    
    // Position ESP preview to the right of main menu, vertically centered
    ImVec2 display_size = ImGui::GetIO().DisplaySize;
    ImVec2 menu_size = ImVec2(750, 500); // Main menu size from menu.cpp
    ImVec2 menu_center = ImVec2(display_size.x / 2, display_size.y / 2);
    ImVec2 menu_pos = ImVec2(menu_center.x - menu_size.x / 2, menu_center.y - menu_size.y / 2);
    
    // ESP preview position: right of menu, vertically aligned with menu
    ImVec2 esp_preview_pos = ImVec2(menu_pos.x + menu_size.x + 20, menu_pos.y);
    ImGui::SetNextWindowPos(esp_preview_pos, ImGuiCond_FirstUseEver);

    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0, 0));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 1.0f);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 15.0f);
    ImGui::PushStyleColor(ImGuiCol_WindowBg, ImVec4(18.0f/255.0f, 19.0f/255.0f, 27.0f/255.0f, 1.0f));
    ImGui::PushStyleColor(ImGuiCol_Border, ImVec4(110.0f/255.0f, 112.0f/255.0f, 130.0f/255.0f, 1.0f));

    if (ImGui::Begin("ESP Preview", &g_visible, ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoTitleBar))
    {
        g_window_pos = ImGui::GetWindowPos();
        ImGuiWindow* window = ImGui::GetCurrentWindow();
        ImRect window_bb = window->Rect();

        // Main content area - full window
        ImVec2 content_min = ImVec2(window_bb.Min.x + 1, window_bb.Min.y + 1);
        ImVec2 content_max = ImVec2(window_bb.Max.x - 1, window_bb.Max.y - 1);
        window->DrawList->AddRectFilled(content_min, content_max, ImGui::GetColorU32(ImVec4(18.0f/255.0f, 19.0f/255.0f, 27.0f/255.0f, 1.0f)), 14.0f, ImDrawFlags_RoundCornersAll);

        // Title area
        float title_height = 40.0f;
        ImVec2 title_min = ImVec2(content_min.x, content_min.y);
        ImVec2 title_max = ImVec2(content_max.x, content_min.y + title_height);

        // Get menu accent color
        extern float g_menu_accent_color[4];

        // Draw title
        const char* title_text = "ESP PREVIEW";
        ImVec2 title_size = ImGui::CalcTextSize(title_text);
        ImVec2 title_pos = ImVec2((title_min.x + title_max.x) / 2 - title_size.x / 2, title_min.y + 10);
        window->DrawList->AddText(title_pos, ImGui::GetColorU32(ImVec4(g_menu_accent_color[0], g_menu_accent_color[1], g_menu_accent_color[2], g_menu_accent_color[3])), title_text);

        // Draw separator below title
        ImVec2 separator_min = ImVec2(title_min.x + 10, title_max.y);
        ImVec2 separator_max = ImVec2(title_max.x - 10, title_max.y);
        window->DrawList->AddLine(separator_min, separator_max, ImGui::GetColorU32(ImVec4(g_menu_accent_color[0], g_menu_accent_color[1], g_menu_accent_color[2], g_menu_accent_color[3])), 1.0f);

        // Avatar content area (below title)
        ImVec2 avatar_content_min = ImVec2(content_min.x, title_max.y + 1);
        ImVec2 avatar_content_max = ImVec2(content_max.x, content_max.y - 35.0f);

        // Get local player avatar
        extern std::unique_ptr<AvatarManager> g_avatar_manager;
        ImTextureID avatar_texture = (ImTextureID)nullptr;
        std::uint64_t local_user_id = 0;
        int avatar_width = 0;
        int avatar_height = 0;

        // Get local player from cache
        cache::entity_t local_entity;
        {
            std::lock_guard<std::mutex> lock(cache::mtx);
            local_entity = cache::cached_local_player;
        }

        if (local_entity.instance.address != 0)
        {
            try
            {
                local_user_id = memory->read<std::uint64_t>(local_entity.instance.address + Offsets::Player::UserId);
                if (local_user_id != 0 && local_user_id != 0xFFFFFFFFFFFFFFFF)
                {
                    g_avatar_manager->requestAvatar(local_user_id);
                    avatar_texture = g_avatar_manager->getAvatarTexture(local_user_id);
                    g_avatar_manager->getAvatarDimensions(local_user_id, avatar_width, avatar_height);
                }
            }
            catch (...)
            {
            }
        }

        // Calculate avatar position and size based on actual texture dimensions
        float avatar_display_width = avatar_width > 0 ? (float)avatar_width : 350.0f;
        float avatar_display_height = avatar_height > 0 ? (float)avatar_height : 350.0f;

        // Scale avatar to fit in window while maintaining aspect ratio
        float max_width = avatar_content_max.x - avatar_content_min.x - 20.0f;
        float max_height = avatar_content_max.y - avatar_content_min.y - 20.0f;

        float scale = (max_width / avatar_display_width) < (max_height / avatar_display_height) ? (max_width / avatar_display_width) : (max_height / avatar_display_height);
        if (scale > 1.0f) scale = 1.0f; // Don't upscale

        float scaled_width = avatar_display_width * scale;
        float scaled_height = avatar_display_height * scale;

        ImVec2 avatar_center = ImVec2((avatar_content_min.x + avatar_content_max.x) / 2, (avatar_content_min.y + avatar_content_max.y) / 2);
        ImVec2 avatar_min = ImVec2(avatar_center.x - scaled_width / 2, avatar_center.y - scaled_height / 2);
        ImVec2 avatar_max = ImVec2(avatar_center.x + scaled_width / 2, avatar_center.y + scaled_height / 2);

        // Draw avatar
        if (avatar_texture != (ImTextureID)nullptr)
        {
            window->DrawList->AddImage(avatar_texture, avatar_min, avatar_max);
        }
        else
        {
            // Placeholder if no avatar
            window->DrawList->AddRectFilled(avatar_min, avatar_max, ImGui::GetColorU32(ImVec4(30.0f/255.0f, 31.0f/255.0f, 40.0f/255.0f, 1.0f)), 10.0f);
            ImVec2 placeholder_text_pos = ImVec2(avatar_center.x - ImGui::CalcTextSize("No Avatar").x / 2, avatar_center.y - ImGui::CalcTextSize("No Avatar").y / 2);
            window->DrawList->AddText(placeholder_text_pos, ImGui::GetColorU32(ImVec4(100.0f/255.0f, 100.0f/255.0f, 100.0f/255.0f, 1.0f)), "No Avatar");
        }

        // Draw ESP elements based on settings
        float box_margin = 35.0f; // Odsunięcie do wewnątrz - omija przezroczyste tło
        ImVec2 box_min = ImVec2(avatar_min.x + box_margin, avatar_min.y + box_margin);
        ImVec2 box_max = ImVec2(avatar_max.x - box_margin, avatar_max.y - box_margin);

        // Box ESP
        if (settings::visuals::box)
        {
            ImU32 box_color = ImGui::GetColorU32(ImVec4(
                settings::visuals::box_color[0],
                settings::visuals::box_color[1],
                settings::visuals::box_color[2],
                settings::visuals::box_color[3]
            ));
            window->DrawList->AddRect(box_min, box_max, box_color, 0.0f, 0, 1.0f);

            // Box fill
            if (settings::visuals::box_fill)
            {
                ImU32 box_fill_color = ImGui::GetColorU32(ImVec4(
                    settings::visuals::box_fill_color[0],
                    settings::visuals::box_fill_color[1],
                    settings::visuals::box_fill_color[2],
                    settings::visuals::box_fill_color[3]
                ));
                window->DrawList->AddRectFilled(box_min, box_max, box_fill_color, 0.0f, ImDrawFlags_RoundCornersAll);
            }
        }

        // CHAMS ESP
        if (settings::visuals::chams)
        {
            // CHAMS fill
            if (settings::visuals::chams_fill_enabled)
            {
                ImU32 chams_fill_color = ImGui::GetColorU32(ImVec4(
                    settings::visuals::chams_fill_color[0],
                    settings::visuals::chams_fill_color[1],
                    settings::visuals::chams_fill_color[2],
                    settings::visuals::chams_fill_color[3]
                ));
                window->DrawList->AddRectFilled(box_min, box_max, chams_fill_color, 0.0f, ImDrawFlags_RoundCornersAll);
            }

            // CHAMS outline
            if (settings::visuals::chams_outline_enabled)
            {
                ImU32 chams_outline_color = ImGui::GetColorU32(ImVec4(
                    settings::visuals::chams_outline_color[0],
                    settings::visuals::chams_outline_color[1],
                    settings::visuals::chams_outline_color[2],
                    settings::visuals::chams_outline_color[3]
                ));
                window->DrawList->AddRect(box_min, box_max, chams_outline_color, 0.0f, 0, 2.0f);
            }
        }

        // Healthbar ESP
        if (settings::visuals::healthbar)
        {
            float healthbar_width = 3.0f;
            float healthbar_height = box_max.y - box_min.y;
            ImVec2 healthbar_min = ImVec2(box_min.x - healthbar_width, box_min.y);
            ImVec2 healthbar_max = ImVec2(box_min.x, box_max.y);

            // Background
            window->DrawList->AddRectFilled(healthbar_min, healthbar_max, ImGui::GetColorU32(ImVec4(0.2f, 0.2f, 0.2f, 1.0f)));

            // Health fill
            float health_percent = 1.0f; // Full health for preview
            ImVec2 health_fill_max = ImVec2(healthbar_max.x, healthbar_min.y + healthbar_height * health_percent);
            ImU32 health_color = ImGui::GetColorU32(ImVec4(
                settings::visuals::healthbar_color[0],
                settings::visuals::healthbar_color[1],
                settings::visuals::healthbar_color[2],
                settings::visuals::healthbar_color[3]
            ));
            window->DrawList->AddRectFilled(healthbar_min, health_fill_max, health_color);

            // Health percent
            if (settings::visuals::health_percent)
            {
                const char* health_percent_text = "100";
                ImVec2 health_percent_pos = ImVec2(healthbar_min.x - ImGui::CalcTextSize(health_percent_text).x - 2, healthbar_min.y + (healthbar_height - ImGui::CalcTextSize(health_percent_text).y) / 2);
                ImU32 health_percent_color = ImGui::GetColorU32(ImVec4(
                    settings::visuals::health_percent_color[0],
                    settings::visuals::health_percent_color[1],
                    settings::visuals::health_percent_color[2],
                    settings::visuals::health_percent_color[3]
                ));
                window->DrawList->AddText(health_percent_pos, health_percent_color, health_percent_text);
            }
        }

        // Armorbar ESP
        if (settings::visuals::armorbar)
        {
            float armorbar_width = 3.0f;
            float armorbar_height = box_max.y - box_min.y;
            ImVec2 armorbar_min = ImVec2(box_min.x - armorbar_width - 3.0f, box_min.y);
            ImVec2 armorbar_max = ImVec2(box_min.x - 3.0f, box_max.y);

            // Background
            window->DrawList->AddRectFilled(armorbar_min, armorbar_max, ImGui::GetColorU32(ImVec4(0.2f, 0.2f, 0.2f, 1.0f)));

            // Armor fill
            float armor_percent = 1.0f; // Full armor for preview
            ImVec2 armor_fill_max = ImVec2(armorbar_max.x, armorbar_min.y + armorbar_height * armor_percent);
            ImU32 armor_color = ImGui::GetColorU32(ImVec4(
                settings::visuals::armorbar_color[0],
                settings::visuals::armorbar_color[1],
                settings::visuals::armorbar_color[2],
                settings::visuals::armorbar_color[3]
            ));
            window->DrawList->AddRectFilled(armorbar_min, armor_fill_max, armor_color);
        }

        // Name ESP
        if (settings::visuals::name)
        {
            const char* name_text = local_entity.instance.address != 0 ? local_entity.name.c_str() : "Player";
            ImVec2 name_esp_pos = ImVec2(avatar_center.x - ImGui::CalcTextSize(name_text).x / 2, box_min.y - ImGui::CalcTextSize(name_text).y - 3);
            ImU32 name_color = ImGui::GetColorU32(ImVec4(
                settings::visuals::name_color[0],
                settings::visuals::name_color[1],
                settings::visuals::name_color[2],
                settings::visuals::name_color[3]
            ));
            window->DrawList->AddText(name_esp_pos, name_color, name_text);
        }

        // Distance ESP
        if (settings::visuals::distance)
        {
            const char* distance_text = "10.0 m"; // Example distance for preview
            ImVec2 distance_pos = ImVec2(avatar_center.x - ImGui::CalcTextSize(distance_text).x / 2, box_max.y + 3);
            ImU32 distance_color = ImGui::GetColorU32(ImVec4(
                settings::visuals::distance_color[0],
                settings::visuals::distance_color[1],
                settings::visuals::distance_color[2],
                settings::visuals::distance_color[3]
            ));
            window->DrawList->AddText(distance_pos, distance_color, distance_text);
        }

        // Tool ESP
        if (settings::visuals::tool)
        {
            const char* tool_text = "Tool"; // Example tool for preview
            ImVec2 tool_pos = ImVec2(avatar_center.x - ImGui::CalcTextSize(tool_text).x / 2, box_max.y + 18);
            ImU32 tool_color = ImGui::GetColorU32(ImVec4(
                settings::visuals::tool_color[0],
                settings::visuals::tool_color[1],
                settings::visuals::tool_color[2],
                settings::visuals::tool_color[3]
            ));
            window->DrawList->AddText(tool_pos, tool_color, tool_text);
        }

        // Target warning icon ESP
        if (settings::visuals::target_warning_icon)
        {
            float icon_size = settings::visuals::target_warning_icon_size;
            ImVec2 icon_pos = ImVec2(box_max.x + 5, box_min.y);
            window->DrawList->AddText(ImGui::GetFont(), icon_size, icon_pos, ImGui::GetColorU32(ImVec4(1.0f, 0.0f, 0.0f, 1.0f)), "!");
        }

        // Flags ESP
        if (settings::visuals::flags)
        {
            const char* flags_text = "FRIEND"; // Example flags for preview
            ImVec2 flags_pos = ImVec2(box_max.x + 5, box_min.y + 20);
            ImU32 flags_color = ImGui::GetColorU32(ImVec4(
                settings::visuals::flags_state_colour[0],
                settings::visuals::flags_state_colour[1],
                settings::visuals::flags_state_colour[2],
                settings::visuals::flags_state_colour[3]
            ));
            window->DrawList->AddText(flags_pos, flags_color, flags_text);
        }

        // Footer area
        float footer_height = 35.0f;
        ImVec2 footer_min = ImVec2(content_min.x, content_max.y - footer_height);
        ImVec2 footer_max = ImVec2(content_max.x, content_max.y);

        // Draw separator above footer
        ImVec2 footer_separator_min = ImVec2(footer_min.x + 10, footer_min.y);
        ImVec2 footer_separator_max = ImVec2(footer_max.x - 10, footer_min.y);
        window->DrawList->AddLine(footer_separator_min, footer_separator_max, ImGui::GetColorU32(ImVec4(100.0f/255.0f, 100.0f/255.0f, 100.0f/255.0f, 1.0f)), 1.0f);

        // Count active ESP elements
        int active_elements = 0;
        if (settings::visuals::box) active_elements++;
        if (settings::visuals::box_fill) active_elements++;
        if (settings::visuals::healthbar) active_elements++;
        if (settings::visuals::health_percent) active_elements++;
        if (settings::visuals::armorbar) active_elements++;
        if (settings::visuals::name) active_elements++;
        if (settings::visuals::distance) active_elements++;
        if (settings::visuals::tool) active_elements++;
        if (settings::visuals::target_warning_icon) active_elements++;
        if (settings::visuals::flags) active_elements++;

        // Draw footer text
        char footer_text[64];
        sprintf_s(footer_text, sizeof(footer_text), "%d elements active", active_elements);
        ImVec2 footer_text_size = ImGui::CalcTextSize(footer_text);
        ImVec2 footer_text_pos = ImVec2((footer_min.x + footer_max.x) / 2 - footer_text_size.x / 2, footer_min.y + 8);
        window->DrawList->AddText(footer_text_pos, ImGui::GetColorU32(ImVec4(150.0f/255.0f, 150.0f/255.0f, 150.0f/255.0f, 1.0f)), footer_text);

        ImGui::End();
    }
    else
    {
        ImGui::End();
    }

    ImGui::PopStyleVar(3);
    ImGui::PopStyleColor(2);
}
