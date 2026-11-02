#include "config.h"
#include "../../settings.h"
#include "../../menu/keybind/keybind.h"
#include <windows.h>
#include <shlobj.h>
#include <fstream>
#include <filesystem>
#include <imgui/imgui.h>
#include "../../../ext/json/json.hpp"

using json = nlohmann::json;

namespace config
{
	std::string get_config_directory()
	{
		char appdata_path[MAX_PATH];
		if (SHGetFolderPathA(NULL, CSIDL_APPDATA, NULL, SHGFP_TYPE_CURRENT, appdata_path) == S_OK)
		{
			std::string path = std::string(appdata_path) + "\\GIBI\\Configs";
			return path;
		}
		return "";
	}

	std::string get_config_path(const std::string& name)
	{
		std::string dir = get_config_directory();
		if (dir.empty())
			return "";
		
		std::string filename = name;
		if (filename.find(".json") == std::string::npos)
			filename += ".json";
		
		return dir + "\\" + filename;
	}

	bool ensure_config_directory()
	{
		std::string dir = get_config_directory();
		if (dir.empty())
		{
			OutputDebugStringA("[CONFIG] Failed to get config directory\n");
			return false;
		}
		
		try
		{
			std::filesystem::create_directories(dir);
			OutputDebugStringA(("[CONFIG] Config directory ensured: " + dir + "\n").c_str());
			return true;
		}
		catch (const std::exception& e)
		{
			OutputDebugStringA(("[CONFIG] Exception while creating directory: " + std::string(e.what()) + "\n").c_str());
			return false;
		}
		catch (...)
		{
			OutputDebugStringA("[CONFIG] Unknown exception while creating directory\n");
			return false;
		}
	}

	std::vector<config_info_t> get_config_list()
	{
		std::vector<config_info_t> configs;
		std::string dir = get_config_directory();
		
		if (dir.empty() || !std::filesystem::exists(dir))
			return configs;
		
		try
		{
			for (const auto& entry : std::filesystem::directory_iterator(dir))
			{
				if (entry.is_regular_file() && entry.path().extension() == ".json")
				{
					config_info_t info;
					info.name = entry.path().stem().string();
					info.path = entry.path().string();
					configs.push_back(info);
				}
			}
		}
		catch (...)
		{
		}
		
		return configs;
	}

	static int key_name_to_code(const std::string& key_name)
	{
		for (int i = 0; i < keybind::key_count; i++)
		{
			if (keybind::key_names[i].name && std::string(keybind::key_names[i].name) == key_name)
			{
				return keybind::key_names[i].value;
			}
		}
		return 0;
	}

