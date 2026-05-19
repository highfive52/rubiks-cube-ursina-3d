import pytest
from ursina import Vec3
import importlib
import sys

# Import main as a module, not as a function
main = importlib.import_module("rubiks_cube.main")


# --- Helpers for testing ---
def make_test_cube():
    # Minimal setup to create cubes and rotation_helper
    app = main.Ursina()
    combine_parent = main.Entity(enabled=False)
    for i, direction in enumerate((Vec3.right, Vec3.up, Vec3.forward)):
        e = main.Entity(
            parent=combine_parent,
            model="plane",
            origin_y=-0.5,
            texture="white_cube",
            color=main.color.white,
        )
        e.look_at(direction, Vec3.up)
        e_flipped = main.Entity(
            parent=combine_parent,
            model="plane",
            origin_y=-0.5,
            texture="white_cube",
            color=main.color.white,
        )
        e_flipped.look_at(-direction, Vec3.up)
    combine_parent.combine()


def test_import_main_module():
    """Test that the main module can be imported without error."""
    import rubiks_cube.main


def test_main_function_exists():
    """Test that main() function exists in the module."""
    import rubiks_cube.main as main_mod

    assert hasattr(main_mod, "main") and callable(main_mod.main)


def test_camera_tracker_class_exists():
    """Test that CameraTracker class exists in the module."""
    import rubiks_cube.main as main_mod

    assert hasattr(main_mod, "CameraTracker")
