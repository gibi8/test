//============ Copyright ImMagic, All rights reserved ============//
//
// Purpose: 
//
//================================================================//

#include "menu.h"
#include "features/config/config.h"
#include "features/player_list/player_list.h"
#include "features/esp_preview/esp_preview.h"
#include "features/notifications/notifications.h"
#include "cache/cache.h"
#include "memory/memory.h"
#include "sdk/offsets.h"
#include "features/avatarmanager/avatarmanager.h"

// Dear ImGui
#include <imgui/imgui.h>
#include <imgui/imgui_internal.h>

// Dear ImGui - Backends
#include <imgui/backends/imgui_impl_dx11.h>
#include <imgui/backends/imgui_impl_win32.h>

// Dear ImGui - Misc
#include <imgui/misc/imgui_freetype.h>

// FontAwesome
#include "../../../ext/imgui/IconsFontAwesome6.h"

// STL
#include <fstream>
#include <vector>

// stb_image
#include <stb_image.h>

// Logo texture
static ID3D11ShaderResourceView* g_logo_texture = nullptr;
static int g_logo_width = 0;
static int g_logo_height = 0;

// Function to load texture from file
static bool LoadLogoTexture(ID3D11Device* pDevice, const char* filename)
{
    // Read file
    std::ifstream file(filename, std::ios::binary);
    if (!file.is_open())
    {
        return false;
    }

    // Get file size
    file.seekg(0, std::ios::end);
    size_t fileSize = file.tellg();
    file.seekg(0, std::ios::beg);

    // Read file data
    std::vector<uint8_t> fileData(fileSize);
    file.read(reinterpret_cast<char*>(fileData.data()), fileSize);
    file.close();

    // Load image with stb_image
    int width, height, channels;
    unsigned char* pixels = stbi_load_from_memory(fileData.data(), static_cast<int>(fileSize), &width, &height, &channels, 4);
    if (!pixels)
    {
        return false;
    }

    // Create D3D11 texture
    D3D11_TEXTURE2D_DESC desc = {};
    desc.Width = width;
    desc.Height = height;
    desc.MipLevels = 1;
    desc.ArraySize = 1;
    desc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
    desc.SampleDesc.Count = 1;
    desc.SampleDesc.Quality = 0;
    desc.Usage = D3D11_USAGE_DEFAULT;
    desc.BindFlags = D3D11_BIND_SHADER_RESOURCE;
    desc.CPUAccessFlags = 0;

    D3D11_SUBRESOURCE_DATA subResource = {};
    subResource.pSysMem = pixels;
    subResource.SysMemPitch = width * 4;

    ID3D11Texture2D* texture = nullptr;
    HRESULT hr = pDevice->CreateTexture2D(&desc, &subResource, &texture);

    stbi_image_free(pixels);

    if (FAILED(hr))
    {
        return false;
    }

    // Create shader resource view
    D3D11_SHADER_RESOURCE_VIEW_DESC srvDesc = {};
    srvDesc.Format = desc.Format;
    srvDesc.ViewDimension = D3D11_SRV_DIMENSION_TEXTURE2D;
    srvDesc.Texture2D.MipLevels = 1;

    hr = pDevice->CreateShaderResourceView(texture, &srvDesc, &g_logo_texture);

    texture->Release();

    if (FAILED(hr))
    {
        return false;
    }

    g_logo_width = width;
    g_logo_height = height;

    return true;
}

// Texture
#include "../../render/textures/texture.h"

// ImGui Addons
#include "../../../ext/imgui/addons/imgui_addons.h"

// Project includes
#include <settings.h>
#include <menu/keybind/keybind.h>
#include <features/explorer/explorer.h>
#include <features/config/config.h>
#include <cache/custom_entities/custom_entities.h>
#include <memory/memory.h>
#include <game/game.h>
#include <sdk/offsets.h>
#include <features/aimbot/aimbot.h>
#include <features/avatarmanager/avatarmanager.h>
#include <features/lighting/skybox/skybox.h>
#include <render/render.h>
#include "../../render/3d/main_api.hpp"
#include "../../render/3d/texture/texture_cache.hpp"
#include "../../ext/font/config/font_config.h"
#include "../../ext/font/visitor.h"
#include "../../ext/font/sp7.h"
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <algorithm>
#include <cmath>
#include <cfloat>
#include <unordered_map>
#include <unordered_set>

extern ImFont* esp_font;
extern ImFont* esp_font_visitor;
extern ImFont* esp_font_sp7;
extern ImFont* esp_font_arial;

class AvatarManager;
extern std::unique_ptr<AvatarManager> g_avatar_manager;

// Global menu accent color for use in addons
float g_menu_accent_color[4] = { 100.0f/255.0f, 149.0f/255.0f, 237.0f/255.0f, 1.0f };

namespace helper
{
    void draw_text_outlined(ImDrawList* draw, ImFont* font, float font_size, ImVec2 pos, ImU32 col, const char* text_begin, const char* text_end = nullptr);
    void corner_box(ImDrawList* draw, ImVec2 min, ImVec2 max, ImU32 col, float thickness = 1.f);
}

#define PROJECT_NAME    "gibi external"

bool Menu::Initialize(HWND hWnd, ID3D11Device* pDevice, ID3D11DeviceContext* pDeviceContext)
{
    bool result = true;

    IMGUI_CHECKVERSION();
    if (!ImGui::GetCurrentContext())
    {
        ImGui::CreateContext();
    }

    ImGuiStyle& style = ImGui::GetStyle();
    ImGuiIO& io = ImGui::GetIO(); (void)io;

    io.IniFilename = nullptr;   // Disable INI File

    // Setup Dear ImGui default style
    ImGui::StyleColorsDark();
    
    style.WindowRounding    = 10.0f;
    style.ChildRounding     = 6.0f;
    style.FrameRounding     = 6.0f;
    style.PopupRounding     = 6.0f;
    style.GrabRounding      = 6.0f;
    style.ScrollbarRounding = 6.0f;

    style.WindowBorderSize  = 1.0f;
    style.FrameBorderSize   = 0;
    style.PopupBorderSize   = 1.0f;

    style.WindowPadding     = ImVec2(0, 0);
    style.ChildPadding      = ImVec2(8, 8);
    style.FramePadding      = ImVec2(8, 4);
    style.CellPadding       = ImVec2(4, 4);
    style.ItemSpacing       = ImVec2(8, 8);
    style.ItemInnerSpacing  = ImVec2(8, 4);
    style.WindowMinSize     = ImVec2(0, 0);

    style.ScrollbarSize     = 6.0f;

    // New color scheme based on specifications
    style.Colors[ImGuiCol_WindowBg]             = ImVec4(0.05f, 0.05f, 0.08f, 0.95f); // #0D0D15 with alpha 0.95
    style.Colors[ImGuiCol_ChildBg]              = ImVec4(0.05f, 0.05f, 0.08f, 1.0f); // #0D0D15
    style.Colors[ImGuiCol_PopupBg]              = ImVec4(0.10f, 0.10f, 0.15f, 0.95f); // #1A1A25

    style.Colors[ImGuiCol_Text]                 = ImVec4(1.0f, 1.0f, 1.0f, 1.0f); // #FFFFFF
    style.Colors[ImGuiCol_TextDisabled]         = ImVec4(0.47f, 0.47f, 0.47f, 1.0f); // #777777

    style.Colors[ImGuiCol_Border]               = ImVec4(0.12f, 0.12f, 0.18f, 1.0f); // #1E1E2E
    style.Colors[ImGuiCol_Separator]            = ImVec4(0.16f, 0.16f, 0.23f, 1.0f); // #2A2A3A

    style.Colors[ImGuiCol_Header]               = ImVec4(100.0f/255.0f, 149.0f/255.0f, 237.0f/255.0f, 1.0f); // #6495ED - Cornflower blue
    style.Colors[ImGuiCol_HeaderHovered]        = ImVec4(135.0f/255.0f, 206.0f/255.0f, 250.0f/255.0f, 1.0f);
    style.Colors[ImGuiCol_HeaderActive]         = ImVec4(176.0f/255.0f, 224.0f/255.0f, 230.0f/255.0f, 1.0f);

    style.Colors[ImGuiCol_SliderGrab]           = ImVec4(100.0f/255.0f, 149.0f/255.0f, 237.0f/255.0f, 1.0f); // #6495ED
    style.Colors[ImGuiCol_SliderGrabActive]     = ImVec4(135.0f/255.0f, 206.0f/255.0f, 250.0f/255.0f, 1.0f);

    style.Colors[ImGuiCol_Button]               = ImVec4(0.10f, 0.10f, 0.15f, 1.0f); // #1A1A25
    style.Colors[ImGuiCol_ButtonHovered]        = ImVec4(0.15f, 0.15f, 0.20f, 1.0f);
    style.Colors[ImGuiCol_ButtonActive]         = ImVec4(100.0f/255.0f, 149.0f/255.0f, 237.0f/255.0f, 1.0f); // #6495ED

    style.Colors[ImGuiCol_FrameBg]              = ImVec4(0.10f, 0.10f, 0.15f, 1.0f); // #1A1A25
    style.Colors[ImGuiCol_FrameBgHovered]       = ImVec4(0.15f, 0.15f, 0.20f, 1.0f);
    style.Colors[ImGuiCol_FrameBgActive]        = ImVec4(100.0f/255.0f, 149.0f/255.0f, 237.0f/255.0f, 1.0f); // #6495ED

    style.Colors[ImGuiCol_CheckMark]            = ImVec4(1.0f, 1.0f, 1.0f, 1.0f); // White checkmark

    style.Colors[ImGuiCol_FrameBgShadow]        = ImVec4(0.0f, 0.0f, 0.0f, 0.5f);
    style.Colors[ImGuiCol_ButtonShadow]         = ImVec4(1.0f, 1.0f, 1.0f, 0.035f);

    // Setup Font - load Inter-Regular.ttf for text first
    ImFontConfig font_cfg_main;
    font_cfg_main.FontLoaderFlags = ImGuiFreeTypeLoaderFlags_ForceAutoHint;
    font_cfg_main.GlyphOffset = ImVec2(0, 1);
    font_cfg_main.SizePixels = 16.0f;
    font_cfg_main.PixelSnapH = true;
    ImFont* main_font = io.Fonts->AddFontFromFileTTF("fonts/Inter-Regular.ttf", 16.0f, &font_cfg_main, io.Fonts->GetGlyphRangesDefault());
    if (!main_font)
    {
        // Try absolute path if relative path fails
        char exe_path[MAX_PATH];
        GetModuleFileNameA(NULL, exe_path, MAX_PATH);
        std::string exe_dir = exe_path;
        exe_dir = exe_dir.substr(0, exe_dir.find_last_of("\\/"));
        std::string font_path = exe_dir + "\\fonts\\Inter-Regular.ttf";
        main_font = io.Fonts->AddFontFromFileTTF(font_path.c_str(), 16.0f, &font_cfg_main, io.Fonts->GetGlyphRangesDefault());
    }

    // Load FontAwesome font as second font, merged with the first
    static const ImWchar icons_ranges[] = { ICON_MIN_FA, ICON_MAX_FA, 0 };
    ImFontConfig font_cfg_icons;
    font_cfg_icons.FontLoaderFlags = ImGuiFreeTypeLoaderFlags_ForceAutoHint;
    font_cfg_icons.GlyphOffset = ImVec2(0, 1);
    font_cfg_icons.SizePixels = 14.0f;
    font_cfg_icons.MergeMode = true; // Merge with default font
    font_cfg_icons.PixelSnapH = true;
    font_cfg_icons.OversampleH = 2;
    font_cfg_icons.OversampleV = 1;
    ImFont* icon_font = io.Fonts->AddFontFromFileTTF("fonts/fa-solid-900.ttf", 14.0f, &font_cfg_icons, icons_ranges);
    if (!icon_font)
    {
        // Try absolute path if relative path fails
        char exe_path[MAX_PATH];
        GetModuleFileNameA(NULL, exe_path, MAX_PATH);
        std::string exe_dir = exe_path;
        exe_dir = exe_dir.substr(0, exe_dir.find_last_of("\\/"));
        std::string font_path = exe_dir + "\\fonts\\fa-solid-900.ttf";
        icon_font = io.Fonts->AddFontFromFileTTF(font_path.c_str(), 14.0f, &font_cfg_icons, icons_ranges);
    }
    
    // Build fonts
    io.Fonts->Build();
    
    // Set default font
    if (main_font)
        io.FontDefault = main_font;

    // Initialize Dear ImGui - WIN32
    result = ImGui_ImplWin32_Init(hWnd);
    if (!result) return false;

    // Initialize Dear ImGui - DX11
    result = ImGui_ImplDX11_Init(pDevice, pDeviceContext);
    if (!result) return false;

    // Load logo texture
    LoadLogoTexture(pDevice, "C:\\Users\\Administrator\\Desktop\\d\\gibi\\ext\\logo.png");

    m_bInitialized = true;

    return true;
}