	bool save_config(const std::string& name)
	{
		if (!ensure_config_directory())
		{
			OutputDebugStringA("[CONFIG] Failed to ensure config directory\n");
			return false;
		}
		
		std::string path = get_config_path(name);
		if (path.empty())
		{
			OutputDebugStringA("[CONFIG] Failed to get config path\n");
			return false;
		}
		
		json config;
		OutputDebugStringA(("[CONFIG] Saving config to: " + path + "\n").c_str());
		
		// Menu settings
		config["menu"]["menu_keybind"] = keybind::get_key_name(settings::menu::menu_keybind);
		config["menu"]["watermark"] = settings::menu::watermark;
		config["menu"]["watermark_position"] = settings::menu::watermark_position;
		config["menu"]["streamproof"] = settings::menu::streamproof;
		config["menu"]["vsync"] = settings::menu::vsync;
		config["menu"]["hide_console"] = settings::menu::hide_console;
		config["menu"]["performance_mode"] = settings::menu::performance_mode;
		
		// Aimbot settings
		config["aimbot"]["enabled"] = settings::aimbot::enabled;
		config["aimbot"]["keybind"] = settings::aimbot::keybind;
		config["aimbot"]["activation_mode"] = settings::aimbot::activation_mode;
		config["aimbot"]["mode"] = settings::aimbot::mode;
		config["aimbot"]["target_part"] = settings::aimbot::target_part;
		config["aimbot"]["air_part_enabled"] = settings::aimbot::air_part_enabled;
		config["aimbot"]["air_part"] = settings::aimbot::air_part;
		config["aimbot"]["fov"] = settings::aimbot::fov;
		config["aimbot"]["use_fov"] = settings::aimbot::use_fov;
		config["aimbot"]["draw_fov"] = settings::aimbot::draw_fov;
		config["aimbot"]["fov_circle_colour"] = settings::aimbot::fov_circle_colour;
		config["aimbot"]["fov_outline_colour"] = settings::aimbot::fov_outline_colour;
		config["aimbot"]["smoothing"] = settings::aimbot::smoothing;
		config["aimbot"]["smoothingx"] = settings::aimbot::smoothingx;
		config["aimbot"]["smoothingy"] = settings::aimbot::smoothingy;
		config["aimbot"]["smoothing_style"] = settings::aimbot::smoothing_style;
		config["aimbot"]["enable_prediction"] = settings::aimbot::enable_prediction;
		config["aimbot"]["prediction_x"] = settings::aimbot::prediction_x;
		config["aimbot"]["prediction_y"] = settings::aimbot::prediction_y;
		config["aimbot"]["air_prediction_enabled"] = settings::aimbot::air_prediction_enabled;
		config["aimbot"]["air_prediction_x"] = settings::aimbot::air_prediction_x;
		config["aimbot"]["air_prediction_y"] = settings::aimbot::air_prediction_y;
		config["aimbot"]["teamcheck"] = settings::aimbot::teamcheck;
		config["aimbot"]["knock_check"] = settings::aimbot::knock_check;
		config["aimbot"]["visible_check"] = settings::aimbot::visible_check;
		config["aimbot"]["sticky_aim"] = settings::aimbot::sticky_aim;
		config["aimbot"]["health_check_enabled"] = settings::aimbot::health_check_enabled;
		config["aimbot"]["min_health"] = settings::aimbot::min_health;
		config["aimbot"]["offset_enabled"] = settings::aimbot::offset_enabled;
		config["aimbot"]["offset_x"] = settings::aimbot::offset_x;
		config["aimbot"]["offset_y"] = settings::aimbot::offset_y;
		
		// Visuals settings
		config["visuals"]["enable_enemies"] = settings::visuals::enable_enemies;
		config["visuals"]["enable_client"] = settings::visuals::enable_client;
		config["visuals"]["show_npc"] = settings::visuals::show_npc;
		config["visuals"]["show_dead"] = settings::visuals::show_dead;
		config["visuals"]["show_friend"] = settings::visuals::show_friend;
		config["visuals"]["show_self"] = settings::visuals::show_self;
		config["visuals"]["visible_check"] = settings::visuals::visible_check;
		config["visuals"]["visible_check_color"] = settings::visuals::visible_check_color;
		config["visuals"]["box"] = settings::visuals::box;
		config["visuals"]["box_type"] = settings::visuals::box_type;
		config["visuals"]["box_color"] = settings::visuals::box_color;
		config["visuals"]["box_fill"] = settings::visuals::box_fill;
		config["visuals"]["box_fill_color"] = settings::visuals::box_fill_color;
		config["visuals"]["name"] = settings::visuals::name;
		config["visuals"]["name_type"] = settings::visuals::name_type;
		config["visuals"]["name_display_type"] = settings::visuals::name_display_type;
		config["visuals"]["name_color"] = settings::visuals::name_color;
		config["visuals"]["name_color_blend_start"] = settings::visuals::name_color_blend_start;
		config["visuals"]["name_color_blend_end"] = settings::visuals::name_color_blend_end;
		config["visuals"]["blend"] = settings::visuals::blend;
		config["visuals"]["avatar"] = settings::visuals::avatar;
		config["visuals"]["healthbar"] = settings::visuals::healthbar;
		config["visuals"]["healthbar_color"] = settings::visuals::healthbar_color;
		config["visuals"]["health_based_healthbar"] = settings::visuals::health_based_healthbar;
		config["visuals"]["gradient_healthbar"] = settings::visuals::gradient_healthbar;
		config["visuals"]["gradient_healthbar_color_start"] = settings::visuals::gradient_healthbar_color_start;
		config["visuals"]["gradient_healthbar_color_end"] = settings::visuals::gradient_healthbar_color_end;
		config["visuals"]["health_percent"] = settings::visuals::health_percent;
		config["visuals"]["health_percent_color"] = settings::visuals::health_percent_color;
		config["visuals"]["armorbar"] = settings::visuals::armorbar;
		config["visuals"]["armorbar_color"] = settings::visuals::armorbar_color;
		config["visuals"]["distance"] = settings::visuals::distance;
		config["visuals"]["distance_measurement"] = settings::visuals::distance_measurement;
		config["visuals"]["distance_color"] = settings::visuals::distance_color;
		config["visuals"]["max_distance"] = settings::visuals::max_distance;
		config["visuals"]["distance_check"] = settings::visuals::distance_check;
		config["visuals"]["tool"] = settings::visuals::tool;
		config["visuals"]["tool_color"] = settings::visuals::tool_color;
		config["visuals"]["esp_font"] = settings::visuals::esp_font;
		config["visuals"]["local_player"] = settings::visuals::local_player;
		config["visuals"]["chams"] = settings::visuals::chams;
		config["visuals"]["chams_type"] = settings::visuals::chams_type;
		config["visuals"]["chams_fill_color"] = settings::visuals::chams_fill_color;
		config["visuals"]["chams_outline_color"] = settings::visuals::chams_outline_color;
		config["visuals"]["chams_fill_enabled"] = settings::visuals::chams_fill_enabled;
		config["visuals"]["chams_outline_enabled"] = settings::visuals::chams_outline_enabled;
		config["visuals"]["target_warning_icon"] = settings::visuals::target_warning_icon;
		config["visuals"]["target_warning_icon_size"] = settings::visuals::target_warning_icon_size;
		config["visuals"]["flags"] = settings::visuals::flags;
		config["visuals"]["flags_state_colour"] = settings::visuals::flags_state_colour;
		config["visuals"]["client_box"] = settings::visuals::client_box;
		config["visuals"]["client_box_color"] = settings::visuals::client_box_color;
		config["visuals"]["client_box_fill"] = settings::visuals::client_box_fill;
		config["visuals"]["client_box_fill_color"] = settings::visuals::client_box_fill_color;
		config["visuals"]["client_name"] = settings::visuals::client_name;
		config["visuals"]["client_name_color"] = settings::visuals::client_name_color;
		config["visuals"]["client_avatar"] = settings::visuals::client_avatar;
		config["visuals"]["client_healthbar"] = settings::visuals::client_healthbar;
		config["visuals"]["client_healthbar_color"] = settings::visuals::client_healthbar_color;
		config["visuals"]["client_health_percent"] = settings::visuals::client_health_percent;
		config["visuals"]["client_health_percent_color"] = settings::visuals::client_health_percent_color;
		config["visuals"]["client_armorbar"] = settings::visuals::client_armorbar;
		config["visuals"]["client_armorbar_color"] = settings::visuals::client_armorbar_color;
		config["visuals"]["client_distance"] = settings::visuals::client_distance;
		config["visuals"]["client_distance_color"] = settings::visuals::client_distance_color;
		config["visuals"]["client_tool"] = settings::visuals::client_tool;
		config["visuals"]["client_tool_color"] = settings::visuals::client_tool_color;
		config["visuals"]["client_chams"] = settings::visuals::client_chams;
		config["visuals"]["client_chams_fill_color"] = settings::visuals::client_chams_fill_color;
		config["visuals"]["client_chams_outline_color"] = settings::visuals::client_chams_outline_color;
		config["visuals"]["client_flags"] = settings::visuals::client_flags;
		config["visuals"]["client_flags_state_colour"] = settings::visuals::client_flags_state_colour;
		config["visuals"]["client_material"] = settings::visuals::client_material;
		config["visuals"]["client_material_color"] = settings::visuals::client_material_color;
		config["visuals"]["client_material_type"] = settings::visuals::client_material_type;
		config["visuals"]["client_headless"] = settings::visuals::client_headless;
		config["visuals"]["client_korblox"] = settings::visuals::client_korblox;
		config["visuals"]["esp_preview_auto_rotate"] = settings::visuals::esp_preview_auto_rotate;
		config["visuals"]["esp_preview_enabled"] = settings::visuals::esp_preview_enabled;
		config["visuals"]["debug_wallcheck"] = settings::visuals::debug_wallcheck;
		config["visuals"]["view_hitbox"] = settings::visuals::view_hitbox;
		config["visuals"]["view_hitbox_color"] = settings::visuals::view_hitbox_color;
		config["visuals"]["fade_in_speed"] = settings::visuals::fade_in_speed;
		config["visuals"]["fade_out_speed"] = settings::visuals::fade_out_speed;
		config["visuals"]["knock_check"] = settings::visuals::knock_check;
		config["visuals"]["hit_tracers_enabled"] = settings::visuals::hit_tracers_enabled;
		config["visuals"]["hit_tracers_method"] = settings::visuals::hit_tracers_method;
		config["visuals"]["hit_tracers_type"] = settings::visuals::hit_tracers_type;
		config["visuals"]["hit_tracers_color"] = settings::visuals::hit_tracers_color;
		config["visuals"]["hit_tracers_duration"] = settings::visuals::hit_tracers_duration;
		
		// Movement settings
		config["movement"]["speedhack"]["enabled"] = settings::movement::speedhack::enabled;
		config["movement"]["speedhack"]["mode"] = settings::movement::speedhack::mode;
		config["movement"]["speedhack"]["speed"] = settings::movement::speedhack::speed;
		config["movement"]["speedhack"]["keybind"] = settings::movement::speedhack::keybind;
		config["movement"]["speedhack"]["activation_mode"] = settings::movement::speedhack::activation_mode;
		
		config["movement"]["flyhack"]["enabled"] = settings::movement::flyhack::enabled;
		config["movement"]["flyhack"]["mode"] = settings::movement::flyhack::mode;
		config["movement"]["flyhack"]["speed"] = settings::movement::flyhack::speed;
		config["movement"]["flyhack"]["keybind"] = settings::movement::flyhack::keybind;
		config["movement"]["flyhack"]["activation_mode"] = settings::movement::flyhack::activation_mode;
		
		config["movement"]["tickrate"]["enabled"] = settings::movement::tickrate::enabled;
		config["movement"]["tickrate"]["value"] = settings::movement::tickrate::value;
		
		config["movement"]["orbit"]["enabled"] = settings::movement::orbit::enabled;
		config["movement"]["orbit"]["orbit_type"] = settings::movement::orbit::orbit_type;
		config["movement"]["orbit"]["speed"] = settings::movement::orbit::speed;
		config["movement"]["orbit"]["radius"] = settings::movement::orbit::radius;
		config["movement"]["orbit"]["height_offset"] = settings::movement::orbit::height_offset;
		config["movement"]["orbit"]["spectate_target"] = settings::movement::orbit::spectate_target;
		config["movement"]["orbit"]["randomize"] = settings::movement::orbit::randomize;
		config["movement"]["orbit"]["randomize_x"] = settings::movement::orbit::randomize_x;
		config["movement"]["orbit"]["randomize_y"] = settings::movement::orbit::randomize_y;
		
		// UI settings
		config["ui"]["watermark"] = settings::ui::watermark;
		config["ui"]["keybinds"] = settings::ui::keybinds;
		config["ui"]["player_list"] = settings::ui::player_list;
		
		// Lighting settings
		config["lighting"]["fog"]["enabled"] = settings::lighting::fog::enabled;
		config["lighting"]["fog"]["fog_start"] = settings::lighting::fog::fog_start;
		config["lighting"]["fog"]["fog_end"] = settings::lighting::fog::fog_end;
		config["lighting"]["fog"]["fog_r"] = settings::lighting::fog::fog_r;
		config["lighting"]["fog"]["fog_g"] = settings::lighting::fog::fog_g;
		config["lighting"]["fog"]["fog_b"] = settings::lighting::fog::fog_b;
		
		config["lighting"]["exposure"]["enabled"] = settings::lighting::exposure::enabled;
		config["lighting"]["exposure"]["exposure"] = settings::lighting::exposure::exposure;
		
		config["lighting"]["skybox"]["enabled"] = settings::lighting::skybox::enabled;
		config["lighting"]["skybox"]["apply_skybox"] = settings::lighting::skybox::apply_skybox;
		config["lighting"]["skybox"]["preset_index"] = settings::lighting::skybox::preset_index;
		config["lighting"]["skybox"]["skybox_bk"] = settings::lighting::skybox::skybox_bk;
		config["lighting"]["skybox"]["skybox_dn"] = settings::lighting::skybox::skybox_dn;
		config["lighting"]["skybox"]["skybox_ft"] = settings::lighting::skybox::skybox_ft;
		config["lighting"]["skybox"]["skybox_lf"] = settings::lighting::skybox::skybox_lf;
		config["lighting"]["skybox"]["skybox_rt"] = settings::lighting::skybox::skybox_rt;
		config["lighting"]["skybox"]["skybox_up"] = settings::lighting::skybox::skybox_up;
		
		config["lighting"]["clocktime"]["enabled"] = settings::lighting::clocktime::enabled;
		config["lighting"]["clocktime"]["clock_time"] = settings::lighting::clocktime::clock_time;
		
		// Rage settings
		config["rage"]["hitsounds"] = settings::rage::hitsounds;
		config["rage"]["hitsound_type"] = settings::rage::hitsound_type;
		config["rage"]["hitsound_method"] = settings::rage::hitsound_method;
		config["rage"]["rapidfire"] = settings::rage::rapidfire;
		config["rage"]["noclip"] = settings::rage::noclip;
		config["rage"]["hit_tracers"] = settings::rage::hit_tracers;
		config["rage"]["hit_tracers_color"] = settings::rage::hit_tracers_color;
		config["rage"]["hit_tracers_duration"] = settings::rage::hit_tracers_duration;
		
		// Rage hitbox_expander
		config["rage"]["hitbox_expander"]["enabled"] = settings::rage::hitbox_expander::enabled;
		config["rage"]["hitbox_expander"]["target_part"] = settings::rage::hitbox_expander::target_part;
		config["rage"]["hitbox_expander"]["size_x"] = settings::rage::hitbox_expander::size_x;
		config["rage"]["hitbox_expander"]["size_y"] = settings::rage::hitbox_expander::size_y;
		config["rage"]["hitbox_expander"]["size_z"] = settings::rage::hitbox_expander::size_z;
		config["rage"]["hitbox_expander"]["knock_check"] = settings::rage::hitbox_expander::knock_check;
		
		// Rage spin360
		config["rage"]["spin360"]["enabled"] = settings::rage::spin360::enabled;
		config["rage"]["spin360"]["keybind"] = settings::rage::spin360::keybind;
		config["rage"]["spin360"]["activation_mode"] = settings::rage::spin360::activation_mode;
		config["rage"]["spin360"]["speed"] = settings::rage::spin360::speed;
		
		// Silentaim settings
		config["silentaim"]["enabled"] = settings::silentaim::enabled;
		config["silentaim"]["keybind"] = settings::silentaim::keybind;
		config["silentaim"]["activation_mode"] = settings::silentaim::activation_mode;
		config["silentaim"]["target_part"] = settings::silentaim::target_part;
		config["silentaim"]["fov"] = settings::silentaim::fov;
		config["silentaim"]["use_fov"] = settings::silentaim::use_fov;
		config["silentaim"]["draw_fov"] = settings::silentaim::draw_fov;
		config["silentaim"]["lerp_fov"] = settings::silentaim::lerp_fov;
		config["silentaim"]["attach_fov_to_target"] = settings::silentaim::attach_fov_to_target;
		config["silentaim"]["fov_circle_colour"] = settings::silentaim::fov_circle_colour;
		config["silentaim"]["fov_outline_colour"] = settings::silentaim::fov_outline_colour;
		config["silentaim"]["enable_prediction"] = settings::silentaim::enable_prediction;
		config["silentaim"]["prediction_x"] = settings::silentaim::prediction_x;
		config["silentaim"]["prediction_y"] = settings::silentaim::prediction_y;
		config["silentaim"]["sticky_aim"] = settings::silentaim::sticky_aim;
		config["silentaim"]["auto_switch"] = settings::silentaim::auto_switch;
		config["silentaim"]["spoof_mouse"] = settings::silentaim::spoof_mouse;
		config["silentaim"]["use_aimbot_target"] = settings::silentaim::use_aimbot_target;
		config["silentaim"]["teamcheck"] = settings::silentaim::teamcheck;
		config["silentaim"]["guncheck"] = settings::silentaim::guncheck;
		config["silentaim"]["knock_check"] = settings::silentaim::knock_check;
		config["silentaim"]["priorities"] = settings::silentaim::priorities;
		config["silentaim"]["health_check_enabled"] = settings::silentaim::health_check_enabled;
		config["silentaim"]["min_health"] = settings::silentaim::min_health;
		config["silentaim"]["draw_target_dot"] = settings::silentaim::draw_target_dot;
		config["silentaim"]["target_dot_color"] = settings::silentaim::target_dot_color;
		config["silentaim"]["target_dot_size"] = settings::silentaim::target_dot_size;
		config["silentaim"]["draw_snap_line"] = settings::silentaim::draw_snap_line;
		config["silentaim"]["snap_line_color"] = settings::silentaim::snap_line_color;
		
		// Triggerbot settings
		config["triggerbot"]["enabled"] = settings::triggerbot::enabled;
		config["triggerbot"]["keybind"] = settings::triggerbot::keybind;
		config["triggerbot"]["activation_mode"] = settings::triggerbot::activation_mode;
		config["triggerbot"]["fov"] = settings::triggerbot::fov;
		config["triggerbot"]["use_fov"] = settings::triggerbot::use_fov;
		config["triggerbot"]["draw_fov"] = settings::triggerbot::draw_fov;
		config["triggerbot"]["fov_circle_colour"] = settings::triggerbot::fov_circle_colour;
		config["triggerbot"]["fov_outline_colour"] = settings::triggerbot::fov_outline_colour;
		config["triggerbot"]["target_part"] = settings::triggerbot::target_part;
		config["triggerbot"]["teamcheck"] = settings::triggerbot::teamcheck;
		config["triggerbot"]["knock_check"] = settings::triggerbot::knock_check;
		config["triggerbot"]["health_check_enabled"] = settings::triggerbot::health_check_enabled;
		config["triggerbot"]["min_health"] = settings::triggerbot::min_health;
		config["triggerbot"]["delay"] = settings::triggerbot::delay;
		config["triggerbot"]["reaction_time"] = settings::triggerbot::reaction_time;
		
		std::ofstream file(path);
		if (!file.is_open())
		{
			OutputDebugStringA(("[CONFIG] Failed to open file for writing: " + path + "\n").c_str());
			return false;
		}
		
		file << config.dump(4);
		file.close();
		OutputDebugStringA(("[CONFIG] Successfully saved config: " + name + "\n").c_str());
		return true;
	}

