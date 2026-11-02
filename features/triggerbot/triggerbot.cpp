//============ Copyright ImMagic, All rights reserved ============//
//
// Purpose: Triggerbot feature
//
//================================================================//

#include "triggerbot.h"
#include <game/game.h>
#include <cache/cache.h>
#include <sdk/sdk.h>
#include <memory/memory.h>
#include <sdk/offsets.h>
#include <settings.h>
#include <sdk/math/math.h>
#include <menu/keybind/keybind.h>

#include <windows.h>
#include <thread>
#include <chrono>
#include <mutex>
#include <cmath>

void triggerbot::run()
{
	static bool was_key_pressed = false;
	static auto last_trigger_time = std::chrono::steady_clock::now();

	while (true) {
		if (!settings::triggerbot::enabled || !game::datamodel.address) {
			was_key_pressed = false;
			std::this_thread::sleep_for(std::chrono::milliseconds(1));
			continue;
		}

		if (game::camera == 0) {
			std::this_thread::sleep_for(std::chrono::milliseconds(1));
			continue;
		}

		// Check keybind
		if (settings::triggerbot::keybind != 0) {
			bool is_key_pressed = (GetAsyncKeyState(settings::triggerbot::keybind) & 0x8000) != 0;

			if (!is_key_pressed) {
				was_key_pressed = false;
				std::this_thread::sleep_for(std::chrono::milliseconds(1));
				continue;
			}

			// Check activation mode
			if (settings::triggerbot::activation_mode == 1 && !was_key_pressed) {
				was_key_pressed = true;
				std::this_thread::sleep_for(std::chrono::milliseconds(1));
				continue;
			}

			was_key_pressed = true;
		}

		// Get camera position and direction
		math::vector3 camera_pos = memory->read<math::vector3>(game::camera + Offsets::Camera::Position);
		math::matrix3 camera_rot = memory->read<math::matrix3>(game::camera + Offsets::Camera::Rotation);
		math::vector3 camera_forward = camera_rot.forward();

		// Get players
		std::vector<cache::entity_t> snapshot;
		{
			std::lock_guard<std::mutex> lock(cache::mtx);
			snapshot = cache::cached_players;
		}

		// Get local player
		cache::entity_t local_player;
		{
			std::lock_guard<std::mutex> lock(cache::mtx);
			local_player = cache::cached_local_player;
		}

		if (!local_player.instance.address) {
			std::this_thread::sleep_for(std::chrono::milliseconds(1));
			continue;
		}

		bool target_found = false;
		float closest_distance = FLT_MAX;

		for (const auto& entity : snapshot) {
			if (entity.instance.address == local_player.instance.address)
				continue;

			// Team check
			if (settings::triggerbot::teamcheck && entity.team == local_player.team)
				continue;

			// Friend check
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
							continue;
						}
					}
				}
				catch (...)
				{
				}
			}

			// Health check
			if (settings::triggerbot::health_check_enabled && entity.health < settings::triggerbot::min_health)
				continue;

			// Get target part position
			auto target_part_it = entity.parts.end();
			if (settings::triggerbot::target_part == 0) {
				target_part_it = entity.parts.find("Head");
			} else if (settings::triggerbot::target_part == 1) {
				target_part_it = entity.parts.find("HumanoidRootPart");
			} else if (settings::triggerbot::target_part == 2) {
				target_part_it = entity.parts.find("UpperTorso");
			} else if (settings::triggerbot::target_part == 3) {
				target_part_it = entity.parts.find("LowerTorso");
			}

			if (target_part_it == entity.parts.end() || target_part_it->second.address == 0)
				continue;

			rbx::part_t target_part = target_part_it->second;
			rbx::primitive_t target_prim = target_part.get_primitive();
			math::vector3 target_pos = target_prim.get_position();

			// Calculate direction to target
			math::vector3 dir_to_target = target_pos - camera_pos;
			float distance = dir_to_target.length();

			if (distance == 0.0f)
				continue;

			dir_to_target = dir_to_target * (1.0f / distance);

			// Calculate angle between camera forward and direction to target
			float dot = camera_forward.x * dir_to_target.x + camera_forward.y * dir_to_target.y + camera_forward.z * dir_to_target.z;
			float angle = std::acos(dot) * (180.0f / 3.14159265359f);

			// Only trigger if target is very close to crosshair (within small FOV)
			float trigger_fov = settings::triggerbot::use_fov ? settings::triggerbot::fov : 2.0f;
			if (angle > trigger_fov)
				continue;

			// Check if closest target
			if (distance < closest_distance) {
				closest_distance = distance;
				target_found = true;
			}
		}

		// Trigger if target found
		if (target_found) {
			auto current_time = std::chrono::steady_clock::now();
			auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(current_time - last_trigger_time).count();

			// Apply delay
			if (elapsed >= (settings::triggerbot::delay * 1000.0f)) {
				// Apply reaction time
				if (settings::triggerbot::reaction_time > 0.0f) {
					std::this_thread::sleep_for(std::chrono::milliseconds(static_cast<int>(settings::triggerbot::reaction_time * 1000.0f)));
				}

				// Simulate mouse click
				mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
				std::this_thread::sleep_for(std::chrono::milliseconds(10));
				mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);

				last_trigger_time = std::chrono::steady_clock::now();
			}
		}

		std::this_thread::sleep_for(std::chrono::milliseconds(1));
	}
}
