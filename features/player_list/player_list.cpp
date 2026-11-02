//============ Copyright ImMagic, All rights reserved ============//
//
// Purpose: Player List window
//
//================================================================//

#include "player_list.h"
#include <settings.h>
#include <cache/cache.h>
#include <memory/memory.h>
#include <game/game.h>
#include <sdk/offsets.h>
#include <features/avatarmanager/avatarmanager.h>
#include <imgui/imgui.h>
#include <imgui/imgui_internal.h>
#include <algorithm>
#include <cmath>
#include <cstring>
#include <../../../ext/imgui/IconsFontAwesome6.h>
#include <windows.h>

extern std::unique_ptr<AvatarManager> g_avatar_manager;

namespace PlayerList
{
    static bool g_visible = false;
    static char g_search_buffer[256] = "";
    static bool g_sort_by_distance = true;
    static int g_context_menu_player_index = -1;
    static ImVec2 g_window_pos = ImVec2(300, 100);
    static bool g_is_spectating = false;
    static std::uint64_t g_spectate_target_address = 0;
    static std::uint64_t g_original_camera_subject = 0;

    void SetVisible(bool visible)
    {
        g_visible = visible;
    }

    bool IsVisible()
    {
        return g_visible;
    }

    static float GetDistanceToLocalPlayer(const cache::entity_t& entity)
    {
        std::uint64_t local_player_address = 0;
        if (game::players.address != 0)
        {
            local_player_address = memory->read<std::uint64_t>(game::players.address + Offsets::Player::LocalPlayer);
        }

        if (local_player_address == 0 || entity.instance.address == 0)
            return FLT_MAX;

        math::vector3 local_root_pos{};
        math::vector3 target_hrp_pos{};
        bool has_local_root_pos = false;
        bool has_target_hrp = false;

        // Get local player position
        std::vector<cache::entity_t> snapshot;
        {
            std::lock_guard<std::mutex> lock(cache::mtx);
            snapshot = cache::cached_players;
        }

        for (cache::entity_t& local_entity : snapshot)
        {
            if (local_entity.instance.address == local_player_address)
            {
                for (auto& parts : local_entity.parts)
                {
                    if (parts.first == "HumanoidRootPart")
                    {
                        rbx::part_t part = parts.second;
                        rbx::primitive_t prim = part.get_primitive();
                        local_root_pos = prim.get_position();
                        has_local_root_pos = true;
                        break;
                    }
                }
                break;
            }
        }

        // Get target position
        for (auto& parts : entity.parts)
        {
            if (parts.first == "HumanoidRootPart")
            {
                rbx::part_t part = parts.second;
                rbx::primitive_t prim = part.get_primitive();
                target_hrp_pos = prim.get_position();
                has_target_hrp = true;
                break;
            }
        }

        if (has_local_root_pos && has_target_hrp)
        {
            math::vector3 diff = { target_hrp_pos.x - local_root_pos.x, target_hrp_pos.y - local_root_pos.y, target_hrp_pos.z - local_root_pos.z };
            return std::sqrt(diff.x * diff.x + diff.y * diff.y + diff.z * diff.z);
        }

        return FLT_MAX;
    }

    static ImU32 GetHealthColor(float health_percent)
    {
        // Always green as requested
        return IM_COL32(0, 255, 0, 255);
    }

