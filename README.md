#  Rubik's Cube Ursina App

## Overview

An interactive 3D Rubik’s Cube simulator built with Python and the Ursina game engine.

Features include:
- Relative camera-based cube controls
- Animated face rotations
- Input queueing for valid cube state management
- Real-time camera telemetry/debug overlays
- Mouse and keyboard interaction
- PyInstaller and PyPI packaging support

## Project Structure

```text
pyproject.toml
README.md
scripts/
  └── debug_moves.py
src/
└── rubiks_cube/
    ├── cube_controller.py
    ├── app/
    │   └── main.py
    ├── engine/
    │   ├── move_definitions.py
    │   └── move_engine.py
    ├── input/
    │   ├── camera_mapping.py
    │   ├── input_controller.py
    │   └── move_actions.py
    ├── model/
    │   └── cube_model.py
    └── renderer/
        └── ursina_renderer.py
tests/
└── test_camera_mapping.py
└── test_input_integration.py
└── test_main.py
└── test_move_actions.py
└── test_move_engine.py
```
## License

MIT License

## How to Run

Option A — using `uv` (recommended for a reproducible run):

```powershell
# install uv if needed
pip install uv
uv pip install .
uv run rubiks-cube
```

Option B — editable install (common during development):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
rubiks-cube
```

You can also run directly without installing the package:

```powershell
python -m rubiks_cube.app.main
```
## Controls

  - **Rotate a side with the mouse:**
    - **Left-click** on a face of the cube to rotate that side clockwise.
    - **Right-click** on a face of the cube to rotate that side counterclockwise.

  - **Rotate a side with the keyboard:**
    - **W/A/S/D/E** keys rotate the cube relative to the camera:
      - **D**: Rotate the right face (relative to your current camera view)
      - **A**: Rotate the left face
      - **W**: Rotate the top face
      - **S**: Rotate the bottom face
      - **E**: Rotate the face you are looking at (front)
    - **Hold Shift** while pressing a key to rotate that face in the opposite direction (counterclockwise).
    - **Moves are queued:** If you press keys rapidly, each move will be performed in order, one at a time, after the previous move animation completes. This prevents overlapping moves and keeps the cube in a valid state.

  - **Toggle Debug Overlays:**
    - Press **1** to show/hide the camera-facing debug text overlay (which face you're looking at and its vector).
    - Press **2** to show/hide the FPS counter.
    - Press **3** to show/hide the entities counter.
    - Press **4** to show/hide the colliders counter.

  - **Randomize:**
    - Click the `randomize` button in the lower right to scramble the cube.

  - **Camera:**
    - Use your mouse to orbit, pan, and zoom the view (EditorCamera controls).
  
## Spatial Mapping

|Face Name       |Notation    |Ursina Direction Vector   |Vector Notation  |
|----------------|------------|--------------------------|-----------------|
|Right           |r           |"Vec3(1, 0, 0)"           |Vec3.right       |
|Left            |l           |"Vec3(-1, 0, 0)"          |Vec3.left        |
|Top (Up)        |u           |"Vec3(0, 1, 0)"           |Vec3.up          |
|Bottom (Down)   |d           |"Vec3(0, -1, 0)"          |Vec3.down        |
|Back            |b           |"Vec3(0, 0, 1)"           |Vec3.forward     |
|Front           |f           |"Vec3(0, 0, -1)"          |Vec3.back        |

> Note: Ursina uses a coordinate system where negative Z faces "forward" toward the viewer.

## Camera-Based Face Detection

This app uses a custom `CameraTracker` class to display real-time camera orientation telemetry in the Ursina window. Here’s how it works:

### How the Ursina Camera Works

- Ursina uses a global `camera` object to represent the player's viewpoint in the 3D world.
- The `EditorCamera` is a special camera controller that allows you to orbit, pan, and zoom around the scene using the mouse and keyboard. It updates the global camera's position and orientation every frame.
- You can have multiple camera controllers, but only one active camera at a time determines the rendered view.

### How CameraTracker Determines the Facing Side

- The `CameraTracker` class receives a reference to the camera (e.g., `EditorCamera`) when instantiated.
- Every frame, in its `update()` method, it reads the camera's forward vector (the direction the camera is looking).
- It compares the camera forward vector against the six cube face normals using a dot product to determine which face is currently most aligned with the camera view.
- The tracker then updates an on-screen text element to display the name and vector of the currently faced side, and colors the text to match that face.

#### Example (simplified):

```python
cam_forward = Vec3(self.cam.forward.x, self.cam.forward.y, self.cam.forward.z)
for face_vector in FACE_MAPPINGS.keys():
    similarity = cam_forward.dot(-face_vector)
    # Track the face with the highest similarity (most "in front" of the camera)