void Menu::Render()
{
    if (!m_bInitialized) return;

    ImGui_ImplDX11_NewFrame();
    ImGui_ImplWin32_NewFrame();
    ImGui::NewFrame();
    {
        DrawMenu();
    }

    // Render Notifications (always render, even when menu is closed)
    Notifications::Render();

    ImGui::Render();
    ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData());
}

void Menu::DrawWatermark()
{
    if (!settings::menu::watermark)
    {
        return;
    }

    ImGuiStyle& style = ImGui::GetStyle();

    // Calculate watermark size based on logo
    float logo_scale = 0.3f; // Scale logo to fit nicely
    float watermark_width = g_logo_width * logo_scale;
    float watermark_height = g_logo_height * logo_scale;

    ImGui::SetNextWindowSize(ImVec2(watermark_width, watermark_height), ImGuiCond_Always);

    // Set position based on watermark_position setting (0: top-left, 1: top-right)
    ImVec2 watermark_pos;
    if (settings::menu::watermark_position == 0)
    {
        watermark_pos = ImVec2(20, 20);
    }
    else
    {
        watermark_pos = ImVec2(ImGui::GetIO().DisplaySize.x - watermark_width - 20, 20);
    }
    ImGui::SetNextWindowPos(watermark_pos, ImGuiCond_Always);

    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0, 0));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0);
    bool watermark_window = ImGui::Begin("ImMagic - Watermark", (bool*)0, ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoBackground);
    ImGui::PopStyleVar(2);

    if (watermark_window)
    {
        ImRect window_bb(ImGui::GetCurrentWindow()->Rect());

        if (ImGui::GetCurrentWindow()->Flags & ImGuiWindowFlags_NoBackground)
        {
            ImGuiWindow* window = ImGui::GetCurrentWindow();

            // Draw background in menu color (not accent color)
            ImVec4 menu_bg_color = ImVec4(0.1f, 0.1f, 0.12f, 1.0f);
            window->DrawList->AddRectFilled(window_bb.Min, window_bb.Max, ImGui::GetColorU32(menu_bg_color), style.WindowRounding);

            // Draw top accent bar (only the top part changes color)
            float accent_bar_height = 4.0f;
            ImRect accent_bar_bb(window_bb.Min, ImVec2(window_bb.Max.x, window_bb.Min.y + accent_bar_height));
            window->DrawList->AddRectFilled(accent_bar_bb.Min, accent_bar_bb.Max, ImGui::GetColorU32(ImVec4(g_menu_accent_color[0], g_menu_accent_color[1], g_menu_accent_color[2], g_menu_accent_color[3])), ImVec2(style.WindowRounding, style.WindowRounding).x);

            if (style.WindowBorderSize > 0.0f)
            {
                window->DrawList->AddRect(window_bb.Min, window_bb.Max, ImGui::GetColorU32(ImGuiCol_Border), style.WindowRounding, ImDrawFlags_None, style.WindowBorderSize);
            }
        }

        ImGui::SetCursorScreenPos(window_bb.Min + ImVec2(0.0f, style.ChildBorderSize * 4.0f));
        ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, style.CellPadding);
        ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, style.CellPadding);
        if (ImGui::BeginChild("watermark_body", ImVec2(window_bb.GetWidth(), ImGui::GetFrameHeight() + style.CellPadding.y * 2.0f), ImGuiChildFlags_AlwaysUseWindowPadding, ImGuiWindowFlags_NoBackground))
        {
            ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(style.FramePadding.x, style.FramePadding.y));
            if (ImGui::BeginChild("logo", ImVec2(ImGui::GetWindowWidth(), ImGui::GetFrameHeight()), ImGuiChildFlags_AlwaysUseWindowPadding, ImGuiWindowFlags_NoBackground))
            {
                // Render logo image
                if (g_logo_texture)
                {
                    ImGui::Image((ImTextureID)g_logo_texture, ImVec2(watermark_width, watermark_height));
                }
            }
            ImGui::EndChild();
            ImGui::PopStyleVar();
        }
        ImGui::EndChild();
        ImGui::PopStyleVar(2);
    }
    ImGui::End();
}