    static void RenderContextMenu(const cache::entity_t& entity)
    {
        if (ImGui::BeginPopupContextItem("PlayerContextMenu"))
        {
            if (ImGui::MenuItem("Teleport to Player", ICON_FA_LOCATION_DOT))
            {
                // Get local player position and teleport to target
                std::uint64_t local_player_address = 0;
                if (game::players.address != 0)
                {
                    local_player_address = memory->read<std::uint64_t>(game::players.address + Offsets::Player::LocalPlayer);
                }

                if (local_player_address != 0 && entity.instance.address != 0)
                {
                    // Get target position
                    math::vector3 target_pos{};
                    for (auto& parts : entity.parts)
                    {
                        if (parts.first == "HumanoidRootPart")
                        {
                            rbx::part_t part = parts.second;
                            rbx::primitive_t prim = part.get_primitive();
                            target_pos = prim.get_position();
                            break;
                        }
                    }

                    // Teleport local player to target position
                    if (target_pos.x != 0 || target_pos.y != 0 || target_pos.z != 0)
                    {
                        // Find local player's HumanoidRootPart
                        std::vector<cache::entity_t> snapshot;
                        {
                            std::lock_guard<std::mutex> lock(cache::mtx);
                            snapshot = cache::cached_players;
                        }

                        for (cache::entity_t& local_entity : snapshot)
                        {
                            if (local_entity.instance.address == local_player_address)
                            {
                                for (auto& parts : local_entity.parts)
                                {
                                    if (parts.first == "HumanoidRootPart")
                                    {
                                        rbx::part_t part = parts.second;
                                        rbx::primitive_t prim = part.get_primitive();
                                        memory->write<math::vector3>(prim.address + Offsets::Primitive::Position, target_pos);
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            }
            if (ImGui::MenuItem("Spectate Player", ICON_FA_EYE))
            {
                if (entity.instance.address != 0 && game::camera != 0)
                {
                    try
                    {
                        // Get target head part
                        auto head_it = entity.parts.find("Head");
                        if (head_it != entity.parts.end() && head_it->second.address != 0)
                        {
                            // Save original camera subject
                            g_original_camera_subject = memory->read<std::uint64_t>(game::camera + Offsets::Camera::CameraSubject);
                            g_spectate_target_address = head_it->second.address;
                            g_is_spectating = true;

                            // Set camera subject to target head
                            memory->write<std::uint64_t>(game::camera + Offsets::Camera::CameraSubject, g_spectate_target_address);
                        }
                    }
                    catch (...)
                    {
                    }
                }
            }
            ImGui::Separator();
            if (ImGui::MenuItem("Add to Friends", ICON_FA_USER_PLUS))
            {
                if (entity.instance.address != 0)
                {
                    try
                    {
                        std::uint64_t user_id = memory->read<std::uint64_t>(entity.instance.address + Offsets::Player::UserId);
                        if (user_id != 0 && user_id != 0xFFFFFFFFFFFFFFFF)
                        {
                            // Check if already in friend list
                            auto it = std::find(settings::ui::friend_list.begin(), settings::ui::friend_list.end(), user_id);
                            if (it == settings::ui::friend_list.end())
                            {
                                settings::ui::friend_list.push_back(user_id);
                            }
                        }
                    }
                    catch (...)
                    {
                    }
                }
            }
            if (ImGui::MenuItem("Remove from Friends", ICON_FA_USER_MINUS))
            {
                if (entity.instance.address != 0)
                {
                    try
                    {
                        std::uint64_t user_id = memory->read<std::uint64_t>(entity.instance.address + Offsets::Player::UserId);
                        if (user_id != 0 && user_id != 0xFFFFFFFFFFFFFFFF)
                        {
                            auto it = std::find(settings::ui::friend_list.begin(), settings::ui::friend_list.end(), user_id);
                            if (it != settings::ui::friend_list.end())
                            {
                                settings::ui::friend_list.erase(it);
                            }
                        }
                    }
                    catch (...)
                    {
                    }
                }
            }
            ImGui::Separator();
            if (ImGui::MenuItem("Copy Name", ICON_FA_COPY))
            {
                ImGui::SetClipboardText(entity.name.c_str());
            }
            if (ImGui::MenuItem("View Profile", ICON_FA_LINK))
            {
                if (entity.instance.address != 0)
                {
                    try
                    {
                        std::uint64_t user_id = memory->read<std::uint64_t>(entity.instance.address + Offsets::Player::UserId);
                        if (user_id != 0 && user_id != 0xFFFFFFFFFFFFFFFF)
                        {
                            std::string url = "https://www.roblox.com/users/" + std::to_string(user_id) + "/profile";
                            ShellExecuteA(NULL, "open", url.c_str(), NULL, NULL, SW_SHOWNORMAL);
                        }
                    }
                    catch (...)
                    {
                    }
                }
            }
            ImGui::EndPopup();
        }
    }

    void Render()
    {
        // Check for X key to exit spectate mode (always check, even when window is closed)
        if (g_is_spectating && (GetAsyncKeyState('X') & 0x8000))
        {
            if (game::camera != 0)
            {
                try
                {
                    // Restore original camera subject
                    memory->write<std::uint64_t>(game::camera + Offsets::Camera::CameraSubject, g_original_camera_subject);
                }
                catch (...)
                {
                }
            }
            g_is_spectating = false;
            g_spectate_target_address = 0;
            g_original_camera_subject = 0;
        }

        // Sync visibility with settings
        g_visible = settings::ui::player_list;

        if (!g_visible)
            return;

        ImGui::SetNextWindowSize(ImVec2(400, 500), ImGuiCond_FirstUseEver);
        ImGui::SetNextWindowPos(g_window_pos, ImGuiCond_FirstUseEver);

        ImGuiWindowFlags window_flags = ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoTitleBar;

        if (ImGui::Begin("Player List", &g_visible, window_flags))
        {
            // Update window position for persistence
            g_window_pos = ImGui::GetWindowPos();

            ImGui::Separator();

            // Search and sort controls
            ImGui::InputTextWithHint("##search", "Search player...", g_search_buffer, sizeof(g_search_buffer));
            ImGui::SameLine();

            if (ImGui::Button(g_sort_by_distance ? ICON_FA_SORT_DOWN : ICON_FA_SORT_UP))
            {
                g_sort_by_distance = !g_sort_by_distance;
            }
            if (ImGui::IsItemHovered())
            {
                ImGui::SetTooltip(g_sort_by_distance ? "Sort by distance" : "Sort alphabetically");
            }

            ImGui::Separator();

            // Get players
            std::vector<cache::entity_t> snapshot;
            {
                std::lock_guard<std::mutex> lock(cache::mtx);
                snapshot = cache::cached_players;
            }

            // Filter and sort players
            std::vector<std::pair<float, size_t>> sorted_players;
            for (size_t i = 0; i < snapshot.size(); ++i)
            {
                const auto& entity = snapshot[i];

                // Filter by search
                if (g_search_buffer[0] != '\0')
                {
                    std::string search_lower = g_search_buffer;
                    std::transform(search_lower.begin(), search_lower.end(), search_lower.begin(), ::tolower);

                    std::string name_lower = entity.name;
                    std::transform(name_lower.begin(), name_lower.end(), name_lower.begin(), ::tolower);

                    std::string display_name_lower = entity.display_name;
                    std::transform(display_name_lower.begin(), display_name_lower.end(), display_name_lower.begin(), ::tolower);

                    if (name_lower.find(search_lower) == std::string::npos &&
                        display_name_lower.find(search_lower) == std::string::npos)
                    {
                        continue;
                    }
                }

                float distance = GetDistanceToLocalPlayer(entity);
                sorted_players.push_back({ distance, i });
            }

            // Sort
            if (g_sort_by_distance)
            {
                std::sort(sorted_players.begin(), sorted_players.end(),
                    [](const auto& a, const auto& b) { return a.first < b.first; });
            }
            else
            {
                std::sort(sorted_players.begin(), sorted_players.end(),
                    [&snapshot](const auto& a, const auto& b) {
                        return snapshot[a.second].name < snapshot[b.second].name;
                    });
            }

            // Render player list
            if (ImGui::BeginChild("PlayerListScroll", ImVec2(0, 0), true))
            {
                for (const auto& [distance, index] : sorted_players)
                {
                    const auto& entity = snapshot[index];

                    ImGui::PushID(index);

                    // Player row
                    ImGui::BeginGroup();

                    // Avatar
                    ImTextureID avatar_texture = (ImTextureID)nullptr;
                    if (g_avatar_manager && entity.instance.address != 0)
                    {
                        try
                        {
                            std::uint64_t user_id = memory->read<std::uint64_t>(entity.instance.address + Offsets::Player::UserId);
                            if (user_id != 0 && user_id != 0xFFFFFFFFFFFFFFFF)
                            {
                                g_avatar_manager->requestAvatar(user_id);
                                avatar_texture = g_avatar_manager->getAvatarTexture(user_id);
                            }
                        }
                        catch (...)
                        {
                        }
                    }

                    if (avatar_texture)
                    {
                        ImGui::Image(avatar_texture, ImVec2(32, 32));
                    }
                    else
                    {
                        ImGui::Dummy(ImVec2(32, 32));
                    }
                    ImGui::SameLine();

                    // Name and display name
                    ImGui::BeginGroup();
                    ImGui::Text("%s", entity.name.c_str());
                    if (entity.display_name != entity.name)
                    {
                        ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.6f, 0.6f, 0.6f, 1.0f));
                        ImGui::Text("%s", entity.display_name.c_str());
                        ImGui::PopStyleColor();
                    }
                    ImGui::EndGroup();
                    ImGui::SameLine();

                    // Health bar
                    if (entity.humanoid.address != 0 && entity.max_health > 0.f)
                    {
                        float health_percent = entity.health / entity.max_health;
                        health_percent = (std::max)(0.0f, (std::min)(1.0f, health_percent));

                        ImU32 health_color = GetHealthColor(health_percent);
                        ImVec4 health_color_vec = ImVec4(
                            ((health_color >> IM_COL32_R_SHIFT) & 0xFF) / 255.0f,
                            ((health_color >> IM_COL32_G_SHIFT) & 0xFF) / 255.0f,
                            ((health_color >> IM_COL32_B_SHIFT) & 0xFF) / 255.0f,
                            ((health_color >> IM_COL32_A_SHIFT) & 0xFF) / 255.0f
                        );

                        ImGui::SameLine();
                        ImGui::PushStyleColor(ImGuiCol_FrameBg, ImVec4(0.2f, 0.2f, 0.2f, 1.0f));
                        ImGui::PushStyleColor(ImGuiCol_PlotHistogram, health_color_vec);
                        ImGui::ProgressBar(health_percent, ImVec2(60, 8), "");
                        ImGui::PopStyleColor(2);
                    }

                    // Distance (convert studs to meters: 1 stud = 0.28 meters)
                    ImGui::SameLine();
                    if (distance < FLT_MAX)
                    {
                        ImGui::Text("%.1f m", distance * 0.28f);
                    }

                    ImGui::EndGroup();

                    // Context menu
                    if (ImGui::IsItemHovered() && ImGui::IsMouseClicked(ImGuiMouseButton_Right))
                    {
                        g_context_menu_player_index = index;
                        ImGui::OpenPopup("PlayerContextMenu");
                    }

                    RenderContextMenu(entity);

                    ImGui::PopID();
                    ImGui::Separator();
                }
            }
            ImGui::EndChild();
        }
        ImGui::End();

        // Update settings when window is closed
        settings::ui::player_list = g_visible;
    }
}