	bool load_config(const std::string& name)
	{
		std::string path = get_config_path(name);
		if (path.empty())
		{
			OutputDebugStringA("[CONFIG] Failed to get config path for loading\n");
			return false;
		}
		
		if (!std::filesystem::exists(path))
		{
			OutputDebugStringA(("[CONFIG] Config file does not exist: " + path + "\n").c_str());
			return false;
		}
		
		OutputDebugStringA(("[CONFIG] Loading config from: " + path + "\n").c_str());
		
		std::ifstream file(path);
		if (!file.is_open())
		{
			OutputDebugStringA(("[CONFIG] Failed to open file for reading: " + path + "\n").c_str());
			return false;
		}
		
		try
		{
			json config;
			file >> config;
			file.close();
			OutputDebugStringA(("[CONFIG] JSON parsed successfully, size: " + std::to_string(config.size()) + " keys\n").c_str());

			// Menu settings
			if (config.contains("menu"))
			{
				auto& menu = config["menu"];
				OutputDebugStringA("[CONFIG] Loading menu settings\n");
				if (menu.contains("menu_keybind"))
				{
					std::string keybind_str = menu["menu_keybind"];
					settings::menu::menu_keybind = key_name_to_code(keybind_str);
					OutputDebugStringA(("[CONFIG] Loaded menu_keybind: " + keybind_str + "\n").c_str());
				}
				if (menu.contains("watermark")) settings::menu::watermark = menu["watermark"];
				if (menu.contains("watermark_position")) settings::menu::watermark_position = menu["watermark_position"];
				if (menu.contains("streamproof")) settings::menu::streamproof = menu["streamproof"];
				if (menu.contains("vsync")) settings::menu::vsync = menu["vsync"];
				if (menu.contains("hide_console")) settings::menu::hide_console = menu["hide_console"];
				if (menu.contains("performance_mode")) settings::menu::performance_mode = menu["performance_mode"];
			}
			
			// Aimbot settings
			if (config.contains("aimbot"))
			{
				auto& aimbot = config["aimbot"];
				OutputDebugStringA("[CONFIG] Loading aimbot settings\n");
				if (aimbot.contains("enabled")) settings::aimbot::enabled = aimbot["enabled"];
				if (aimbot.contains("keybind")) settings::aimbot::keybind = aimbot["keybind"];
				if (aimbot.contains("activation_mode")) settings::aimbot::activation_mode = aimbot["activation_mode"];
				if (aimbot.contains("mode")) settings::aimbot::mode = aimbot["mode"];
				if (aimbot.contains("target_part")) settings::aimbot::target_part = aimbot["target_part"];
				if (aimbot.contains("fov")) settings::aimbot::fov = aimbot["fov"];
				if (aimbot.contains("use_fov")) settings::aimbot::use_fov = aimbot["use_fov"];
				if (aimbot.contains("draw_fov")) settings::aimbot::draw_fov = aimbot["draw_fov"];
				if (aimbot.contains("fov_circle_colour"))
				{
					auto col = aimbot["fov_circle_colour"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::aimbot::fov_circle_colour[i] = col[i];
					}
				}
				if (aimbot.contains("fov_outline_colour"))
				{
					auto col = aimbot["fov_outline_colour"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::aimbot::fov_outline_colour[i] = col[i];
					}
				}
				if (aimbot.contains("smoothing")) settings::aimbot::smoothing = aimbot["smoothing"];
				if (aimbot.contains("smoothingx")) settings::aimbot::smoothingx = aimbot["smoothingx"];
				if (aimbot.contains("smoothingy")) settings::aimbot::smoothingy = aimbot["smoothingy"];
				if (aimbot.contains("smoothing_style")) settings::aimbot::smoothing_style = aimbot["smoothing_style"];
				if (aimbot.contains("enable_prediction")) settings::aimbot::enable_prediction = aimbot["enable_prediction"];
				if (aimbot.contains("prediction_x")) settings::aimbot::prediction_x = aimbot["prediction_x"];
				if (aimbot.contains("prediction_y")) settings::aimbot::prediction_y = aimbot["prediction_y"];
				if (aimbot.contains("air_part_enabled")) settings::aimbot::air_part_enabled = aimbot["air_part_enabled"];
				if (aimbot.contains("air_part")) settings::aimbot::air_part = aimbot["air_part"];
				if (aimbot.contains("air_prediction_enabled")) settings::aimbot::air_prediction_enabled = aimbot["air_prediction_enabled"];
				if (aimbot.contains("air_prediction_x")) settings::aimbot::air_prediction_x = aimbot["air_prediction_x"];
				if (aimbot.contains("air_prediction_y")) settings::aimbot::air_prediction_y = aimbot["air_prediction_y"];
				if (aimbot.contains("teamcheck")) settings::aimbot::teamcheck = aimbot["teamcheck"];
				if (aimbot.contains("knock_check")) settings::aimbot::knock_check = aimbot["knock_check"];
				if (aimbot.contains("visible_check")) settings::aimbot::visible_check = aimbot["visible_check"];
				if (aimbot.contains("sticky_aim")) settings::aimbot::sticky_aim = aimbot["sticky_aim"];
				if (aimbot.contains("health_check_enabled")) settings::aimbot::health_check_enabled = aimbot["health_check_enabled"];
				if (aimbot.contains("min_health")) settings::aimbot::min_health = aimbot["min_health"];
				if (aimbot.contains("offset_enabled")) settings::aimbot::offset_enabled = aimbot["offset_enabled"];
				if (aimbot.contains("offset_x")) settings::aimbot::offset_x = aimbot["offset_x"];
				if (aimbot.contains("offset_y")) settings::aimbot::offset_y = aimbot["offset_y"];
				OutputDebugStringA("[CONFIG] Aimbot settings loaded\n");
			}
			
			// Visuals settings
			if (config.contains("visuals"))
			{
				auto& visuals = config["visuals"];
				if (visuals.contains("enable_enemies")) settings::visuals::enable_enemies = visuals["enable_enemies"];
				if (visuals.contains("enable_client")) settings::visuals::enable_client = visuals["enable_client"];
				if (visuals.contains("show_npc")) settings::visuals::show_npc = visuals["show_npc"];
				if (visuals.contains("show_dead")) settings::visuals::show_dead = visuals["show_dead"];
				if (visuals.contains("show_friend")) settings::visuals::show_friend = visuals["show_friend"];
				if (visuals.contains("show_self")) settings::visuals::show_self = visuals["show_self"];
				if (visuals.contains("visible_check")) settings::visuals::visible_check = visuals["visible_check"];
				if (visuals.contains("visible_check_color"))
				{
					auto col = visuals["visible_check_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::visible_check_color[i] = col[i];
					}
				}
				if (visuals.contains("box")) settings::visuals::box = visuals["box"];
				if (visuals.contains("box_type")) settings::visuals::box_type = visuals["box_type"];
				if (visuals.contains("box_color"))
				{
					auto col = visuals["box_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::box_color[i] = col[i];
					}
				}
				if (visuals.contains("box_fill")) settings::visuals::box_fill = visuals["box_fill"];
				if (visuals.contains("box_fill_color"))
				{
					auto col = visuals["box_fill_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::box_fill_color[i] = col[i];
					}
				}
				if (visuals.contains("name")) settings::visuals::name = visuals["name"];
				if (visuals.contains("name_type")) settings::visuals::name_type = visuals["name_type"];
				if (visuals.contains("name_display_type")) settings::visuals::name_display_type = visuals["name_display_type"];
				if (visuals.contains("name_color"))
				{
					auto col = visuals["name_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::name_color[i] = col[i];
					}
				}
				if (visuals.contains("name_color_blend_start"))
				{
					auto col = visuals["name_color_blend_start"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::name_color_blend_start[i] = col[i];
					}
				}
				if (visuals.contains("name_color_blend_end"))
				{
					auto col = visuals["name_color_blend_end"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::name_color_blend_end[i] = col[i];
					}
				}
				if (visuals.contains("blend")) settings::visuals::blend = visuals["blend"];
				if (visuals.contains("avatar")) settings::visuals::avatar = visuals["avatar"];
				if (visuals.contains("healthbar")) settings::visuals::healthbar = visuals["healthbar"];
				if (visuals.contains("healthbar_color"))
				{
					auto col = visuals["healthbar_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::healthbar_color[i] = col[i];
					}
				}
				if (visuals.contains("health_based_healthbar")) settings::visuals::health_based_healthbar = visuals["health_based_healthbar"];
				if (visuals.contains("gradient_healthbar")) settings::visuals::gradient_healthbar = visuals["gradient_healthbar"];
				if (visuals.contains("gradient_healthbar_color_start"))
				{
					auto col = visuals["gradient_healthbar_color_start"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::gradient_healthbar_color_start[i] = col[i];
					}
				}
				if (visuals.contains("gradient_healthbar_color_end"))
				{
					auto col = visuals["gradient_healthbar_color_end"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::gradient_healthbar_color_end[i] = col[i];
					}
				}
				if (visuals.contains("health_percent")) settings::visuals::health_percent = visuals["health_percent"];
				if (visuals.contains("health_percent_color"))
				{
					auto col = visuals["health_percent_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::health_percent_color[i] = col[i];
					}
				}
				if (visuals.contains("armorbar")) settings::visuals::armorbar = visuals["armorbar"];
				if (visuals.contains("armorbar_color"))
				{
					auto col = visuals["armorbar_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::armorbar_color[i] = col[i];
					}
				}
				if (visuals.contains("distance")) settings::visuals::distance = visuals["distance"];
				if (visuals.contains("distance_measurement")) settings::visuals::distance_measurement = visuals["distance_measurement"];
				if (visuals.contains("distance_color"))
				{
					auto col = visuals["distance_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::distance_color[i] = col[i];
					}
				}
				if (visuals.contains("max_distance")) settings::visuals::max_distance = visuals["max_distance"];
				if (visuals.contains("distance_check")) settings::visuals::distance_check = visuals["distance_check"];
				if (visuals.contains("tool")) settings::visuals::tool = visuals["tool"];
				if (visuals.contains("tool_color"))
				{
					auto col = visuals["tool_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::tool_color[i] = col[i];
					}
				}
				if (visuals.contains("esp_font")) settings::visuals::esp_font = visuals["esp_font"];
				if (visuals.contains("local_player")) settings::visuals::local_player = visuals["local_player"];
				if (visuals.contains("chams")) settings::visuals::chams = visuals["chams"];
				if (visuals.contains("chams_type")) settings::visuals::chams_type = visuals["chams_type"];
				if (visuals.contains("chams_fill_color"))
				{
					auto col = visuals["chams_fill_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::chams_fill_color[i] = col[i];
					}
				}
				if (visuals.contains("chams_outline_color"))
				{
					auto col = visuals["chams_outline_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::chams_outline_color[i] = col[i];
					}
				}
				if (visuals.contains("chams_fill_enabled")) settings::visuals::chams_fill_enabled = visuals["chams_fill_enabled"];
				if (visuals.contains("chams_outline_enabled")) settings::visuals::chams_outline_enabled = visuals["chams_outline_enabled"];
				if (visuals.contains("target_warning_icon")) settings::visuals::target_warning_icon = visuals["target_warning_icon"];
				if (visuals.contains("target_warning_icon_size")) settings::visuals::target_warning_icon_size = visuals["target_warning_icon_size"];
				if (visuals.contains("flags")) settings::visuals::flags = visuals["flags"];
				if (visuals.contains("flags_state_colour"))
				{
					auto col = visuals["flags_state_colour"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::flags_state_colour[i] = col[i];
					}
				}
				if (visuals.contains("client_box")) settings::visuals::client_box = visuals["client_box"];
				if (visuals.contains("client_box_color"))
				{
					auto col = visuals["client_box_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::client_box_color[i] = col[i];
					}
				}
				if (visuals.contains("client_box_fill")) settings::visuals::client_box_fill = visuals["client_box_fill"];
				if (visuals.contains("client_box_fill_color"))
				{
					auto col = visuals["client_box_fill_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::client_box_fill_color[i] = col[i];
					}
				}
				if (visuals.contains("client_name")) settings::visuals::client_name = visuals["client_name"];
				if (visuals.contains("client_name_color"))
				{
					auto col = visuals["client_name_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::client_name_color[i] = col[i];
					}
				}
				if (visuals.contains("client_avatar")) settings::visuals::client_avatar = visuals["client_avatar"];
				if (visuals.contains("client_healthbar")) settings::visuals::client_healthbar = visuals["client_healthbar"];
				if (visuals.contains("client_healthbar_color"))
				{
					auto col = visuals["client_healthbar_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::client_healthbar_color[i] = col[i];
					}
				}
				if (visuals.contains("client_health_percent")) settings::visuals::client_health_percent = visuals["client_health_percent"];
				if (visuals.contains("client_health_percent_color"))
				{
					auto col = visuals["client_health_percent_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::client_health_percent_color[i] = col[i];
					}
				}
				if (visuals.contains("client_armorbar")) settings::visuals::client_armorbar = visuals["client_armorbar"];
				if (visuals.contains("client_armorbar_color"))
				{
					auto col = visuals["client_armorbar_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::client_armorbar_color[i] = col[i];
					}
				}
				if (visuals.contains("client_distance")) settings::visuals::client_distance = visuals["client_distance"];
				if (visuals.contains("client_distance_color"))
				{
					auto col = visuals["client_distance_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::client_distance_color[i] = col[i];
					}
				}
				if (visuals.contains("client_tool")) settings::visuals::client_tool = visuals["client_tool"];
				if (visuals.contains("client_tool_color"))
				{
					auto col = visuals["client_tool_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::client_tool_color[i] = col[i];
					}
				}
				if (visuals.contains("client_chams")) settings::visuals::client_chams = visuals["client_chams"];
				if (visuals.contains("client_chams_fill_color"))
				{
					auto col = visuals["client_chams_fill_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::client_chams_fill_color[i] = col[i];
					}
				}
				if (visuals.contains("client_chams_outline_color"))
				{
					auto col = visuals["client_chams_outline_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::client_chams_outline_color[i] = col[i];
					}
				}
				if (visuals.contains("client_flags")) settings::visuals::client_flags = visuals["client_flags"];
				if (visuals.contains("client_flags_state_colour"))
				{
					auto col = visuals["client_flags_state_colour"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::client_flags_state_colour[i] = col[i];
					}
				}
				if (visuals.contains("client_material")) settings::visuals::client_material = visuals["client_material"];
				if (visuals.contains("client_material_color"))
				{
					auto col = visuals["client_material_color"];
					if (col.is_array() && col.size() == 3)
					{
						for (int i = 0; i < 3; i++) settings::visuals::client_material_color[i] = col[i];
					}
				}
				if (visuals.contains("client_material_type")) settings::visuals::client_material_type = visuals["client_material_type"];
				if (visuals.contains("client_headless")) settings::visuals::client_headless = visuals["client_headless"];
				if (visuals.contains("client_korblox")) settings::visuals::client_korblox = visuals["client_korblox"];
				if (visuals.contains("esp_preview_auto_rotate")) settings::visuals::esp_preview_auto_rotate = visuals["esp_preview_auto_rotate"];
				if (visuals.contains("esp_preview_enabled")) settings::visuals::esp_preview_enabled = visuals["esp_preview_enabled"];
				if (visuals.contains("debug_wallcheck")) settings::visuals::debug_wallcheck = visuals["debug_wallcheck"];
				if (visuals.contains("view_hitbox")) settings::visuals::view_hitbox = visuals["view_hitbox"];
				if (visuals.contains("view_hitbox_color"))
				{
					auto col = visuals["view_hitbox_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::view_hitbox_color[i] = col[i];
					}
				}
				if (visuals.contains("fade_in_speed")) settings::visuals::fade_in_speed = visuals["fade_in_speed"];
				if (visuals.contains("fade_out_speed")) settings::visuals::fade_out_speed = visuals["fade_out_speed"];
				if (visuals.contains("knock_check")) settings::visuals::knock_check = visuals["knock_check"];
				if (visuals.contains("hit_tracers_enabled")) settings::visuals::hit_tracers_enabled = visuals["hit_tracers_enabled"];
				if (visuals.contains("hit_tracers_method")) settings::visuals::hit_tracers_method = visuals["hit_tracers_method"];
				if (visuals.contains("hit_tracers_type")) settings::visuals::hit_tracers_type = visuals["hit_tracers_type"];
				if (visuals.contains("hit_tracers_color"))
				{
					auto col = visuals["hit_tracers_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::visuals::hit_tracers_color[i] = col[i];
					}
				}
				if (visuals.contains("hit_tracers_duration")) settings::visuals::hit_tracers_duration = visuals["hit_tracers_duration"];
			}
			
			// Movement settings
			if (config.contains("movement"))
			{
				auto& movement = config["movement"];
				if (movement.contains("speedhack"))
				{
					auto& speedhack = movement["speedhack"];
					if (speedhack.contains("enabled")) settings::movement::speedhack::enabled = speedhack["enabled"];
					if (speedhack.contains("mode")) settings::movement::speedhack::mode = speedhack["mode"];
					if (speedhack.contains("speed")) settings::movement::speedhack::speed = speedhack["speed"];
					if (speedhack.contains("keybind")) settings::movement::speedhack::keybind = speedhack["keybind"];
					if (speedhack.contains("activation_mode")) settings::movement::speedhack::activation_mode = speedhack["activation_mode"];
				}
				if (movement.contains("flyhack"))
				{
					auto& flyhack = movement["flyhack"];
					if (flyhack.contains("enabled")) settings::movement::flyhack::enabled = flyhack["enabled"];
					if (flyhack.contains("mode")) settings::movement::flyhack::mode = flyhack["mode"];
					if (flyhack.contains("speed")) settings::movement::flyhack::speed = flyhack["speed"];
					if (flyhack.contains("keybind")) settings::movement::flyhack::keybind = flyhack["keybind"];
					if (flyhack.contains("activation_mode")) settings::movement::flyhack::activation_mode = flyhack["activation_mode"];
				}
				if (movement.contains("tickrate"))
				{
					auto& tickrate = movement["tickrate"];
					if (tickrate.contains("enabled")) settings::movement::tickrate::enabled = tickrate["enabled"];
					if (tickrate.contains("value")) settings::movement::tickrate::value = tickrate["value"];
				}
				if (movement.contains("orbit"))
				{
					auto& orbit = movement["orbit"];
					if (orbit.contains("enabled")) settings::movement::orbit::enabled = orbit["enabled"];
					if (orbit.contains("orbit_type")) settings::movement::orbit::orbit_type = orbit["orbit_type"];
					if (orbit.contains("speed")) settings::movement::orbit::speed = orbit["speed"];
					if (orbit.contains("radius")) settings::movement::orbit::radius = orbit["radius"];
					if (orbit.contains("height_offset")) settings::movement::orbit::height_offset = orbit["height_offset"];
					if (orbit.contains("spectate_target")) settings::movement::orbit::spectate_target = orbit["spectate_target"];
					if (orbit.contains("randomize")) settings::movement::orbit::randomize = orbit["randomize"];
					if (orbit.contains("randomize_x")) settings::movement::orbit::randomize_x = orbit["randomize_x"];
					if (orbit.contains("randomize_y")) settings::movement::orbit::randomize_y = orbit["randomize_y"];
				}
			}
			
			// UI settings
			if (config.contains("ui"))
			{
				auto& ui = config["ui"];
				if (ui.contains("watermark")) settings::ui::watermark = ui["watermark"];
				if (ui.contains("keybinds")) settings::ui::keybinds = ui["keybinds"];
				if (ui.contains("player_list")) settings::ui::player_list = ui["player_list"];
			}
			
			// Lighting settings
			if (config.contains("lighting"))
			{
				auto& lighting = config["lighting"];
				if (lighting.contains("fog"))
				{
					auto& fog = lighting["fog"];
					if (fog.contains("enabled")) settings::lighting::fog::enabled = fog["enabled"];
					if (fog.contains("fog_start")) settings::lighting::fog::fog_start = fog["fog_start"];
					if (fog.contains("fog_end")) settings::lighting::fog::fog_end = fog["fog_end"];
					if (fog.contains("fog_r")) settings::lighting::fog::fog_r = fog["fog_r"];
					if (fog.contains("fog_g")) settings::lighting::fog::fog_g = fog["fog_g"];
					if (fog.contains("fog_b")) settings::lighting::fog::fog_b = fog["fog_b"];
				}
				if (lighting.contains("exposure"))
				{
					auto& exposure = lighting["exposure"];
					if (exposure.contains("enabled")) settings::lighting::exposure::enabled = exposure["enabled"];
					if (exposure.contains("exposure")) settings::lighting::exposure::exposure = exposure["exposure"];
				}
				if (lighting.contains("skybox"))
				{
					auto& skybox = lighting["skybox"];
					if (skybox.contains("enabled")) settings::lighting::skybox::enabled = skybox["enabled"];
					if (skybox.contains("apply_skybox")) settings::lighting::skybox::apply_skybox = skybox["apply_skybox"];
					if (skybox.contains("preset_index")) settings::lighting::skybox::preset_index = skybox["preset_index"];
					if (skybox.contains("skybox_bk")) settings::lighting::skybox::skybox_bk = skybox["skybox_bk"];
					if (skybox.contains("skybox_dn")) settings::lighting::skybox::skybox_dn = skybox["skybox_dn"];
					if (skybox.contains("skybox_ft")) settings::lighting::skybox::skybox_ft = skybox["skybox_ft"];
					if (skybox.contains("skybox_lf")) settings::lighting::skybox::skybox_lf = skybox["skybox_lf"];
					if (skybox.contains("skybox_rt")) settings::lighting::skybox::skybox_rt = skybox["skybox_rt"];
					if (skybox.contains("skybox_up")) settings::lighting::skybox::skybox_up = skybox["skybox_up"];
				}
				if (lighting.contains("clocktime"))
				{
					auto& clocktime = lighting["clocktime"];
					if (clocktime.contains("enabled")) settings::lighting::clocktime::enabled = clocktime["enabled"];
					if (clocktime.contains("clock_time")) settings::lighting::clocktime::clock_time = clocktime["clock_time"];
				}
			}
			
			// Rage settings
			if (config.contains("rage"))
			{
				auto& rage = config["rage"];
				if (rage.contains("hitsounds")) settings::rage::hitsounds = rage["hitsounds"];
				if (rage.contains("hitsound_type")) settings::rage::hitsound_type = rage["hitsound_type"];
				if (rage.contains("hitsound_method")) settings::rage::hitsound_method = rage["hitsound_method"];
				if (rage.contains("rapidfire")) settings::rage::rapidfire = rage["rapidfire"];
				if (rage.contains("noclip")) settings::rage::noclip = rage["noclip"];
				if (rage.contains("hit_tracers")) settings::rage::hit_tracers = rage["hit_tracers"];
				if (rage.contains("hit_tracers_color"))
				{
					auto col = rage["hit_tracers_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::rage::hit_tracers_color[i] = col[i];
					}
				}
				if (rage.contains("hit_tracers_duration")) settings::rage::hit_tracers_duration = rage["hit_tracers_duration"];
				
				// Rage hitbox_expander
				if (rage.contains("hitbox_expander"))
				{
					auto& hitbox_expander = rage["hitbox_expander"];
					if (hitbox_expander.contains("enabled")) settings::rage::hitbox_expander::enabled = hitbox_expander["enabled"];
					if (hitbox_expander.contains("target_part")) settings::rage::hitbox_expander::target_part = hitbox_expander["target_part"];
					if (hitbox_expander.contains("size_x")) settings::rage::hitbox_expander::size_x = hitbox_expander["size_x"];
					if (hitbox_expander.contains("size_y")) settings::rage::hitbox_expander::size_y = hitbox_expander["size_y"];
					if (hitbox_expander.contains("size_z")) settings::rage::hitbox_expander::size_z = hitbox_expander["size_z"];
					if (hitbox_expander.contains("knock_check")) settings::rage::hitbox_expander::knock_check = hitbox_expander["knock_check"];
				}
				
				// Rage spin360
				if (rage.contains("spin360"))
				{
					auto& spin360 = rage["spin360"];
					if (spin360.contains("enabled")) settings::rage::spin360::enabled = spin360["enabled"];
					if (spin360.contains("keybind")) settings::rage::spin360::keybind = spin360["keybind"];
					if (spin360.contains("activation_mode")) settings::rage::spin360::activation_mode = spin360["activation_mode"];
					if (spin360.contains("speed")) settings::rage::spin360::speed = spin360["speed"];
				}
			}
			
			// Silentaim settings
			if (config.contains("silentaim"))
			{
				auto& silentaim = config["silentaim"];
				if (silentaim.contains("enabled")) settings::silentaim::enabled = silentaim["enabled"];
				if (silentaim.contains("keybind")) settings::silentaim::keybind = silentaim["keybind"];
				if (silentaim.contains("activation_mode")) settings::silentaim::activation_mode = silentaim["activation_mode"];
				if (silentaim.contains("target_part")) settings::silentaim::target_part = silentaim["target_part"];
				if (silentaim.contains("fov")) settings::silentaim::fov = silentaim["fov"];
				if (silentaim.contains("use_fov")) settings::silentaim::use_fov = silentaim["use_fov"];
				if (silentaim.contains("draw_fov")) settings::silentaim::draw_fov = silentaim["draw_fov"];
				if (silentaim.contains("lerp_fov")) settings::silentaim::lerp_fov = silentaim["lerp_fov"];
				if (silentaim.contains("attach_fov_to_target")) settings::silentaim::attach_fov_to_target = silentaim["attach_fov_to_target"];
				if (silentaim.contains("fov_circle_colour"))
				{
					auto col = silentaim["fov_circle_colour"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::silentaim::fov_circle_colour[i] = col[i];
					}
				}
				if (silentaim.contains("fov_outline_colour"))
				{
					auto col = silentaim["fov_outline_colour"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::silentaim::fov_outline_colour[i] = col[i];
					}
				}
				if (silentaim.contains("enable_prediction")) settings::silentaim::enable_prediction = silentaim["enable_prediction"];
				if (silentaim.contains("prediction_x")) settings::silentaim::prediction_x = silentaim["prediction_x"];
				if (silentaim.contains("prediction_y")) settings::silentaim::prediction_y = silentaim["prediction_y"];
				if (silentaim.contains("sticky_aim")) settings::silentaim::sticky_aim = silentaim["sticky_aim"];
				if (silentaim.contains("auto_switch")) settings::silentaim::auto_switch = silentaim["auto_switch"];
				if (silentaim.contains("spoof_mouse")) settings::silentaim::spoof_mouse = silentaim["spoof_mouse"];
				if (silentaim.contains("use_aimbot_target")) settings::silentaim::use_aimbot_target = silentaim["use_aimbot_target"];
				if (silentaim.contains("teamcheck")) settings::silentaim::teamcheck = silentaim["teamcheck"];
				if (silentaim.contains("guncheck")) settings::silentaim::guncheck = silentaim["guncheck"];
				if (silentaim.contains("knock_check")) settings::silentaim::knock_check = silentaim["knock_check"];
				if (silentaim.contains("priorities")) settings::silentaim::priorities = silentaim["priorities"];
				if (silentaim.contains("health_check_enabled")) settings::silentaim::health_check_enabled = silentaim["health_check_enabled"];
				if (silentaim.contains("min_health")) settings::silentaim::min_health = silentaim["min_health"];
				if (silentaim.contains("draw_target_dot")) settings::silentaim::draw_target_dot = silentaim["draw_target_dot"];
				if (silentaim.contains("target_dot_color"))
				{
					auto col = silentaim["target_dot_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::silentaim::target_dot_color[i] = col[i];
					}
				}
				if (silentaim.contains("target_dot_size")) settings::silentaim::target_dot_size = silentaim["target_dot_size"];
				if (silentaim.contains("draw_snap_line")) settings::silentaim::draw_snap_line = silentaim["draw_snap_line"];
				if (silentaim.contains("snap_line_color"))
				{
					auto col = silentaim["snap_line_color"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::silentaim::snap_line_color[i] = col[i];
					}
				}
			}
			
			// Triggerbot settings
			if (config.contains("triggerbot"))
			{
				auto& triggerbot = config["triggerbot"];
				if (triggerbot.contains("enabled")) settings::triggerbot::enabled = triggerbot["enabled"];
				if (triggerbot.contains("keybind")) settings::triggerbot::keybind = triggerbot["keybind"];
				if (triggerbot.contains("activation_mode")) settings::triggerbot::activation_mode = triggerbot["activation_mode"];
				if (triggerbot.contains("fov")) settings::triggerbot::fov = triggerbot["fov"];
				if (triggerbot.contains("use_fov")) settings::triggerbot::use_fov = triggerbot["use_fov"];
				if (triggerbot.contains("draw_fov")) settings::triggerbot::draw_fov = triggerbot["draw_fov"];
				if (triggerbot.contains("fov_circle_colour"))
				{
					auto col = triggerbot["fov_circle_colour"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::triggerbot::fov_circle_colour[i] = col[i];
					}
				}
				if (triggerbot.contains("fov_outline_colour"))
				{
					auto col = triggerbot["fov_outline_colour"];
					if (col.is_array() && col.size() == 4)
					{
						for (int i = 0; i < 4; i++) settings::triggerbot::fov_outline_colour[i] = col[i];
					}
				}
				if (triggerbot.contains("target_part")) settings::triggerbot::target_part = triggerbot["target_part"];
				if (triggerbot.contains("teamcheck")) settings::triggerbot::teamcheck = triggerbot["teamcheck"];
				if (triggerbot.contains("knock_check")) settings::triggerbot::knock_check = triggerbot["knock_check"];
				if (triggerbot.contains("health_check_enabled")) settings::triggerbot::health_check_enabled = triggerbot["health_check_enabled"];
				if (triggerbot.contains("min_health")) settings::triggerbot::min_health = triggerbot["min_health"];
				if (triggerbot.contains("delay")) settings::triggerbot::delay = triggerbot["delay"];
				if (triggerbot.contains("reaction_time")) settings::triggerbot::reaction_time = triggerbot["reaction_time"];
			}
			
			OutputDebugStringA(("[CONFIG] Successfully loaded config: " + name + "\n").c_str());
			return true;
		}
		catch (const std::exception& e)
		{
			OutputDebugStringA(("[CONFIG] Exception while loading config: " + std::string(e.what()) + "\n").c_str());
			return false;
		}
		catch (...)
		{
			OutputDebugStringA("[CONFIG] Unknown exception while loading config\n");
			return false;
		}
	}

	bool delete_config(const std::string& name)
	{
		std::string path = get_config_path(name);
		if (path.empty() || !std::filesystem::exists(path))
			return false;
		
		try
		{
			std::filesystem::remove(path);
			return true;
		}
		catch (...)
		{
			return false;
		}
	}

	bool config_exists(const std::string& name)
	{
		std::string path = get_config_path(name);
		if (path.empty())
			return false;
		
		return std::filesystem::exists(path);
	}

	void open_file_location()
	{
		std::string dir = get_config_directory();
		if (dir.empty())
			return;
		
		ShellExecuteA(NULL, "open", dir.c_str(), NULL, NULL, SW_SHOWDEFAULT);
	}
}