void Menu::DrawMenu()
{
    static bool m_bMainWindowOpen = true;
    static int m_nCategoryIndex = 0; // 0: Combat, 1: Visuals, 2: Misc, 3: Settings
    static int m_nSubTabIndex = 0; // Subtabs within each category
    static float menu_accent_color[4] = { 100.0f/255.0f, 149.0f/255.0f, 237.0f/255.0f, 1.0f }; // Default accent color
    
    // Sync global accent color with local
    memcpy(g_menu_accent_color, menu_accent_color, sizeof(menu_accent_color));
    
    // Update ImGui scrollbar colors dynamically every frame
    ImGuiStyle& style = ImGui::GetStyle();
    style.Colors[ImGuiCol_ScrollbarGrab] = ImVec4(menu_accent_color[0], menu_accent_color[1], menu_accent_color[2], menu_accent_color[3]);
    style.Colors[ImGuiCol_ScrollbarGrabHovered] = ImVec4(menu_accent_color[0] * 1.2f, menu_accent_color[1] * 1.2f, menu_accent_color[2] * 1.2f, 1.0f);
    style.Colors[ImGuiCol_ScrollbarGrabActive] = ImVec4(menu_accent_color[0] * 0.8f, menu_accent_color[1] * 0.8f, menu_accent_color[2] * 0.8f, 1.0f);
    
    ImGuiIO& io = ImGui::GetIO(); (void)io;

    if (m_bMainWindowOpen)
    {
        // Window size matching screenshots: 750x500
        ImGui::SetNextWindowSize(ImVec2(750, 500), ImGuiCond_Once);
        // Shift menu slightly to the left (100px offset from center)
        ImGui::SetNextWindowPos(io.DisplaySize / 2 - ImVec2(100, 0), ImGuiCond_Once, ImVec2(0.5f, 0.5f));

        ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0, 0));
        ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 1.0f);
        ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 15.0f);
        ImGui::PushStyleColor(ImGuiCol_WindowBg, ImVec4(8.0f/255.0f, 9.0f/255.0f, 13.0f/255.0f, 1.0f));
        ImGui::PushStyleColor(ImGuiCol_Border, ImVec4(35.0f/255.0f, 36.0f/255.0f, 48.0f/255.0f, 1.0f));
        bool main_window = ImGui::Begin("gibi external - Main Menu", &m_bMainWindowOpen, ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoScrollWithMouse | ImGuiWindowFlags_NoResize);
        ImGui::PopStyleVar(3);
        ImGui::PopStyleColor(2);

        if (main_window)
        {
            ImRect window_bb = ImGui::GetCurrentWindow()->Rect();
            ImGuiWindow* window = ImGui::GetCurrentWindow();

            // Top bar (30px height) - inset from edges to respect rounded corners
            ImVec2 top_bar_min = ImVec2(window_bb.Min.x + 1, window_bb.Min.y + 1);
            ImVec2 top_bar_max = ImVec2(window_bb.Max.x - 1, window_bb.Min.y + 30);
            window->DrawList->AddRectFilled(top_bar_min, top_bar_max, ImGui::GetColorU32(ImVec4(14.0f/255.0f, 15.0f/255.0f, 21.0f/255.0f, 1.0f)), 14.0f, ImDrawFlags_RoundCornersTop);

            // Draw "gibi.xyz" text - brighter and more prominent
            ImVec2 text_pos = ImVec2(top_bar_min.x + 15, top_bar_min.y + 6);
            window->DrawList->AddText(ImGui::GetFont(), 16.0f, text_pos, ImGui::GetColorU32(ImVec4(215.0f/255.0f, 216.0f/255.0f, 230.0f/255.0f, 1.0f)), "gibi.xyz");

            // Separator line below top bar - inset from edges
            window->DrawList->AddLine(ImVec2(top_bar_min.x + 15, top_bar_max.y), ImVec2(top_bar_max.x - 15, top_bar_max.y), ImGui::GetColorU32(ImVec4(35.0f/255.0f, 36.0f/255.0f, 48.0f/255.0f, 1.0f)), 1.0f);

            // Left sidebar (100px width) - inset from bottom to respect rounded corners
            ImVec2 sidebar_min = ImVec2(window_bb.Min.x + 1, top_bar_max.y);
            ImVec2 sidebar_max = ImVec2(window_bb.Min.x + 100, window_bb.Max.y - 1);
            window->DrawList->AddRectFilled(sidebar_min, sidebar_max, ImGui::GetColorU32(ImVec4(14.0f/255.0f, 15.0f/255.0f, 21.0f/255.0f, 1.0f)), 14.0f, ImDrawFlags_RoundCornersBottom);

            // Sidebar icons (4 icons evenly spaced)
            const char* category_names[] = { "Combat", "Visuals", "Misc", "Settings" };
            const char* icon_symbols[] = { ICON_FA_CROSSHAIRS, ICON_FA_EYE, ICON_FA_LAYER_GROUP, ICON_FA_GEAR };
            float sidebar_height = sidebar_max.y - sidebar_min.y;
            float icon_spacing = sidebar_height / 4.0f;
            
            for (int i = 0; i < 4; i++)
            {
                ImVec2 icon_center = ImVec2(sidebar_min.x + 50, sidebar_min.y + icon_spacing * i + icon_spacing / 2);
                
                // Draw active indicator (blue line on left)
                if (m_nCategoryIndex == i)
                {
                    ImVec2 indicator_min = ImVec2(sidebar_min.x + 2, icon_center.y - 12);
                    ImVec2 indicator_max = ImVec2(sidebar_min.x + 4, icon_center.y + 12);
                    window->DrawList->AddRectFilled(indicator_min, indicator_max, ImGui::GetColorU32(ImVec4(menu_accent_color[0], menu_accent_color[1], menu_accent_color[2], menu_accent_color[3])), 2.0f);
                }

                // Draw icon symbol (left of text) - use menu accent color when active
                ImVec4 icon_color = (m_nCategoryIndex == i) ? ImVec4(menu_accent_color[0], menu_accent_color[1], menu_accent_color[2], menu_accent_color[3]) : ImVec4(125.0f/255.0f, 127.0f/255.0f, 147.0f/255.0f, 1.0f);
                window->DrawList->AddText(ImGui::GetFont(), 18.0f, ImVec2(icon_center.x - 25, icon_center.y - 9), ImGui::GetColorU32(icon_color), icon_symbols[i]);

                // Draw category name to the right of icon (smaller)
                ImVec4 text_color = (m_nCategoryIndex == i) ? ImVec4(215.0f/255.0f, 216.0f/255.0f, 230.0f/255.0f, 1.0f) : ImVec4(125.0f/255.0f, 127.0f/255.0f, 147.0f/255.0f, 1.0f);
                window->DrawList->AddText(ImGui::GetFont(), 14.0f, ImVec2(icon_center.x - 5, icon_center.y - 7), ImGui::GetColorU32(text_color), category_names[i]);
                
                // Clickable area for icon
                ImVec2 click_min = ImVec2(sidebar_min.x, sidebar_min.y + icon_spacing * i);
                ImVec2 click_max = ImVec2(sidebar_max.x, sidebar_min.y + icon_spacing * (i + 1));
                
                if (ImGui::IsMouseHoveringRect(click_min, click_max) && ImGui::IsMouseClicked(0))
                {
                    m_nCategoryIndex = i;
                    m_nSubTabIndex = 0;
                }
            }

            // Right panel - inset from edges to respect rounded corners
            ImVec2 panel_min = ImVec2(sidebar_max.x, top_bar_max.y);
            ImVec2 panel_max = ImVec2(window_bb.Max.x - 1, window_bb.Max.y - 1);
            window->DrawList->AddRectFilled(panel_min, panel_max, ImGui::GetColorU32(ImVec4(18.0f/255.0f, 19.0f/255.0f, 27.0f/255.0f, 1.0f)), 14.0f, ImDrawFlags_RoundCornersBottom);

            // Subtab bar (45px height)
            ImVec2 subtab_min = panel_min;
            ImVec2 subtab_max = ImVec2(panel_max.x, panel_min.y + 45);
            window->DrawList->AddRectFilled(subtab_min, subtab_max, ImGui::GetColorU32(ImVec4(14.0f/255.0f, 15.0f/255.0f, 21.0f/255.0f, 1.0f)));
            
            // Draw subtabs based on category
            const char* combat_subtabs[] = { ICON_FA_CROSSHAIRS " Aimbot", ICON_FA_VOLUME_XMARK " Silent Aim", ICON_FA_WAND_MAGIC_SPARKLES " Magic Bullet", ICON_FA_BOLT " Triggerbot" };
            const char* visuals_subtabs[] = { ICON_FA_EYE " Enemy", ICON_FA_EXPAND " World", ICON_FA_GEAR " Settings" };
            const char* misc_subtabs[] = { ICON_FA_WAVE_SQUARE " Movement", ICON_FA_BOLT " Exploits", ICON_FA_LAYER_GROUP " Other" };
            const char* settings_subtabs[] = { ICON_FA_GEAR " Menu", ICON_FA_RULER " Config", ICON_FA_EYE " About" };
            
            const char** current_subtabs = nullptr;
            int subtab_count = 0;
            
            switch (m_nCategoryIndex)
            {
                case 0: current_subtabs = combat_subtabs; subtab_count = 4; break;
                case 1: current_subtabs = visuals_subtabs; subtab_count = 3; break;
                case 2: current_subtabs = misc_subtabs; subtab_count = 3; break;
                case 3: current_subtabs = settings_subtabs; subtab_count = 3; break;
            }
            
            if (current_subtabs && subtab_count > 0)
            {
                float subtab_width = (panel_max.x - panel_min.x) / subtab_count;
                
                for (int i = 0; i < subtab_count; i++)
                {
                    ImVec2 subtab_text_min = ImVec2(panel_min.x + subtab_width * i + subtab_width / 2 - ImGui::CalcTextSize(current_subtabs[i]).x / 2, subtab_min.y + 14);
                    ImVec4 text_color = (m_nSubTabIndex == i) ? ImVec4(215.0f/255.0f, 216.0f/255.0f, 230.0f/255.0f, 1.0f) : ImVec4(125.0f/255.0f, 127.0f/255.0f, 147.0f/255.0f, 1.0f);
                    
                    // Hover effect
                    if (ImGui::IsMouseHoveringRect(ImVec2(panel_min.x + subtab_width * i, subtab_min.y), ImVec2(panel_min.x + subtab_width * (i + 1), subtab_max.y)))
                    {
                        text_color = ImVec4(135.0f/255.0f, 137.0f/255.0f, 155.0f/255.0f, 1.0f);
                    }
                    
                    window->DrawList->AddText(ImGui::GetFont(), 14.0f, subtab_text_min, ImGui::GetColorU32(text_color), current_subtabs[i]);
                    
                    // Draw underline for active subtab - fixed alignment
                    if (m_nSubTabIndex == i)
                    {
                        float text_width = ImGui::CalcTextSize(current_subtabs[i]).x;
                        float text_center_x = subtab_text_min.x + text_width / 2.0f;
                        float underline_width = text_width;
                        ImVec2 underline_min = ImVec2(text_center_x - underline_width / 2.0f, subtab_max.y - 2);
                        ImVec2 underline_max = ImVec2(text_center_x + underline_width / 2.0f, subtab_max.y);
                        window->DrawList->AddLine(underline_min, underline_max, ImGui::GetColorU32(ImVec4(menu_accent_color[0], menu_accent_color[1], menu_accent_color[2], menu_accent_color[3])), 2.0f);
                    }
                    
                    // Clickable area for subtab
                    if (ImGui::IsMouseHoveringRect(ImVec2(panel_min.x + subtab_width * i, subtab_min.y), ImVec2(panel_min.x + subtab_width * (i + 1), subtab_max.y)) && ImGui::IsMouseClicked(0))
                    {
                        m_nSubTabIndex = i;
                    }
                }
            }
            
            // Separator line below subtab bar
            window->DrawList->AddLine(ImVec2(panel_min.x, subtab_max.y), ImVec2(panel_max.x, subtab_max.y), ImGui::GetColorU32(ImVec4(0.12f, 0.12f, 0.16f, 1.0f)), 1.0f);

            // Content area below subtabs - split into two columns
            ImVec2 content_min = ImVec2(panel_min.x + 20, subtab_max.y + 20);
            ImVec2 content_max = ImVec2(panel_max.x - 20, panel_max.y - 20);
            ImVec2 content_size = content_max - content_min;
            
            // Left column for main options (40% width)
            ImVec2 left_col_min = content_min;
            ImVec2 left_col_max = ImVec2(content_min.x + content_size.x * 0.4f, content_max.y);
            
            // Right column for sub-options (55% width, 5% gap)
            ImVec2 right_col_min = ImVec2(left_col_max.x + 20, content_min.y);
            ImVec2 right_col_max = content_max;
            
            // Draw content based on category and subtab
            ImGui::SetCursorScreenPos(content_min);
            ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(12, 12));
            ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(10, 10));
            ImGui::PushStyleVar(ImGuiStyleVar_FramePadding, ImVec2(8, 6));
            
            if (ImGui::BeginChild("content_area", content_max - content_min, false, ImGuiWindowFlags_NoBackground))
            {
                // Render content based on current category and subtab
                if (m_nCategoryIndex == 0 && m_nSubTabIndex == 0) // Combat -> Aimbot
                {
                    // Left column - Main options
                    ImGui::SetCursorScreenPos(left_col_min);
                    if (ImGui::BeginChild("left_column", left_col_max - left_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::PushFont(ImGui::GetFont());
                        ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.6f, 0.6f, 0.6f, 1.0f));
                        ImGui::Text("%s AIMBOT SETTINGS", ICON_FA_CROSSHAIRS);
                        ImGui::PopStyleColor();
                        ImGui::PopFont();
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));
                        
                        ImAdd::CustomToggle("Enabled", &settings::aimbot::enabled);
                        ImGui::SameLine();
                        static ImGuiKey aimbot_key = ImGuiKey_None;
                        aimbot_key = keybind::vk_to_imgui_key(settings::aimbot::keybind);
                        if (ImAdd::KeyBind("## Aimbot Keybind", &aimbot_key, ImVec2(0, 0), &settings::aimbot::activation_mode))
                        {
                            settings::aimbot::keybind = keybind::imgui_key_to_vk(aimbot_key);
                        }

                        ImAdd::CustomToggle("Use FOV", &settings::aimbot::use_fov);
                        ImAdd::CustomToggle("Team Check", &settings::aimbot::teamcheck);
                        ImAdd::CustomToggle("Wallcheck", &settings::aimbot::visible_check);
                        ImAdd::CustomToggle("Health Check", &settings::aimbot::health_check_enabled);
                        ImAdd::CustomToggle("Sticky Aim", &settings::aimbot::sticky_aim);
                        ImAdd::CustomToggle("Draw FOV", &settings::aimbot::draw_fov);
                        
                        ImGui::Dummy(ImVec2(0, 15));
                        ImGui::TextColored(ImVec4(0.6f, 0.6f, 0.6f, 1.0f), "ADVANCED");
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));
                        
                        ImAdd::CustomToggle("Enable Smoothing", &settings::aimbot::smoothing);
                        ImAdd::CustomToggle("Enable Prediction", &settings::aimbot::enable_prediction);
                        ImAdd::CustomToggle("Air Prediction", &settings::aimbot::air_prediction_enabled);
                        ImAdd::CustomToggle("Offset", &settings::aimbot::offset_enabled);
                        ImAdd::CustomToggle("Air Part", &settings::aimbot::air_part_enabled);
                    }
                    ImGui::EndChild();

                    // Right column - Sub-options
                    ImGui::SetCursorScreenPos(right_col_min);
                    if (ImGui::BeginChild("right_column", right_col_max - right_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        if (settings::aimbot::draw_fov)
                        {
                            ImGui::Text("FOV Colors");
                            ImAdd::ColorEdit4("Circle", settings::aimbot::fov_circle_colour);
                            ImGui::SameLine();
                            ImAdd::ColorEdit4("Outline", settings::aimbot::fov_outline_colour);
                        }

                        ImAdd::SliderFloat("FOV", &settings::aimbot::fov, 0.0f, 1000.0f, "%.0f");

                        ImGui::Text("Mode");
                        ImAdd::Combo("## Aimbot Mode", &settings::aimbot::mode, { "Mouse", "Camera" });

                        ImGui::Text("Target Part");
                        ImAdd::Combo("## Target Part", &settings::aimbot::target_part, { "Closest", "Head", "HumanoidRootPart", "LeftArm", "RightArm", "LeftLeg", "RightLeg" });

                        if (settings::aimbot::air_part_enabled)
                        {
                            ImGui::Text("Air Part");
                            ImAdd::Combo("## Air Part", &settings::aimbot::air_part, { "Closest", "Head", "HumanoidRootPart", "LeftArm", "RightArm", "LeftLeg", "RightLeg" });
                        }

                        if (settings::aimbot::smoothing)
                        {
                            ImAdd::SliderFloat(ICON_FA_WAVE_SQUARE " Smoothing X", &settings::aimbot::smoothingx, 1.0f, 100.0f, "%.1f");
                            ImAdd::SliderFloat(ICON_FA_WAVE_SQUARE " Smoothing Y", &settings::aimbot::smoothingy, 1.0f, 100.0f, "%.1f");
                            ImGui::Text("Smoothing Style");
                            ImAdd::Combo("## Smoothing Style", &settings::aimbot::smoothing_style, { "None", "Linear", "EaseInQuad", "EaseOutQuad", "EaseInOutQuad", "EaseInCubic", "EaseOutCubic", "EaseInOutCubic", "EaseInSine", "EaseOutSine", "EaseInOutSine" });
                        }

                        if (settings::aimbot::enable_prediction)
                        {
                            ImAdd::SliderFloat("Prediction X", &settings::aimbot::prediction_x, 0.0f, 20.0f, "%.1f");
                            ImAdd::SliderFloat("Prediction Y", &settings::aimbot::prediction_y, 0.0f, 20.0f, "%.1f");
                        }

                        if (settings::aimbot::air_prediction_enabled)
                        {
                            ImAdd::SliderFloat("Air Prediction X", &settings::aimbot::air_prediction_x, 0.0f, 20.0f, "%.1f");
                            ImAdd::SliderFloat("Air Prediction Y", &settings::aimbot::air_prediction_y, 0.0f, 20.0f, "%.1f");
                        }

                        if (settings::aimbot::offset_enabled)
                        {
                            ImAdd::SliderFloat("Offset X", &settings::aimbot::offset_x, -100.0f, 100.0f, "%.1f");
                            ImAdd::SliderFloat("Offset Y", &settings::aimbot::offset_y, -100.0f, 100.0f, "%.1f");
                        }

                        if (settings::aimbot::health_check_enabled)
                        {
                            ImAdd::SliderFloat("Min Health", &settings::aimbot::min_health, 0.0f, 100.0f, "%.1f");
                        }
                    }
                    ImGui::EndChild();
                }
                else if (m_nCategoryIndex == 0 && m_nSubTabIndex == 1) // Combat -> Silent Aim
                {
                    // Left column - Main options
                    ImGui::SetCursorScreenPos(left_col_min);
                    if (ImGui::BeginChild("silent_left", left_col_max - left_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::PushFont(ImGui::GetFont());
                        ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.6f, 0.6f, 0.6f, 1.0f));
                        ImGui::Text("%s SILENT AIM SETTINGS", ICON_FA_VOLUME_XMARK);
                        ImGui::PopStyleColor();
                        ImGui::PopFont();
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));
                        
                        ImAdd::CustomToggle("Enabled", &settings::silentaim::enabled);
                        ImGui::SameLine();
                        static ImGuiKey silentaim_key = ImGuiKey_None;
                        silentaim_key = keybind::vk_to_imgui_key(settings::silentaim::keybind);
                        if (ImAdd::KeyBind("## Silent Aim Keybind", &silentaim_key, ImVec2(0, 0), &settings::silentaim::activation_mode))
                        {
                            settings::silentaim::keybind = keybind::imgui_key_to_vk(silentaim_key);
                        }

                        ImAdd::CustomToggle("Use FOV", &settings::silentaim::use_fov);
                        ImAdd::CustomToggle("Team Check", &settings::silentaim::teamcheck);
                        ImAdd::CustomToggle("Gun Check", &settings::silentaim::guncheck);
                        ImAdd::CustomToggle("Knock Check", &settings::silentaim::knock_check);
                        ImAdd::CustomToggle("Health Check", &settings::silentaim::health_check_enabled);
                        ImAdd::CustomToggle("Sticky Aim", &settings::silentaim::sticky_aim);
                        ImAdd::CustomToggle("Draw FOV", &settings::silentaim::draw_fov);
                        
                        ImGui::Dummy(ImVec2(0, 15));
                        ImGui::TextColored(ImVec4(0.6f, 0.6f, 0.6f, 1.0f), "ADVANCED");
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));
                        
                        ImAdd::CustomToggle("Enable Prediction", &settings::silentaim::enable_prediction);
                        ImAdd::CustomToggle("Use Aimbot Target", &settings::silentaim::use_aimbot_target);
                        ImAdd::CustomToggle("Draw Target Dot", &settings::silentaim::draw_target_dot);
                    }
                    ImGui::EndChild();

                    // Right column - Sub-options
                    ImGui::SetCursorScreenPos(right_col_min);
                    if (ImGui::BeginChild("silent_right", right_col_max - right_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        if (settings::silentaim::draw_fov)
                        {
                            ImGui::Text("FOV Colors");
                            ImAdd::ColorEdit4("Circle", settings::silentaim::fov_circle_colour);
                            ImGui::SameLine();
                            ImAdd::ColorEdit4("Outline", settings::silentaim::fov_outline_colour);
                            ImAdd::CustomToggle("Attach FOV to Target", &settings::silentaim::attach_fov_to_target);
                        }

                        ImAdd::SliderFloat("FOV", &settings::silentaim::fov, 0.0f, 1000.0f, "%.0f");

                        ImGui::Text("Target Part");
                        ImAdd::Combo("## Target Part", &settings::silentaim::target_part, { "Nearest Point", "Closest", "Head", "HumanoidRootPart", "LeftArm", "RightArm", "LeftLeg", "RightLeg" });

                        if (settings::silentaim::enable_prediction)
                        {
                            ImAdd::SliderFloat("Prediction X", &settings::silentaim::prediction_x, 0.0f, 20.0f, "%.1f");
                            ImAdd::SliderFloat("Prediction Y", &settings::silentaim::prediction_y, 0.0f, 20.0f, "%.1f");
                        }

                        if (settings::silentaim::health_check_enabled)
                        {
                            ImAdd::SliderFloat("Min Health", &settings::silentaim::min_health, 0.0f, 100.0f, "%.1f");
                        }

                        if (settings::silentaim::draw_target_dot)
                        {
                            ImAdd::ColorEdit4("Target Dot Color", settings::silentaim::target_dot_color);
                        }
                    }
                    ImGui::EndChild();
                }
                else if (m_nCategoryIndex == 0 && m_nSubTabIndex == 2) // Combat -> Magic Bullet
                {
                    ImGui::TextColored(ImVec4(0.47f, 0.47f, 0.47f, 1.0f), "Magic Bullet options coming soon...");
                }
                else if (m_nCategoryIndex == 0 && m_nSubTabIndex == 3) // Combat -> Triggerbot
                {
                    // Left column - Main options
                    ImGui::SetCursorScreenPos(left_col_min);
                    if (ImGui::BeginChild("triggerbot_left", left_col_max - left_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::PushFont(ImGui::GetFont());
                        ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.6f, 0.6f, 0.6f, 1.0f));
                        ImGui::Text("%s TRIGGERBOT SETTINGS", ICON_FA_BOLT);
                        ImGui::PopStyleColor();
                        ImGui::PopFont();
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));

                        ImAdd::CustomToggle("Enabled", &settings::triggerbot::enabled);
                        ImGui::SameLine();
                        static ImGuiKey triggerbot_key = ImGuiKey_None;
                        triggerbot_key = keybind::vk_to_imgui_key(settings::triggerbot::keybind);
                        if (ImAdd::KeyBind("## Triggerbot Keybind", &triggerbot_key, ImVec2(0, 0), &settings::triggerbot::activation_mode))
                        {
                            settings::triggerbot::keybind = keybind::imgui_key_to_vk(triggerbot_key);
                        }

                        ImAdd::CustomToggle("Use FOV", &settings::triggerbot::use_fov);
                        ImAdd::CustomToggle("Team Check", &settings::triggerbot::teamcheck);
                        ImAdd::CustomToggle("Knock Check", &settings::triggerbot::knock_check);
                        ImAdd::CustomToggle("Health Check", &settings::triggerbot::health_check_enabled);
                        ImAdd::CustomToggle("Draw FOV", &settings::triggerbot::draw_fov);
                    }
                    ImGui::EndChild();

                    // Right column - Sub-options
                    ImGui::SetCursorScreenPos(right_col_min);
                    if (ImGui::BeginChild("triggerbot_right", right_col_max - right_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        if (settings::triggerbot::draw_fov)
                        {
                            ImGui::Text("FOV Colors");
                            ImAdd::ColorEdit4("Circle", settings::triggerbot::fov_circle_colour);
                            ImGui::SameLine();
                            ImAdd::ColorEdit4("Outline", settings::triggerbot::fov_outline_colour);
                        }

                        ImAdd::SliderFloat("FOV", &settings::triggerbot::fov, 0.0f, 1000.0f, "%.0f");

                        ImGui::Text("Target Part");
                        ImAdd::Combo("## Triggerbot Target Part", &settings::triggerbot::target_part, { "Closest", "Head", "HumanoidRootPart", "LeftArm", "RightArm", "LeftLeg", "RightLeg" });

                        if (settings::triggerbot::health_check_enabled)
                        {
                            ImAdd::SliderFloat("Min Health", &settings::triggerbot::min_health, 0.0f, 100.0f, "%.1f");
                        }

                        ImAdd::SliderFloat("Delay", &settings::triggerbot::delay, 0.0f, 1000.0f, "%.1f");
                        ImAdd::SliderFloat("Reaction Time", &settings::triggerbot::reaction_time, 0.0f, 1000.0f, "%.1f");
                    }
                    ImGui::EndChild();
                }
                else if (m_nCategoryIndex == 1 && m_nSubTabIndex == 0) // Visuals -> Enemy
                {
                    // Left column - Main options
                    ImGui::SetCursorScreenPos(left_col_min);
                    if (ImGui::BeginChild("enemy_left", left_col_max - left_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::PushFont(ImGui::GetFont());
                        ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.6f, 0.6f, 0.6f, 1.0f));
                        ImGui::Text("%s ENEMY ESP", ICON_FA_EYE);
                        ImGui::PopStyleColor();
                        ImGui::PopFont();
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));
                        
                        ImAdd::CustomToggle("Enable", &settings::visuals::enable_enemies);
                        ImGui::SameLine();
                        static ImGuiKey esp_key = ImGuiKey_None;
                        esp_key = keybind::vk_to_imgui_key(settings::visuals::esp_keybind);
                        if (ImAdd::KeyBind("## ESP Keybind", &esp_key, ImVec2(0, 0), &settings::visuals::esp_activation_mode))
                        {
                            settings::visuals::esp_keybind = keybind::imgui_key_to_vk(esp_key);
                        }
                        ImAdd::CustomToggle("Box", &settings::visuals::box);
                        ImGui::SameLine();
                        ImGui::ColorButton("##box_color", ImVec4(settings::visuals::box_color[0], settings::visuals::box_color[1], settings::visuals::box_color[2], settings::visuals::box_color[3]), ImGuiColorEditFlags_NoTooltip | ImGuiColorEditFlags_NoBorder, ImVec2(16, 16));
                        if (ImGui::BeginPopup("##box_color"))
                        {
                            ImGui::ColorPicker4("Box Color", settings::visuals::box_color);
                            ImGui::EndPopup();
                        }
                        if (ImGui::IsItemClicked())
                            ImGui::OpenPopup("##box_color");
                        
                        ImAdd::CustomToggle("Box Fill", &settings::visuals::box_fill);
                        ImGui::SameLine();
                        ImGui::ColorButton("##box_fill_color", ImVec4(settings::visuals::box_fill_color[0], settings::visuals::box_fill_color[1], settings::visuals::box_fill_color[2], settings::visuals::box_fill_color[3]), ImGuiColorEditFlags_NoTooltip | ImGuiColorEditFlags_NoBorder, ImVec2(16, 16));
                        if (ImGui::BeginPopup("##box_fill_color"))
                        {
                            ImGui::ColorPicker4("Box Fill Color", settings::visuals::box_fill_color);
                            ImGui::EndPopup();
                        }
                        if (ImGui::IsItemClicked())
                            ImGui::OpenPopup("##box_fill_color");
                        
                        ImAdd::CustomToggle("Name", &settings::visuals::name);
                        ImGui::SameLine();
                        ImGui::ColorButton("##name_color", ImVec4(settings::visuals::name_color[0], settings::visuals::name_color[1], settings::visuals::name_color[2], settings::visuals::name_color[3]), ImGuiColorEditFlags_NoTooltip | ImGuiColorEditFlags_NoBorder, ImVec2(16, 16));
                        if (ImGui::BeginPopup("##name_color"))
                        {
                            ImGui::ColorPicker4("Name Color", settings::visuals::name_color);
                            ImGui::EndPopup();
                        }
                        if (ImGui::IsItemClicked())
                            ImGui::OpenPopup("##name_color");
                        
                        ImAdd::CustomToggle("Avatar", &settings::visuals::avatar);
                        ImAdd::CustomToggle("Healthbar", &settings::visuals::healthbar);
                        ImGui::SameLine();
                        ImGui::ColorButton("##healthbar_color", ImVec4(settings::visuals::healthbar_color[0], settings::visuals::healthbar_color[1], settings::visuals::healthbar_color[2], settings::visuals::healthbar_color[3]), ImGuiColorEditFlags_NoTooltip | ImGuiColorEditFlags_NoBorder, ImVec2(16, 16));
                        if (ImGui::BeginPopup("##healthbar_color"))
                        {
                            ImGui::ColorPicker4("Healthbar Color", settings::visuals::healthbar_color);
                            ImGui::EndPopup();
                        }
                        if (ImGui::IsItemClicked())
                            ImGui::OpenPopup("##healthbar_color");
                        
                        ImAdd::CustomToggle("Health Percent", &settings::visuals::health_percent);
                        ImGui::SameLine();
                        ImGui::ColorButton("##health_percent_color", ImVec4(settings::visuals::health_percent_color[0], settings::visuals::health_percent_color[1], settings::visuals::health_percent_color[2], settings::visuals::health_percent_color[3]), ImGuiColorEditFlags_NoTooltip | ImGuiColorEditFlags_NoBorder, ImVec2(16, 16));
                        if (ImGui::BeginPopup("##health_percent_color"))
                        {
                            ImGui::ColorPicker4("Health Percent Color", settings::visuals::health_percent_color);
                            ImGui::EndPopup();
                        }
                        if (ImGui::IsItemClicked())
                            ImGui::OpenPopup("##health_percent_color");
                        
                        ImAdd::CustomToggle("Armor Bar", &settings::visuals::armorbar);
                        ImGui::SameLine();
                        ImGui::ColorButton("##armorbar_color", ImVec4(settings::visuals::armorbar_color[0], settings::visuals::armorbar_color[1], settings::visuals::armorbar_color[2], settings::visuals::armorbar_color[3]), ImGuiColorEditFlags_NoTooltip | ImGuiColorEditFlags_NoBorder, ImVec2(16, 16));
                        if (ImGui::BeginPopup("##armorbar_color"))
                        {
                            ImGui::ColorPicker4("Armor Bar Color", settings::visuals::armorbar_color);
                            ImGui::EndPopup();
                        }
                        if (ImGui::IsItemClicked())
                            ImGui::OpenPopup("##armorbar_color");
                        
                        ImAdd::CustomToggle("Distance", &settings::visuals::distance);
                        ImGui::SameLine();
                        ImGui::ColorButton("##distance_color", ImVec4(settings::visuals::distance_color[0], settings::visuals::distance_color[1], settings::visuals::distance_color[2], settings::visuals::distance_color[3]), ImGuiColorEditFlags_NoTooltip | ImGuiColorEditFlags_NoBorder, ImVec2(16, 16));
                        if (ImGui::BeginPopup("##distance_color"))
                        {
                            ImGui::ColorPicker4("Distance Color", settings::visuals::distance_color);
                            ImGui::EndPopup();
                        }
                        if (ImGui::IsItemClicked())
                            ImGui::OpenPopup("##distance_color");
                        
                        ImAdd::CustomToggle("Tool", &settings::visuals::tool);
                        ImGui::SameLine();
                        ImGui::ColorButton("##tool_color", ImVec4(settings::visuals::tool_color[0], settings::visuals::tool_color[1], settings::visuals::tool_color[2], settings::visuals::tool_color[3]), ImGuiColorEditFlags_NoTooltip | ImGuiColorEditFlags_NoBorder, ImVec2(16, 16));
                        if (ImGui::BeginPopup("##tool_color"))
                        {
                            ImGui::ColorPicker4("Tool Color", settings::visuals::tool_color);
                            ImGui::EndPopup();
                        }
                        if (ImGui::IsItemClicked())
                            ImGui::OpenPopup("##tool_color");
                        
                        ImAdd::CustomToggle("Flags", &settings::visuals::flags);
                        ImGui::SameLine();
                        ImGui::ColorButton("##flags_color", ImVec4(settings::visuals::flags_state_colour[0], settings::visuals::flags_state_colour[1], settings::visuals::flags_state_colour[2], settings::visuals::flags_state_colour[3]), ImGuiColorEditFlags_NoTooltip | ImGuiColorEditFlags_NoBorder, ImVec2(16, 16));
                        if (ImGui::BeginPopup("##flags_color"))
                        {
                            ImGui::ColorPicker4("Flags Color", settings::visuals::flags_state_colour);
                            ImGui::EndPopup();
                        }
                        if (ImGui::IsItemClicked())
                            ImGui::OpenPopup("##flags_color");
                        
                        ImAdd::CustomToggle("Chams", &settings::visuals::chams);
                        ImGui::SameLine();
                        ImGui::ColorButton("##chams_fill_color", ImVec4(settings::visuals::chams_fill_color[0], settings::visuals::chams_fill_color[1], settings::visuals::chams_fill_color[2], settings::visuals::chams_fill_color[3]), ImGuiColorEditFlags_NoTooltip | ImGuiColorEditFlags_NoBorder, ImVec2(16, 16));
                        if (ImGui::BeginPopup("##chams_fill_color"))
                        {
                            ImGui::ColorPicker4("Chams Fill Color", settings::visuals::chams_fill_color);
                            ImGui::EndPopup();
                        }
                        if (ImGui::IsItemClicked())
                            ImGui::OpenPopup("##chams_fill_color");
                        ImGui::SameLine();
                        ImGui::ColorButton("##chams_outline_color", ImVec4(settings::visuals::chams_outline_color[0], settings::visuals::chams_outline_color[1], settings::visuals::chams_outline_color[2], settings::visuals::chams_outline_color[3]), ImGuiColorEditFlags_NoTooltip | ImGuiColorEditFlags_NoBorder, ImVec2(16, 16));
                        if (ImGui::BeginPopup("##chams_outline_color"))
                        {
                            ImGui::ColorPicker4("Chams Outline Color", settings::visuals::chams_outline_color);
                            ImGui::EndPopup();
                        }
                        if (ImGui::IsItemClicked())
                            ImGui::OpenPopup("##chams_outline_color");
                        
                        ImAdd::CustomToggle("Target Warning Icon", &settings::visuals::target_warning_icon);
                    }
                    ImGui::EndChild();

                    // Right column - ESP Options and Distance
                    ImGui::SetCursorScreenPos(right_col_min);
                    if (ImGui::BeginChild("enemy_right", right_col_max - right_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::Text("ESP Options");
                        ImAdd::CustomToggle("Show NPC", &settings::visuals::show_npc);
                        ImAdd::CustomToggle("Show Dead", &settings::visuals::show_dead);
                        ImAdd::CustomToggle("Show Friend", &settings::visuals::show_friend);
                        ImAdd::CustomToggle("Show Self", &settings::visuals::show_self);
                        ImAdd::CustomToggle("Visible Check", &settings::visuals::visible_check);
                        ImGui::SameLine();
                        ImGui::ColorButton("##visible_check_color", ImVec4(settings::visuals::visible_check_color[0], settings::visuals::visible_check_color[1], settings::visuals::visible_check_color[2], settings::visuals::visible_check_color[3]), ImGuiColorEditFlags_NoTooltip | ImGuiColorEditFlags_NoBorder, ImVec2(16, 16));
                        if (ImGui::BeginPopup("##visible_check_color"))
                        {
                            ImGui::ColorPicker4("Visible Check Color", settings::visuals::visible_check_color);
                            ImGui::EndPopup();
                        }
                        if (ImGui::IsItemClicked())
                            ImGui::OpenPopup("##visible_check_color");
                        
                        ImGui::Separator();
                        ImGui::Text("Distance Settings");
                        ImAdd::SliderFloat("Max Distance", &settings::visuals::max_distance, 0.0f, 1000.0f, "%.0f");
                        ImAdd::CustomToggle("Distance Check", &settings::visuals::distance_check);
                    }
                    ImGui::EndChild();
                }
                else if (m_nCategoryIndex == 1 && m_nSubTabIndex == 1) // Visuals -> World
                {
                    ImGui::TextColored(ImVec4(0.47f, 0.47f, 0.47f, 1.0f), "World options coming soon...");
                }
                else if (m_nCategoryIndex == 1 && m_nSubTabIndex == 2) // Visuals -> Settings
                {
                    // Left column - Main options
                    ImGui::SetCursorScreenPos(left_col_min);
                    if (ImGui::BeginChild("vis_settings_left", left_col_max - left_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::PushFont(ImGui::GetFont());
                        ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.6f, 0.6f, 0.6f, 1.0f));
                        ImGui::Text("%s VISUALS SETTINGS", ICON_FA_GEAR);
                        ImGui::PopStyleColor();
                        ImGui::PopFont();
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));

                        ImAdd::CustomToggle("Knock Check", &settings::visuals::knock_check);
                        ImAdd::CustomToggle("Debug Wallcheck", &settings::visuals::debug_wallcheck);
                        ImAdd::CustomToggle("View Hitbox", &settings::visuals::view_hitbox);
                        ImAdd::CustomToggle("Hit Tracers", &settings::visuals::hit_tracers_enabled);
                    }
                    ImGui::EndChild();

                    // Right column - Sub-options
                    ImGui::SetCursorScreenPos(right_col_min);
                    if (ImGui::BeginChild("vis_settings_right", right_col_max - right_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                    }
                    ImGui::EndChild();
                }
                else if (m_nCategoryIndex == 1 && m_nSubTabIndex == 1) // Visuals -> World
                {
                    ImGui::TextColored(ImVec4(0.47f, 0.47f, 0.47f, 1.0f), "World options coming soon...");
                }
                else if (m_nCategoryIndex == 1 && m_nSubTabIndex == 2) // Visuals -> Settings
                {
                    // Left column - Main options
                    ImGui::SetCursorScreenPos(left_col_min);
                    if (ImGui::BeginChild("vis_settings_left", left_col_max - left_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::PushFont(ImGui::GetFont());
                        ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.6f, 0.6f, 0.6f, 1.0f));
                        ImGui::Text("%s VISUALS SETTINGS", ICON_FA_GEAR);
                        ImGui::PopStyleColor();
                        ImGui::PopFont();
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));

                        ImAdd::CustomToggle("Knock Check", &settings::visuals::knock_check);
                        ImAdd::CustomToggle("Debug Wallcheck", &settings::visuals::debug_wallcheck);
                        ImAdd::CustomToggle("View Hitbox", &settings::visuals::view_hitbox);
                        ImAdd::CustomToggle("Hit Tracers", &settings::visuals::hit_tracers_enabled);
                    }
                    ImGui::EndChild();

                    // Right column - Sub-options
                    ImGui::SetCursorScreenPos(right_col_min);
                    if (ImGui::BeginChild("vis_settings_right", right_col_max - right_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                    }
                    ImGui::EndChild();
                }
                else if (m_nCategoryIndex == 2 && m_nSubTabIndex == 0) // Misc -> Movement
                {
                    // Left column - Main options
                    ImGui::SetCursorScreenPos(left_col_min);
                    if (ImGui::BeginChild("movement_left", left_col_max - left_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::TextColored(ImVec4(0.6f, 0.6f, 0.6f, 1.0f), "MOVEMENT");
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));
                        
                        ImAdd::CustomToggle("Speedhack", &settings::movement::speedhack::enabled);
                        if (settings::movement::speedhack::enabled)
                        {
                            ImGui::SameLine();
                            static ImGuiKey speed_key = ImGuiKey_None;
                            speed_key = keybind::vk_to_imgui_key(settings::movement::speedhack::keybind);
                            if (ImAdd::KeyBind("## Speed Keybind", &speed_key, ImVec2(0, 0), &settings::movement::speedhack::activation_mode))
                            {
                                settings::movement::speedhack::keybind = keybind::imgui_key_to_vk(speed_key);
                            }
                        }

                        ImAdd::CustomToggle("Flyhack", &settings::movement::flyhack::enabled);
                        if (settings::movement::flyhack::enabled)
                        {
                            ImGui::SameLine();
                            static ImGuiKey fly_key = ImGuiKey_None;
                            fly_key = keybind::vk_to_imgui_key(settings::movement::flyhack::keybind);
                            if (ImAdd::KeyBind("## Fly Keybind", &fly_key, ImVec2(0, 0), &settings::movement::flyhack::activation_mode))
                            {
                                settings::movement::flyhack::keybind = keybind::imgui_key_to_vk(fly_key);
                            }
                        }

                        ImAdd::CustomToggle("Noclip", &settings::rage::noclip);
                        if (settings::rage::noclip)
                        {
                            ImGui::SameLine();
                            static ImGuiKey noclip_key = ImGuiKey_None;
                            noclip_key = keybind::vk_to_imgui_key(settings::movement::noclip::keybind);
                            if (ImAdd::KeyBind("## Noclip Keybind", &noclip_key, ImVec2(0, 0), &settings::movement::noclip::activation_mode))
                            {
                                settings::movement::noclip::keybind = keybind::imgui_key_to_vk(noclip_key);
                            }
                        }

                        ImAdd::CustomToggle("Orbit", &settings::movement::orbit::enabled);
                        ImAdd::CustomToggle("Tickrate", &settings::movement::tickrate::enabled);
                    }
                    ImGui::EndChild();

                    // Right column - Sub-options
                    ImGui::SetCursorScreenPos(right_col_min);
                    if (ImGui::BeginChild("movement_right", right_col_max - right_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        if (settings::movement::speedhack::enabled)
                        {
                            ImGui::Text("Speedhack");
                            ImGui::Text("Mode");
                            ImAdd::Combo("## Speed Mode", &settings::movement::speedhack::mode, { "Normal", "Bhop" });
                            ImAdd::SliderFloat("Speed", &settings::movement::speedhack::speed, 1.0f, 100.0f, "%.0f");
                        }

                        if (settings::movement::flyhack::enabled)
                        {
                            ImGui::Text("Flyhack");
                            ImGui::Text("Mode");
                            ImAdd::Combo("## Fly Mode", &settings::movement::flyhack::mode, { "Normal", "Smooth" });
                            ImAdd::SliderFloat("Speed", &settings::movement::flyhack::speed, 1.0f, 100.0f, "%.0f");
                        }

                        if (settings::movement::orbit::enabled)
                        {
                            ImGui::Text("Orbit");
                            ImGui::Text("Orbit Type");
                            ImAdd::Combo("## Orbit Type", &settings::movement::orbit::orbit_type, { "Around", "Circle" });
                            ImAdd::SliderFloat("Speed", &settings::movement::orbit::speed, 1.0f, 100.0f, "%.0f");
                            ImAdd::SliderFloat("Radius", &settings::movement::orbit::radius, 1.0f, 50.0f, "%.0f");
                            ImAdd::SliderFloat("Height Offset", &settings::movement::orbit::height_offset, -50.0f, 50.0f, "%.0f");
                            ImAdd::CustomToggle("Spectate Target", &settings::movement::orbit::spectate_target);
                            ImAdd::CustomToggle("Randomize", &settings::movement::orbit::randomize);
                            if (settings::movement::orbit::randomize)
                            {
                                ImAdd::SliderFloat("Randomize X", &settings::movement::orbit::randomize_x, 0.0f, 20.0f, "%.0f");
                                ImAdd::SliderFloat("Randomize Y", &settings::movement::orbit::randomize_y, 0.0f, 20.0f, "%.0f");
                            }
                        }

                        if (settings::movement::tickrate::enabled)
                        {
                            ImGui::Text("Tickrate");
                            ImAdd::SliderFloat("Tickrate", &settings::movement::tickrate::value, 1.0f, 240.0f, "%.0f");
                        }
                    }
                    ImGui::EndChild();
                }
                else if (m_nCategoryIndex == 2 && m_nSubTabIndex == 1) // Misc -> Exploits
                {
                    // Left column - Main options
                    ImGui::SetCursorScreenPos(left_col_min);
                    if (ImGui::BeginChild("exploits_left", left_col_max - left_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::TextColored(ImVec4(0.6f, 0.6f, 0.6f, 1.0f), "EXPLOITS");
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));
                        
                        ImAdd::CustomToggle("Hitsounds", &settings::rage::hitsounds);
                        ImAdd::CustomToggle("Rapidfire", &settings::rage::rapidfire);
                        ImAdd::CustomToggle("Hit Tracers", &settings::rage::hit_tracers);
                        ImAdd::CustomToggle("Hitbox Expander", &settings::rage::hitbox_expander::enabled);
                        ImAdd::CustomToggle("Spin 360", &settings::rage::spin360::enabled);
                        if (settings::rage::spin360::enabled)
                        {
                            ImGui::SameLine();
                            static ImGuiKey spin_key = ImGuiKey_None;
                            spin_key = keybind::vk_to_imgui_key(settings::rage::spin360::keybind);
                            if (ImAdd::KeyBind("## Spin Keybind", &spin_key, ImVec2(0, 0), &settings::rage::spin360::activation_mode))
                            {
                                settings::rage::spin360::keybind = keybind::imgui_key_to_vk(spin_key);
                            }
                        }
                    }
                    ImGui::EndChild();

                    // Right column - Sub-options
                    ImGui::SetCursorScreenPos(right_col_min);
                    if (ImGui::BeginChild("exploits_right", right_col_max - right_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        if (settings::rage::hitsounds)
                        {
                            ImGui::Text("Hitsounds");
                            ImGui::Text("Type");
                            ImAdd::Combo("## hitsound type", &settings::rage::hitsound_type, { "Default", "Custom" });
                            ImGui::Text("Method");
                            ImAdd::Combo("## hitsound method", &settings::rage::hitsound_method, { "PlaySound", "Beep" });
                        }

                        if (settings::rage::hit_tracers)
                        {
                            ImGui::Text("Hit Tracers");
                            ImAdd::ColorEdit4("Color", settings::rage::hit_tracers_color);
                            ImAdd::SliderFloat("Duration", &settings::rage::hit_tracers_duration, 0.1f, 5.0f, "%.1f");
                        }

                        if (settings::rage::hitbox_expander::enabled)
                        {
                            ImGui::Text("Hitbox Expander");
                            ImGui::Text("Target Part");
                            ImAdd::Combo("## hbe target part", &settings::rage::hitbox_expander::target_part, { "Head", "HumanoidRootPart", "All" });
                            ImAdd::SliderFloat("Size X", &settings::rage::hitbox_expander::size_x, 1.0f, 10.0f, "%.1f");
                            ImAdd::SliderFloat("Size Y", &settings::rage::hitbox_expander::size_y, 1.0f, 10.0f, "%.1f");
                            ImAdd::SliderFloat("Size Z", &settings::rage::hitbox_expander::size_z, 1.0f, 10.0f, "%.1f");
                            ImAdd::CustomToggle("Knock Check", &settings::rage::hitbox_expander::knock_check);
                        }

                        if (settings::rage::spin360::enabled)
                        {
                            ImGui::Text("Spin 360");
                            ImAdd::SliderFloat("Speed", &settings::rage::spin360::speed, 1.0f, 100.0f, "%.0f");
                        }
                    }
                    ImGui::EndChild();
                }
                else if (m_nCategoryIndex == 2 && m_nSubTabIndex == 2) // Misc -> Other
                {
                    ImGui::PushFont(ImGui::GetFont());
                    ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.6f, 0.6f, 0.6f, 1.0f));
                    ImGui::Text("%s OTHER", ICON_FA_LAYER_GROUP);
                    ImGui::PopStyleColor();
                    ImGui::PopFont();

                    ImGui::Separator();
                    ImGui::Spacing();

                    ImAdd::CustomToggle("Player List", &settings::ui::player_list);
                    if (ImGui::IsItemHovered())
                    {
                        ImGui::SetTooltip("Show/hide Player List window");
                    }

                    ImGui::Separator();
                    ImGui::Spacing();

                    // Friend List section on the right side
                    ImGui::PushFont(ImGui::GetFont());
                    ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.6f, 0.6f, 0.6f, 1.0f));
                    ImGui::Text("%s FRIEND LIST", ICON_FA_USER_GROUP);
                    ImGui::PopStyleColor();
                    ImGui::PopFont();

                    ImGui::Separator();
                    ImGui::Spacing();

                    if (ImGui::BeginChild("FriendListScroll", ImVec2(0, 200), true))
                    {
                        if (settings::ui::friend_list.empty())
                        {
                            ImGui::TextColored(ImVec4(0.47f, 0.47f, 0.47f, 1.0f), "No friends added yet.");
                            ImGui::TextColored(ImVec4(0.47f, 0.47f, 0.47f, 1.0f), "Right-click on a player in Player List to add them.");
                        }
                        else
                        {
                            // Get cached players snapshot
                            std::vector<cache::entity_t> player_snapshot;
                            {
                                std::lock_guard<std::mutex> lock(cache::mtx);
                                player_snapshot = cache::cached_players;
                            }

                            for (size_t i = 0; i < settings::ui::friend_list.size(); ++i)
                            {
                                std::uint64_t friend_user_id = settings::ui::friend_list[i];

                                // Find player in cache by User ID
                                const cache::entity_t* friend_entity = nullptr;
                                for (const auto& entity : player_snapshot)
                                {
                                    if (entity.instance.address != 0)
                                    {
                                        try
                                        {
                                            std::uint64_t user_id = memory->read<std::uint64_t>(entity.instance.address + Offsets::Player::UserId);
                                            if (user_id == friend_user_id)
                                            {
                                                friend_entity = &entity;
                                                break;
                                            }
                                        }
                                        catch (...)
                                        {
                                        }
                                    }
                                }

                                ImGui::PushID(i);

                                if (friend_entity)
                                {
                                    // Display like in Player List
                                    ImGui::BeginGroup();

                                    // Avatar
                                    ImTextureID avatar_texture = (ImTextureID)nullptr;
                                    extern std::unique_ptr<AvatarManager> g_avatar_manager;
                                    if (g_avatar_manager && friend_entity->instance.address != 0)
                                    {
                                        try
                                        {
                                            std::uint64_t user_id = memory->read<std::uint64_t>(friend_entity->instance.address + Offsets::Player::UserId);
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

                                    if (avatar_texture != (ImTextureID)nullptr)
                                    {
                                        ImGui::Image(avatar_texture, ImVec2(32, 32));
                                    }
                                    else
                                    {
                                        ImGui::Dummy(ImVec2(32, 32));
                                    }

                                    ImGui::SameLine();

                                    // Name and display name
                                    if (!friend_entity->display_name.empty() && friend_entity->display_name != friend_entity->name)
                                    {
                                        ImGui::Text("%s (@%s)", friend_entity->display_name.c_str(), friend_entity->name.c_str());
                                    }
                                    else
                                    {
                                        ImGui::Text("%s", friend_entity->name.c_str());
                                    }

                                    ImGui::SameLine();

                                    // Health bar
                                    if (friend_entity->humanoid.address != 0 && friend_entity->max_health > 0.f)
                                    {
                                        float health_percent = friend_entity->health / friend_entity->max_health;
                                        health_percent = (std::max)(0.0f, (std::min)(1.0f, health_percent));

                                        ImU32 health_color = IM_COL32(0, 255, 0, 255); // Green
                                        ImVec4 health_color_vec = ImVec4(0.0f, 1.0f, 0.0f, 1.0f);

                                        ImGui::SameLine();
                                        ImGui::PushStyleColor(ImGuiCol_FrameBg, ImVec4(0.2f, 0.2f, 0.2f, 1.0f));
                                        ImGui::PushStyleColor(ImGuiCol_PlotHistogram, health_color_vec);
                                        ImGui::ProgressBar(health_percent, ImVec2(60, 8), "");
                                        ImGui::PopStyleColor(2);
                                    }

                                    ImGui::SameLine();
                                    if (ImGui::SmallButton("Remove"))
                                    {
                                        settings::ui::friend_list.erase(settings::ui::friend_list.begin() + i);
                                        ImGui::PopID();
                                        ImGui::EndGroup();
                                        ImGui::Separator();
                                        break;
                                    }

                                    ImGui::EndGroup();
                                }
                                else
                                {
                                    // Friend not in current game/session
                                    ImGui::Text("User ID: %llu (not in game)", friend_user_id);
                                    ImGui::SameLine();
                                    if (ImGui::SmallButton("Remove"))
                                    {
                                        settings::ui::friend_list.erase(settings::ui::friend_list.begin() + i);
                                        ImGui::PopID();
                                        break;
                                    }
                                }

                                ImGui::PopID();
                                ImGui::Separator();
                            }
                        }
                    }
                    ImGui::EndChild();
                }
                // Config subtab removed from MISC
                else if (m_nCategoryIndex == 3 && m_nSubTabIndex == 0) // Settings -> Menu
                {
                    // Left column - Main options
                    ImGui::SetCursorScreenPos(left_col_min);
                    if (ImGui::BeginChild("settings_menu_left", left_col_max - left_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::PushFont(ImGui::GetFont());
                        ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(0.6f, 0.6f, 0.6f, 1.0f));
                        ImGui::Text("%s MENU SETTINGS", ICON_FA_GEAR);
                        ImGui::PopStyleColor();
                        ImGui::PopFont();
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));

                        ImAdd::CustomToggle("Watermark", &settings::menu::watermark);

                        if (settings::menu::watermark)
                        {
                            ImGui::Text("Watermark Position");
                            ImAdd::Combo("## Watermark Position", &settings::menu::watermark_position, { "Top Left", "Top Right" });
                        }

                        ImAdd::CustomToggle("Streamproof", &settings::menu::streamproof);
                        ImAdd::CustomToggle("VSync", &settings::menu::vsync);
                        ImAdd::CustomToggle("Hide Console", &settings::menu::hide_console);
                        ImAdd::CustomToggle("Performance Mode", &settings::menu::performance_mode);
                        ImAdd::CustomToggle("Hide Notifications", &settings::menu::hide_notifications);

                        ImGui::Dummy(ImVec2(0, 15));
                        ImGui::TextColored(ImVec4(0.6f, 0.6f, 0.6f, 1.0f), "MENU KEYBIND");
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));

                        static ImGuiKey menu_key = ImGuiKey_None;
                        menu_key = keybind::vk_to_imgui_key(settings::menu::menu_keybind);
                        if (ImAdd::KeyBind("## Menu Keybind", &menu_key, ImVec2(0, 0), nullptr))
                        {
                            settings::menu::menu_keybind = keybind::imgui_key_to_vk(menu_key);
                        }

                        ImGui::Dummy(ImVec2(0, 15));
                        ImGui::Separator();
                        ImGui::PushStyleColor(ImGuiCol_Button, ImVec4(220.0f/255.0f, 65.0f/255.0f, 65.0f/255.0f, 1.0f));
                        ImGui::PushStyleColor(ImGuiCol_ButtonHovered, ImVec4(240.0f/255.0f, 85.0f/255.0f, 85.0f/255.0f, 1.0f));
                        ImGui::PushStyleColor(ImGuiCol_ButtonActive, ImVec4(200.0f/255.0f, 55.0f/255.0f, 55.0f/255.0f, 1.0f));
                        if (ImGui::Button("UNLOAD CHEAT", ImVec2(ImGui::GetContentRegionAvail().x, 40)))
                        {
                            // Unload the cheat completely
                            m_bMainWindowOpen = false;
                            Menu::Shutdown();
                            exit(0);
                        }
                        ImGui::PopStyleColor(3);
                    }
                    ImGui::EndChild();

                    // Right column - Menu color
                    ImGui::SetCursorScreenPos(right_col_min);
                    if (ImGui::BeginChild("settings_menu_right", right_col_max - right_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::Text("Menu Color");
                        if (ImGui::ColorEdit4("Accent Color", menu_accent_color, ImGuiColorEditFlags_NoInputs | ImGuiColorEditFlags_PickerHueWheel))
                        {
                            // Color changed - global accent color is synced every frame
                        }
                    }
                    ImGui::EndChild();
                }
                else if (m_nCategoryIndex == 3 && m_nSubTabIndex == 1) // Settings -> Config
                {
                    static int selected_config = 0;
                    static auto configs = config::get_config_list();
                    static char config_name[128] = "config";

                    // Left column - Config management
                    ImGui::SetCursorScreenPos(left_col_min);
                    if (ImGui::BeginChild("config_left", left_col_max - left_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::TextColored(ImVec4(0.6f, 0.6f, 0.6f, 1.0f), "CONFIG MANAGEMENT");
                        ImGui::Separator();
                        ImGui::Dummy(ImVec2(0, 8));

                        ImGui::InputText("Config Name", config_name, 128);

                        if (ImGui::Button("Save Config", ImVec2(ImGui::GetContentRegionAvail().x, 35)))
                        {
                            if (config::save_config(config_name))
                            {
                                ImGui::TextColored(ImVec4(0.0f, 1.0f, 0.0f, 1.0f), "Config saved successfully!");
                                configs = config::get_config_list();
                                selected_config = 0;
                            }
                            else
                            {
                                ImGui::TextColored(ImVec4(1.0f, 0.0f, 0.0f, 1.0f), "Failed to save config!");
                            }
                        }
                        if (ImGui::Button("Load Config", ImVec2(ImGui::GetContentRegionAvail().x, 35)))
                        {
                            if (config::load_config(config_name))
                            {
                                ImGui::TextColored(ImVec4(0.0f, 1.0f, 0.0f, 1.0f), "Config loaded successfully!");
                            }
                            else
                            {
                                ImGui::TextColored(ImVec4(1.0f, 0.0f, 0.0f, 1.0f), "Failed to load config!");
                            }
                        }
                        if (ImGui::Button("Delete Config", ImVec2(ImGui::GetContentRegionAvail().x, 35)))
                        {
                            if (config::delete_config(config_name))
                            {
                                ImGui::TextColored(ImVec4(0.0f, 1.0f, 0.0f, 1.0f), "Config deleted successfully!");
                                configs = config::get_config_list();
                                selected_config = 0;
                            }
                            else
                            {
                                ImGui::TextColored(ImVec4(1.0f, 0.0f, 0.0f, 1.0f), "Failed to delete config!");
                            }
                        }
                    }
                    ImGui::EndChild();

                    // Right column - Config slots
                    ImGui::SetCursorScreenPos(right_col_min);
                    if (ImGui::BeginChild("config_right", right_col_max - right_col_min, false, ImGuiWindowFlags_NoBackground))
                    {
                        ImGui::Text("Config Slots");
                        std::vector<const char*> config_names;
                        for (const auto& cfg : configs)
                        {
                            config_names.push_back(cfg.name.c_str());
                        }
                        if (!config_names.empty())
                        {
                            ImGui::PushStyleColor(ImGuiCol_Header, ImVec4(menu_accent_color[0], menu_accent_color[1], menu_accent_color[2], menu_accent_color[3]));
                            ImGui::PushStyleColor(ImGuiCol_HeaderHovered, ImVec4(menu_accent_color[0] * 1.2f, menu_accent_color[1] * 1.2f, menu_accent_color[2] * 1.2f, menu_accent_color[3]));
                            ImGui::PushStyleColor(ImGuiCol_HeaderActive, ImVec4(menu_accent_color[0] * 0.8f, menu_accent_color[1] * 0.8f, menu_accent_color[2] * 0.8f, menu_accent_color[3]));
                            ImGui::ListBox("## configs", &selected_config, config_names.data(), config_names.size(), 5);
                            ImGui::PopStyleColor(3);
                        }
                        else
                        {
                            ImGui::Text("No configs found");
                        }
                    }
                    ImGui::EndChild();
                }
                else if (m_nCategoryIndex == 3 && m_nSubTabIndex == 2) // Settings -> About
                {
                    ImGui::TextColored(ImVec4(1.0f, 1.0f, 1.0f, 1.0f), "gibi external");
                    ImGui::TextColored(ImVec4(0.47f, 0.47f, 0.47f, 1.0f), "Version: 1.0");
                    ImGui::TextColored(ImVec4(0.47f, 0.47f, 0.47f, 1.0f), "Built with modern UI");
                }
            }
            ImGui::EndChild();
            ImGui::PopStyleVar(3);
        }
        ImGui::End();
    }

    // Render Player List window
    PlayerList::Render();

    // Render ESP Preview window
    ESPPreview::Render();
}

