//============ Copyright ImMagic, All rights reserved ============//
//
// Purpose: Notification system with animations
//
//================================================================//

#pragma once

#include <string>
#include <chrono>
#include <vector>

namespace Notifications
{
    enum class NotificationType
    {
        SUCCESS,  // Green, "SUCCESS" header
        INFO      // Menu color, "INFO" header
    };

    struct Notification
    {
        std::string header;
        std::string content;
        NotificationType type;
        std::chrono::steady_clock::time_point created_time;
        float slide_in_progress;
        float fade_out_progress;
        bool is_visible;
    };

    void Add(const std::string& content, NotificationType type);
    void Render();
    void Clear();
}
