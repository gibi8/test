//============ Copyright ImMagic, All rights reserved ============//
//
// Purpose: Notification system with animations
//
//================================================================//

#include "notifications.h"
#include <settings.h>
#include <imgui/imgui.h>
#include <imgui/imgui_internal.h>
#include <algorithm>
#include <mutex>

namespace Notifications
{
    static std::vector<Notification> g_notifications;
    static std::mutex g_mutex;

    void Add(const std::string& content, NotificationType type)
    {
        std::lock_guard<std::mutex> lock(g_mutex);

        Notification notification;
        notification.content = content;
        notification.type = type;
        notification.created_time = std::chrono::steady_clock::now();
        notification.slide_in_progress = 0.0f;
        notification.fade_out_progress = 0.0f;
        notification.is_visible = true;

        if (type == NotificationType::SUCCESS)
        {
            notification.header = "SUCCESS";
        }
        else
        {
            notification.header = "INFO";
        }

        g_notifications.push_back(notification);
    }

    void Render()
    {
        if (settings::menu::hide_notifications)
            return;

        std::lock_guard<std::mutex> lock(g_mutex);

        if (g_notifications.empty())
            return;

        ImGuiIO& io = ImGui::GetIO();
        ImVec2 display_size = io.DisplaySize;

        float notification_width = 300.0f;
        float notification_height = 60.0f;
        float bar_width = 4.0f;
        float spacing = 10.0f;

        auto current_time = std::chrono::steady_clock::now();
        const float slide_in_duration = 0.3f; // seconds
        const float fade_out_duration = 0.5f; // seconds
        const float display_duration = 3.0f; // seconds

        // Remove old notifications
        g_notifications.erase(
            std::remove_if(g_notifications.begin(), g_notifications.end(),
                [&current_time, display_duration, fade_out_duration](const Notification& n) {
                    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(current_time - n.created_time).count() / 1000.0f;
                    return elapsed > display_duration + fade_out_duration;
                }),
            g_notifications.end());

        // Render notifications
        float y_offset = 20.0f;
        for (auto& notification : g_notifications)
        {
            auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(current_time - notification.created_time).count() / 1000.0f;

            // Calculate slide-in progress
            if (elapsed < slide_in_duration)
            {
                notification.slide_in_progress = elapsed / slide_in_duration;
                // Smooth easing
                notification.slide_in_progress = 1.0f - std::pow(1.0f - notification.slide_in_progress, 3);
            }
            else
            {
                notification.slide_in_progress = 1.0f;
            }

            // Calculate fade-out progress
            if (elapsed > display_duration)
            {
                notification.fade_out_progress = (elapsed - display_duration) / fade_out_duration;
                if (notification.fade_out_progress > 1.0f)
                    notification.fade_out_progress = 1.0f;
            }
            else
            {
                notification.fade_out_progress = 0.0f;
            }

            // Calculate position with slide-in animation
            float x_offset = -notification_width * (1.0f - notification.slide_in_progress);
            ImVec2 pos(x_offset, y_offset);
            ImVec2 size(notification_width, notification_height);

            // Get color based on type
            ImVec4 accent_color;
            if (notification.type == NotificationType::SUCCESS)
            {
                accent_color = ImVec4(0.0f, 1.0f, 0.39f, 1.0f); // RGB: 0, 255, 100
            }
            else
            {
                // Default menu color (RGB: 100, 149, 237)
                accent_color = ImVec4(100.0f/255.0f, 149.0f/255.0f, 237.0f/255.0f, 1.0f);
            }

            // Calculate alpha based on fade-out
            float alpha = 1.0f - notification.fade_out_progress;
            accent_color.w *= alpha;

            ImU32 accent_color_u32 = ImGui::GetColorU32(accent_color);
            ImU32 background_color = ImGui::GetColorU32(ImVec4(0.05f, 0.06f, 0.08f, 0.9f * alpha));
            ImU32 text_color = ImGui::GetColorU32(ImVec4(1.0f, 1.0f, 1.0f, alpha));

            ImGui::SetNextWindowPos(pos);
            ImGui::SetNextWindowSize(size);
            ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 8.0f);
            ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0, 0));
            ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0.0f);
            ImGui::PushStyleColor(ImGuiCol_WindowBg, background_color);

            char window_id[64];
            sprintf_s(window_id, sizeof(window_id), "Notification_%zu", reinterpret_cast<std::uintptr_t>(&notification));

            ImGuiWindowFlags flags = ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoResize | 
                                     ImGuiWindowFlags_NoMove | ImGuiWindowFlags_NoScrollbar | 
                                     ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoSavedSettings;

            if (ImGui::Begin(window_id, nullptr, flags))
            {
                ImDrawList* draw_list = ImGui::GetWindowDrawList();
                ImVec2 window_min = ImGui::GetWindowPos();
                ImVec2 window_max = ImVec2(window_min.x + size.x, window_min.y + size.y);

                // Draw vertical colored bar on the left
                ImVec2 bar_min = window_min;
                ImVec2 bar_max = ImVec2(window_min.x + bar_width, window_max.y);
                draw_list->AddRectFilled(bar_min, bar_max, accent_color_u32);

                // Draw header text (bold, same color as bar)
                ImGui::SetCursorPos(ImVec2(bar_width + 10, 8));
                ImGui::PushStyleColor(ImGuiCol_Text, accent_color);
                ImGui::PushFont(ImGui::GetFont());
                ImGui::Text("%s", notification.header.c_str());
                ImGui::PopFont();
                ImGui::PopStyleColor();

                // Draw content text (white, smaller)
                ImGui::SetCursorPos(ImVec2(bar_width + 10, 30));
                ImGui::PushStyleColor(ImGuiCol_Text, text_color);
                ImGui::PushFont(ImGui::GetFont());
                ImGui::Text("%s", notification.content.c_str());
                ImGui::PopFont();
                ImGui::PopStyleColor();
            }

            ImGui::End();
            ImGui::PopStyleColor();
            ImGui::PopStyleVar(3);

            y_offset += notification_height + spacing;
        }
    }

    void Clear()
    {
        std::lock_guard<std::mutex> lock(g_mutex);
        g_notifications.clear();
    }
}