void Menu::HandleKeybinds()
{
    static bool esp_was_pressed = false;
    static bool esp_old_state = false;
    static bool noclip_was_pressed = false;
    static bool noclip_old_state = false;

    while (true)
    {
        // Handle ESP keybind
        if (settings::visuals::esp_keybind != 0)
        {
            bool is_pressed = (GetAsyncKeyState(settings::visuals::esp_keybind) & 0x8000) != 0;

            if (settings::visuals::esp_activation_mode == 0) // Toggle
            {
                if (is_pressed && !esp_was_pressed)
                {
                    settings::visuals::enable_enemies = !settings::visuals::enable_enemies;
                    esp_was_pressed = true;

                    // Add notification
                    if (settings::visuals::enable_enemies)
                        Notifications::Add("ESP enabled", Notifications::NotificationType::SUCCESS);
                    else
                        Notifications::Add("ESP disabled", Notifications::NotificationType::INFO);
                }
                else if (!is_pressed)
                {
                    esp_was_pressed = false;
                }
            }
            else if (settings::visuals::esp_activation_mode == 1) // Hold
            {
                settings::visuals::enable_enemies = is_pressed;

                // Add notification on state change
                if (settings::visuals::enable_enemies != esp_old_state)
                {
                    if (settings::visuals::enable_enemies)
                        Notifications::Add("ESP enabled", Notifications::NotificationType::SUCCESS);
                    else
                        Notifications::Add("ESP disabled", Notifications::NotificationType::INFO);
                    esp_old_state = settings::visuals::enable_enemies;
                }
            }
        }

        // Handle Noclip keybind
        if (settings::movement::noclip::keybind != 0)
        {
            bool is_pressed = (GetAsyncKeyState(settings::movement::noclip::keybind) & 0x8000) != 0;

            if (settings::movement::noclip::activation_mode == 0) // Toggle
            {
                if (is_pressed && !noclip_was_pressed)
                {
                    settings::rage::noclip = !settings::rage::noclip;
                    noclip_was_pressed = true;

                    // Add notification
                    if (settings::rage::noclip)
                        Notifications::Add("Noclip enabled", Notifications::NotificationType::SUCCESS);
                    else
                        Notifications::Add("Noclip disabled", Notifications::NotificationType::INFO);
                }
                else if (!is_pressed)
                {
                    noclip_was_pressed = false;
                }
            }
            else if (settings::movement::noclip::activation_mode == 1) // Hold
            {
                settings::rage::noclip = is_pressed;

                // Add notification on state change
                if (settings::rage::noclip != noclip_old_state)
                {
                    if (settings::rage::noclip)
                        Notifications::Add("Noclip enabled", Notifications::NotificationType::SUCCESS);
                    else
                        Notifications::Add("Noclip disabled", Notifications::NotificationType::INFO);
                    noclip_old_state = settings::rage::noclip;
                }
            }
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
}

void Menu::Shutdown()
{
    if (!m_bInitialized) return;

    ImGui_ImplDX11_Shutdown();
    ImGui_ImplWin32_Shutdown();
    ImGui::DestroyContext();
}

void Menu::InvalidateDeviceObjects()
{
    if (!m_bInitialized) return;

    ImGui_ImplDX11_InvalidateDeviceObjects();
}

void Menu::CreateDeviceObjects()
{
    if (!m_bInitialized) return;

    ImGui_ImplDX11_CreateDeviceObjects();
}

extern IMGUI_IMPL_API LRESULT ImGui_ImplWin32_WndProcHandler(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam);
bool Menu::HandleMessage(HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
    if (!m_bInitialized) return false;

    return ImGui_ImplWin32_WndProcHandler(hWnd, uMsg, wParam, lParam);
}