```

### Why the Tracker Class Must Be Global

- The `CameraTracker` class must be defined at the global/module level so Ursina can manage it as an entity and call its `update()` method every frame.
- If you define the class inside a function (like `main()`), Ursina’s entity system cannot find or manage it properly, and its `update()` method will not be called.

### Passing the Camera

- In `main()`, an `EditorCamera` instance is created and passed to the `CameraTracker` when it is instantiated:

  ```python
  editor_camera = EditorCamera()
  CameraTracker(camera_to_track=editor_camera)
  ```
- This allows the tracker to access the camera’s orientation and update the on-screen telemetry every frame.

### Multiple Trackers

- You can create multiple tracker entities to monitor different cameras or different aspects of the same camera. Each tracker will receive its own `update()` call every frame.

**Summary:**

- Always define your `Entity` subclasses (like `CameraTracker`) at the global/module level for Ursina to manage them correctly.
- Instantiate and pass in the camera (or other objects to track) from anywhere, such as `main()`.
- Ursina will handle calling `update()` on each tracker entity every frame.

## Notes
- The app window must be focused for mouse controls to work.

## Code Quality: pre-commit Hooks

This project uses [pre-commit](https://pre-commit.com/) to automate code formatting and linting.

### Setup pre-commit

Recommended local setup:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

Note: `black`, `pre-commit`, and `pytest` are development tools. Consider moving them out of runtime `dependencies` in `pyproject.toml` into an optional/development extras group so end users don't install dev tools by default.

## Build

### PyInstaller (Windows — tested)

This command was tested on Windows and builds a standalone executable including the Panda3D binaries that Ursina may require:

```
pyinstaller --add-data=".venv/Lib/site-packages/panda3d/etc;panda3d/etc" \
            --add-binary=".venv/Lib/site-packages/panda3d/libpandagl.dll;panda3d" \
            --add-binary=".venv/Lib/site-packages/panda3d/libp3windisplay.dll;panda3d" \
            --add-data=".venv/Lib/site-packages/ursina/models_compressed;ursina/models_compressed" \
            --add-data=".venv/Lib/site-packages/ursina/fonts;ursina/fonts" \
            --add-data=".venv/Lib/site-packages/ursina/textures;ursina/textures" \
            --add-data="src/rubiks_cube;rubiks_cube" \
            src/rubiks_cube/app/main.py
```

Tip: this command assumes a `.venv` virtual environment with packages installed there; if your environment differs, update the paths accordingly. After the build, inspect the `dist/` folder and add any missing data files via `--add-data` if necessary.

## Troubleshooting

- If input seems unresponsive, ensure the app window is focused.
- If rendering errors occur, verify your `ursina` and optional `panda3d` versions are compatible with Python 3.12.
- Packaging issues usually show missing assets in `dist/`; add them via `--add-data` and re-run.

## Contributing / Contact

- Contributions welcome — please open an issue or PR with context for your change.
- Maintainer contact is listed in `pyproject.toml`.

### PyPi

```powershell
pip install --upgrade build twine
```

```powershell
python -m build
```

Upload to the official PyPI repository:

```
python -m twine upload dist/*
```

#### Local Whl Test

1. Create the virtual environment folder named .venv
  ```sh
  python -m venv .venv
  ```
2. Activate the environment in PowerShell
  ```sh
  .\.venv\Scripts\Activate.ps1
  ```
3. Install the wheel file directly:
  ```sh
  pip install rubiks_cube-0.1.0-py3-none-any.whl
  ```

  Or, if you want to force re-install an older version over itself:
  ```sh
  pip install --force-reinstall rubiks_cube-0.1.0-py3-none-any.whl
  ```

Enjoy solving the Rubik's Cube!

## Testing

This project uses `pytest` for testing. To run the tests:

```sh
pytest
```

Make sure your virtual environment is activated and dependencies are installed.

## Roadmap

- [ ] Move history and undo support
- [ ] Solver integration
- [ ] Scramble notation export
- [ ] Additional cube sizes (4x4, 5x5)
